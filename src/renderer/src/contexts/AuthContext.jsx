import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

const AuthContext = createContext(null);

const API_BASE = (window.zonixAPI && window.zonixAPI.backendUrl) ? `${window.zonixAPI.backendUrl}/api` : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:4000/api' : 'https://zonix-backend-0ggt.onrender.com/api');

// Module-level in-memory SWR cache for instant page switching (0ms latency)
const apiCache = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds fresh window

export function clearApiCache() {
  apiCache.clear();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('zonix_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);

  const showAlert = useCallback((message, title = 'SYSTEM NOTIFICATION', variant = 'info') => {
    return new Promise((resolve) => {
      setDialog({
        type: 'alert',
        title,
        message,
        variant,
        onConfirm: () => {
          setDialog(null);
          resolve();
        }
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = 'CONFIRM ACTION', variant = 'warning') => {
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        title,
        message,
        variant,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      let activeToken = token;

      if (window.zonixAPI) {
        try {
          const electronToken = await window.zonixAPI.getConfig('authToken');
          if (electronToken) {
            localStorage.setItem('zonix_token', electronToken);
            setToken(electronToken);
            activeToken = electronToken;
          }
        } catch (e) {
          console.error('[Auth] Failed to load token from Electron:', e);
        }
      }

      if (!activeToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else if (response.status === 401) {
          // Only invalidate token if server explicitly confirms it is invalid (401)
          console.warn('[Auth] Token invalid (401). Logging out.');
          localStorage.removeItem('zonix_token');
          setToken(null);
          setUser(null);
          if (window.zonixAPI) {
            await window.zonixAPI.setConfig('authToken', null);
          }
        } else {
          // Server transient error (500/502/503/504) - preserve token and retain user session context from token decode if available
          console.warn(`[Auth] Backend verify returned status ${response.status}. Retaining session token.`);
        }
      } catch (err) {
        console.error('[Auth] Token verification connection failed (network/offline):', err.message);
        // Do not clear token on connection error
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (orgId, username, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('zonix_token', data.token);
        if (window.zonixAPI) {
          await window.zonixAPI.setConfig('authToken', data.token);
          await window.zonixAPI.setConfig('orgId', orgId);
          await window.zonixAPI.setConfig('userId', username);
        }
        setToken(data.token);
        setUser(data.user);
        setOrganization(data.organization);
        return { success: true };
      }

      setError(data.error || 'Login failed');
      return { success: false, error: data.error };
    } catch (err) {
      const errorMsg = 'Connection failed. Is the backend running?';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    localStorage.removeItem('zonix_token');
    apiCache.clear();
    setToken(null);
    setUser(null);
    setOrganization(null);
    if (window.zonixAPI) {
      try {
        await window.zonixAPI.logout();
      } catch (e) {
        console.error('[Auth] Failed to call Electron logout:', e);
      }
    }
  };

  const authFetch = useCallback(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const cacheKey = `${url}?token=${token || ''}`;

    // On mutations (POST, PUT, DELETE, PATCH), invalidate cache immediately to prevent stale UI state
    if (method !== 'GET') {
      apiCache.clear();
      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired');
      }

      return response;
    }

    // For GET requests: check if active fresh cache entry exists
    if (!options.skipCache && apiCache.has(cacheKey)) {
      const entry = apiCache.get(cacheKey);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return new Response(JSON.stringify(entry.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired');
    }

    if (response.ok) {
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
      } catch (e) {
        // Non-JSON response, ignore caching
      }
    }

    return response;
  }, [token]);

  const value = {
    user,
    organization,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    authFetch,
    clearCache: clearApiCache,
    showAlert,
    showConfirm
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialog && createPortal(
        <div className="fixed inset-0 bg-[#0A0F1D]/75 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 select-none animate-modal-backdrop" onClick={dialog.type === 'confirm' ? dialog.onCancel : undefined}>
          <div className="bg-white border border-[#CBD5E1] rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col relative animate-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Header / Title */}
            <div className="flex items-start gap-3.5 mb-3">
              <div className="flex-shrink-0 mt-0.5">
                {dialog.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-[#047857]" />}
                {dialog.variant === 'error' && <AlertCircle className="w-5 h-5 text-[#B91C1C]" />}
                {dialog.variant === 'warning' && <AlertTriangle className="w-5 h-5 text-[#B45309]" />}
                {dialog.variant === 'info' && <Info className="w-5 h-5 text-[#1E40AF]" />}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {dialog.title}
                </h3>
                <div className="text-xs text-[#475569] mt-2 leading-relaxed whitespace-pre-line font-medium">
                  {dialog.message}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-[#E2E8F0]">
              {dialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={dialog.onCancel}
                  className="zonix-btn-secondary text-xs h-[34px] px-3.5"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={dialog.onConfirm}
                className={dialog.variant === 'error' ? 'zonix-btn-danger text-xs h-[34px] px-4' : 'zonix-btn-primary text-xs h-[34px] px-4'}
                autoFocus
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
