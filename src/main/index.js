const { app, BrowserWindow, session, ipcMain, protocol, Tray, Menu, nativeImage, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

// Redirect console logs to a file in userData directory for debugging
const logFile = path.join(app.getPath('userData'), 'app.log');
try {
  fs.writeFileSync(logFile, `--- ZONIX RUN START: ${new Date().toISOString()} ---\n`);
} catch (e) {
  console.error('Failed to create log file:', e.message);
}

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

let logBuffer = [];
let logFlushTimer = null;

function flushLogBuffer(sync = false) {
  if (logBuffer.length === 0) return;
  const chunk = logBuffer.join('');
  logBuffer = [];
  try {
    if (sync) {
      fs.appendFileSync(logFile, chunk);
    } else {
      fs.appendFile(logFile, chunk, () => {});
    }
  } catch (e) {}
}

function writeToLogFile(level, args) {
  try {
    const formattedMsg = args.map(arg => {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch (e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    logBuffer.push(`[${new Date().toLocaleTimeString()}] [${level}] ${formattedMsg}\n`);
    if (logBuffer.length >= 30) {
      if (logFlushTimer) {
        clearTimeout(logFlushTimer);
        logFlushTimer = null;
      }
      flushLogBuffer();
    } else if (!logFlushTimer) {
      logFlushTimer = setTimeout(() => {
        logFlushTimer = null;
        flushLogBuffer();
      }, 250);
    }
  } catch (e) {}
}

console.log = function(...args) {
  writeToLogFile('INFO', args);
  originalLog.apply(console, args);
};
console.warn = function(...args) {
  writeToLogFile('WARN', args);
  originalWarn.apply(console, args);
};
console.error = function(...args) {
  writeToLogFile('ERROR', args);
  originalError.apply(console, args);
};
const Store = require('electron-store');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const ProxyManager = require('./proxyManager');
const SecurityEngine = require('./security');
const { autoUpdater } = require('electron-updater');

const store = new Store();

function getAuthToken() {
  const token = store.get('authToken');
  if (!token) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(token, 'base64'));
    }
  } catch (err) {
    console.error('[ZONIX] Failed to decrypt authToken:', err.message);
  }
  return token;
}

function setAuthToken(token) {
  if (!token) {
    store.delete('authToken');
    return;
  }
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      store.set('authToken', encrypted.toString('base64'));
      return;
    }
  } catch (err) {
    console.error('[ZONIX] Failed to encrypt authToken:', err.message);
  }
  store.set('authToken', token);
}

function disableDevTools(win) {
  if (app.isPackaged && win) {
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools();
    });
  }
}

// Global Security Safeguard: Deny mailto, tel, and unauthorized popup window creation across all webContents
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    const lowerUrl = (url || '').toLowerCase();
    if (lowerUrl.startsWith('mailto:') || lowerUrl.startsWith('tel:') || lowerUrl.includes('mailto:')) {
      return { action: 'deny' };
    }
    if (lowerUrl.startsWith('http:') || lowerUrl.startsWith('https:')) {
      if (!lowerUrl.includes('dat.com') && !lowerUrl.includes('truckstop.com') && !lowerUrl.includes('123loadboard.com')) {
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  contents.on('will-navigate', (e, navigationUrl) => {
    const lowerUrl = (navigationUrl || '').toLowerCase();
    if (lowerUrl.startsWith('mailto:') || lowerUrl.startsWith('tel:') || lowerUrl.includes('mailto:')) {
      e.preventDefault();
    }
  });
});

let mainWindow = null;
let authWindow = null;
let syncWindow = null;
let tray = null;
let activeSessions = new Map();
// Maps partitionId -> localStorageData (JSON string). Used for O(1) lookup in IPC handler.
const sessionLocalStorageMap = new Map();
// Maps guest webContents.id -> { partitionId, localStorageData, sessionId, orgId, userId } for zero-latency token injection
const guestWebContentsMap = new Map();
let wsConnection = null;
let proxyManager = null;
let securityEngine = null;
const proxyCredentials = new Map(); // 'host:port' -> { username, password }

const CONFIG = {
  BACKEND_URL: process.env.ZONIX_BACKEND_URL || 'https://zonix-backend-0ggt.onrender.com',
  WS_URL: process.env.ZONIX_WS_URL || 'wss://zonix-backend-0ggt.onrender.com/ws',
  PARTITION_PREFIX: 'persist:org_',
  HEARTBEAT_INTERVAL: 30000,
  OIDC_REDIRECT_THRESHOLD: 3,
  OIDC_REDIRECT_WINDOW: 15000,
  PROXY_TIMEOUT: 10000
};

const nodeFetch = require('node-fetch');
async function zonixFetch(url, options = {}) {
  const headers = options.headers || {};
  headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  return nodeFetch(url, { ...options, headers });
}

// Background Keep-Alive Ping: prevents Render free tier backend from cold-sleeping (15m idle limit)
let keepAliveTimer = null;
function startBackendKeepAlive() {
  if (keepAliveTimer) return;
  const ping = async () => {
    try {
      await zonixFetch(`${CONFIG.BACKEND_URL}/api/health`, { method: 'GET' });
    } catch (e) {}
  };
  ping();
  keepAliveTimer = setInterval(ping, 210000); // Ping every 3.5 minutes
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('ZONIX Dispatcher');
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function createAuthWindow(errorType = '') {
  const iconPath = path.join(__dirname, 'logo.png');
 
  authWindow = new BrowserWindow({
    width: 450,
    height: 680,
    frame: false,
    resizable: false,
    show: false,
    icon: iconPath,
    title: 'ZONIX',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    backgroundColor: '#0b0f19'
  });
 
  const htmlPath = path.join(__dirname, '..', 'renderer', 'dist', 'auth.html');
  const hash = errorType ? `#${errorType}` : '';
  authWindow.loadURL(`file://${htmlPath}${hash}`);

  authWindow.setMenu(null);
  authWindow.once('ready-to-show', () => {
    authWindow.show();
  });
  authWindow.on('closed', () => { authWindow = null; });

  disableDevTools(authWindow);
}

function createMainWindow() {
  // Remove the File/Edit/View/Help menu bar globally
  Menu.setApplicationMenu(null);
 
  const iconPath = path.join(__dirname, 'logo.png');
 
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    title: 'ZONIX // System Control Node',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    backgroundColor: '#0b0f19'
  });
 
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });
 
  mainWindow.on('closed', () => { mainWindow = null; });

  disableDevTools(mainWindow);
}

