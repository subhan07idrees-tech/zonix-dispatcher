import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ZonixLogo from '../components/ZonixLogo';
import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, error } = useAuth();
  const [orgId, setOrgId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(orgId, username, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 select-none relative overflow-hidden">
      {/* Subtle Structural Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="w-full max-w-[420px] space-y-6 relative z-10 animate-modal-content">
        {/* Brand Header with Custom Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <ZonixLogo size={48} showText={false} />
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
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-7 shadow-card space-y-5 relative">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
            <h2 className="text-xs font-semibold text-[#0F172A] flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#1E40AF]" />
              Console Authentication
            </h2>
            <span className="zonix-badge-active text-[10px] font-bold">
              TLS Encrypted
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 animate-modal-content">
              <AlertCircle className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-[#991B1B] leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#0F172A]">Organization ID</label>
                <span className="text-[11px] text-[#64748B] font-mono">Blank for Super Admin</span>
              </div>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="zonix-input w-full font-mono text-xs"
                placeholder="e.g. alpha-team"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="zonix-input w-full text-xs font-medium"
                placeholder="admin or superadmin"
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="zonix-btn-primary w-full h-[40px] text-xs font-bold mt-2 tracking-wide"
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
            <span className="flex items-center gap-1.5 text-[#047857] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
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
