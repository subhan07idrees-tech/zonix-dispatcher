import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ZonixLogo from '../components/ZonixLogo';
import { AlertCircle, Eye, EyeOff, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const { login, error } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [orgId, setOrgId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(orgId, username, password);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg p-4 select-none">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-ctl bg-surface border border-line text-ink-2 hover:text-ink hover:bg-surface-hover transition-colors"
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
        </button>
      </div>

      <div className="w-full max-w-[360px] space-y-6">
        {/* Header with Centered Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <ZonixLogo size={44} showText={false} dark={isDark} />
          </div>
          <h1 className="text-[20px] font-semibold text-ink tracking-tight">
            Sign in to ZONIX
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            System control and dispatch console
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-card p-8">
          {error && (
            <div className="mb-4 p-3 rounded-ctl bg-err-bg border border-line-input flex items-start gap-2 text-xs text-err-ink font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-err" strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization ID */}
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">
                Organization ID
              </label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="zx-input w-full font-mono text-[13px]"
                placeholder="Tenant ID (leave blank for root console)"
                autoComplete="organization"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">
                Username or email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="zx-input w-full text-[13px]"
                placeholder="Username or email"
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="zx-input w-full pr-9 font-mono text-[13px]"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink p-1 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-accent accent-accent border-line-input focus:ring-0 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-[13px] text-ink-2 cursor-pointer select-none">
                Remember this workstation
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="zx-btn-primary w-full h-[40px] text-sm font-medium mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in…</span>
                </span>
              ) : (
                'Sign in to console'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-ink-3">
          <span className="w-1.5 h-1.5 rounded-full bg-ok" />
          <span>Node gateway online · Multi-tenant</span>
        </div>
      </div>
    </div>
  );
}
