const { app, BrowserWindow, session, ipcMain, protocol, Tray, Menu, nativeImage, dialog, safeStorage } = require('electron');
const path = require('path');
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
let mainWindow = null;
let authWindow = null;
let syncWindow = null;
let tray = null;
let activeSessions = new Map();
// Maps partitionId -> localStorageData (JSON string). Used for O(1) lookup in IPC handler.
const sessionLocalStorageMap = new Map();
let wsConnection = null;
let proxyManager = null;
let securityEngine = null;
const proxyCredentials = new Map(); // 'host:port' -> { username, password }

const CONFIG = {
  BACKEND_URL: process.env.ZONIX_BACKEND_URL || 'https://zonix-backend-ouhi.onrender.com',
  WS_URL: process.env.ZONIX_WS_URL || 'wss://zonix-backend-ouhi.onrender.com/ws',
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

        // Build the correct URL for this cookie
        let cookieUrl = cookie.url;
        if (!cookieUrl || cookieUrl === targetUrl) {
          const scheme = isSecure ? 'https://' : 'http://';
          const rawDomain = cookie.domain || (new URL(targetUrl).hostname);
          const cleanDomain = rawDomain.startsWith('.') ? rawDomain.substring(1) : rawDomain;
          cookieUrl = `${scheme}${cleanDomain}${cookie.path || '/'}`;
        }

        // Translate sameSite value from Chrome DevTools format to Electron's expected format.
        // Chrome uses: 'none', 'lax', 'strict', 'unspecified'
        // Electron uses: 'no_restriction', 'lax', 'strict', 'unspecified'
        // IMPORTANT: SameSite=None (no_restriction) requires Secure=true in Chromium.
        // Non-secure cookies with empty/none sameSite must use 'lax' instead.
        let sameSite;
        const rawSameSite = (cookie.sameSite || '').toLowerCase();
        if (rawSameSite === 'strict') {
          sameSite = 'strict';
        } else if (rawSameSite === 'lax') {
          sameSite = 'lax';
        } else if (rawSameSite === 'unspecified') {
          sameSite = 'unspecified';
        } else if (rawSameSite === 'none' || rawSameSite === 'no_restriction') {
          // SameSite=None requires Secure. If not secure, downgrade to lax.
          sameSite = isSecure ? 'no_restriction' : 'lax';
        } else {
          // empty/unknown: use lax for non-secure, no_restriction for secure
          sameSite = isSecure ? 'no_restriction' : 'lax';
        }

        const cookieDetails = {
          url: cookieUrl,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || (new URL(targetUrl).hostname),
          path: cookie.path || '/',
          secure: isSecure,
          httpOnly: cookie.httpOnly !== undefined ? cookie.httpOnly : false,
          sameSite
        };

        if (cookie.expirationDate) {
          cookieDetails.expirationDate = cookie.expirationDate;
        }

        await sess.cookies.set(cookieDetails);
        console.log(`[ZONIX] Set cookie: ${cookie.name} domain=${cookieDetails.domain} secure=${isSecure} sameSite=${sameSite}`);
      } catch (err) {
        console.error(`[ZONIX] Injection error for '${cookie.name}':`, err.message);
      }
    }));

    // Flush the store to commit memory cookies to partition store
    await sess.cookies.flushStore();

    // Verify all injected cookies are actually written
    const storedCookies = await sess.cookies.get({});
    const missingCookies = originalCookies.filter(oc => {
      return !storedCookies.some(sc => sc.name === oc.name);
    });

    if (missingCookies.length === 0) {
      console.log(`[ZONIX] Cookie verification PASSED. All ${originalCookies.length} cookies verified in partition.`);
      return true;
    }

    console.warn(`[ZONIX] Cookie verification FAILED. Missing: ${missingCookies.map(c => c.name).join(', ')}. Retrying...`);
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return false;
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
  let targetDomain = '';
  try {
    targetDomain = new URL(targetUrl).hostname;
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
    syncWindow.webContents.send('sync:start', { orgId, userId, targetUrl });
  });

  disableDevTools(syncWindow);
 
  return syncWindow;
}

