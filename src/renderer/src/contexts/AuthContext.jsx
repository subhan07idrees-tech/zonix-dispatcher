import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

const AuthContext = createContext(null);

const API_BASE = window.location.protocol === 'file:' ? 'https://zonix-backend-ouhi.onrender.com/api' : '/api';

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
        } else {
          localStorage.removeItem('zonix_token');
          setToken(null);
          setUser(null);
          if (window.zonixAPI) {
            await window.zonixAPI.setConfig('authToken', null);
          }
        }
      } catch (err) {
        console.error('[Auth] Token verification failed:', err);
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

  const authFetch = async (url, options = {}) => {
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
  };

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
    showAlert,
    showConfirm
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 select-none animate-[fadeIn_0.15s_ease-out]">
          <div className="zonix-card max-w-md w-full border border-zonix-border/80 p-6 shadow-2xl bg-zonix-surface flex flex-col relative animate-[scaleIn_0.2s_ease-out]">
            
            {/* Header / Title */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="flex-shrink-0 mt-0.5">
                {dialog.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                {dialog.variant === 'error' && <AlertCircle className="w-5 h-5 text-zonix-crimson" />}
                {dialog.variant === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                {dialog.variant === 'info' && <Info className="w-5 h-5 text-zonix-cyan" />}
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold tracking-wider text-zonix-text uppercase font-mono">
                  {dialog.title}
                </h3>
                <div className="text-xs text-zonix-text-dim mt-2 leading-relaxed font-mono whitespace-pre-line">
                  {dialog.message}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-2.5 mt-5">
              {dialog.type === 'confirm' && (
                <button
                  onClick={dialog.onCancel}
                  className="zonix-btn-ghost text-xs font-mono py-1.5 px-4"
                >
                  CANCEL
                </button>
              )}
              <button
                onClick={dialog.onConfirm}
                className={`text-xs font-mono py-1.5 px-5 rounded font-bold border transition-all ${
                  dialog.variant === 'error'
                    ? 'bg-zonix-crimson/15 border-zonix-crimson/30 hover:bg-zonix-crimson/25 text-zonix-crimson shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                    : dialog.variant === 'success'
                    ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/25 text-green-400'
                    : 'bg-zonix-cyan/15 border-zonix-cyan/30 hover:bg-zonix-cyan/25 text-zonix-cyan shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                }`}
                autoFocus
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
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
