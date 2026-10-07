const { session, net } = require('electron');

class SecurityEngine {
  constructor() {
    this.interceptedSessions = new Map();
    this.TELEMETRY_DOMAINS = [
      '*://bam.nr-data.net/*',
      '*://*.browser-intake-datadoghq.com/*',
      '*://*.sentry.io/api/*',
      '*://api.mixpanel.com/*',
      '*://*.hotjar.com/*',
      '*://*.fullstory.com/*',
      '*://*.logrocket.com/*',
      '*://*.segment.io/*',
      '*://*.amplitude.com/*',
      '*://*.heap.io/*',
      '*://api.crazyegg.com/*',
      '*://*.mouseflow.com/*',
      '*://clarity.ms/*',
      '*://*.optimizely.com/*',
      '*://analytics.google.com/*',
      '*://stats.g.doubleclick.net/*',
      '*://*.newrelic.com/*',
      '*://*.chartbeat.com/*',
      '*://cdn.mouseflow.com/*',
      '*://*.luckyorange.com/*',
      '*://collector.githubapp.com/*',
      '*://telemetry.microsoft.com/*',
      '*://events.fivetran.com/*',
      '*://api.segment.io/*'
    ];

    this.SINKHOLE_DATA_URI = 'data:text/javascript,window.__ZONIX_SINKHOLE=true;';
  }

  applyInterceptors(targetSession, orgId, sessionId, proxyManager) {
    if (this.interceptedSessions.has(targetSession.id)) {
      console.log(`[Security] Interceptors already applied to session ${targetSession.id}`);
      return;
    }

    this.applyZeroLeakMasterFilter(targetSession, sessionId, proxyManager);
    this.applyWebRTCLeakProtection(targetSession);
    this.applyFingerprintConsistencyHeaders(targetSession, orgId);
    this.applyContentSecurityPolicy(targetSession);
    this.removeBrowserDetectionHeaders(targetSession);

    this.interceptedSessions.set(targetSession.id, {
      orgId,
      sessionId,
      appliedAt: Date.now()
    });

    console.log(`[Security] All zero-leak security interceptors locked for org ${orgId}, session ${targetSession.id}`);
  }

  applyZeroLeakMasterFilter(targetSession, sessionId, proxyManager) {
    const dnsLeakDomains = ['dns.google', 'cloudflare-dns.com', '1.1.1.1', 'one.one.one.one'];
    const devToolsProtocols = ['chrome-devtools:', 'devtools:', 'view-source:'];

    targetSession.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const url = details.url || '';

        // 1. HARD ZERO-LEAK KILL-SWITCH GATE (Immediate in-memory block)
        if (proxyManager && sessionId && proxyManager.isKillSwitchActive(sessionId)) {
          // Allow internal file/data scripts, completely blackhole all outbound network egress
          if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('chrome-extension:')) {
            return callback({});
          }
          console.warn(`[Zero-Leak Hard Block] 🚨 OUTBOUND BLOCKED during proxy disconnect: ${url.substring(0, 90)}`);
          return callback({ cancel: true });
        }

        // 2. DevTools Navigation Lockdown
        if (devToolsProtocols.some(p => url.startsWith(p))) {
          return callback({ cancel: true });
        }

        // 3. Native DNS Leak Probe Block
        if (dnsLeakDomains.some(d => url.includes(d))) {
          console.warn(`[Security] DNS leak probe blocked: ${url.substring(0, 80)}`);
          return callback({ cancel: true });
        }

