const { session, net } = require('electron');

class ProxyManager {
  constructor() {
    this.healthChecks = new Map();
    this.killSwitchActive = new Set();
    this.proxyLatencies = new Map();
    this.PROXY_CHECK_INTERVAL = 10000; // 10 seconds health check
    this.MAX_LATENCY_MS = 5000;
    this.FAILURE_THRESHOLD = 2; // consecutive failures before triggering block
    this.proxyFailures = new Map();
  }

  async checkProxyHealth(proxyString, sessionId, credentials) {
    if (!proxyString) return { status: 'no-proxy', latency: 0 };

    try {
      const startTime = Date.now();
      const url = new URL('https://clients3.google.com/generate_204'); // Secure HTTPS request
      
      // Get isolated session for health checks and set the proxy rules
      const checkSess = session.fromPartition(`persist:proxy_check_${sessionId}`);
      await checkSess.setProxy({ proxyRules: proxyString });

      const request = net.request({
        method: 'GET',
        url: url.toString(),
        session: checkSess
      });

      // Handle proxy authentication for background requests
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
          reject(new Error('Proxy health check timeout'));
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
      if (latency > 500) status = 'degraded';
      if (latency > this.MAX_LATENCY_MS * 0.8) status = 'critical';

      return { status, latency, proxyString };
    } catch (err) {
      const failures = (this.proxyFailures.get(sessionId) || 0) + 1;
      this.proxyFailures.set(sessionId, failures);

      console.error(`[ProxyManager] Health check failed for session ${sessionId}: ${err.message} (failures: ${failures})`);

      if (failures >= this.FAILURE_THRESHOLD) {
        return { status: 'unreachable', latency: -1, proxyString, consecutiveFailures: failures };
      }
      return { status: 'degraded', latency: -1, proxyString, consecutiveFailures: failures };
    }
  }

  activateKillSwitch(sessionId, browserWindow) {
    if (this.killSwitchActive.has(sessionId)) return;

    this.killSwitchActive.add(sessionId);
    console.warn(`[ProxyManager] KILL-SWITCH ACTIVATED for session ${sessionId}. Blocking connection to prevent IP leak.`);

    try {
      const sess = browserWindow.webContents.session;
      // Force invalid proxy rules to block all outbound requests instantly
      sess.setProxy({ proxyRules: '127.0.0.1:0' });

      // Notify the renderer overlay to show the "Reconnecting" UI
      browserWindow.webContents.send('proxy:status', { status: 'disconnected' });
    } catch (err) {
      console.error(`[ProxyManager] Kill-switch activation error: ${err.message}`);
    }

    this.reportKillSwitch(sessionId);
  }

  deactivateKillSwitch(sessionId, browserWindow, proxyString) {
    if (!this.killSwitchActive.has(sessionId)) return;

    this.killSwitchActive.delete(sessionId);
    console.log(`[ProxyManager] KILL-SWITCH DEACTIVATED for session ${sessionId}. Restoring proxy connection.`);

    try {
      const sess = browserWindow.webContents.session;
      if (proxyString) {
        sess.setProxy({ proxyRules: proxyString });
      } else {
        sess.setProxy({});
      }

      // Notify the renderer overlay to hide the "Reconnecting" UI
      browserWindow.webContents.send('proxy:status', { status: 'connected' });
    } catch (err) {
      console.error(`[ProxyManager] Kill-switch deactivation error: ${err.message}`);
    }
  }

  async reportKillSwitch(sessionId) {
    try {
      const Store = require('electron-store');
      const store = new Store();
      const fetch = require('node-fetch');

      await fetch(`${process.env.ZONIX_BACKEND_URL || 'https://zonix-backend-ouhi.onrender.com'}/api/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${store.get('authToken')}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          type: 'kill-switch',
          sessionId,
          timestamp: Date.now(),
          reason: 'proxy-unreachable'
        })
      });
    } catch (err) {
      console.error(`[ProxyManager] Failed to report kill-switch event: ${err.message}`);
    }
  }

  clearKillSwitch(sessionId) {
    this.killSwitchActive.delete(sessionId);
    this.proxyFailures.delete(sessionId);
    this.proxyLatencies.delete(sessionId);
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

  async startContinuousHealthCheck(sessionId, proxyString, browserWindow, credentials) {
    if (this.healthChecks.has(sessionId)) {
      clearInterval(this.healthChecks.get(sessionId));
    }

    const timer = setInterval(async () => {
      const result = await this.checkProxyHealth(proxyString, sessionId, credentials);

      if (result.status === 'unreachable') {
        if (!this.killSwitchActive.has(sessionId)) {
          this.activateKillSwitch(sessionId, browserWindow);
        }
      } else {
        if (this.killSwitchActive.has(sessionId)) {
          this.deactivateKillSwitch(sessionId, browserWindow, proxyString);
        }
      }
    }, this.PROXY_CHECK_INTERVAL);

    this.healthChecks.set(sessionId, timer);
    console.log(`[ProxyManager] Continuous health check active for session ${sessionId}`);
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
  }
}

module.exports = ProxyManager;