async function createDispatchWindow(sessionId, config) {
  const { orgId, userId, proxyString, cookies, localStorageData, targetUrl, hardwareProfile } = config;
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
  }

  if (cookies && cookies.length > 0) {
    // Inject cookies into the ONE correct session (partitionId already has persist: prefix).
    // The <webview> inside dispatcher.html uses the same partitionId, so it shares this session.
    await verifyCookieSync(sess, cookies, targetUrl);
    console.log(`[ZONIX] Cookies injected into partition: ${partitionId}`);
  }

  securityEngine.applyInterceptors(sess, orgId);

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

  dispatchWindow.webContents.setUserAgent(hardwareProfile?.userAgent || generateStableUA());

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

  dispatchWindow.on('close', () => {
    proxyManager.stopHealthCheck(sessionId);
    proxyManager.clearKillSwitch(sessionId);
    activeSessions.delete(sessionId);
    sessionLocalStorageMap.delete(partitionId);
    broadcastSessionUpdate();
    endSessionOnBackend(sessionId);
  });

  const lsData = localStorageData || '{}';
  activeSessions.set(sessionId, {
    window: dispatchWindow,
    orgId,
    userId,
    partitionId,
    proxyString,
    targetUrl,
    localStorageData: lsData,
    startTime: Date.now(),
    heartbeatTimer: null
  });
  // Register partition -> localStorage mapping for fast IPC lookup
  sessionLocalStorageMap.set(partitionId, lsData);

  if (proxyString) {
    proxyManager.startContinuousHealthCheck(sessionId, proxyString, dispatchWindow, {
      username: config.proxyUsername,
      password: config.proxyPassword
    });
  }
  startHeartbeatMonitor(sessionId);
  broadcastSessionUpdate();

  const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');
  const wrapperPath = path.join(__dirname, '..', 'renderer', 'dist', 'dispatcher.html');
  const maxTabs = store.get('maxTabs') || 5;
  // URL-encode partitionId so the 'persist:' prefix (colon) doesn't break URL parsing
  const wrapperUrl = `file://${wrapperPath}?partition=${encodeURIComponent(partitionId)}&url=${encodeURIComponent(targetUrl)}&preload=${encodeURIComponent(preloadPath)}&maxTabs=${maxTabs}`;
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
  const platform = 'Win32';
  const platformVersion = '10.0.0';
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
        proxyManager.activateKillSwitch(sessionId, sessionData.window);
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
      proxyManager.activateKillSwitch(sessionId, sessionData.window);
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
    const token = store.get('authToken');
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
      const activeProxy = data.proxies?.find(p => p.status === 'ACTIVE');
      return activeProxy || null;
    }
  } catch (err) {
    console.error('[ZONIX Main] Failed to fetch proxy for org:', orgId, err.message);
  }
  return null;
}

