import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4 select-none">
      <div className="w-full max-w-[420px] space-y-4 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-lg bg-[#172033] flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold font-mono">Z</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              ZONIX Console
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">
              System Control & Administration Gateway
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#D9DEE7] rounded-xl p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h2 className="text-xs font-semibold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#245B9E]" />
              Console Authentication
            </h2>
            <span className="zonix-badge-active text-[10px]">TLS Encrypted</span>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B54747] flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-[#991B1B] leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#334155]">Organization ID</label>
                <span className="text-[11px] text-[#94A3B8]">Blank for Super Admin</span>
              </div>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="zonix-input w-full"
                placeholder="e.g. alpha-team"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="zonix-input w-full"
                placeholder="admin or superadmin"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="zonix-input w-full pr-10"
                  placeholder="Enter password"
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
              className="zonix-btn-primary w-full h-[40px] text-xs font-semibold mt-2"
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
            <span className="flex items-center gap-1.5 text-[#059669] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              Direct Node Gateway
            </span>
            <span>Enterprise Multi-Tenant</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#94A3B8] font-mono">
          ZONIX Dispatcher v{window.zonixAPI?.appVersion || '1.8.18'}
        </p>
      </div>
    </div>
  );
}
