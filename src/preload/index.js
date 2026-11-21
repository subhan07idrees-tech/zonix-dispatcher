const { contextBridge, ipcRenderer } = require('electron');

(function redirectConsoleLogs() {
  try {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    function sendToMain(level, args) {
      try {
        const msg = args.map(arg => {
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg); } catch(e) { return String(arg); }
          }
          return String(arg);
        }).join(' ');
        ipcRenderer.send('log:write', { level, message: msg });
      } catch (e) {}
    }

    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].startsWith('[ZONIX')) {
        sendToMain('INFO', args);
      }
      originalLog.apply(console, args);
    };
    console.warn = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].startsWith('[ZONIX')) {
        sendToMain('WARN', args);
      }
      originalWarn.apply(console, args);
    };
    console.error = function(...args) {
      sendToMain('ERROR', args);
      originalError.apply(console, args);
    };
  } catch (e) {}
})();

(function injectLocalStorage() {
  try {
    const rawData = ipcRenderer.sendSync('get-session-local-storage');
    if (rawData && rawData !== '{}') {
      const data = JSON.parse(rawData);
      const keyCount = Object.keys(data).length;
      if (keyCount === 0) return;

      console.log(`[ZONIX LocalStorage] Initializing resilient storage wrapper for ${keyCount} keys.`);

      // 1. Initial seed of critical keys into standard storage
      if (window.localStorage) {
        for (const [k, v] of Object.entries(data)) {
          try {
            window.localStorage.setItem(k, v);
          } catch (e) {}
        }
      }

      // 1b. Seed directly into document main world context before any DAT scripts evaluate
      try {
        const injectScript = document.createElement('script');
        injectScript.textContent = `
          (function() {
            try {
              var tokens = ${JSON.stringify(data)};
              for (var key in tokens) {
                if (tokens.hasOwnProperty(key)) {
                  try { window.localStorage.setItem(key, tokens[key]); } catch(e) {}
                }
              }
            } catch(e) {}
          })();
        `;
        (document.head || document.documentElement).appendChild(injectScript);
        injectScript.remove();
      } catch (e) {}

      // 2. Wrap prototype methods to intercept reads, writes, and deletions dynamically.
      // This protects session tokens from being wiped by client-side clear/logout calls,
      // while still allowing the site to successfully read new/updated tokens.
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function(key) {
        if (this === window.localStorage && data.hasOwnProperty(key)) {
          const actualValue = originalGetItem.apply(this, arguments);
          // Fall back to captured token only if the actual store has been cleared or is empty
          return actualValue !== null && actualValue !== undefined ? actualValue : data[key];
        }
        return originalGetItem.apply(this, arguments);
      };

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === window.localStorage && data.hasOwnProperty(key)) {
          data[key] = value; // Update cache with fresh session token
        }
        return originalSetItem.apply(this, arguments);
      };

      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function(key) {
        if (this === window.localStorage && data.hasOwnProperty(key)) {
          console.warn(`[ZONIX LocalStorage] Preserved critical authentication key from deletion: ${key}`);
          return; // Block direct deletion of critical keys
        }
        return originalRemoveItem.apply(this, arguments);
      };

      const originalClear = Storage.prototype.clear;
      Storage.prototype.clear = function() {
        if (this === window.localStorage) {
          // Clear only non-critical keys
          const keysToRemove = [];
          for (let i = 0; i < this.length; i++) {
            const k = this.key(i);
            if (k && !data.hasOwnProperty(k)) {
              keysToRemove.push(k);
            }
          }
          for (const k of keysToRemove) {
            originalRemoveItem.call(this, k);
          }
          console.log(`[ZONIX LocalStorage] Intercepted clear(): preserved ${Object.keys(data).length} critical keys.`);
          return;
        }
        return originalClear.apply(this, arguments);
      };

      // 3. Define property wrappers for direct property access (e.g. localStorage.token)
      for (const key of Object.keys(data)) {
        try {
          Object.defineProperty(window.localStorage, key, {
            get: () => {
              const actualValue = originalGetItem.call(window.localStorage, key);
              return actualValue !== null && actualValue !== undefined ? actualValue : data[key];
            },
            set: (val) => {
              data[key] = val;
              originalSetItem.call(window.localStorage, key, val);
            },
            configurable: true,
            enumerable: true
          });
        } catch (e) {}
      }

      console.log('[ZONIX LocalStorage] Resilient storage active.');
    }
  } catch (err) {
    console.error('[ZONIX LocalStorage] Activation failed:', err.message);
  }
})();

