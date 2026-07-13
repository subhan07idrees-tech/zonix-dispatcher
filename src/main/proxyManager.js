const { session } = require('electron');
const { net } = require('electron');

class ProxyManager {
  constructor() {
    this.healthChecks = new Map();
    this.killSwitchActive = new Set();
    this.proxyLatencies = new Map();
    this.PROXY_CHECK_INTERVAL = 15000;
    this.MAX_LATENCY_MS = 5000;
    this.FAILURE_THRESHOLD = 3;
    this.proxyFailures = new Map();
  }

  async checkProxyHealth(proxyString, sessionId) {
    if (!proxyString) return { status: 'no-proxy', latency: 0 };

    try {
      const startTime = Date.now();

      const url = new URL('https://httpbin.org/ip');
      const request = net.request({
        url: url.toString(),
        session: `proxy-check-${sessionId}`,
        proxy: proxyString
      });

      const latency = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          request.abort();
          reject(new Error('Proxy health check timeout'));
        }, this.MAX_LATENCY_MS);

        request.on('response', (response) => {
          clearTimeout(timeout);
          let body = '';
          response.on('data', (chunk) => { body += chunk.toString(); });
          response.on('end', () => {
            const elapsed = Date.now() - startTime;
            if (response.statusCode >= 200 && response.statusCode < 400) {
              resolve(elapsed);
            } else {
              reject(new Error(`Proxy returned status ${response.statusCode}`));
            }
          });
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
      if (latency > 300) status = 'degraded';
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
    if (this.killSwitchActive.has(sessionId)) {
      console.log(`[ProxyManager] Kill-switch already active for session ${sessionId}`);
      return;
    }

    this.killSwitchActive.add(sessionId);
    console.warn(`[ProxyManager] KILL-SWITCH ACTIVATED for session ${sessionId}. Terminating connection to prevent IP leak.`);

    try {
      const webContents = browserWindow.webContents;
      webContents.stop();

      const killScreenHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>ZONIX - Kill Switch</title></head>
        <body style="background:#0D0E12;color:#FF3B3B;font-family:'Inter',sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1 style="font-size:28px;margin-bottom:8px;color:#FF3B3B;">PROXY KILL-SWITCH</h1>
            <p style="color:#00F0FF;font-size:14px;margin-bottom:24px;">ACTIVE — Connection Severed</p>
            <div style="background:#161920;border:1px solid #FF3B3B;border-radius:8px;padding:24px;max-width:480px;text-align:left;">
              <p style="color:#888;font-size:13px;margin:8px 0;"><strong style="color:#FF3B3B;">STATUS:</strong> Proxy node unreachable</p>
              <p style="color:#888;font-size:13px;margin:8px 0;"><strong style="color:#FF3B3B;">ACTION:</strong> All network activity halted</p>
              <p style="color:#888;font-size:13px;margin:8px 0;"><strong style="color:#00F0FF;">PROTECTION:</strong> Your real IP was never exposed</p>
              <p style="color:#888;font-size:13px;margin:8px 0;"><strong style="color:#00F0FF;">RECOVERY:</strong> Contact your administrator</p>
            </div>
            <p style="color:#555;font-size:11px;margin-top:24px;">ZONIX Protection Engine v1.0</p>
          </div>
        </body>
        </html>
      `;

      browserWindow.loadURL(`data:text/html,${encodeURIComponent(killScreenHtml)}`);
      console.log(`[ProxyManager] Kill-switch screen displayed for session ${sessionId}`);
    } catch (err) {
      console.error(`[ProxyManager] Kill-switch display error: ${err.message}`);
    }

    this.reportKillSwitch(sessionId);
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
          'Content-Type': 'application/json'
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
    console.log(`[ProxyManager] Kill-switch cleared for session ${sessionId}`);
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

  async startContinuousHealthCheck(sessionId, proxyString, browserWindow, intervalMs) {
    const checkInterval = intervalMs || this.PROXY_CHECK_INTERVAL;

    if (this.healthChecks.has(sessionId)) {
      clearInterval(this.healthChecks.get(sessionId));
    }

    const timer = setInterval(async () => {
      if (!this.killSwitchActive.has(sessionId)) {
        const result = await this.checkProxyHealth(proxyString, sessionId);

        if (result.status === 'unreachable') {
          this.activateKillSwitch(sessionId, browserWindow);
          clearInterval(timer);
          this.healthChecks.delete(sessionId);
        } else if (result.status === 'critical') {
          console.warn(`[ProxyManager] Proxy critical for session ${sessionId}: ${result.latency}ms`);
        }
      } else {
        clearInterval(timer);
        this.healthChecks.delete(sessionId);
      }
    }, checkInterval);

    this.healthChecks.set(sessionId, timer);
    console.log(`[ProxyManager] Continuous health check started for session ${sessionId} (interval: ${checkInterval}ms)`);
  }

  stopHealthCheck(sessionId) {
    if (this.healthChecks.has(sessionId)) {
      clearInterval(this.healthChecks.get(sessionId));
      this.healthChecks.delete(sessionId);
    }
  }

  stopAll() {
    this.healthChecks.forEach((timer, sessionId) => {
      clearInterval(timer);
    });
    this.healthChecks.clear();
    this.killSwitchActive.clear();
    this.proxyFailures.clear();
    this.proxyLatencies.clear();
  }
}

module.exports = ProxyManager;