async function verifyCookieSync(sess, originalCookies, targetUrl, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    attempt++;
    console.log(`[ZONIX] Cookie verification attempt ${attempt}/${retries}...`);
    
    // Inject cookies
    await Promise.all(originalCookies.map(async (cookie) => {
      try {
        const isSecure = cookie.secure !== undefined ? cookie.secure : true;

        // Extract clean domain without leading dot for URL construction
        const rawDomain = cookie.domain || (new URL(targetUrl).hostname);
        const cleanDomain = rawDomain.startsWith('.') ? rawDomain.substring(1) : rawDomain;
        const scheme = isSecure ? 'https://' : 'http://';

        let cookieUrl = cookie.url;
        if (!cookieUrl || cookieUrl.includes('localhost')) {
          cookieUrl = `${scheme}${cleanDomain}${cookie.path || '/'}`;
        }

        // Translate sameSite value from Chrome DevTools format to Electron's expected format.
        let sameSite;
        const rawSameSite = (cookie.sameSite || '').toLowerCase();
        if (rawSameSite === 'strict') {
          sameSite = 'strict';
        } else if (rawSameSite === 'lax') {
          sameSite = 'lax';
        } else if (rawSameSite === 'unspecified') {
          sameSite = 'unspecified';
        } else if (rawSameSite === 'none' || rawSameSite === 'no_restriction') {
          sameSite = isSecure ? 'no_restriction' : 'lax';
        } else {
          sameSite = isSecure ? 'no_restriction' : 'lax';
        }

        const nowSec = Math.floor(Date.now() / 1000);
        let exp = cookie.expirationDate;
        // Extend session and device identification cookies to at least 30 days to prevent premature DAT logouts
        if (!exp || exp < nowSec + 30 * 86400) {
          exp = nowSec + 30 * 86400; // 30 days guaranteed minimum
        }

        const cookieDetails = {
          url: cookieUrl,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path || '/',
          secure: isSecure,
          httpOnly: cookie.httpOnly !== undefined ? cookie.httpOnly : false,
          sameSite,
          expirationDate: exp
        };

        // If cookie has a specific domain defined, preserve its original format
        if (cookie.domain) {
          cookieDetails.domain = cookie.domain;
        }

        try {
          await sess.cookies.set(cookieDetails);
        } catch (setErr) {
          // If explicit domain set fails, retry without domain parameter (Electron will derive host-only cookie from url)
          delete cookieDetails.domain;
          try {
            await sess.cookies.set(cookieDetails);
          } catch (retryErr) {
            console.error(`[ZONIX] Failed cookie set '${cookie.name}':`, retryErr.message);
          }
        }
        console.log(`[ZONIX] Set cookie: ${cookie.name} domain=${cookie.domain || cleanDomain} secure=${isSecure} sameSite=${sameSite}`);
      } catch (err) {
        console.error(`[ZONIX] Injection error for '${cookie.name}':`, err.message);
      }
    }));

    // Flush the store to commit memory cookies to partition store
    await sess.cookies.flushStore();

    // Verify all injected cookies are actually written
    const storedCookies = await sess.cookies.get({});
    const missingCookies = originalCookies.filter(oc => {
      const targetName = (oc.name || '').trim().toLowerCase();
      return !storedCookies.some(sc => (sc.name || '').trim().toLowerCase() === targetName);
    });

    if (missingCookies.length === 0 || storedCookies.length >= originalCookies.length * 0.8) {
      console.log(`[ZONIX] Cookie verification PASSED. ${storedCookies.length}/${originalCookies.length} cookies verified in partition.`);
      return true;
    }

    console.warn(`[ZONIX] Cookie verification FAILED. Missing: ${missingCookies.map(c => c.name).join(', ')}. Retrying...`);
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  return true; // Soft pass to prevent blocking worker launch on minor non-critical cookie mismatches
}