try {
  const zonixBridge = {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    launchDispatch: (config) => ipcRenderer.invoke('dispatch:launch', config),
    killSession: (sessionId) => ipcRenderer.invoke('session:kill', sessionId),
    restartSession: (sessionId) => ipcRenderer.invoke('session:restart', sessionId),
    listSessions: () => ipcRenderer.invoke('sessions:list'),
    captureCookies: (args) => ipcRenderer.invoke('session:cookies:capture', args),
    launchCaptureWindow: (args) => ipcRenderer.invoke('session:cookies:capture', args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    getConfig: (key) => ipcRenderer.invoke('config:get', key),
    setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
    onSessionsUpdate: (callback) => ipcRenderer.on('sessions:update', (_, data) => callback(data)),
    onSessionWarning: (callback) => ipcRenderer.on('session:warning', (_, data) => callback(data)),
    onAlertProxy: (callback) => ipcRenderer.on('alert:proxy', (_, data) => callback(data)),
    onSyncStart: (callback) => ipcRenderer.on('sync:start', (_, data) => callback(data)),
    onSyncFailed: (callback) => ipcRenderer.on('sync:failed', (_, reason) => callback(reason)),
    retryCookieSync: () => ipcRenderer.send('sync:retry'),
    onProxyStatus: (callback) => ipcRenderer.on('proxy:status', (_, status) => callback(status)),
    onSessionPause: (callback) => ipcRenderer.on('session:pause', (_, data) => callback(data)),
    onSessionResume: (callback) => ipcRenderer.on('session:resume', (_, data) => callback(data)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    logoutDispatcher: () => ipcRenderer.invoke('dispatch:logout'),
    getSessionLocalStorage: (partitionId) => ipcRenderer.invoke('get-session-local-storage-async', { partitionId }),
    appVersion: ipcRenderer.sendSync('get-app-version')
  };

  contextBridge.exposeInMainWorld('zonixAPI', zonixBridge);

  // Expose API for update window & backward compatibility
  contextBridge.exposeInMainWorld('electronAPI', {
    ...zonixBridge,
    onUpdateInfo: (callback) => ipcRenderer.on('update:info', (_, data) => callback(data)),
    onDownloadProgress: (callback) => ipcRenderer.on('update:progress', (_, pct) => callback(pct)),
    onUpdateError: (callback) => ipcRenderer.on('update:error', (_, errText) => callback(errText)),
    startUpdate: () => ipcRenderer.send('update:start'),
    quitApp: () => ipcRenderer.send('update:quit')
  });
} catch (e) {
  console.error('[Preload] Failed to expose zonixAPI:', e);
}

(function injectFingerprintOverrides() {
  const FP_CONFIG = {
    ORG_FP_SEED: 42069,
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    PLATFORM: 'Win32',
    VENDOR: 'Google Inc.',
    LANGUAGES: ['en-US', 'en'],
    SCREEN_WIDTH: 1920,
    SCREEN_HEIGHT: 1080,
    SCREEN_AVAIL_WIDTH: 1920,
    SCREEN_AVAIL_HEIGHT: 1040,
    SCREEN_COLOR_DEPTH: 24,
    SCREEN_PIXEL_DEPTH: 24,
    DEVICE_PIXEL_RATIO: 1,
    HARDWARE_CONCURRENCY: 8,
    DEVICE_MEMORY: 8,
    MAX_TOUCH_POINTS: 0,
    WEBGL_VENDOR: 'Google Inc. (NVIDIA)',
    WEBGL_RENDERER: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0)',
    AUDIO_CONTEXT_SAMPLE_RATE: 44100
  };

  let fpSeed = 42069;
  try {
    const orgId = ipcRenderer.sendSync('get-session-org-id') || 'zonix-system';
    let seed = 0;
    for (let i = 0; i < orgId.length; i++) {
      seed = (seed << 5) - seed + orgId.charCodeAt(i);
      seed |= 0;
    }
    fpSeed = Math.abs(seed) || 42069;
  } catch (e) {
    console.error('[ZONIX FP] Failed to resolve dynamic seed:', e);
  }

  function seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generateDeterministicNoise(seed, length) {
    const rng = seededRandom(seed);
    const noise = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      noise[i] = (rng() - 0.5) * 0.0001;
    }
    return noise;
  }

  try {
    Object.defineProperty(Navigator.prototype, 'userAgent', {
      get: () => FP_CONFIG.USER_AGENT,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'platform', {
      get: () => FP_CONFIG.PLATFORM,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'vendor', {
      get: () => FP_CONFIG.VENDOR,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'languages', {
      get: () => Object.freeze([...FP_CONFIG.LANGUAGES]),
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'language', {
      get: () => FP_CONFIG.LANGUAGES[0],
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      get: () => FP_CONFIG.HARDWARE_CONCURRENCY,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'deviceMemory', {
      get: () => FP_CONFIG.DEVICE_MEMORY,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
      get: () => FP_CONFIG.MAX_TOUCH_POINTS,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: () => false,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'doNotTrack', {
      get: () => null,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ];
        plugins.length = 3;
        return plugins;
      },
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'mimeTypes', {
      get: () => {
        const mimeTypes = [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' }
        ];
        mimeTypes.length = 2;
        return mimeTypes;
      },
      configurable: true
    });

    const userAgentDataMock = {
      brands: [
        { brand: 'Not_A Brand', version: '8' },
        { brand: 'Chromium', version: '120' },
        { brand: 'Google Chrome', version: '120' }
      ],
      mobile: false,
      platform: 'Windows',
      getHighEntropyValues: async (hints) => {
        const values = {
          platform: 'Windows',
          platformVersion: '10.0.0',
          architecture: 'x86',
          model: '',
          uaFullVersion: '120.0.0.0',
          fullVersionList: [
            { brand: 'Not_A Brand', version: '8.0.0.0' },
            { brand: 'Chromium', version: '120.0.0.0' },
            { brand: 'Google Chrome', version: '120.0.0.0' }
          ]
        };
        const result = {};
        hints.forEach(hint => { result[hint] = values[hint] !== undefined ? values[hint] : ''; });
        return result;
      }
    };

    Object.defineProperty(Navigator.prototype, 'userAgentData', {
      get: () => userAgentDataMock,
      configurable: true
    });

    console.log('[ZONIX FP] Navigator properties overridden successfully');
  } catch (err) {
    console.error('[ZONIX FP] Navigator override failed:', err.message);
  }

  try {
    Object.defineProperty(screen, 'width', { get: () => FP_CONFIG.SCREEN_WIDTH, configurable: false });
    Object.defineProperty(screen, 'height', { get: () => FP_CONFIG.SCREEN_HEIGHT, configurable: false });
    Object.defineProperty(screen, 'availWidth', { get: () => FP_CONFIG.SCREEN_AVAIL_WIDTH, configurable: false });
    Object.defineProperty(screen, 'availHeight', { get: () => FP_CONFIG.SCREEN_AVAIL_HEIGHT, configurable: false });
    Object.defineProperty(screen, 'colorDepth', { get: () => FP_CONFIG.SCREEN_COLOR_DEPTH, configurable: false });
    Object.defineProperty(screen, 'pixelDepth', { get: () => FP_CONFIG.SCREEN_PIXEL_DEPTH, configurable: false });

    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => FP_CONFIG.DEVICE_PIXEL_RATIO,
      configurable: false
    });

    Object.defineProperty(window, 'outerWidth', {
      get: () => FP_CONFIG.SCREEN_WIDTH,
      configurable: false
    });

    Object.defineProperty(window, 'outerHeight', {
      get: () => FP_CONFIG.SCREEN_AVAIL_HEIGHT,
      configurable: false
    });

    console.log('[ZONIX FP] Screen properties overridden successfully');
  } catch (err) {
    console.error('[ZONIX FP] Screen override failed:', err.message);
  }

  try {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
      const context = originalGetContext.call(this, contextType, contextAttributes);

      if (contextType === '2d' && context) {
        const originalGetImageData = context.getImageData;
        context.getImageData = function(sx, sy, sw, sh) {
          const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
          const noise = generateDeterministicNoise(fpSeed, imageData.data.length);
          for (let i = 0; i < imageData.data.length; i++) {
            imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise[i] * 255));
          }
          return imageData;
        };

        const originalToDataURL = this.toDataURL;
        this.toDataURL = function() {
          const ctx = originalGetContext.call(this, '2d');
          if (ctx) {
            const imgData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
            const noise = generateDeterministicNoise(fpSeed, imgData.data.length);
            for (let i = 0; i < imgData.data.length; i++) {
              imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise[i] * 255));
            }
            ctx.putImageData(imgData, 0, 0);
          }
          return originalToDataURL.call(this);
        };

        const originalToBlob = this.toBlob;
        this.toBlob = function(callback, type, quality) {
          const ctx = originalGetContext.call(this, '2d');
          if (ctx) {
            const imgData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
            const noise = generateDeterministicNoise(fpSeed, imgData.data.length);
            for (let i = 0; i < imgData.data.length; i++) {
              imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise[i] * 255));
            }
            ctx.putImageData(imgData, 0, 0);
          }
          return originalToBlob.call(this, callback, type, quality);
        };
      }

      return context;
    };

    console.log('[ZONIX FP] Canvas fingerprint virtualization active');
  } catch (err) {
    console.error('[ZONIX FP] Canvas override failed:', err.message);
  }

  try {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      const gl = this;

      const UNMASKED_VENDOR_WEBGL = 0x9245;
      const UNMASKED_RENDERER_WEBGL = 0x9246;

      if (param === UNMASKED_VENDOR_WEBGL) {
        return FP_CONFIG.WEBGL_VENDOR;
      }
      if (param === UNMASKED_RENDERER_WEBGL) {
        return FP_CONFIG.WEBGL_RENDERER;
      }

      return originalGetParameter.call(this, param);
    };

    if (typeof WebGL2RenderingContext !== 'undefined') {
      const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(param) {
        const UNMASKED_VENDOR_WEBGL = 0x9245;
        const UNMASKED_RENDERER_WEBGL = 0x9246;

        if (param === UNMASKED_VENDOR_WEBGL) {
          return FP_CONFIG.WEBGL_VENDOR;
        }
        if (param === UNMASKED_RENDERER_WEBGL) {
          return FP_CONFIG.WEBGL_RENDERER;
        }

        return originalGetParameter2.call(this, param);
      };
    }

    console.log('[ZONIX FP] WebGL fingerprint virtualization active');
  } catch (err) {
    console.error('[ZONIX FP] WebGL override failed:', err.message);
  }

  try {
    const originalGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(channel) {
      const data = originalGetChannelData.call(this, channel);
      const noise = generateDeterministicNoise(fpSeed + channel, data.length);
      const modified = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        modified[i] = data[i] + noise[i];
      }
      return modified;
    };

    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    if (originalCreateOscillator) {
      AudioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.call(this);
        return oscillator;
      };
    }

    console.log('[ZONIX FP] AudioContext fingerprint protection active');
  } catch (err) {
    console.error('[ZONIX FP] AudioContext override failed:', err.message);
  }

  try {
    const originalDateTimeFormat = Intl.DateTimeFormat;
    const resolvedOptions = originalDateTimeFormat.prototype.resolvedOptions;

    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      const options = resolvedOptions.call(this);
      return Object.assign({}, options, {
        timeZone: 'America/New_York'
      });
    };

    console.log('[ZONIX FP] Timezone fingerprint protection active');
  } catch (err) {
    console.error('[ZONIX FP] Timezone override failed:', err.message);
  }

  try {
    Object.defineProperty(Navigator.prototype, 'webkitHardwareConcurrency', {
      get: () => FP_CONFIG.HARDWARE_CONCURRENCY,
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'webkitDeviceMemory', {
      get: () => FP_CONFIG.DEVICE_MEMORY,
      configurable: true
    });

    const originalGetBattery = navigator.getBattery;
    if (originalGetBattery) {
      navigator.getBattery = function() {
        return Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return true; }
        });
      };
    }

    console.log('[ZONIX FP] Battery API spoofed');
  } catch (err) {
    console.error('[ZONIX FP] Additional API override failed:', err.message);
  }

  try {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10.0,
        saveData: false,
        type: 'wifi'
      }),
      configurable: false
    });

    console.log('[ZONIX FP] Network Information API spoofed');
  } catch (err) {
    console.error('[ZONIX FP] Network info override failed:', err.message);
  }

  try {
    const getComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(element, pseudoElt) {
      const style = getComputedStyle.call(this, element, pseudoElt);
      return style;
    };
  } catch (err) {}

  console.log('[ZONIX FP] All fingerprint overrides initialized successfully');
})();

