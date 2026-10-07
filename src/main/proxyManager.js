const { session, net } = require('electron');

class ProxyManager {
  constructor() {
    this.healthChecks = new Map();
    this.killSwitchActive = new Set();
    this.proxyLatencies = new Map();
    this.partitionSessions = new Map();
    this.PROXY_CHECK_INTERVAL = 1500; // Ultra-fast 1.5s heartbeat
    this.MAX_LATENCY_MS = 2000;       // Aggressive 2s timeout for immediate failover
    this.FAILURE_THRESHOLD = 1;       // IMMEDIATE: Single failure trips kill-switch instantly
    this.proxyFailures = new Map();
  }

  isKillSwitchActive(sessionId) {
    return this.killSwitchActive.has(sessionId);
  }

  async checkProxyHealth(proxyString, sessionId, credentials) {
    if (!proxyString) return { status: 'no-proxy', latency: 0 };

    try {
      const startTime = Date.now();
      const url = new URL('https://clients3.google.com/generate_204'); // Low-overhead 204 endpoint
      
      // Isolated test session with configured upstream proxy rules
      const checkSess = session.fromPartition(`persist:proxy_check_${sessionId}`);
      await checkSess.setProxy({ proxyRules: proxyString });

      const request = net.request({
        method: 'GET',
        url: url.toString(),
        session: checkSess
      });

      // Handle proxy authentication for background probe
      request.on('login', (authInfo, callback) => {
        if (credentials && credentials.username) {
          callback(credentials.username, credentials.password);
        } else {
          callback();
        }
      });

      const latency = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          request.abort();
          reject(new Error('Proxy health probe timeout'));
        }, this.MAX_LATENCY_MS);

        request.on('response', (response) => {
          clearTimeout(timeout);
          if (response.statusCode >= 200 && response.statusCode < 400) {
            resolve(Date.now() - startTime);
          } else {
            reject(new Error(`Proxy returned status ${response.statusCode}`));
          }
        });

