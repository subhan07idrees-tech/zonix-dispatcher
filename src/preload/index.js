const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zonixAPI', {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  launchDispatch: (config) => ipcRenderer.invoke('dispatch:launch', config),
  killSession: (sessionId) => ipcRenderer.invoke('session:kill', sessionId),
  restartSession: (sessionId) => ipcRenderer.invoke('session:restart', sessionId),
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  captureCookies: (args) => ipcRenderer.invoke('session:cookies:capture', args),
  getConfig: (key) => ipcRenderer.invoke('config:get', key),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
  onSessionsUpdate: (callback) => ipcRenderer.on('sessions:update', (_, data) => callback(data)),
  onSessionWarning: (callback) => ipcRenderer.on('session:warning', (_, data) => callback(data)),
  onAlertProxy: (callback) => ipcRenderer.on('alert:proxy', (_, data) => callback(data)),
  onSyncStart: (callback) => ipcRenderer.on('sync:start', (_, data) => callback(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  logoutDispatcher: () => ipcRenderer.invoke('dispatch:logout'),
  appVersion: ipcRenderer.sendSync('get-app-version')
});

// Separate API for the update window
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateInfo: (callback) => ipcRenderer.on('update:info', (_, data) => callback(data)),
  onDownloadProgress: (callback) => ipcRenderer.on('update:progress', (_, pct) => callback(pct)),
  startUpdate: () => ipcRenderer.send('update:start'),
  quitApp: () => ipcRenderer.send('update:quit')
});

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
    Object.defineProperty(navigator, 'userAgent', {
      get: () => FP_CONFIG.USER_AGENT,
      configurable: false
    });

    Object.defineProperty(navigator, 'platform', {
      get: () => FP_CONFIG.PLATFORM,
      configurable: false
    });

    Object.defineProperty(navigator, 'vendor', {
      get: () => FP_CONFIG.VENDOR,
      configurable: false
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => Object.freeze([...FP_CONFIG.LANGUAGES]),
      configurable: false
    });

    Object.defineProperty(navigator, 'language', {
      get: () => FP_CONFIG.LANGUAGES[0],
      configurable: false
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => FP_CONFIG.HARDWARE_CONCURRENCY,
      configurable: false
    });

    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => FP_CONFIG.DEVICE_MEMORY,
      configurable: false
    });

    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => FP_CONFIG.MAX_TOUCH_POINTS,
      configurable: false
    });

    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: false
    });

    Object.defineProperty(navigator, 'doNotTrack', {
      get: () => null,
      configurable: false
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ];
        plugins.length = 3;
        return plugins;
      },
      configurable: false
    });

    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const mimeTypes = [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' }
        ];
        mimeTypes.length = 2;
        return mimeTypes;
      },
      configurable: false
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
    Object.defineProperty(navigator, 'webkitHardwareConcurrency', {
      get: () => FP_CONFIG.HARDWARE_CONCURRENCY,
      configurable: false
    });

    Object.defineProperty(navigator, 'webkitDeviceMemory', {
      get: () => FP_CONFIG.DEVICE_MEMORY,
      configurable: false
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