(function injectWebRTCProtection() {
  try {
    const originalRTCPeerConnection = window.RTCPeerConnection;
    if (originalRTCPeerConnection) {
      window.RTCPeerConnection = function(configuration, constraints) {
        const safeConfig = Object.assign({}, configuration);

        if (safeConfig.iceServers) {
          safeConfig.iceServers = safeConfig.iceServers.filter(server => {
            const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
            return urls.every(url => !url.includes('stun:') && !url.includes('stun.l.google.com'));
          });
        }

        if (!safeConfig.iceCandidatePoolSize) {
          safeConfig.iceCandidatePoolSize = 0;
        }

        return new originalRTCPeerConnection(safeConfig, constraints);
      };

      window.RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
      window.RTCPeerConnection.generateCertificate = originalRTCPeerConnection.generateCertificate;
    }

    const originalGetStats = RTCPeerConnection.prototype.getStats;
    if (originalGetStats) {
      RTCPeerConnection.prototype.getStats = function() {
        return originalGetStats.call(this).then(stats => {
          const filtered = new Map();
          stats.forEach((report) => {
            if (report.type !== 'local-candidate' && report.type !== 'remote-candidate') {
              filtered.set(report.id, report);
            }
          });
          return filtered;
        });
      };
    }

    console.log('[ZONIX FP] WebRTC leak protection active');
  } catch (err) {
    console.error('[ZONIX FP] WebRTC protection failed:', err.message);
  }
})();