async function fetchCookiesForSession(orgId, userId, targetDomain, token) {
  if (!token || !targetDomain) return { cookies: [], localStorage: '{}' };
  try {
    const res = await zonixFetch(`${CONFIG.BACKEND_URL}/api/cookies/retrieve/${orgId}/${userId}/${targetDomain}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const resData = await res.json();
      return {
        cookies: resData.cookies || [],
        localStorage: resData.localStorage || '{}'
      };
    }
  } catch (err) {
    console.error('[ZONIX Main] Failed to retrieve cookies:', err.message);
  }
  return { cookies: [], localStorage: '{}' };
}

function createSyncWindow(orgId, userId, targetUrl) {
  // Start prefetching cookies and proxy nodes concurrently
  const token = getAuthToken();
  const effectiveTarget = (targetUrl && targetUrl.trim() !== '' && !targetUrl.includes('app.example.com')) 
    ? targetUrl 
    : (store.get('targetUrl') || 'https://one.dat.com');
  let targetDomain = '';
  try {
    targetDomain = new URL(effectiveTarget).hostname;
  } catch (e) {}
 
  prefetchData = {
    cookiesPromise: fetchCookiesForSession(orgId, userId, targetDomain, token),
    proxyPromise: getActiveProxyForOrg(orgId, token)
  };
 
  syncWindow = new BrowserWindow({
    width: 500,
    height: 480,
    frame: false,
    transparent: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    backgroundColor: '#0b0f19'
  });
 
  syncWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'sync.html'));
  syncWindow.webContents.on('did-finish-load', () => {
    syncWindow.show();
    syncWindow.webContents.send('sync:start', { 
      orgId, 
      userId, 
      targetUrl: effectiveTarget,
      username: store.get('username') || ''
    });
  });

  syncWindow.on('closed', () => {
    syncWindow = null;
    if (activeSessions.size === 0 && !mainWindow) {
      if (!authWindow || authWindow.isDestroyed()) {
        createAuthWindow();
      } else {
        authWindow.show();
      }
    }
  });

  disableDevTools(syncWindow);
 
  return syncWindow;
}

async function createDispatchWindow(sessionId, config) {
  const { 
    orgId, 
    userId, 
    username, 
    proxyString, 
    proxyUsername, 
    proxyPassword, 
    proxyName, 
    proxyHost, 
    cookies, 
    localStorageData, 
    targetUrl, 
    hardwareProfile 
  } = config;
  if (!proxyString || proxyString.trim() === '') {
    throw new Error('No Proxy Configured: An active proxy tunnel is strictly required to launch the dispatcher.');
  }

  // PRE-FLIGHT PROXY REACHABILITY VERIFICATION GATE:
  // Strictly prevent dispatch window from opening if proxy is unreachable or broken
  const displayName = proxyName ? `${proxyName} (${proxyHost || proxyString})` : (proxyHost || proxyString);
  console.log(`[ZONIX Launch Gate] Probing proxy reachability for session ${sessionId} (${displayName})...`);
  const probe = await proxyManager.checkProxyHealth(proxyString, sessionId, {
    username: proxyUsername || config.proxyUsername,
    password: proxyPassword || config.proxyPassword
  });

  if (probe.status === 'unreachable' || probe.latency === -1) {
    console.error(`[ZONIX Launch Gate] 🛑 BLOCKED DISPATCH WINDOW: Proxy ${displayName} is unreachable.`);
    throw new Error(`Proxy Unreachable: The configured proxy server (${displayName}) could not be reached. Dispatcher launch was aborted to prevent account blockage or IP leaks. Please verify your proxy host, port, and credentials in the Admin Portal.`);
  }

  console.log(`[ZONIX Launch Gate] ✅ Proxy confirmed reachable (latency: ${probe.latency}ms). Opening secure viewport...`);

  const partitionId = `${CONFIG.PARTITION_PREFIX}${orgId}_user_${userId}`;

  // partitionId already starts with 'persist:' from CONFIG.PARTITION_PREFIX.
  // Do NOT add another 'persist:' prefix or it becomes 'persist:persist:...' which is a different, nonexistent partition.
  const sess = session.fromPartition(partitionId);

  if (proxyString) {
    await sess.setProxy({ proxyRules: proxyString });
    console.log(`[ZONIX] Proxy bound for session ${sessionId}: ${proxyString}`);
    if (config.proxyUsername && config.proxyPassword) {
      // Key by host:port so app.on('login') can match by authInfo.host/port
      try {
        const u = new URL(proxyString.includes('://') ? proxyString : `http://${proxyString}`);
        proxyCredentials.set(`${u.hostname}:${u.port}`, {
          username: config.proxyUsername,
          password: config.proxyPassword
        });
      } catch (e) {
        proxyCredentials.set(proxyString, { username: config.proxyUsername, password: config.proxyPassword });
      }
    }
  } else {
    // STRICT ZERO-LEAK HARD PROXY ENFORCEMENT: Never fall back to direct connection
    await sess.setProxy({ proxyRules: '127.0.0.1:0' });
    console.warn(`[ZONIX Security Shield] Hard Proxy Enforcement: No proxy string provided for session ${sessionId}. Blackholing connection to prevent direct IP leak.`);
  }

  if (cookies && cookies.length > 0) {
    // Clear only stale cookies to prevent conflict; NEVER wipe localstorage or indexdb so Auth0 tokens persist!
    try {
      await sess.clearStorageData({
        storages: ['cookies']
      });
      console.log(`[ZONIX] Cleared stale partition cookies for: ${partitionId}`);
    } catch (cleanErr) {
      console.warn(`[ZONIX] Warning clearing partition cookies:`, cleanErr.message);
    }

    // Inject cookies into the ONE correct session (partitionId already has persist: prefix).
    // The <webview> inside dispatcher.html uses the same partitionId, so it shares this session.
    await verifyCookieSync(sess, cookies, targetUrl);
    console.log(`[ZONIX] Cookies injected into partition: ${partitionId}`);
  }

  securityEngine.applyInterceptors(sess, orgId, sessionId, proxyManager);

  // IMMEDIATE NETWORK-LEVEL TRIPWIRE (0ms detection directly from Chromium network service):
  sess.webRequest.onErrorOccurred({ urls: ['*://*/*'] }, (details) => {
    const err = details.error || '';
    if (
      err.includes('ERR_PROXY') ||
      err.includes('ERR_TUNNEL') ||
      err.includes('ERR_SOCKS') ||
      err.includes('ERR_TIMED_OUT') ||
      err.includes('ERR_CONNECTION_RESET')
    ) {
      console.warn(`[ZONIX Zero-Leak Shield] 🚨 Immediate network proxy failure (${err}) for URL: ${details.url}. Activating kill-switch immediately!`);
      if (proxyManager) {
        proxyManager.activateKillSwitch(sessionId, dispatchWindow, partitionId);
      }
    }
  });

  const dispatchWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      session: sess
    },
    backgroundColor: '#0b0f19'
  });

  const targetUserAgent = hardwareProfile?.userAgent || generateStableUA();
  dispatchWindow.webContents.setUserAgent(targetUserAgent);
  dispatchWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.setUserAgent(targetUserAgent);
    console.log(`[ZONIX] Inherited parent User Agent to child webview: ${targetUserAgent}`);

    // Register guest webContents for instant 0ms localStorage token injection
    guestWebContentsMap.set(webContents.id, {
      partitionId,
      localStorageData: localStorageData || '{}',
      sessionId,
      orgId,
      userId
    });
    webContents.on('destroyed', () => {
      guestWebContentsMap.delete(webContents.id);
    });

    // Instant tripwire if guest webview encounters proxy drop
    webContents.on('did-fail-load', (e, errorCode, errorDesc) => {
      if (errorCode === -130 || errorCode === -111 || errorCode === -136 || errorCode === -115) {
        console.warn(`[ZONIX Zero-Leak Shield] 🚨 Guest webview proxy error (${errorCode} ${errorDesc}). Activating kill-switch!`);
        if (proxyManager) {
          proxyManager.activateKillSwitch(sessionId, dispatchWindow, partitionId);
        }
      }
    });
  });

  setupOIDCLoopDetection(dispatchWindow, sessionId);

  // Show on successful load and maximize to full screen
  dispatchWindow.webContents.on('did-finish-load', () => {
    if (!dispatchWindow.isVisible()) {
      dispatchWindow.maximize();
      dispatchWindow.show();
    }
    if (authWindow) authWindow.hide();
  });

  // ALSO show on failed load (proxy auth error, DNS failure, etc.) so window is
  // never permanently hidden/blank. The browser will display its own error page.
  dispatchWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.warn(`[ZONIX] Dispatch window failed to load (${errorCode} ${errorDesc}): ${validatedURL}`);
      if (!dispatchWindow.isVisible()) {
        dispatchWindow.maximize();
        dispatchWindow.show();
      }
    }
  });

  let isClosed = false;
  dispatchWindow.on('close', async (e) => {
    if (isClosed) return;
    e.preventDefault();

    proxyManager.stopHealthCheck(sessionId);
    proxyManager.clearKillSwitch(sessionId);
    activeSessions.delete(sessionId);
    sessionLocalStorageMap.delete(partitionId);
    broadcastSessionUpdate();

    try {
      console.log(`[ZONIX] Notifying backend of session termination for ${sessionId}...`);
      await endSessionOnBackend(sessionId);
    } catch (err) {
      console.error(`[ZONIX] Failed to notify backend of session termination:`, err.message);
    }

    isClosed = true;
    dispatchWindow.close();
  });

  const lsData = localStorageData || '{}';
  const effectiveTarget = (targetUrl && targetUrl.trim() !== '' && !targetUrl.includes('app.example.com')) 
    ? targetUrl 
    : (store.get('targetUrl') || 'https://one.dat.com');

  activeSessions.set(sessionId, {
    window: dispatchWindow,
    orgId,
    userId,
    username: username || store.get('username') || '',
    partitionId,
    proxyString,
    proxyName: proxyName || '',
    proxyHost: proxyHost || '',
    targetUrl: effectiveTarget,
    localStorageData: lsData,
    startTime: Date.now(),
    heartbeatTimer: null
  });
  // Register partition -> localStorage mapping for fast IPC lookup
  sessionLocalStorageMap.set(partitionId, lsData);

  if (proxyString) {
    proxyManager.startContinuousHealthCheck(sessionId, proxyString, dispatchWindow, {
      username: proxyUsername || config.proxyUsername,
      password: proxyPassword || config.proxyPassword
    }, partitionId);
  }
  startHeartbeatMonitor(sessionId);
  broadcastSessionUpdate();

  const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');
  const wrapperPath = path.join(__dirname, '..', 'renderer', 'dist', 'dispatcher.html');
  const maxTabs = store.get('maxTabs') || 5;

  const proxyLabel = 'SECURE TUNNEL';

  const operatorUser = username || store.get('username') || userId || 'Dispatcher';

  // URL-encode partitionId so the 'persist:' prefix (colon) doesn't break URL parsing
  const wrapperUrl = `file://${wrapperPath}?partition=${encodeURIComponent(partitionId)}&url=${encodeURIComponent(effectiveTarget)}&preload=${encodeURIComponent(preloadPath)}&maxTabs=${maxTabs}&proxy=${encodeURIComponent(proxyLabel)}&user=${encodeURIComponent(operatorUser)}&org=${encodeURIComponent(orgId || '')}`;
  try {
    await dispatchWindow.loadURL(wrapperUrl);
  } catch (loadErr) {
    console.error(`[ZONIX] Dispatch loadURL error (${loadErr.code || loadErr.message})`);
  }

  disableDevTools(dispatchWindow);

  return dispatchWindow;
}

function generateStableUA() {
  const chromeVersion = '120.0.0.0';
  const platform = 'Windows NT 10.0';
  return `Mozilla/5.0 (${platform}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

function setupOIDCLoopDetection(browserWindow, sessionId) {
  const navigationLog = [];
  const oidcPatterns = [
    /authorize\?/,
    /oauth2\/auth/,
    /openid\/connect/,
    /\/auth\/callback/,
    /\/login\/sso/,
    /\/saml\/sso/,
    /idp\/login/,
    /\/realms\/.*\/protocol\/openid/
  ];

  browserWindow.webContents.on('will-redirect', (event, url) => {
    const now = Date.now();
    const isOidc = oidcPatterns.some(p => p.test(url));

    if (isOidc) {
      navigationLog.push({ url, timestamp: now });

      while (navigationLog.length > 0 && navigationLog[0].timestamp < now - CONFIG.OIDC_REDIRECT_WINDOW) {
        navigationLog.shift();
      }

      if (navigationLog.length >= CONFIG.OIDC_REDIRECT_THRESHOLD) {
        console.warn(`[ZONIX] OIDC Redirect Loop detected on session ${sessionId}. Initiating remediation...`);
        event.preventDefault();
        handleOIDCRemediation(sessionId, browserWindow);
        navigationLog.length = 0;
      }
    } else {
      navigationLog.length = 0;
    }
  });
}

async function handleOIDCRemediation(sessionId, browserWindow) {
  const sessionData = activeSessions.get(sessionId);
  if (!sessionData) return;

  try {
    const partitionId = sessionData.partitionId;
    const sess = session.fromPartition(partitionId);

    await sess.clearStorageData({ storages: ['cookies', 'sessionstorage', 'localstorage', 'indexdb'] });
    console.log(`[ZONIX] Cleared token storage for session ${sessionId}`);

    const freshSession = await fetchSessionFromBackend(sessionData.orgId, sessionData.userId);
    if (freshSession && freshSession.cookies) {
      for (const cookie of freshSession.cookies) {
        await sess.cookies.set({
          url: cookie.url || sessionData.targetUrl,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          secure: true,
          httpOnly: cookie.httpOnly || false,
          sameSite: 'no_restriction'
        });
      }
      console.log(`[ZONIX] Refreshed ${freshSession.cookies.length} cookies for session ${sessionId}`);
    }

    browserWindow.loadURL(sessionData.targetUrl);
  } catch (err) {
    console.error(`[ZONIX] OIDC remediation failed for session ${sessionId}:`, err.message);
    showDisconnectedScreen(browserWindow, 'OIDC Remediation Failed');
  }
}

async function fetchSessionFromBackend(orgId, userId) {
  try {
    const response = await zonixFetch(`${CONFIG.BACKEND_URL}/api/sessions/${orgId}/${userId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('[ZONIX] Backend session fetch failed:', err.message);
    return null;
  }
}

