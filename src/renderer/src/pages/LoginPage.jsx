import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Radio, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, error } = useAuth();
  const [orgId, setOrgId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(orgId, username, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zonix-base">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-zonix-cyan/10 border border-zonix-cyan/30 flex items-center justify-center zonix-glow-cyan">
            <Radio className="w-8 h-8 text-zonix-cyan" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-zonix-cyan">ZONIX</h1>
          <p className="text-xs text-zonix-text-muted mt-1 tracking-wider">MULTI-TENANT DISPATCHER SYSTEM</p>
        </div>

        <div className="zonix-card p-6">
          <h2 className="text-sm font-semibold text-zonix-text mb-6 tracking-wide">SYSTEM ACCESS</h2>

          {error && (
            <div className="mb-4 p-3 rounded bg-zonix-crimson/10 border border-zonix-crimson/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-zonix-crimson flex-shrink-0" />
              <p className="text-xs text-zonix-crimson">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-zonix-text-dim mb-1.5 font-mono">ORG_ID</label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="zonix-input w-full font-mono"
                placeholder="e.g. alpha-team"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-zonix-text-dim mb-1.5 font-mono">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="zonix-input w-full font-mono"
                placeholder="e.g. admin"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-zonix-text-dim mb-1.5 font-mono">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="zonix-input w-full font-mono"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !orgId || !username || !password}
              className="zonix-btn-primary w-full mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-zonix-cyan border-t-transparent rounded-full animate-spin"></div>
                  AUTHENTICATING...
                </span>
              ) : (
                'INITIALIZE SESSION'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-zonix-text-muted mt-6 font-mono">
          ZONIX DISPATCHER v{window.zonixAPI?.appVersion || '1.1.0'} // ENCRYPTED CHANNEL
        </p>
      </div>
    </div>
  );
}