(function injectPermissionSpoof() {
  try {
    const originalQuery = window.Permissions.prototype.query;
    window.Permissions.prototype.query = function(permissionDesc) {
      const name = permissionDesc.name || permissionDesc;

      const alwaysGranted = [
        'geolocation',
        'notifications',
        'push',
        'midi',
        'camera',
        'microphone',
        'accelerometer',
        'gyroscope',
        'magnetometer'
      ];

      if (alwaysGranted.includes(name)) {
        return Promise.resolve({ state: 'granted', onchange: null });
      }

      return originalQuery.call(this, permissionDesc);
    };

    if (window.Notification) {
      try {
        Object.defineProperty(window.Notification, 'permission', {
          get: () => 'granted',
          configurable: true
        });
        window.Notification.requestPermission = function(cb) {
          const res = Promise.resolve('granted');
          if (typeof cb === 'function') cb('granted');
          return res;
        };
      } catch (notifErr) {}
    }

    console.log('[ZONIX FP] Permission query spoofing active');
  } catch (err) {
    console.error('[ZONIX FP] Permission spoof failed:', err.message);
  }
})();

(function preventFingerprintLeakage() {
  try {
    const definedProps = new Set();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
            if (node.textContent && node.textContent.includes('fingerprint')) {
              node.textContent = '/* ZONIX: blocked */';
            }
          }
        }
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.documentElement, { childList: true, subtree: true });
      });
    }

    console.log('[ZONIX FP] Fingerprint script injection monitor active');
  } catch (err) {
    console.error('[ZONIX FP] Script monitor failed:', err.message);
  }
})();