        request.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        request.end();
      });

      this.proxyFailures.delete(sessionId);
      this.proxyLatencies.set(sessionId, latency);

      let status = 'healthy';
      if (latency > 600) status = 'degraded';
      if (latency > this.MAX_LATENCY_MS * 0.8) status = 'critical';

      return { status, latency, proxyString };
    } catch (err) {
      const failures = (this.proxyFailures.get(sessionId) || 0) + 1;
      this.proxyFailures.set(sessionId, failures);

      console.warn(`[ProxyManager] Proxy fault on session ${sessionId}: ${err.message} (failCount: ${failures})`);

      if (failures >= this.FAILURE_THRESHOLD) {
        return { status: 'unreachable', latency: -1, proxyString, consecutiveFailures: failures };
      }
      return { status: 'degraded', latency: -1, proxyString, consecutiveFailures: failures };
    }
  }

  async activateKillSwitch(sessionId, browserWindow, partitionId) {
    if (this.killSwitchActive.has(sessionId)) return;

    this.killSwitchActive.add(sessionId);
    console.warn(`[ProxyManager] 🚨 IMMEDIATE KILL-SWITCH TRIPPED for session ${sessionId}. Severing all connections to prevent IP leak.`);

    try {
      const targetPartitionId = partitionId || this.partitionSessions.get(sessionId);
      const targetSessions = [];

      if (targetPartitionId) {
        try { targetSessions.push(session.fromPartition(targetPartitionId)); } catch(e) {}
      }
      if (browserWindow && !browserWindow.isDestroyed() && browserWindow.webContents) {
        try { targetSessions.push(browserWindow.webContents.session); } catch(e) {}
      }

      // 1. Blackhole Chromium proxy and destroy all active socket pools instantly
      for (const sess of targetSessions) {
        try {
          // Point all outbound traffic to a dead blackhole address
          sess.setProxy({ proxyRules: '127.0.0.1:0' }).catch(() => {});
          
          // CRITICAL ZERO-LEAK CALL: Immediately terminate existing open TCP, TLS, and WebSockets
          if (typeof sess.closeAllConnections === 'function') {
            sess.closeAllConnections().catch(() => {});
          }
        } catch (e) {
          console.error(`[ProxyManager] Error terminating session connections:`, e.message);
        }
      }

      // 2. Halt active navigations and show immediate lockdown overlay in renderer
      if (browserWindow && !browserWindow.isDestroyed()) {
        try {
          browserWindow.webContents.stop();
          browserWindow.webContents.send('proxy:status', { 
            status: 'disconnected', 
            reason: 'kill-switch-triggered' 
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error(`[ProxyManager] Kill-switch activation error: ${err.message}`);
    }

    this.reportKillSwitch(sessionId);
  }

  async deactivateKillSwitch(sessionId, browserWindow, proxyString, partitionId) {
    if (!this.killSwitchActive.has(sessionId)) return;

    this.killSwitchActive.delete(sessionId);
    console.log(`[ProxyManager] ✅ KILL-SWITCH RESTORED for session ${sessionId}. Proxy confirmed healthy: ${proxyString}`);

    try {
      const targetPartitionId = partitionId || this.partitionSessions.get(sessionId);
      const targetSessions = [];

      if (targetPartitionId) {
        try { targetSessions.push(session.fromPartition(targetPartitionId)); } catch(e) {}
      }
      if (browserWindow && !browserWindow.isDestroyed() && browserWindow.webContents) {
        try { targetSessions.push(browserWindow.webContents.session); } catch(e) {}
      }

      for (const sess of targetSessions) {
        try {
          if (proxyString) {
            await sess.setProxy({ proxyRules: proxyString });
          } else {
            await sess.setProxy({});
          }
        } catch (e) {}
      }

      // Dismiss lockdown overlay in renderer
      if (browserWindow && !browserWindow.isDestroyed()) {
        browserWindow.webContents.send('proxy:status', { status: 'connected' });
      }
    } catch (err) {
      console.error(`[ProxyManager] Kill-switch deactivation error: ${err.message}`);
    }
  }

  async reportKillSwitch(sessionId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const { safeStorage } = require('electron');
      const fetch = require('node-fetch');

      let token = store.get('authToken');
      if (token && safeStorage.isEncryptionAvailable()) {
        try {
          token = safeStorage.decryptString(Buffer.from(token, 'base64'));
        } catch (e) {}
      }

      await fetch(`${process.env.ZONIX_BACKEND_URL || 'https://zonix-backend-0ggt.onrender.com'}/api/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          type: 'kill-switch',
          sessionId,
          timestamp: Date.now(),
          reason: 'proxy-unreachable-or-fault'
        })
      });
    } catch (err) {}
  }

  clearKillSwitch(sessionId) {
    this.killSwitchActive.delete(sessionId);
    this.proxyFailures.delete(sessionId);
    this.proxyLatencies.delete(sessionId);
    this.partitionSessions.delete(sessionId);
  }

  getProxyStatus(sessionId) {
    return {
      isKillSwitchActive: this.killSwitchActive.has(sessionId),
      failures: this.proxyFailures.get(sessionId) || 0,
      lastLatency: this.proxyLatencies.get(sessionId) || -1
    };
  }

  getAllProxyStatuses() {
    const statuses = {};
    this.proxyFailures.forEach((failures, sessionId) => {
      statuses[sessionId] = {
        failures,
        latency: this.proxyLatencies.get(sessionId) || -1,
        killSwitchActive: this.killSwitchActive.has(sessionId)
      };
    });
    return statuses;
  }

  async startContinuousHealthCheck(sessionId, proxyString, browserWindow, credentials, partitionId) {
    if (this.healthChecks.has(sessionId)) {
      clearInterval(this.healthChecks.get(sessionId));
    }

    if (partitionId) {
      this.partitionSessions.set(sessionId, partitionId);
    }

    const performCheck = async () => {
      const result = await this.checkProxyHealth(proxyString, sessionId, credentials);

      if (result.status === 'unreachable') {
        if (!this.killSwitchActive.has(sessionId)) {
          await this.activateKillSwitch(sessionId, browserWindow, partitionId);
        }
      } else if (result.status === 'healthy' || result.status === 'degraded') {
        if (this.killSwitchActive.has(sessionId)) {
          await this.deactivateKillSwitch(sessionId, browserWindow, proxyString, partitionId);
        }
      }
    };

    // Execute initial probe immediately on startup so no leak window exists
    setImmediate(performCheck);

    // Continuous ultra-fast 2s monitoring loop
    const timer = setInterval(performCheck, this.PROXY_CHECK_INTERVAL);
    this.healthChecks.set(sessionId, timer);
    console.log(`[ProxyManager] Ultra-fast continuous health check active (2s cadence) for session ${sessionId}`);
  }

  stopHealthCheck(sessionId) {
    if (this.healthChecks.has(sessionId)) {
      clearInterval(this.healthChecks.get(sessionId));
      this.healthChecks.delete(sessionId);
    }
  }

  stopAll() {
    this.healthChecks.forEach((timer) => clearInterval(timer));
    this.healthChecks.clear();
    this.killSwitchActive.clear();
    this.proxyFailures.clear();
    this.proxyLatencies.clear();
    this.partitionSessions.clear();
  }
}

module.exports = ProxyManager;