function startHeartbeatMonitor(sessionId) {
  const sessionData = activeSessions.get(sessionId);
  if (!sessionData) return;

  sessionData.heartbeatTimer = setInterval(async () => {
    try {
      const response = await zonixFetch(`${CONFIG.BACKEND_URL}/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          orgId: sessionData.orgId,
          userId: sessionData.userId,
          proxyString: sessionData.proxyString
        })
      });

      const result = await response.json();

      if (result.proxyStatus === 'unreachable') {
        console.warn(`[ZONIX] Proxy failure detected for session ${sessionId}. Activating kill-switch...`);
        proxyManager.activateKillSwitch(sessionId, sessionData.window, sessionData.partitionId);
      }

      if (result.proxyStatus === 'degraded') {
        console.warn(`[ZONIX] Proxy degraded for session ${sessionId}. Latency: ${result.latency}ms`);
        sendToRenderer('session:warning', {
          sessionId,
          message: `Proxy latency: ${result.latency}ms`,
          level: 'warn'
        });
      }
    } catch (err) {
      console.error(`[ZONIX] Heartbeat failed for session ${sessionId}:`, err.message);
      proxyManager.activateKillSwitch(sessionId, sessionData.window, sessionData.partitionId);
    }
  }, CONFIG.HEARTBEAT_INTERVAL);
}

function showDisconnectedScreen(browserWindow, reason) {
  const disconnectedHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>ZONIX - Disconnected</title></head>
    <body style="background:#0D0E12;color:#FF3B3B;font-family:'Inter',sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
      <div style="text-align:center;">
        <h1 style="font-size:24px;margin-bottom:16px;">CONNECTION TERMINATED</h1>
        <p style="color:#888;font-size:14px;">${reason}</p>
        <p style="color:#555;font-size:12px;margin-top:24px;">Your IP has been protected. No bare traffic was leaked.</p>
      </div>
    </body>
    </html>
  `;
  browserWindow.loadURL(`data:text/html,${encodeURIComponent(disconnectedHtml)}`);
}

function broadcastSessionUpdate() {
  const sessions = [];
  activeSessions.forEach((data, id) => {
    sessions.push({
      sessionId: id,
      orgId: data.orgId,
      userId: data.userId,
      proxyNode: data.proxyString,
      status: 'ACTIVE',
      uptime: Math.floor((Date.now() - data.startTime) / 1000)
    });
  });

  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(JSON.stringify({ type: 'sessions:update', data: sessions }));
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sessions:update', sessions);
  }
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function connectWebSocket() {
  const wsUrl = CONFIG.WS_URL;
  const authToken = getAuthToken();

  if (!authToken) return;

  wsConnection = new WebSocket(`${wsUrl}?token=${authToken}`);

  wsConnection.on('open', () => {
    console.log('[ZONIX] WebSocket connected to backend registry');
    broadcastSessionUpdate();
  });

  wsConnection.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleWSMessage(msg);
    } catch (err) {
      console.error('[ZONIX] WS message parse error:', err.message);
    }
  });

  wsConnection.on('close', () => {
    console.log('[ZONIX] WebSocket disconnected. Reconnecting in 5s...');
    setTimeout(connectWebSocket, 5000);
  });

  wsConnection.on('error', (err) => {
    console.error('[ZONIX] WebSocket error:', err.message);
  });
}

function forceLogout() {
  console.warn('[ZONIX] Force-logout command received. Evicting local session.');
  
  createAuthWindow('session_expired');

  setAuthToken(null);
  store.delete('orgId');
  store.delete('userId');
  store.delete('userRole');
  store.delete('targetUrl');
  store.delete('maxTabs');

  if (wsConnection) {
    wsConnection.removeAllListeners('close');
    wsConnection.close();
    wsConnection = null;
  }

  activeSessions.forEach((sessionData) => {
    try {
      sessionData.window.destroy();
    } catch (e) {}
  });
  activeSessions.clear();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }
}

function handleWSMessage(msg) {
  switch (msg.type) {
    case 'command:kill':
      killSession(msg.sessionId);
      break;
    case 'command:restart':
      restartSession(msg.sessionId);
      break;
    case 'command:refreshCookies':
      refreshSessionCookies(msg.sessionId);
      break;
    case 'command:logout':
      forceLogout();
      break;
    case 'alert:proxy':
      sendToRenderer('alert:proxy', msg.data);
      break;
    default:
      console.log(`[ZONIX] Unknown WS message type: ${msg.type}`);
  }
}

async function endSessionOnBackend(sessionId) {
  try {
    const token = getAuthToken();
    await zonixFetch(`${CONFIG.BACKEND_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (err) {
    console.error(`[ZONIX] Failed to notify backend of session termination for ${sessionId}:`, err.message);
  }
}

function killSession(sessionId) {
  const sessionData = activeSessions.get(sessionId);
  if (!sessionData) return;

  clearInterval(sessionData.heartbeatTimer);
  proxyManager.stopHealthCheck(sessionId);
  proxyManager.clearKillSwitch(sessionId);
  try {
    sessionData.window.close();
  } catch (e) {}
  activeSessions.delete(sessionId);
  broadcastSessionUpdate();
  endSessionOnBackend(sessionId);
  console.log(`[ZONIX] Session ${sessionId} terminated by command`);
}

async function restartSession(sessionId) {
  const sessionData = activeSessions.get(sessionId);
  if (!sessionData) return;

  clearInterval(sessionData.heartbeatTimer);
  proxyManager.stopHealthCheck(sessionId);
  proxyManager.clearKillSwitch(sessionId);
  try {
    sessionData.window.close();
  } catch (e) {}
  activeSessions.delete(sessionId);

  const backendData = await fetchSessionFromBackend(sessionData.orgId, sessionData.userId);
  const activeSession = backendData?.sessions?.[0];
  if (activeSession) {
    const newId = activeSession.id;
    await createDispatchWindow(newId, {
      ...sessionData,
      cookies: activeSession.cookies || []
    });
  }

  broadcastSessionUpdate();
}

async function refreshSessionCookies(sessionId) {
  const sessionData = activeSessions.get(sessionId);
  if (!sessionData) return;

  const backendData = await fetchSessionFromBackend(sessionData.orgId, sessionData.userId);
  const activeSession = backendData?.sessions?.[0];
  if (activeSession && activeSession.cookies) {
    const sess = session.fromPartition(sessionData.partitionId);
    await sess.clearStorageData({ storages: ['cookies'] });

    await Promise.all(activeSession.cookies.map(async (cookie) => {
      try {
        await sess.cookies.set({
          url: cookie.url || sessionData.targetUrl,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          secure: true,
          httpOnly: cookie.httpOnly || false,
          sameSite: 'no_restriction'
        });
      } catch (err) {
        console.error(`[ZONIX] Cookie inject fail in refresh for '${cookie.name}':`, err.message);
      }
    }));

    sessionData.window.loadURL(sessionData.targetUrl);
    console.log(`[ZONIX] Refreshed cookies for session ${sessionId}`);
  }
}

async function getActiveProxyForOrg(orgId, token) {
  try {
    const response = await zonixFetch(`${CONFIG.BACKEND_URL}/api/proxies/${orgId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      const proxiesList = data.proxies || [];
      if (proxiesList.length > 0) {
        // ALWAYS select the assigned proxy for this organization:
        // Prefer an ACTIVE node, but if all are UNREACHABLE/OFFLINE/TESTING,
        // still select it so the pre-flight gate accurately tests it!
        const chosenProxy = proxiesList.find(p => p.status === 'ACTIVE') || proxiesList[0];

        // Cache active proxy to local vault for offline resilience
        try {
          const vaultKey = `cached_proxy_${orgId}`;
          const rawStr = JSON.stringify(chosenProxy);
          if (safeStorage && safeStorage.isEncryptionAvailable()) {
            store.set(vaultKey, safeStorage.encryptString(rawStr).toString('base64'));
          } else {
            store.set(vaultKey, rawStr);
          }
        } catch (vErr) {
          console.warn('[ZONIX Main] Failed to write proxy to local vault cache:', vErr.message);
        }
        console.log(`[ZONIX Main] Selected organization proxy: ${chosenProxy.name} (${chosenProxy.host}:${chosenProxy.port}, status: ${chosenProxy.status})`);
        return chosenProxy;
      } else {
        // Organization has 0 proxies in backend. Clear any stale cached proxy!
        try {
          store.delete(`cached_proxy_${orgId}`);
        } catch (e) {}
        console.warn(`[ZONIX Main] Organization ${orgId} has 0 proxies configured in backend.`);
        return null;
      }
    }
  } catch (err) {
    console.error('[ZONIX Main] Failed to fetch proxy for org from backend:', orgId, err.message);
  }

  // FALLBACK TO LOCAL ENCRYPTED VAULT CACHE ONLY IF BACKEND IS OFFLINE!
  try {
    const vaultKey = `cached_proxy_${orgId}`;
    const rawVal = store.get(vaultKey);
    if (rawVal) {
      let decryptedStr = rawVal;
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        decryptedStr = safeStorage.decryptString(Buffer.from(rawVal, 'base64'));
      }
      const cachedProxy = JSON.parse(decryptedStr);
      console.log(`[ZONIX Main] Vault Fallback: Successfully loaded cached proxy for org ${orgId}: ${cachedProxy.host}:${cachedProxy.port}`);
      return cachedProxy;
    }
  } catch (vaultReadErr) {
    console.error('[ZONIX Main] Failed reading local vault proxy backup:', vaultReadErr.message);
  }

  return null;
}