function registerIPC() {
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.on('get-session-org-id', (event) => {
    event.returnValue = store.get('orgId') || 'zonix-system';
  });

  ipcMain.on('get-session-local-storage', (event) => {
    // Identify the sender's session by comparing session objects directly.
    // event.sender.session is the actual Session object of the WebContents (or guest webview).
    const senderSession = event.sender.session;
    let foundData = '{}';

    // Fast path: iterate known partitions and compare session object identity
    for (const [partitionId, lsData] of sessionLocalStorageMap) {
      try {
        const partSess = session.fromPartition(partitionId);
        if (partSess === senderSession) {
          foundData = lsData;
          console.log(`[ZONIX Main] IPC get-session-local-storage: matched partition "${partitionId}". Keys: ${Object.keys(JSON.parse(foundData || '{}')).length}`);
          break;
        }
      } catch (e) {}
    }

    if (foundData === '{}') {
      console.warn('[ZONIX Main] IPC get-session-local-storage: no session match found for sender.');
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
         store.set('orgId', actualOrgId);
         store.set('userId', result.user.id);
         store.set('userRole', result.user.role);
         store.set('targetUrl', result.organization.targetUrl || '');
         store.set('maxTabs', result.organization.maxTabs || 5);
         connectWebSocket();
        
        setTimeout(() => {
          try {
            if (result.user.role === 'DISPATCHER') {
              createSyncWindow(actualOrgId, result.user.id, result.organization.targetUrl || '');
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

  ipcMain.handle('dispatch:launch', async (event, { targetUrl }) => {
    const orgId = store.get('orgId');
    const userId = store.get('userId');
    const token = getAuthToken();
    const sessionId = uuidv4();

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
        try { targetDomain = new URL(targetUrl).hostname; } catch (e) {}
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
          targetUrl,
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
        proxyString: activeProxyString,
        proxyUsername,
        proxyPassword,
        cookies: cookiesObj.cookies || [],
        localStorageData: cookiesObj.localStorage || '{}',
        targetUrl,
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

    const token = store.get('authToken');
    const proxyNode = await getActiveProxyForOrg(targetOrgId, token);

    // Use a temporary isolated partition for the capture browser to prevent SQLite locks
    const partitionId = `temp_capture_${targetOrgId}_user_${targetUserId}`;
    const sess = session.fromPartition(partitionId);

    // Clear old cookies from the temp capture session so the admin gets a clean login screen
    await sess.clearStorageData({ storages: ['cookies'] });

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
      await sess.setProxy({ proxyRules: 'direct://' });
      console.log('[ZONIX Main] No proxy configured for org, capture window using direct connection');
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

    const handleCookieChange = async (event, cookie, cause, removed) => {
      try {
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
            localStorage: lastCapturedLocalStorage
          })
        });
        console.log(`[ZONIX Main] Live synced ${serializedCookies.length} cookies & localStorage for user ${targetUserId}`);
      } catch (err) {
        console.error('[ZONIX Main] Live cookie/storage sync failed:', err.message);
      }
    };

    sess.cookies.on('changed', handleCookieChange);

    let isCaptured = false;
    let localStorageData = '{}';
    captureWindow.on('close', async (e) => {
      if (isCaptured) return;
      e.preventDefault();
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
        }
      } catch (err) {
        console.error('[ZONIX Main] Final localStorage capture failed:', err.message);
      }

      if (!localStorageData || localStorageData === '{}') {
        localStorageData = lastCapturedLocalStorage;
      }
      isCaptured = true;
      captureWindow.close();
    });

    // Wait until the admin logs in and manually closes the window
    await new Promise((resolve) => {
      captureWindow.on('closed', () => {
        sess.cookies.removeListener('changed', handleCookieChange);
        resolve();
      });
    });

    const allCookies = await sess.cookies.get({});

    // Clean up temporary capture session storage
    await sess.clearStorageData({ storages: ['cookies'] });

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
      activeDispatcherSession.localStorageData = localStorageData || '{}';

      // Notify the dispatcher's window to hide the overlay and resume
      activeDispatcherSession.window.webContents.send('session:resume');
    }

    let targetDomain = '';
    try {
      targetDomain = new URL(targetUrl).hostname;
    } catch (e) {
      console.error(e);
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

    return { success: true, cookies: serializedCookies, localStorageData, targetDomain };
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
    if (win) win.close();
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

function setupAutoUpdater() {
  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  let updateWindow = null;

  function createUpdateWindow(newVersion) {
    if (updateWindow) return;
 
    updateWindow = new BrowserWindow({
      width: 460,
      height: 560,
      frame: false,
      transparent: false,
      resizable: false,
      alwaysOnTop: true,
      center: true,
      show: false,
      title: 'ZONIX Update',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      },
      backgroundColor: '#0b0f1e'
    });
 
    updateWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'update.html'));
    updateWindow.setMenu(null);
 
    updateWindow.webContents.on('did-finish-load', () => {
      updateWindow.show();
      updateWindow.webContents.send('update:info', {
        newVersion,
        currentVersion: app.getVersion()
      });
    });
 
    updateWindow.on('closed', () => { updateWindow = null; });
  }

  // IPC handlers for update window buttons
  ipcMain.on('update:start', async () => {
    try {
      console.log('[Updater] start download requested');
      await autoUpdater.downloadUpdate();
      console.log('[Updater] downloadUpdate call initiated successfully');
    } catch (err) {
      console.error('[Updater] downloadUpdate failed to start:', err.message);
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
    console.log('[Updater] Update available:', info.version);
    createUpdateWindow(info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] Up to date.');
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.webContents.send('update:error', err.message || 'Download failed');
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
    console.log('[Updater] Download complete. Installing...');
    if (updateWindow && !updateWindow.isDestroyed()) {
      updateWindow.close();
    }
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[Updater] Failed to check for updates:', err.message);
  });
}


app.whenReady().then(async () => {
  proxyManager = new ProxyManager();
  securityEngine = new SecurityEngine();

  // Set app icon for taskbar / dock
  const appIconPath = path.join(__dirname, '..', 'renderer', 'public', 'logo.png');
  app.setAppUserModelId('com.zonix.dispatcher');
  if (app.dock) app.dock.setIcon(appIconPath); // macOS

  createTray();
  registerIPC();
  setupAutoUpdater();

  // Clear any cached session on startup so they always see the login page
  store.delete('authToken');
  store.delete('orgId');
  store.delete('userId');
  store.delete('userRole');
  store.delete('targetUrl');
  store.delete('maxTabs');

  createAuthWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
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
