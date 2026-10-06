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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4 select-none">
      <div className="w-full max-w-md space-y-6 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-lg bg-[#172033] flex items-center justify-center shadow-sm">
            <span className="text-white text-xl font-bold font-mono">Z</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-[#172033] uppercase font-mono">
              ZONIX
            </h1>
            <p className="text-xs text-[#667085] tracking-wide mt-0.5">
              System Control & Administration Gateway
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#D9DEE7] rounded-lg p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3">
            <h2 className="text-xs font-semibold text-[#172033] tracking-wider uppercase font-mono flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#245B9E]" />
              Console Authentication
            </h2>
            <span className="zonix-badge-cyan text-[10px]">AES-256</span>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-[#FEE2E2] border border-[#FCA5A5] flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-[#B54747] flex-shrink-0" />
              <p className="text-xs font-medium text-[#B54747]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#344054] mb-1 font-mono">Organization ID</label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="zonix-input w-full"
                placeholder="e.g. alpha-team"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#344054] mb-1 font-mono">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="zonix-input w-full"
                placeholder="e.g. admin"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#344054] mb-1 font-mono">Password</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#172033] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !orgId || !username || !password}
              className="zonix-btn-primary w-full py-2 text-xs font-semibold mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                'Sign In to Console'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#98A2B3] font-mono tracking-wide">
          ZONIX Dispatcher v{window.zonixAPI?.appVersion || '1.8.17'} // Enterprise Infrastructure Node
        </p>
      </div>
    </div>
  );
}