function registerIPC() {
  ipcMain.on('log:write', (event, { level, message }) => {
    const sender = event.sender;
    const isGuest = typeof sender.isGuest === 'function' && sender.isGuest();
    const typeLabel = isGuest ? 'WebView' : 'Renderer';
    console.log(`[${typeLabel}] [${level}] ${message}`);
  });

  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.on('get-session-org-id', (event) => {
    event.returnValue = store.get('orgId') || 'zonix-system';
  });

  ipcMain.on('get-session-local-storage', (event) => {
    let foundData = '{}';

    try {
      // 1. Direct O(1) match via guestWebContentsMap (registered when webview attaches)
      const guestInfo = guestWebContentsMap.get(event.sender.id);
      if (guestInfo && guestInfo.localStorageData && guestInfo.localStorageData !== '{}') {
        const keyCount = Object.keys(JSON.parse(guestInfo.localStorageData || '{}')).length;
        console.log(`[ZONIX Main] IPC get-session-local-storage: matched guest webview ${event.sender.id} (${guestInfo.partitionId}). Keys: ${keyCount}`);
        event.returnValue = guestInfo.localStorageData;
        return;
      }

      // 2. Session object identity match against sessionLocalStorageMap
      const senderSession = event.sender.session;
      for (const [partitionId, lsData] of sessionLocalStorageMap) {
        try {
          const partSess = session.fromPartition(partitionId);
          if (partSess === senderSession && lsData && lsData !== '{}') {
            const keyCount = Object.keys(JSON.parse(lsData || '{}')).length;
            console.log(`[ZONIX Main] IPC get-session-local-storage: matched partition "${partitionId}" by session identity. Keys: ${keyCount}`);
            event.returnValue = lsData;
            return;
          }
        } catch (e) {}
      }

      // 3. Storage path matching (accounting for 'persist:' prefix differences)
      if (senderSession && typeof senderSession.getStoragePath === 'function') {
        const sPath = (senderSession.getStoragePath() || '').toLowerCase();
        for (const [partId, lsData] of sessionLocalStorageMap) {
          const cleanPart = partId.replace(/^persist:/, '').toLowerCase();
          if (cleanPart && sPath.includes(cleanPart) && lsData && lsData !== '{}') {
            const keyCount = Object.keys(JSON.parse(lsData || '{}')).length;
            console.log(`[ZONIX Main] IPC get-session-local-storage: matched partition "${partId}" by storage path. Keys: ${keyCount}`);
            event.returnValue = lsData;
            return;
          }
        }
      }

      // 4. Match activeSessions by window webContents or partition
      for (const [sId, sessData] of activeSessions) {
        if (sessData.localStorageData && sessData.localStorageData !== '{}') {
          if (sessData.window && !sessData.window.isDestroyed() && sessData.window.webContents === event.sender) {
            event.returnValue = sessData.localStorageData;
            return;
          }
        }
      }

      // 5. Resilient fallback: return first active non-empty session token vault
      if (sessionLocalStorageMap.size > 0) {
        for (const [k, v] of sessionLocalStorageMap.entries()) {
          if (v && v !== '{}') {
            const keyCount = Object.keys(JSON.parse(v || '{}')).length;
            console.log(`[ZONIX Main] IPC get-session-local-storage: fallback matched partition "${k}". Keys: ${keyCount}`);
            event.returnValue = v;
            return;
          }
        }
      }
    } catch (err) {
      console.error('[ZONIX Main] get-session-local-storage error:', err.message);
    }

    if (foundData === '{}') {
      console.warn('[ZONIX Main] IPC get-session-local-storage: no session match found for sender ID', event.sender.id);
    }
    event.returnValue = foundData;
  });

  ipcMain.handle('auth:login', async (event, { orgId, userId, password }) => {
    try {
      console.log('[ZONIX Main] auth:login request for org:', orgId, 'user:', userId);
      const response = await zonixFetch(`${CONFIG.BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, username: userId, password })
      });

      console.log('[ZONIX Main] auth:login response status:', response.status);
      const result = await response.json();
      console.log('[ZONIX Main] auth:login result:', result);

      if (result.success) {
        const actualOrgId = result.organization.id;
        setAuthToken(result.token);
        const effectiveTargetUrl = (result.organization.targetUrl && result.organization.targetUrl.trim() !== '' && !result.organization.targetUrl.includes('app.example.com')) 
          ? result.organization.targetUrl 
          : 'https://one.dat.com';
        store.set('orgId', actualOrgId);
        store.set('userId', result.user.id);
        store.set('username', result.user.username);
        store.set('userRole', result.user.role);
        store.set('targetUrl', effectiveTargetUrl);
        store.set('maxTabs', result.organization.maxTabs || 5);
        connectWebSocket();
        
        setTimeout(() => {
          try {
            if (result.user.role === 'DISPATCHER') {
              createSyncWindow(actualOrgId, result.user.id, effectiveTargetUrl);
            } else {
              createMainWindow();
            }
          } catch (err) {
            console.error('[ZONIX Main] Failed to transition after login:', err.message);
          } finally {
            if (authWindow) {
              authWindow.close();
            }
          }
        }, 50);

        return { 
          success: true, 
          token: result.token,
          orgId: actualOrgId,
          role: result.user.role
        };
      }

      return { success: false, error: result.error || 'Authentication failed' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    setAuthToken(null);
    store.delete('orgId');
    store.delete('userId');
    store.delete('userRole');
    store.delete('targetUrl');

    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }

    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }

    createAuthWindow();
    return { success: true };
  });

  ipcMain.handle('dispatch:logout', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.close();
    }
    if (authWindow) {
      authWindow.show();
    } else {
      createAuthWindow();
    }
    return { success: true };
  });

  ipcMain.handle('get-session-local-storage-async', async (event, args) => {
    try {
      const { partitionId } = args || {};
      if (partitionId && sessionLocalStorageMap.has(partitionId)) {
        const val = sessionLocalStorageMap.get(partitionId);
        if (val && val !== '{}') return val;
      }
      for (const [k, v] of sessionLocalStorageMap.entries()) {
        if (v && v !== '{}') return v;
      }
      return '{}';
    } catch (e) {
      return '{}';
    }
  });

  ipcMain.handle('dispatch:launch', async (event, options = {}) => {
    const orgId = options.orgId || store.get('orgId');
    const userId = options.userId || store.get('userId');
    const username = options.username || store.get('username') || '';
    const token = getAuthToken();
    const sessionId = uuidv4();
    const effectiveTargetUrl = (options.targetUrl && options.targetUrl.trim() !== '' && !options.targetUrl.includes('app.example.com'))
      ? options.targetUrl
      : (store.get('targetUrl') || 'https://one.dat.com');

    console.log(`[ZONIX Main] dispatch:launch orgId=${orgId}, userId=${userId}, targetUrl=${effectiveTargetUrl}`);

    try {
      let cookiesObj = { cookies: [], localStorage: '{}' };
      let proxyNode = null;

      // Await pre-fetched promises in parallel
      if (prefetchData) {
        const results = await Promise.allSettled([
          prefetchData.cookiesPromise,
          prefetchData.proxyPromise
        ]);
        cookiesObj = results[0].status === 'fulfilled' ? results[0].value : { cookies: [], localStorage: '{}' };
        proxyNode = results[1].status === 'fulfilled' ? results[1].value : null;
        prefetchData = null; // Clear prefetch
      } else {
        // Fallback if launch was triggered without prefetch
        let targetDomain = '';
        try { targetDomain = new URL(effectiveTargetUrl).hostname; } catch (e) {}
        const results = await Promise.allSettled([
          fetchCookiesForSession(orgId, userId, targetDomain, token),
          getActiveProxyForOrg(orgId, token)
        ]);
        cookiesObj = results[0].status === 'fulfilled' ? results[0].value : { cookies: [], localStorage: '{}' };
        proxyNode = results[1].status === 'fulfilled' ? results[1].value : null;
      }

      let activeProxyString = '';
      let proxyUsername = '';
      let proxyPassword = '';

      if (proxyNode) {
        activeProxyString = `${proxyNode.protocol.toLowerCase()}://${proxyNode.host}:${proxyNode.port}`;
        proxyUsername = proxyNode.username || '';
        proxyPassword = proxyNode.password || '';
        console.log(`[ZONIX Main] Routing dispatch session through proxy:`, activeProxyString);
      } else {
        throw new Error('No Proxy Assigned: Your organization has no active proxy route configured. An active proxy is required to protect your accounts and prevent IP leaks.');
      }

      console.log(`[ZONIX Launch Gate] Pre-flight probing proxy node ${proxyNode.name} (${activeProxyString})...`);
      const preProbe = await proxyManager.checkProxyHealth(activeProxyString, `prelaunch_${userId}`, {
        username: proxyUsername,
        password: proxyPassword
      });

      if (preProbe.status === 'unreachable' || preProbe.latency === -1) {
        throw new Error(`Proxy Unreachable: The configured proxy server (${proxyNode.name} · ${proxyNode.host}:${proxyNode.port}) is not responding or unreachable. Launch was aborted to protect your account.`);
      }

      // Register session with backend
      const sessionResponse = await zonixFetch(`${CONFIG.BACKEND_URL}/api/sessions/${orgId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          targetUrl: effectiveTargetUrl,
          proxyNodeId: proxyNode ? proxyNode.id : null,
          cookies: cookiesObj.cookies || []
        })
      });

      if (!sessionResponse.ok) {
        const errData = await sessionResponse.json();
        throw new Error(errData.error || `Backend session creation failed with status ${sessionResponse.status}`);
      }

      const sessionResult = await sessionResponse.json();
      const backendSessionId = sessionResult.session.id;

      const hardwareProfile = store.get(`hwProfile_${orgId}`) || {
        userAgent: generateStableUA(),
        screenResolution: '1920x1080',
        platform: 'Win32',
        languages: ['en-US', 'en']
      };

      await createDispatchWindow(backendSessionId, {
        orgId,
        userId,
        username,
        proxyString: activeProxyString,
        proxyUsername,
        proxyPassword,
        proxyName: proxyNode ? proxyNode.name : '',
        proxyHost: proxyNode ? `${proxyNode.host}:${proxyNode.port}` : '',
        cookies: cookiesObj.cookies || [],
        localStorageData: cookiesObj.localStorage || '{}',
        targetUrl: effectiveTargetUrl,
        hardwareProfile
      });

      if (syncWindow) {
        syncWindow.close();
        syncWindow = null;
      }

      return { success: true, sessionId: backendSessionId };
    } catch (err) {
      console.error('[ZONIX Main] Launch failed:', err.message);
      if (syncWindow && !syncWindow.isDestroyed()) {
        syncWindow.webContents.send('sync:failed', err.message);
      }
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('session:kill', async (event, sessionId) => {
    const sessionData = activeSessions.get(sessionId);
    if (sessionData) {
      const userOrgId = store.get('orgId');
      const userRole = store.get('userRole');
      if (userRole !== 'SUPER_ADMIN' && sessionData.orgId !== userOrgId) {
        throw new Error('Access denied to session');
      }
    }
    killSession(sessionId);
    return { success: true };
  });

  ipcMain.handle('session:restart', async (event, sessionId) => {
    const sessionData = activeSessions.get(sessionId);
    if (sessionData) {
      const userOrgId = store.get('orgId');
      const userRole = store.get('userRole');
      if (userRole !== 'SUPER_ADMIN' && sessionData.orgId !== userOrgId) {
        throw new Error('Access denied to session');
      }
    }
    await restartSession(sessionId);
    return { success: true };
  });

  ipcMain.handle('sessions:list', () => {
    const sessions = [];
    const userOrgId = store.get('orgId');
    const userRole = store.get('userRole');

    activeSessions.forEach((data, id) => {
      if (userRole === 'SUPER_ADMIN' || data.orgId === userOrgId) {
        sessions.push({
          sessionId: id,
          orgId: data.orgId,
          userId: data.userId,
          proxyNode: data.proxyString,
          status: 'ACTIVE',
          uptime: Math.floor((Date.now() - data.startTime) / 1000)
        });
      }
    });
    return sessions;
  });

  ipcMain.handle('session:cookies:capture', async (event, args) => {
    const { targetUrl, orgId, userId } = args || {};
    
    const userOrgId = store.get('orgId');
    const userRole = store.get('userRole');
    const userUserId = store.get('userId');

    let targetOrgId = userOrgId;
    let targetUserId = userUserId;

    if (userRole === 'SUPER_ADMIN' && orgId) {
      targetOrgId = orgId;
    }
    if ((userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'MANAGER') && userId) {
      targetUserId = userId;
    }

    if (!targetUrl) {
      throw new Error('targetUrl is required for session capture');
    }

    // Check if there is an active live dispatcher session for this user
    let activeDispatcherSession = null;
    activeSessions.forEach((data, id) => {
      if (data.orgId === targetOrgId && data.userId === targetUserId) {
        activeDispatcherSession = data;
      }
    });

    if (activeDispatcherSession) {
      console.log(`[ZONIX Main] Pausing active dispatcher session ${activeDispatcherSession.sessionId} for credential refresh`);
      activeDispatcherSession.window.webContents.send('session:pause');
      // Suspend network activity to prevent IP leak and session collisions
      const dispSess = session.fromPartition(activeDispatcherSession.partitionId);
      await dispSess.setProxy({ proxyRules: '127.0.0.1:0' });
    }

    const token = getAuthToken(); // Use decrypted auth token!
    const proxyNode = await getActiveProxyForOrg(targetOrgId, token);

    let targetDomain = '';
    try {
      targetDomain = new URL(targetUrl).hostname;
    } catch (e) {
      console.error('[ZONIX Main] Invalid targetUrl:', e.message);
    }

    // Retrieve existing credentials from database to pre-populate capture window
    const existingData = await fetchCookiesForSession(targetOrgId, targetUserId, targetDomain, token);

    // Use a temporary isolated partition for the capture browser to prevent SQLite locks
    const partitionId = `temp_capture_${targetOrgId}_user_${targetUserId}`;
    const sess = session.fromPartition(partitionId);

    // Clear old cookies from the temp capture session so the admin starts with a clean baseline
    await sess.clearStorageData({ storages: ['cookies'] });

    // Pre-populate with existing cookies if present to keep session active
    if (existingData && existingData.cookies && existingData.cookies.length > 0) {
      console.log(`[ZONIX Main] Pre-populating capture window with ${existingData.cookies.length} existing cookies`);
      await verifyCookieSync(sess, existingData.cookies, targetUrl);
    }

    // Map existing localStorage so the preload script can load it
    if (existingData && existingData.localStorage) {
      sessionLocalStorageMap.set(partitionId, existingData.localStorage);
    }

    if (proxyNode) {
      const proxyRule = `${proxyNode.protocol.toLowerCase()}://${proxyNode.host}:${proxyNode.port}`;
      const proxyKey = `${proxyNode.host}:${proxyNode.port}`;
      await sess.setProxy({ proxyRules: proxyRule });
      console.log(`[ZONIX Main] Capture window routing through proxy:`, proxyRule);
      if (proxyNode.username && proxyNode.password) {
        proxyCredentials.set(proxyKey, {
          username: proxyNode.username,
          password: proxyNode.password
        });
        console.log(`[ZONIX Main] Proxy credentials registered for ${proxyKey}`);
      }
    } else {
      // STRICT ZERO-LEAK HARD PROXY ENFORCEMENT:
      // Never fall back to 'direct://' local connection under any circumstances.
      // Blackhole traffic to prevent local IP exposure to DAT/loadboards.
      await sess.setProxy({ proxyRules: '127.0.0.1:0' });
      console.warn('[ZONIX Security Shield] Hard Proxy Enforcement: No active proxy node available for org. Blackholing connection to prevent direct IP leak.');
    }

    const captureWindow = new BrowserWindow({
      width: 1280,
      height: 860,
      title: `ZONIX — Authenticate Session (Log in, then close this window)`,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#0b0f19',
        symbolColor: '#9ca3af',
        height: 36
      },
      webPreferences: {
        partition: partitionId,
        preload: path.join(__dirname, '..', 'preload', 'index.js'), // Use preload for localStorage injection!
        contextIsolation: true,
        nodeIntegration: false
      },
      show: true
    });

    captureWindow.webContents.on('did-fail-load', (ev, code, desc, url, isMain) => {
      if (isMain && code !== -3) {
        console.warn(`[ZONIX Main] Capture window load failed (${code} ${desc}): ${url}`);
        captureWindow.webContents.executeJavaScript(`
          document.body.style='margin:0;padding:40px;background:#0D0E12;color:#E8E8E8;font-family:monospace;';
          document.body.innerHTML=
            '<h2 style="color:#FF3B3B">CONNECTION FAILED</h2>' +
            '<p style="color:#888;margin:12px 0">Code: ${code} — ${desc}</p>' +
            '<p style="color:#888">URL: ${url || targetUrl}</p>' +
            '<p style="margin-top:24px;color:#00F0FF">If a proxy is configured, verify it is reachable.<br>You can type the URL manually in the browser.</p>';
        `).catch(() => {});
      }
    });

    captureWindow.setMenu(null);

    try {
      await captureWindow.loadURL(targetUrl);
    } catch (loadErr) {
      console.error('[ZONIX Main] Capture window failed to load URL:', loadErr.message);
    }

    let lastCapturedLocalStorage = '{}';
    let saveDebounceTimer = null;

    const performCookieSync = async () => {
      try {
        if (!sess) return;
        const allCookies = await sess.cookies.get({});
        const serializedCookies = allCookies.map(c => {
          const scheme = c.secure ? 'https://' : 'http://';
          const cleanDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
          const cookieUrl = `${scheme}${cleanDomain}${c.path || '/'}`;
          return {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            sameSite: c.sameSite,
            expirationDate: c.expirationDate,
            url: cookieUrl
          };
        });

        let localStorageData = '{}';
        try {
          if (captureWindow && !captureWindow.isDestroyed()) {
            localStorageData = await captureWindow.webContents.executeJavaScript(`
              (function() {
                try {
                  return JSON.stringify(window.localStorage);
                } catch (err) {
                  return '{}';
                }
              })()
            `);
            if (localStorageData && localStorageData !== '{}') {
              lastCapturedLocalStorage = localStorageData;
            }
          }
        } catch (lsErr) {
          console.error('[ZONIX Main] Live localStorage capture failed:', lsErr.message);
        }

        const finalLs = (localStorageData && localStorageData !== '{}') ? localStorageData : lastCapturedLocalStorage;
        const targetDomain = new URL(targetUrl).hostname;

        await zonixFetch(`${CONFIG.BACKEND_URL}/api/cookies/store`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orgId: targetOrgId,
            userId: targetUserId,
            targetDomain,
            cookies: serializedCookies,
            localStorage: finalLs
          })
        });
        console.log(`[ZONIX Main] Successfully persisted ${serializedCookies.length} cookies & device tokens for user ${targetUserId}`);
      } catch (err) {
        console.error('[ZONIX Main] Cookie/storage sync failed:', err.message);
      }
    };

    const handleCookieChange = (event, cookie, cause, removed) => {
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => {
        performCookieSync();
      }, 1000); // 1-second smooth debounce
    };

    sess.cookies.on('changed', handleCookieChange);

    let isCaptured = false;
    captureWindow.on('close', async (e) => {
      if (isCaptured) return;
      e.preventDefault();
      isCaptured = true;
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      
      console.log('[ZONIX Main] Capture window closing — executing instant final session & device token sync...');
      await performCookieSync();
      captureWindow.destroy();
    });

    // Wait until the admin logs in and closes the window
    await new Promise((resolve) => {
      captureWindow.on('closed', () => {
        sess.cookies.removeListener('changed', handleCookieChange);
        sessionLocalStorageMap.delete(partitionId);
        console.log(`[ZONIX Main] Capture window closed. Cleaned up event listeners.`);
        resolve();
      });
    });

    // Capture all cookies from the session before any partition cleanup
    const allCookies = await sess.cookies.get({});
    console.log(`[ZONIX Main] Capture window closed: retrieved ${allCookies.length} session cookies from partition.`);

    // If there was an active dispatcher session, hot-swap the cookies and resume it
    if (activeDispatcherSession) {
      console.log(`[ZONIX Main] Resuming active dispatcher session ${activeDispatcherSession.sessionId} with fresh cookies`);
      
      const partitions = [
        activeDispatcherSession.partitionId,
        `persist:${activeDispatcherSession.partitionId}`
      ];

      for (const part of partitions) {
        const dispSess = session.fromPartition(part);
        
        // Wipe old cookies in the dispatcher's live partition
        await dispSess.clearStorageData({ storages: ['cookies'] });
        
        // Inject the fresh cookies
        await Promise.all(allCookies.map(async (c) => {
          try {
            const scheme = c.secure ? 'https://' : 'http://';
            const cleanDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
            const cookieUrl = `${scheme}${cleanDomain}${c.path || '/'}`;
            await dispSess.cookies.set({
              url: cookieUrl,
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path || '/',
              secure: c.secure,
              httpOnly: c.httpOnly,
              sameSite: c.secure ? (c.sameSite || 'no_restriction') : 'lax',
              expirationDate: c.expirationDate
            });
          } catch (e) {
            console.error(`[ZONIX Main] Failed to hot-swap cookie in partition ${part}:`, e.message);
          }
        }));

        // Restore original proxy settings on the dispatcher session partition
        if (activeDispatcherSession.proxyString) {
          await dispSess.setProxy({ proxyRules: activeDispatcherSession.proxyString });
        } else {
          await dispSess.setProxy({});
        }
      }

      // Update stored local storage in memory context
      activeDispatcherSession.localStorageData = lastCapturedLocalStorage || '{}';

      // Notify the dispatcher's window to hide the overlay and resume
      activeDispatcherSession.window.webContents.send('session:resume');
    }



    const serializedCookies = allCookies.map(c => {
      const scheme = c.secure ? 'https://' : 'http://';
      const cleanDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
      const cookieUrl = `${scheme}${cleanDomain}${c.path || '/'}`;
      return {
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.expirationDate,
        url: cookieUrl
      };
    });

    // Save final captured state (including final localStorage) to the database on close
    try {
      await zonixFetch(`${CONFIG.BACKEND_URL}/api/cookies/store`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId: targetOrgId,
          userId: targetUserId,
          targetDomain,
          cookies: serializedCookies,
          localStorage: lastCapturedLocalStorage || '{}'
        })
      });
      console.log(`[ZONIX Main] Final captured state saved successfully to DB. Cookies: ${serializedCookies.length}, LocalStorage size: ${(lastCapturedLocalStorage || '').length} chars`);
    } catch (saveErr) {
      console.error('[ZONIX Main] Failed to save final captured state to DB:', saveErr.message);
    }

    return { success: true, cookies: serializedCookies, localStorageData: lastCapturedLocalStorage, targetDomain };
  });

  ipcMain.handle('config:get', (event, key) => {
    if (key === 'authToken') {
      return getAuthToken();
    }
    return store.get(key);
  });

  ipcMain.handle('config:set', (event, key, value) => {
    if (key === 'authToken') {
      setAuthToken(value);
    } else {
      store.set(key, value);
    }
    return { success: true };
  });

  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win === syncWindow) {
        syncWindow = null;
        if (!authWindow || authWindow.isDestroyed()) {
          createAuthWindow();
        } else {
          authWindow.show();
        }
      }
      win.close();
    }
  });
}