        // 4. Telemetry Domain Sinkhole
        for (const pattern of this.TELEMETRY_DOMAINS) {
          const domain = pattern.replace(/^\*?:\/\//, '').replace(/\/\*$/, '').replace(/\*/g, '');
          if (url.includes(domain)) {
            return callback({ cancel: true, redirectURL: this.SINKHOLE_DATA_URI });
          }
        }

        // Standard proxied traffic allowed
        callback({});
      }
    );

    console.log('[Security] Unified zero-leak master request filter active');
  }

  applyWebRTCLeakProtection(targetSession) {
    try {
      // Chromium policy: strictly disables UDP when proxy is in use, routing WebRTC only through proxy
      targetSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
      console.log('[Security] Native WebRTC IP Handling Policy set to: disable_non_proxied_udp');
    } catch (e) {
      try {
        targetSession.setWebRTCIPHandlingPolicy('default_public_interface_only');
      } catch (e2) {
        console.error('[Security] Failed to set native WebRTC IP handling policy:', e.message);
      }
    }
    console.log('[Security] WebRTC leak protection active (strict zero-leak mode)');
  }

  applyFingerprintConsistencyHeaders(targetSession, orgId) {
    const fingerprintSeed = this.generateOrgFingerprintSeed(orgId);

    targetSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const headers = details.requestHeaders;

        if (!headers['X-Zonix-Secured']) {
          headers['X-Zonix-Secured'] = 'true';
        }

        if (!headers['Accept-Language'] || headers['Accept-Language'] === '') {
          headers['Accept-Language'] = 'en-US,en;q=0.9';
        }

        if (!headers['sec-ch-ua-platform']) {
          headers['sec-ch-ua-platform'] = '"Windows"';
        }

        if (!headers['sec-ch-ua-mobile']) {
          headers['sec-ch-ua-mobile'] = '?0';
        }

        headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
        headers['sec-ch-ua-model'] = '""';
        headers['sec-ch-ua-full-Version'] = '"120.0.6099.110"';
        headers['sec-ch-ua-platform-version'] = '"10.0.0"';

        callback({ requestHeaders: headers });
      }
    );

    console.log(`[Security] Fingerprint consistency headers applied for org ${orgId}`);
  }

  generateOrgFingerprintSeed(orgId) {
    let hash = 0;
    const str = `zonix_fp_seed_${orgId}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  applyContentSecurityPolicy(targetSession) {
    targetSession.webRequest.onHeadersReceived(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const headers = details.responseHeaders;
        if (!headers) {
          callback({});
          return;
        }

        // Map lowercase headers to their actual keys in a single quick pass
        const headerMap = {};
        for (const key of Object.keys(headers)) {
          headerMap[key.toLowerCase()] = key;
        }

        const cspOriginalKey = headerMap['content-security-policy'];
        if (cspOriginalKey) {
          const existingCSP = headers[cspOriginalKey];
          if (Array.isArray(existingCSP)) {
            headers[cspOriginalKey] = existingCSP.map(csp =>
              csp.replace(/report-uri[^;]*/gi, '')
                 .replace(/report-to[^;]*/gi, '')
                 .replace(/connect-src/gi, "connect-src 'self'")
            );
          }
        }

        // Strip tracking headers case-insensitively using the map
        const headersToStrip = ['x-device-id', 'x-client-id', 'x-session-fingerprint'];
        for (const h of headersToStrip) {
          const originalKey = headerMap[h];
          if (originalKey) {
            delete headers[originalKey];
          }
        }

        callback({ responseHeaders: headers });
      }
    );

    console.log('[Security] CSP enhancement and tracking header removal applied');
  }

  removeBrowserDetectionHeaders(targetSession) {
    targetSession.webRequest.onHeadersReceived(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const headers = details.responseHeaders;
        if (!headers) {
          callback({});
          return;
        }

        const headerMap = {};
        for (const key of Object.keys(headers)) {
          headerMap[key.toLowerCase()] = key;
        }

        const headersToRemove = [
          'x-powered-by',
          'x-aspnet-version',
          'x-aspnetmvc-version',
          'x-runtime',
          'x-request-id',
          'x-debug'
        ];

        for (const h of headersToRemove) {
          const originalKey = headerMap[h];
          if (originalKey) {
            delete headers[originalKey];
          }
        }

        callback({ responseHeaders: headers });
      }
    );
  }

  getInterceptedSessions() {
    const result = {};
    this.interceptedSessions.forEach((data, sessionId) => {
      result[sessionId] = data;
    });
    return result;
  }

  cleanupSession(sessionId) {
    this.interceptedSessions.delete(sessionId);
    console.log(`[Security] Cleanup completed for session ${sessionId}`);
  }
}

module.exports = SecurityEngine;
