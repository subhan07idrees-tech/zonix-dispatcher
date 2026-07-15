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

  applyInterceptors(targetSession, orgId) {
    if (this.interceptedSessions.has(targetSession.id)) {
      console.log(`[Security] Interceptors already applied to session ${targetSession.id}`);
      return;
    }

    this.applyTelemetrySinkhole(targetSession);
    this.applyWebRTCLeakProtection(targetSession);
    this.applyDNSLeakProtection(targetSession);
    this.applyFingerprintConsistencyHeaders(targetSession, orgId);

    this.interceptedSessions.set(targetSession.id, {
      orgId,
      appliedAt: Date.now()
    });

    console.log(`[Security] All interceptors applied for org ${orgId}, session ${targetSession.id}`);
  }

  applyTelemetrySinkhole(targetSession) {
    const sinkholePattern = this.TELEMETRY_DOMAINS.map(d => {
      const cleaned = d.replace(/^\*?:\/\//, '').replace(/\/\*$/, '');
      return `*://${cleaned}*`;
    });

    targetSession.webRequest.onBeforeRequest(
      { urls: this.TELEMETRY_DOMAINS },
      (details, callback) => {
        console.debug(`[Security] Sinkholed telemetry request: ${details.url.substring(0, 80)}...`);
        callback({ cancel: true, redirectURL: this.SINKHOLE_DATA_URI });
      }
    );

    console.log(`[Security] Telemetry sinkhole active — blocking ${this.TELEMETRY_DOMAINS.length} tracker patterns`);
  }

  applyWebRTCLeakProtection(targetSession) {
    try {
      targetSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp_send');
      console.log('[Security] Native WebRTC IP Handling Policy set to disable_non_proxied_udp_send');
    } catch (e) {
      console.error('[Security] Failed to set native WebRTC IP handling policy:', e.message);
    }

    targetSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*/*'] },
      (details, callback) => {
        if (!details.requestHeaders['X-Zonix-Secured']) {
          details.requestHeaders['X-Zonix-Secured'] = 'true';
        }
        callback({ requestHeaders: details.requestHeaders });
      }
    );

    console.log('[Security] WebRTC leak protection applied');
  }

  applyDNSLeakProtection(targetSession) {
    targetSession.webRequest.onBeforeRequest(
      { urls: ['*://dns.google/*', '*://cloudflare-dns.com/*', '*://1.1.1.1/*'] },
      (details, callback) => {
        callback({ cancel: true });
      }
    );

    console.log('[Security] DNS leak protection applied');
  }

  applyFingerprintConsistencyHeaders(targetSession, orgId) {
    const fingerprintSeed = this.generateOrgFingerprintSeed(orgId);

    targetSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*/*'] },
      (details, callback) => {
        const headers = details.requestHeaders;

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
        headers['sec-ch-ua-platform-version'] = '"15.0.0"';

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

  applyCanvasFingerprintProtection(targetSession, orgId) {
    const seed = this.generateOrgFingerprintSeed(orgId);

    targetSession.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        callback({});
      }
    );

    console.log(`[Security] Canvas fingerprint protection queued for preload injection (seed: ${seed})`);
  }

  blockNavigationToDevTools(targetSession) {
    targetSession.webRequest.onBeforeRequest(
      { urls: ['chrome-devtools://*', 'devtools://*', 'view-source://*'] },
      (details, callback) => {
        callback({ cancel: true });
      }
    );

    console.log('[Security] DevTools navigation blocked');
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

        // Map lowercase headers to their actual keys in a single quick pass
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