// Sidebar and Link Lockdown for DAT One
(function applyDATLockdown() {
  try {
    if (!window.location.hostname.includes('dat.com')) {
      return;
    }

    // 1. Inject custom CSS rules to block clicking broker profile links
    const style = document.createElement('style');
    style.id = 'zonix-dat-lockdown-css';
    style.innerHTML = `
      /* Disable clicking on broker profile links or search directories in the loads list */
      a[href*="/directory/"], a[href*="/profile/"], a[href*="/broker/"], [class*="company"] a, [class*="broker"] a {
        pointer-events: none !important;
        cursor: default !important;
        text-decoration: none !important;
        color: inherit !important;
      }
    `;
    
    const insertStyle = () => {
      if (document.head && !document.getElementById('zonix-dat-lockdown-css')) {
        document.head.appendChild(style);
      }
    };

    if (document.head) {
      insertStyle();
    } else {
      document.addEventListener('DOMContentLoaded', insertStyle);
    }

    // Document-Level Event Capture Delegation: Immediately intercepts and blocks email/phone/contact links and restricted sidebar menus at the root
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;

      // Fast-Path Guard: Never thrash DOM layout or intercept clicks inside load data tables, rows, filters, search tabs, alarms, native/custom copy buttons, or icons
      if (target.closest('[role="grid"], [role="row"], table, tr, td, [class*="table" i], [class*="row" i], [class*="load" i], [class*="pane" i], [role="tab"], [class*="tab" i], [class*="alarm" i], [aria-label*="alarm" i], [title*="alarm" i], [aria-label*="notification" i], [title*="notification" i], [class*="copy" i], [aria-label*="copy" i], [title*="copy" i], .zonix-quick-copy-btn, .zonix-load-details-btn, .zonix-row-copy-btn, mat-icon, svg, button')) {
        return;
      }

      const clickable = target.closest('a, button, [role="button"], [class*="company"], [class*="broker"], [class*="menu"], [class*="item"], [class*="nav"], li');
      if (!clickable) return;

      const href = (clickable.getAttribute('href') || '').toLowerCase();
      const rawText = (clickable.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();

      // Block restricted menu items (Support, My Account, Sign Out, Account Info, Privacy Policy, Terms, etc.) at the click root
      const menuBlockList = [
        'support',
        'my account',
        'account information',
        'privacy policy',
        'terms and conditions',
        'sign out',
        'signout',
        'log out',
        'logout',
        'dashboard',
        'my trucks',
        'my loads',
        'private network',
        'tools',
        'account notifications',
        'account settings',
        'user profile',
        'help center'
      ];

      for (const label of menuBlockList) {
        if (rawText === label || rawText.startsWith(label) || (rawText.includes(label) && rawText.length < label.length + 15)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          clickable.style.setProperty('display', 'none', 'important');
          clickable.style.setProperty('pointer-events', 'none', 'important');
          return false;
        }
      }

      // Check email match
      const emailMatch = (href + ' ' + rawText).match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      if (href.startsWith('mailto:') || href.includes('mailto:') || emailMatch) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const emailToCopy = emailMatch ? emailMatch[0] : href.replace('mailto:', '');
        if (emailToCopy) {
          safeCopyToClipboard(emailToCopy);
        }
        return false;
      }

      // Check phone match (e.g. 800-580-3101, (469) 505-0875)
      const phoneMatch = (href + ' ' + rawText).match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (href.startsWith('tel:') || href.includes('tel:') || (phoneMatch && (clickable.tagName === 'A' || clickable.tagName === 'BUTTON' || href.length > 0))) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const phoneToCopy = phoneMatch ? phoneMatch[0] : href.replace('tel:', '');
        if (phoneToCopy) {
          safeCopyToClipboard(phoneToCopy);
        }
        return false;
      }

      if (href.includes('/directory/') || href.includes('/profile/') || href.includes('/broker/')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }, true);

    // List of DAT menu items we want to hide to restrict dispatchers to "Search Loads" only
    const blockLabels = [
      'dashboard',
      'my trucks',
      'my loads',
      'private network',
      'tools',
      'support',
      'my account',
      'account notifications',
      'account settings',
      'user profile',
      'help center',
      'account information',
      'privacy policy',
      'terms and conditions',
      'sign out',
      'signout',
      'log out',
      'logout'
    ];

    const getCopySVG = (color = '#64748b') => `
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    const getCheckSVG = () => `
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

    const fallbackCopyText = (text) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        console.error('[ZONIX] Fallback copy failed:', err);
        return false;
      }
    };

    function tryBrowserCopy(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopyText(text));
      }
      return Promise.resolve(fallbackCopyText(text));
    }

    function safeCopyToClipboard(text) {
      if (!text) return Promise.resolve(false);
      // 1. Direct OS-Level Clipboard Bridge via Electron IPC (100% reliable)
      try {
        if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
          return ipcRenderer.invoke('zonix:clipboard-write', text).then((res) => {
            if (res) return true;
            return tryBrowserCopy(text);
          }).catch(() => tryBrowserCopy(text));
        }
      } catch (e) {}
      return tryBrowserCopy(text);
    }

    // Proxy navigator.clipboard.writeText so DAT One's native blue copy icons also write to OS clipboard via IPC
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        const origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = function(text) {
          if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
            ipcRenderer.invoke('zonix:clipboard-write', text).catch(() => {});
          }
          return origWrite(text).catch(() => Promise.resolve());
        };
      }
    } catch (e) {}

    const eqMap = {
      'V': 'Van',
      'SV': 'Sprinter Van',
      'SB': 'Straight Box Truck',
      'VR': 'Van / Reefer',
      'R': 'Reefer',
      'F': 'Flatbed',
      'SD': 'Step Deck',
      'HS': 'Hotshot',
      'PO': 'Power Only',
      'AUTO': 'Auto Carrier'
    };

    const parseLoadFromRowAndDrawer = (rowText, drawerText = '') => {
      const combinedText = (rowText + '\n' + drawerText).replace(/\r\n/g, '\n');
      const cleanRow = (rowText || '').replace(/\s+/g, ' ');

      // 1. Origin & Destination
      const cityStateRegex = /\b([A-Za-z\s\.\'-]{2,30}),\s*([A-Za-z]{2})\b/g;
      const locs = [];
      let m;
      while ((m = cityStateRegex.exec(cleanRow)) !== null) {
        locs.push(m[0].trim());
        if (locs.length >= 2) break;
      }
      if (locs.length < 2 && drawerText) {
        cityStateRegex.lastIndex = 0;
        while ((m = cityStateRegex.exec(drawerText)) !== null) {
          if (!locs.includes(m[0].trim())) locs.push(m[0].trim());
          if (locs.length >= 2) break;
        }
      }
      const origin = locs[0] || '';
      const dest = locs[1] || '';

      // 2. Miles: Trip & Deadhead
      const tripMatch = cleanRow.match(/\b(\d{1,4})\s+(?:[A-Za-z\s\.\'-]{2,30},\s*[A-Za-z]{2})/) ||
                        combinedText.match(/Loaded\s*miles[\s\n\r]*(\d[\d,]*\s*mi)/i) ||
                        combinedText.match(/(\d[\d,]*)\s*trip/i);
      const tripMiles = tripMatch ? parseInt(tripMatch[1], 10) : null;
      const dhMatch = cleanRow.match(/\((\d{1,4})\)/) ||
                      combinedText.match(/Deadhead[\s\n\r]*(\d[\d,]*\s*mi)/i) ||
                      combinedText.match(/\+?(\d[\d,]*)\s*DH/i);
      const dhMiles = dhMatch ? parseInt(dhMatch[1], 10) : null;

      let milesStr = '';
      if (tripMiles) {
        if (dhMiles) {
          const total = tripMiles + dhMiles;
          milesStr = `${total} mi total (${tripMiles} mi trip + ${dhMiles} mi DH-O)`;
        } else {
          milesStr = `${tripMiles} mi trip`;
        }
      } else {
        const totalMatch = combinedText.match(/(\d[\d,]*)\s*mi\s*(?:total|\[([^\]]+)\])/i) || combinedText.match(/(\d[\d,]*)\s*mi/i);
        if (totalMatch) milesStr = totalMatch[1] + ' mi';
      }

      // 3. Rate & Rate per mile
      let rateStr = 'Not Listed / Negotiable';
      const rateMatch = cleanRow.match(/\$([\d,]+)(?:\s*\$([\d\.]+)\/mi)?/) ||
                        combinedText.match(/Total\s*Pay[\s\n\r]*\$([\d,]+)/i) ||
                        combinedText.match(/Posted\s*rate[\s\n\r]*\$([\d,]+)/i);
      if (rateMatch) {
        rateStr = '$' + rateMatch[1];
        if (rateMatch[2]) {
          rateStr += ' ($' + rateMatch[2] + '/mi)';
        } else {
          const rpmMatch = combinedText.match(/Rate\s*\/\s*Mile[^\$\n\r]*\$([\d\.]+)\/mi/i);
          if (rpmMatch) rateStr += ' ($' + rpmMatch[1] + '/mi)';
        }
      }

      // 4. Equipment
      const lengthMatch = cleanRow.match(/\b(\d{1,2})\s*ft\b/i) || combinedText.match(/Length[\s\n\r]+([^\n\r]+)/i);
      const weightMatch = cleanRow.match(/\b([\d,]+)\s*lbs\b/i) || combinedText.match(/Weight[\s\n\r]+([^\n\r]+)/i);
      const capMatch = cleanRow.match(/\b(Full|Partial)\b/i) || combinedText.match(/(?:^|\n)\s*Load[\s\n\r]+(Full|Partial)/i);
      
      let eqType = '';
      const eqTokens = ['SV', 'SB', 'VR', 'V', 'R', 'F', 'SD', 'HS', 'PO', 'AUTO'];
      for (const token of eqTokens) {
        const r = new RegExp(`\\b${token}\\b`);
        if (r.test(cleanRow)) {
          eqType = eqMap[token] || token;
          break;
        }
      }
      if (!eqType && drawerText) {
        const truckMatch = drawerText.match(/Truck[\s\n\r]+([^\n\r]+)/i);
        if (truckMatch && truckMatch[1].trim() !== '-') eqType = truckMatch[1].trim();
      }

      const eqParts = [];
      if (eqType) eqParts.push(eqType);
      if (lengthMatch) eqParts.push(lengthMatch[0] ? lengthMatch[0].trim() : lengthMatch[1].trim());
      if (weightMatch) eqParts.push(weightMatch[0] ? weightMatch[0].trim() : weightMatch[1].trim());
      if (capMatch) eqParts.push(capMatch[0] ? capMatch[0].trim() : capMatch[1].trim());
      const equipStr = eqParts.join(' | ');

      // 5. Pickup Date (Strict calendar month / MM/DD format, never lbs/ft)
      let puDate = '';
      const dateMatch = cleanRow.match(/\b(\d{1,2}\/\d{1,2}(?:\s*-\s*\d{1,2}\/\d{1,2})?)\b/) ||
                        cleanRow.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}(?:\s*-\s*(?:[A-Za-z]{3}\s*)?\d{1,2})?)\b/i) ||
                        drawerText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}(?:\s*-\s*(?:[A-Za-z]{3}\s*)?\d{1,2})?)\b/i);
      if (dateMatch) {
        puDate = dateMatch[1].trim();
      }

      // 6. Comments & Commodity (From Drawer or Row)
      const commentsMatch = drawerText.match(/COMMENTS[\s\n\r]+([^\n\r]+)/i) || cleanRow.match(/Comments?[:\s]+([^\n\r]+)/i);
      const commMatch = drawerText.match(/Commodity[\s\n\r]+([^\n\r]+)/i);
      const refMatch = drawerText.match(/Reference\s*ID[\s\n\r]+([^\n\r]+)/i) || cleanRow.match(/Ref\s*(?:ID|#)?[:\s]*([A-Za-z0-9]+)/i);
      
      const commentItems = [];
      if (commMatch && commMatch[1].trim() !== '-') commentItems.push(commMatch[1].trim());
      if (commentsMatch && commentsMatch[1].trim() !== '-') commentItems.push(commentsMatch[1].trim());
      if (refMatch && refMatch[1].trim() !== '-') commentItems.push('Ref ID: ' + refMatch[1].trim());

      // Strict privacy sanitizer on comments (zero company/phone/email/MC leaks)
      const sanitizedComments = commentItems.map(c => {
        return c
          .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '')
          .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '')
          .replace(/\b(?:MC|DOT)\s*#?\s*\d+\b/gi, '')
          .replace(/\b\d+\s*(?:CS|DTP)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }).filter(Boolean);

      // Assemble final payload
      const lines = [];
      if (origin && dest) lines.push(`📍 Lane: ${origin} ➔ ${dest}`);
      if (milesStr) lines.push(`🛣️ Miles: ${milesStr}`);
      if (rateStr) lines.push(`💵 Rate: ${rateStr}`);
      if (equipStr) lines.push(`🚛 Equipment: ${equipStr}`);
      if (puDate) lines.push(`📅 Date: ${puDate}`);
      if (sanitizedComments.length > 0) lines.push(`📝 Comments: ${sanitizedComments.join(' | ')}`);

      return lines.join('\n');
    };

    const createStyledCopyButton = (getTextFn, titleText) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zonix-quick-copy-btn';
      btn.title = titleText;
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        border-radius: 4px;
        padding: 0;
        margin-left: 6px;
        width: 20px;
        height: 20px;
        vertical-align: middle;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        transition: all 0.15s ease-in-out;
        flex-shrink: 0;
        box-sizing: border-box;
      `;
      
      btn.innerHTML = getCopySVG('#64748b');
      
      btn.addEventListener('mouseenter', () => {
        if (!btn.dataset.copied) {
          btn.style.background = '#ffffff';
          btn.style.borderColor = '#cbd5e1';
          btn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.06)';
          btn.innerHTML = getCopySVG('#2447d6');
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (!btn.dataset.copied) {
          btn.style.background = '#f8fafc';
          btn.style.borderColor = '#e2e8f0';
          btn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
          btn.innerHTML = getCopySVG('#64748b');
        }
      });
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const text = btn._getTextFn ? btn._getTextFn() : getTextFn();
        safeCopyToClipboard(text).then((success) => {
          if (!success) return;
          btn.dataset.copied = 'true';
          btn.innerHTML = getCheckSVG();
          btn.style.borderColor = '#86efac';
          btn.style.background = '#f0fdf4';
          btn.style.boxShadow = '0 1px 2px rgba(22, 163, 74, 0.1)';
          
          setTimeout(() => {
            delete btn.dataset.copied;
            btn.innerHTML = getCopySVG('#64748b');
            btn.style.borderColor = '#e2e8f0';
            btn.style.background = '#f8fafc';
            btn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
          }, 1200);
        });
      });
      
      btn._getTextFn = getTextFn;
      return btn;
    };

    let isMutatingOurself = false;

    const applyLockdownPass = () => {
      try {
        isMutatingOurself = true;

        // Hide sidebar/menu items - fast textContent scanning without layout thrashing
        const selectors = 'nav a, nav button, nav li, header a, header button, footer a, footer button, footer li, aside a, aside button, aside li, [role="navigation"] a, [role="navigation"] button, [class*="sidebar"] a, [class*="sidebar"] button, [class*="sidebar"] li, [class*="drawer"] a, [class*="drawer"] button, [class*="footer"] a, [class*="footer"] button, [class*="account"] a, [class*="account"] button';
        const elements = document.querySelectorAll(selectors);
        
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (el.dataset.zonixBlocked === 'true' || el.dataset.zonixChecked === 'true' || el.style.display === 'none') continue;
          
          // Guard: Never touch copy buttons, details view, search bars, filters, forms, tabs, alarms, or data tables
          if (el.classList.contains('zonix-load-details-btn') || el.classList.contains('zonix-row-copy-btn') || el.classList.contains('zonix-quick-copy-btn') || el.closest('form, [class*="search"], [class*="filter"], [class*="table"], [role="table"], [role="grid"], [role="tab"], [class*="tab"], [class*="alarm"], [class*="detail" i]')) {
            el.dataset.zonixChecked = 'true';
            continue;
          }

          const text = (el.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
          if (!text) continue;

          let matched = false;
          for (let j = 0; j < blockLabels.length; j++) {
            const label = blockLabels[j];
            if (text === label || text === label + 's' || text.startsWith(label + ' ') || text.endsWith(' ' + label)) {
              el.dataset.zonixBlocked = 'true';
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('pointer-events', 'none', 'important');
              if (el.parentElement && (el.parentElement.tagName === 'LI' || el.parentElement.classList.toString().includes('item'))) {
                el.parentElement.dataset.zonixBlocked = 'true';
                el.parentElement.style.setProperty('display', 'none', 'important');
                el.parentElement.style.setProperty('pointer-events', 'none', 'important');
              }
              matched = true;
              break;
            }
          }
          if (!matched) {
            el.dataset.zonixChecked = 'true';
          }
        }

      // Intercept and manage mailto: links (copies email on click, cancels mail client, removes duplicate quick-copy buttons)
      const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
      mailtoLinks.forEach(link => {
        if (!link.dataset.hooked) {
          link.dataset.hooked = 'true';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const email = (link.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0].trim();
            if (email) safeCopyToClipboard(email);
          }, true);
          link.style.setProperty('cursor', 'pointer', 'important');
        }

        const parent = link.parentNode;
        if (parent) {
          const dupBtn = parent.querySelector('.zonix-quick-copy-btn');
          if (dupBtn) dupBtn.remove();
        }
      });

      // Remove any lingering duplicate quick-copy buttons across the view
      document.querySelectorAll('.zonix-quick-copy-btn').forEach(b => b.remove());

      // 1. Inject Micro-Copy Button on EVERY Table Row in Search Results (Zero layout shift, 60fps)
      (() => {
        const rows = document.querySelectorAll('tr, [role="row"], dat-table-row, [class*="load-row" i], [class*="table-row" i], [class*="cdk-row" i], [class*="dat-row" i]');
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          if (row.closest('thead') || row.querySelector('th, [role="columnheader"]')) continue;
          if (row.querySelector('.zonix-row-copy-btn')) continue;

          // Target the first cell (Checkbox / Action cell) so no data columns (Lane, Rate, Miles) get squished
          const cells = Array.from(row.querySelectorAll('td, [role="cell"], [class*="cell" i]'));
          if (cells.length === 0) continue;

          const targetCell = cells[0];
          if (!targetCell) continue;

          const copyBtn = document.createElement('button');
          copyBtn.type = 'button';
          copyBtn.className = 'zonix-row-copy-btn';
          copyBtn.title = 'Copy Load Details';
          copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
          copyBtn.style.cssText = `
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            min-height: 18px !important;
            padding: 0 !important;
            margin-left: 6px !important;
            background: #ffffff !important;
            color: #0284c7 !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            vertical-align: middle !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
            transition: all 0.15s ease-in-out !important;
            flex-shrink: 0 !important;
            box-sizing: border-box !important;
            z-index: 5 !important;
          `;

          copyBtn.addEventListener('mouseenter', () => {
            if (!copyBtn.dataset.copied) {
              copyBtn.style.setProperty('background', '#f0f9ff', 'important');
              copyBtn.style.setProperty('border-color', '#38bdf8', 'important');
              copyBtn.style.setProperty('color', '#0369a1', 'important');
            }
          });
          copyBtn.addEventListener('mouseleave', () => {
            if (!copyBtn.dataset.copied) {
              copyBtn.style.setProperty('background', '#ffffff', 'important');
              copyBtn.style.setProperty('border-color', '#cbd5e1', 'important');
              copyBtn.style.setProperty('color', '#0284c7', 'important');
            }
          });

          copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const detailsDrawer = document.querySelector('[class*="detail" i], [class*="drawer" i], [class*="pane" i], mat-drawer');
            const drawerText = detailsDrawer ? (detailsDrawer.innerText || detailsDrawer.textContent || '') : '';
            const rowText = row.innerText || row.textContent || '';
            const formattedText = parseLoadFromRowAndDrawer(rowText, drawerText);

            if (!formattedText) return;

            safeCopyToClipboard(formattedText).then(() => {
              copyBtn.dataset.copied = 'true';
              copyBtn.style.setProperty('background', '#f0fdf4', 'important');
              copyBtn.style.setProperty('border-color', '#86efac', 'important');
              copyBtn.style.setProperty('color', '#16a34a', 'important');
              copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              `;
              setTimeout(() => {
                delete copyBtn.dataset.copied;
                copyBtn.style.setProperty('background', '#ffffff', 'important');
                copyBtn.style.setProperty('border-color', '#cbd5e1', 'important');
                copyBtn.style.setProperty('color', '#0284c7', 'important');
                copyBtn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                `;
              }, 1200);
            });
          });

          targetCell.appendChild(copyBtn);
        }
      })();

      // 2. Inject Compact Copy Button in Load Details Drawer Header (When drawer is open)
      (() => {
        const cityStateRegex = /\b[A-Za-z\s\.\'-]{2,35},\s*[A-Za-z]{2}\b/gi;
        const candidates = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="header" i], [class*="title" i], [class*="lane" i], [class*="summary" i], [class*="details" i], div');
        
        let targetHeader = null;
        for (let i = 0; i < candidates.length; i++) {
          const el = candidates[i];
          if (el.closest('[role="grid"], [role="row"], table, thead, tbody, tr, td, th, dat-table-row')) continue;

          const text = (el.textContent || '').trim();
          if (text.length < 15 || text.length > 200) continue;
          if (!/mi|dh/i.test(text)) continue;

          cityStateRegex.lastIndex = 0;
          const locMatches = text.match(cityStateRegex);
          if (!locMatches || locMatches.length < 2) continue;

          const hasDeeperMatch = Array.from(el.children).some(child => {
            const ct = (child.textContent || '').trim();
            if (ct.length >= 15 && ct.length <= 200 && /mi|dh/i.test(ct)) {
              cityStateRegex.lastIndex = 0;
              const cm = ct.match(cityStateRegex);
              return cm && cm.length >= 2;
            }
            return false;
          });

          if (!hasDeeperMatch) {
            targetHeader = el;
            break;
          }
        }

        if (targetHeader && !targetHeader.querySelector('.zonix-load-details-btn')) {
          const detailsBtn = document.createElement('button');
          detailsBtn.type = 'button';
          detailsBtn.className = 'zonix-load-details-btn';
          detailsBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: middle; margin-right: 4px;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          `;
          detailsBtn.style.cssText = `
            display: inline-flex !important;
            align-items: center !important;
            background: #ffffff !important;
            color: #0284c7 !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            padding: 2px 7px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            font-family: inherit !important;
            cursor: pointer !important;
            margin-left: 10px !important;
            vertical-align: middle !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
            transition: all 0.15s ease-in-out !important;
            line-height: 1.2 !important;
            flex-shrink: 0 !important;
            z-index: 999999 !important;
            pointer-events: auto !important;
          `;

          detailsBtn.addEventListener('mouseenter', () => {
            if (!detailsBtn.dataset.copied) {
              detailsBtn.style.setProperty('background', '#f0f9ff', 'important');
              detailsBtn.style.setProperty('border-color', '#38bdf8', 'important');
            }
          });
          detailsBtn.addEventListener('mouseleave', () => {
            if (!detailsBtn.dataset.copied) {
              detailsBtn.style.setProperty('background', '#ffffff', 'important');
              detailsBtn.style.setProperty('border-color', '#cbd5e1', 'important');
            }
          });

          detailsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            let paneRoot = targetHeader;
            for (let p = 0; p < 8; p++) {
              if (!paneRoot.parentElement || paneRoot.parentElement === document.body) break;
              paneRoot = paneRoot.parentElement;
              if (paneRoot.matches && paneRoot.matches('[class*="detail" i], [class*="drawer" i], [class*="pane" i], mat-drawer')) {
                break;
              }
            }

            const formattedText = parseLoadFromRowAndDrawer('', paneRoot.innerText || paneRoot.textContent || '');
            if (!formattedText) return;

            safeCopyToClipboard(formattedText).then(() => {
              detailsBtn.dataset.copied = 'true';
              detailsBtn.style.setProperty('background', '#f0fdf4', 'important');
              detailsBtn.style.setProperty('border-color', '#86efac', 'important');
              detailsBtn.style.setProperty('color', '#16a34a', 'important');
              detailsBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: middle; margin-right: 4px;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>
              `;
              setTimeout(() => {
                delete detailsBtn.dataset.copied;
                detailsBtn.style.setProperty('background', '#ffffff', 'important');
                detailsBtn.style.setProperty('border-color', '#cbd5e1', 'important');
                detailsBtn.style.setProperty('color', '#0284c7', 'important');
                detailsBtn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: middle; margin-right: 4px;">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy</span>
                `;
              }, 1200);
            });
          });

          targetHeader.appendChild(detailsBtn);
        }
      })();

      // Clean up any lingering location copy buttons
      document.querySelectorAll('.zonix-route-copy-btn').forEach(b => b.remove());

      // Dashboard Page Lockdown
      const isDashboard = window.location.pathname.includes('/dashboard') || 
                          window.location.hash.includes('/dashboard') || 
                          (document.querySelector('h1')?.textContent === 'Dashboard');
                          
      if (isDashboard) {
        const interactiveElements = document.querySelectorAll('a, button, [role="button"], [class*="card"], [class*="button"]');
        interactiveElements.forEach(el => {
          const inModal = el.closest('[role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="dialog"], [class*="popup"], [class*="overlay"]');
          if (inModal) {
            el.style.setProperty('pointer-events', 'auto', 'important');
            el.style.setProperty('opacity', '1', 'important');
            return;
          }

          const text = (el.textContent || '').toLowerCase().trim();
          if (text.includes('search loads')) {
            el.style.setProperty('pointer-events', 'auto', 'important');
            el.style.setProperty('opacity', '1', 'important');
            el.style.setProperty('display', 'inline-flex', 'important');
          } else {
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('opacity', '0.3', 'important');
          }
        });
      }
      } catch (err) {
        console.error('[ZONIX] Lockdown pass error:', err.message);
      } finally {
        Promise.resolve().then(() => {
          isMutatingOurself = false;
        });
      }
    };

    // Debounced Native Scheduler (Zero CPU overhead, batches DOM checks)
    let debounceTimer = null;
    const scheduleLockdownPass = () => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        applyLockdownPass();
      }, 200);
    };

    // Real-Time MutationObserver - triggers only when new elements are inserted into the DOM
    const observer = new MutationObserver((mutations) => {
      if (isMutatingOurself) return;
      let hasAdded = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          hasAdded = true;
          break;
        }
      }
      if (hasAdded) {
        scheduleLockdownPass();
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    document.addEventListener('DOMContentLoaded', applyLockdownPass);
    setInterval(scheduleLockdownPass, 3000);

    console.log('[ZONIX] DAT One real-time interface lockdown engine active');
  } catch (err) {
    console.error('[ZONIX] DAT lockdown engine error:', err.message);
  }
})();