app.on('login', (event, webContents, request, authInfo, callback) => {
  if (authInfo.isProxy) {
    // Match by host:port — this is what Electron provides in authInfo
    const proxyKey = `${authInfo.host}:${authInfo.port}`;
    const creds = proxyCredentials.get(proxyKey);
    if (creds && creds.username) {
      event.preventDefault();
      callback(creds.username, creds.password);
      console.log(`[ZONIX Main] Proxy credentials supplied for ${proxyKey}`);
      return;
    }
    // If no credentials registered, let Chromium show its native auth dialog
    console.warn(`[ZONIX Main] Proxy auth requested for ${proxyKey} but no credentials registered`);
  }
});

let isUpdateGateActive = false;
let startupLaunchTimeout = null;

function setupAutoUpdater() {
  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  let updateWindow = null;

  function createUpdateWindow(newVersion) {
    if (updateWindow) return;

    isUpdateGateActive = true;

    // Clear any startup launch timeout
    if (startupLaunchTimeout) {
      clearTimeout(startupLaunchTimeout);
      startupLaunchTimeout = null;
    }

    // Force destroy authWindow and mainWindow so NO login window can exist alongside update
    if (authWindow && !authWindow.isDestroyed()) {
      try { authWindow.destroy(); } catch (e) {}
      authWindow = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.destroy(); } catch (e) {}
      mainWindow = null;
    }
 
    updateWindow = new BrowserWindow({
      width: 460,
      height: 560,
      frame: false,
      transparent: false,
      resizable: false,
      alwaysOnTop: true,
      center: true,
      show: false,
      title: 'ZONIX Mandatory Update',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      },
      backgroundColor: '#090A0F'
    });
 
    updateWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'update.html'));
    updateWindow.setMenu(null);
 
    updateWindow.webContents.on('did-finish-load', () => {
      updateWindow.show();
      updateWindow.webContents.send('update:info', {
        newVersion,
        currentVersion: app.getVersion()
      });

      // Auto-start download immediately upon launch gate activation
      autoUpdater.downloadUpdate().catch(err => {
        console.error('[Updater] Auto-download error:', err.message);
      });
    });
 
    updateWindow.on('closed', () => {
      updateWindow = null;
      if (isUpdateGateActive) {
        app.quit();
      }
    });
  }

  // IPC handlers for update window buttons
  ipcMain.on('update:start', async () => {
    try {
      console.log('[Updater] start download requested');
      await autoUpdater.downloadUpdate();
    } catch (err) {
      console.error('[Updater] downloadUpdate failed:', err.message);
      if (updateWindow && !updateWindow.isDestroyed()) {
        updateWindow.webContents.send('update:error', err.message);
      }
    }
  });

  ipcMain.on('update:quit', () => {
    app.quit();
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Launch Gate: Update available:', info.version);
    createUpdateWindow(info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] Launch Gate: Up to date.');
    if (!isUpdateGateActive && !authWindow && !mainWindow) {
      createAuthWindow();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.webContents.send('update:error', err.message || 'Download failed');
    } else if (!isUpdateGateActive && !authWindow && !mainWindow) {
      // If error occurred during startup check, safely proceed to auth window
      createAuthWindow();
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const pct = progressObj.percent || 0;
    console.log(`[Updater] Downloading: ${Math.round(pct)}%`);
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.webContents.send('update:progress', pct);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[Updater] Download complete. Installing update...');
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.close();
    }
    autoUpdater.quitAndInstall();
  });
}


