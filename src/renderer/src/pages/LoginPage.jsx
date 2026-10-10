import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ZonixLogo from '../components/ZonixLogo';
import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck, Building2, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const { login, error } = useAuth();
  const [mode, setMode] = useState('org'); // 'org' | 'superadmin'
  const [orgId, setOrgId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(mode === 'superadmin' ? '' : orgId, username, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 select-none relative overflow-hidden">
      {/* Subtle Structural Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Atmospheric Soft Ambient Center Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#1E40AF]/5 to-transparent blur-3xl pointer-events-none -top-20 -left-20 animate-pulse-slow" />
      <div className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-br from-[#38BDF8]/5 to-transparent blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse-slow" />

      <div className="w-full max-w-[430px] space-y-6 relative z-10 animate-page-slide">
        {/* Brand Header with Custom Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-[#1E40AF]/10 blur-lg pointer-events-none animate-pulse-slow" />
              <ZonixLogo size={50} showText={false} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-widest text-[#0F172A] font-mono">
              ZONIX
            </h1>
            <p className="text-xs text-[#64748B] mt-1 font-medium">
              System Control &amp; Dispatch Administration Gateway
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className={`bg-white border border-[#E2E8F0] rounded-xl p-7 shadow-modal space-y-5 relative transition-all duration-200 ${shake ? 'animate-card-shake border-[#FECACA]' : ''}`}>
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
            <h2 className="text-xs font-semibold text-[#0F172A] flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#1E40AF]" />
              Console Authentication
            </h2>
            <span className="zonix-badge-active text-[10px] font-bold">
              TLS Encrypted
            </span>
          </div>

          {/* Role Mode Segmented Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('org')}
              className={`py-1.5 px-3 rounded-md transition-all duration-150 flex items-center justify-center gap-1.5 ${
                mode === 'org'
                  ? 'bg-white text-[#0F172A] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#1E40AF]" />
              <span>Org Dispatcher</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('superadmin'); setOrgId(''); }}
              className={`py-1.5 px-3 rounded-md transition-all duration-150 flex items-center justify-center gap-1.5 ${
                mode === 'superadmin'
                  ? 'bg-white text-[#0F172A] shadow-xs font-bold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#1E40AF]" />
              <span>Super Admin</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 animate-modal-content">
              <AlertCircle className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-[#991B1B] leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'org' ? (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#0F172A]">Organization ID</label>
                  <span className="text-[11px] text-[#64748B] font-mono">Assigned Tenant</span>
                </div>
                <input
                  type="text"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="zonix-input w-full font-mono text-xs"
                  placeholder="e.g. alpha-team"
                  required
                />
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2 text-xs text-[#64748B] animate-fadeIn">
                <ShieldCheck className="w-4 h-4 text-[#047857] flex-shrink-0" />
                <span className="font-medium">Direct Root Console Access (Multi-Tenant Scope)</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="zonix-input w-full text-xs font-medium"
                placeholder={mode === 'superadmin' ? 'superadmin' : 'username or email'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="zonix-input w-full pr-10 text-xs font-mono"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password || (mode === 'org' && !orgId)}
              className="zonix-btn-primary w-full h-[40px] text-xs font-bold mt-2 tracking-wide shadow-xs active:scale-[0.985] transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In to Console'
              )}
            </button>
          </form>

          <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
            <span className="flex items-center gap-2 text-[#047857] font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#047857]" />
              </span>
              Direct Node Gateway
            </span>
            <span className="font-mono text-[#64748B]">Multi-Tenant v{window.zonixAPI?.appVersion || '1.9.9'}</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#64748B] font-mono">
          ZONIX Dispatcher v{window.zonixAPI?.appVersion || '1.9.9'}
        </p>
      </div>
    </div>
  );
}
