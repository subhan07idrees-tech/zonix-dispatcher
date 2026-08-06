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
      sendToMain('INFO', args);
      originalLog.apply(console, args);
    };
    console.warn = function(...args) {
      sendToMain('WARN', args);
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

if (window.location.protocol === 'file:') {
  const zonixBridge = {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    launchDispatch: (config) => ipcRenderer.invoke('dispatch:launch', config),
    killSession: (sessionId) => ipcRenderer.invoke('session:kill', sessionId),
    restartSession: (sessionId) => ipcRenderer.invoke('session:restart', sessionId),
    listSessions: () => ipcRenderer.invoke('sessions:list'),
    captureCookies: (args) => ipcRenderer.invoke('session:cookies:capture', args),
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

      if (name === 'notifications') {
        return Promise.resolve({ state: Notification.permission || 'default', onchange: null });
      }

      return originalQuery.call(this, permissionDesc);
    };

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

      const clickable = target.closest('a, button, [role="button"], [class*="company"], [class*="broker"], [class*="menu"], [class*="item"], [class*="nav"], li, div');
      if (!clickable) return;

      const href = (clickable.getAttribute('href') || '').toLowerCase();
      const rawText = (clickable.innerText || clickable.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();

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
        'notifications',
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
          navigator.clipboard.writeText(emailToCopy).catch(() => {});
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
          navigator.clipboard.writeText(phoneToCopy).catch(() => {});
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
      'notifications',
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

    const getCopySVG = (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    const getCheckSVG = () => `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

    const createStyledCopyButton = (getTextFn, titleText) => {
      const btn = document.createElement('button');
      btn.className = 'zonix-quick-copy-btn';
      btn.title = titleText;
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 1px solid #334155;
        background: #1e293b;
        border-radius: 4px;
        padding: 4px;
        margin-left: 6px;
        width: 22px;
        height: 22px;
        vertical-align: middle;
        transition: all 0.2s ease;
      `;
      
      btn.innerHTML = getCopySVG('#94a3b8');
      
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#334155';
        btn.style.borderColor = '#475569';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#1e293b';
        btn.style.borderColor = '#334155';
      });
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const text = getTextFn();
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = getCheckSVG();
          btn.style.borderColor = '#10b981';
          btn.style.background = '#064e3b';
          
          setTimeout(() => {
            btn.innerHTML = getCopySVG('#94a3b8');
            btn.style.borderColor = '#334155';
            btn.style.background = '#1e293b';
          }, 1000);
        }).catch(err => {
          console.error('[ZONIX] Copy failed:', err);
        });
      });
      
      return btn;
    };

    const applyLockdownPass = () => {
      // Hide sidebar/menu items - expanded scanning including drawer/footer elements
      const selectors = 'nav a, nav button, nav li, header a, header button, footer a, footer button, footer li, aside a, aside button, aside li, [role="navigation"] a, [role="navigation"] button, [class*="sidebar"] a, [class*="sidebar"] button, [class*="sidebar"] li, [class*="drawer"] a, [class*="drawer"] button, [class*="footer"] a, [class*="footer"] button, [class*="account"] a, [class*="account"] button';
      const elements = Array.from(document.querySelectorAll(selectors));
      
      elements.forEach(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!text) return;
        
        blockLabels.forEach(label => {
          if (text === label || text.startsWith(label) || (text.includes(label) && text.length < label.length + 15)) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            if (el.parentElement && (el.parentElement.tagName === 'LI' || el.parentElement.classList.toString().includes('item'))) {
              el.parentElement.style.setProperty('display', 'none', 'important');
              el.parentElement.style.setProperty('pointer-events', 'none', 'important');
            }
          }
        });
      });

      // Intercept and cancel clicks on mailto: links & inject Copy Email button
      const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
      mailtoLinks.forEach(link => {
        if (!link.dataset.hooked) {
          link.dataset.hooked = 'true';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
          }, true);
          link.style.setProperty('pointer-events', 'none', 'important');
          link.style.setProperty('cursor', 'default', 'important');
          link.style.setProperty('text-decoration', 'none', 'important');
        }

        // Inject Copy Button next to the email address
        if (!link.parentNode.querySelector('.zonix-quick-copy-btn')) {
          const emailText = link.getAttribute('href').replace('mailto:', '');
          const copyBtn = createStyledCopyButton(() => emailText, 'Copy Email Address');
          link.parentNode.insertBefore(copyBtn, link.nextSibling);
        }
      });

      // Inject Route Copy Button ONLY in the Detail Header
      (() => {
        const viewRouteBtn = Array.from(document.querySelectorAll('button, a')).find(el => {
          const t = (el.textContent || '').trim().toUpperCase();
          return t === 'VIEW ROUTE' || t === 'VIEW MAP';
        });
        if (!viewRouteBtn) return; // No details pane open - do nothing

        let sectionEl = viewRouteBtn;
        for (let i = 0; i < 8; i++) {
          if (!sectionEl.parentElement || sectionEl.parentElement === document.body) break;
          sectionEl = sectionEl.parentElement;
        }

        const cityStateRegex = /([A-Za-z][A-Za-z\s\.\'-]*),\s*([A-Za-z]{2})(?:\s|$)/g;
        const allEls = Array.from(sectionEl.querySelectorAll('h1, h2, h3, h4, [class*="header"], [class*="title"], [class*="heading"]'));
        const directChildren = Array.from(sectionEl.children).slice(0, 3);
        const candidates = [...allEls, ...directChildren];

        for (const el of candidates) {
          if (el.querySelector('.zonix-route-copy-btn') || el.querySelector('.zonix-quick-copy-btn')) continue;

          const rawText = (el.textContent || '').trim();
          if (rawText.length < 5 || rawText.length > 200) continue;

          cityStateRegex.lastIndex = 0;
          const matches = [];
          let m;
          while ((m = cityStateRegex.exec(rawText)) !== null) {
            const loc = `${m[1].trim()}, ${m[2].trim().toUpperCase()}`;
            if (!matches.includes(loc)) matches.push(loc);
          }

          if (matches.length >= 2) {
            const copyBtn = createStyledCopyButton(
              () => `${matches[0]} ➔ ${matches[1]}`,
              'Copy Route'
            );
            copyBtn.className = 'zonix-quick-copy-btn zonix-route-copy-btn';
            copyBtn.style.marginLeft = '8px';
            el.appendChild(copyBtn);
            break;
          }
        }
      })();

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
    };

    // Real-Time MutationObserver for Instant <10ms UI Restrictions
    const observer = new MutationObserver(() => {
      applyLockdownPass();
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    document.addEventListener('DOMContentLoaded', applyLockdownPass);
    setInterval(applyLockdownPass, 1000);

    console.log('[ZONIX] DAT One real-time interface lockdown engine active');
  } catch (err) {
    console.error('[ZONIX] DAT lockdown engine error:', err.message);
  }
})();