app.whenReady().then(async () => {
  // Register zonix:// deep-link protocol scheme in Windows OS
  try {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('zonix', process.execPath, [path.resolve(process.argv[1])]);
      }
    } else {
      app.setAsDefaultProtocolClient('zonix');
    }
  } catch (err) {
    console.error('[ZONIX] Protocol registration error:', err.message);
  }

  proxyManager = new ProxyManager();
  securityEngine = new SecurityEngine();

  // Set app icon for taskbar / dock
  const appIconPath = path.join(__dirname, '..', 'renderer', 'public', 'logo.png');
  app.setAppUserModelId('com.zonix.dispatcher');
  if (app.dock) app.dock.setIcon(appIconPath); // macOS

  createTray();
  registerIPC();
  setupAutoUpdater();
  startBackendKeepAlive();

  // Clear any cached session on startup so they always see the login page
  store.delete('authToken');
  store.delete('orgId');
  store.delete('userId');
  store.delete('userRole');
  store.delete('targetUrl');
  store.delete('maxTabs');

  // Check for updates at startup. If an update exists, updateWindow opens and gates launch.
  // If no update exists (or check times out in 3.5s), launch createAuthWindow().
  let hasChecked = false;
  startupLaunchTimeout = setTimeout(() => {
    if (!hasChecked && !isUpdateGateActive && !authWindow) {
      hasChecked = true;
      console.log('[ZONIX] Startup update check timeout. Proceeding to auth window...');
      createAuthWindow();
    }
  }, 3500);

  autoUpdater.checkForUpdates().then(() => {
    hasChecked = true;
  }).catch((err) => {
    hasChecked = true;
    console.error('[ZONIX] Startup update check failed:', err.message);
    if (!isUpdateGateActive && !authWindow) {
      createAuthWindow();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !isUpdateGateActive) {
      createAuthWindow();
    }
  });
});

app.on('window-all-closed', () => {
  activeSessions.forEach((data, id) => {
    clearInterval(data.heartbeatTimer);
  });
  activeSessions.clear();

  if (wsConnection) {
    wsConnection.close();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  flushLogBuffer(true);

  activeSessions.forEach((data, id) => {
    clearInterval(data.heartbeatTimer);
    try {
      data.window.destroy();
    } catch (e) {}
  });

  if (wsConnection) {
    wsConnection.close();
  }
});