// Guest Viewport Zoom Interceptor (Forwards keyboard/wheel shortcuts to host webview)
(function initGuestZoomShortcutInterceptor() {
  try {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd') {
          e.preventDefault();
          e.stopPropagation();
          if (ipcRenderer && typeof ipcRenderer.sendToHost === 'function') {
            ipcRenderer.sendToHost('zonix:zoom-in');
          }
        } else if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          e.stopPropagation();
          if (ipcRenderer && typeof ipcRenderer.sendToHost === 'function') {
            ipcRenderer.sendToHost('zonix:zoom-out');
          }
        } else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
          e.preventDefault();
          e.stopPropagation();
          if (ipcRenderer && typeof ipcRenderer.sendToHost === 'function') {
            ipcRenderer.sendToHost('zonix:zoom-reset');
          }
        }
      }
    }, true);

    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        if (ipcRenderer && typeof ipcRenderer.sendToHost === 'function') {
          if (e.deltaY < 0) {
            ipcRenderer.sendToHost('zonix:zoom-in');
          } else if (e.deltaY > 0) {
            ipcRenderer.sendToHost('zonix:zoom-out');
          }
        }
      }
    }, { passive: false, capture: true });

    console.log('[ZONIX] Guest viewport zoom shortcut handler ready');
  } catch (err) {
    console.error('[ZONIX] Guest zoom shortcut interceptor error:', err.message);
  }
})();

