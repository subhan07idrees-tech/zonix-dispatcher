import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wifi, Plus, Edit2, Trash2, X, Activity, Circle, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

function ProxyModal({ proxy, orgId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: proxy?.name || '',
    host: proxy?.host || '',
    port: proxy?.port || 8080,
    protocol: proxy?.protocol || 'HTTP',
    username: proxy?.username || '',
    password: '',
    maxSessions: proxy?.maxSessions || 10
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="zonix-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold tracking-wide">
            {proxy ? 'EDIT PROXY NODE' : 'NEW PROXY NODE'}
          </h3>
          <button onClick={onClose} className="text-zonix-text-dim hover:text-zonix-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">NAME</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="zonix-input w-full font-mono"
              placeholder="e.g. proxy-us-east"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-zonix-text-dim mb-1 font-mono">HOST</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className="zonix-input w-full font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zonix-text-dim mb-1 font-mono">PORT</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
                className="zonix-input w-full font-mono"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zonix-text-dim mb-1 font-mono">PROTOCOL</label>
              <select
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                className="zonix-input w-full font-mono"
              >
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SOCKS5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zonix-text-dim mb-1 font-mono">MAX SESSIONS</label>
              <input
                type="number"
                value={form.maxSessions}
                onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value) })}
                className="zonix-input w-full font-mono"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">USERNAME (optional)</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="zonix-input w-full font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">
              PASSWORD (optional)
              {proxy?.username && (
                <span className="ml-2 text-yellow-400 normal-case font-sans">
                  ⚠ Re-enter to update
                </span>
              )}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="zonix-input w-full font-mono"
              placeholder={proxy?.username ? 'Enter password again to apply proxy auth' : ''}
            />
            {proxy?.username && (
              <p className="text-xs text-yellow-400/80 mt-1 font-mono">
                ↑ Required for proxy authentication to work correctly
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="zonix-btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1">
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProxiesPage() {
  const { authFetch, user, showConfirm, showAlert } = useAuth();
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProxy, setEditingProxy] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(user?.orgId || '');
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      fetchOrgs();
    }
  }, [user]);

  useEffect(() => {
    if (selectedOrg) {
      fetchProxies();
    }
  }, [selectedOrg]);

  const fetchOrgs = async () => {
    try {
      const res = await authFetch('/organizations');
      const data = await res.json();
      setOrgs(data.organizations || []);
      if (data.organizations?.length > 0 && !selectedOrg) {
        setSelectedOrg(data.organizations[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProxies = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/proxies/${selectedOrg}`);
      const data = await res.json();
      setProxies(data.proxies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form) => {
    try {
      let res;
      if (editingProxy) {
        res = await authFetch(`/proxies/${selectedOrg}/${editingProxy.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        res = await authFetch(`/proxies/${selectedOrg}`, {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        showAlert(errorData.error || 'Failed to save proxy node', 'ERROR', 'error');
        return;
      }

      setShowModal(false);
      setEditingProxy(null);
      fetchProxies();
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'ERROR', 'error');
    }
  };

  const handleDelete = async (proxyId) => {
    const confirmed = await showConfirm('Delete this proxy node?', 'DELETE PROXY NODE', 'error');
    if (!confirmed) return;
    try {
      await authFetch(`/proxies/${selectedOrg}/${proxyId}`, { method: 'DELETE' });
      fetchProxies();
    } catch (err) {
      console.error(err);
    }
  };

  const [testResults, setTestResults] = useState({}); // proxyId -> { reachable, latencyMs, error, testing }

  const handleTest = async (proxy) => {
    setTestResults(prev => ({ ...prev, [proxy.id]: { testing: true } }));
    try {
      const res = await authFetch(`/proxies/${selectedOrg}/${proxy.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [proxy.id]: { testing: false, ...data } }));
      fetchProxies(); // refresh status badge
    } catch (err) {
      setTestResults(prev => ({ ...prev, [proxy.id]: { testing: false, reachable: false, error: err.message } }));
    }
  };

  const statusConfig = {
    ACTIVE: { color: 'zonix-badge-active', dot: 'text-zonix-cyan' },
    DEGRADED: { color: 'zonix-badge-warning', dot: 'text-yellow-400' },
    UNREACHABLE: { color: 'zonix-badge-error', dot: 'text-zonix-crimson' },
    MAINTENANCE: { color: 'zonix-badge-purple', dot: 'text-zonix-purple' }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-wide">PROXY NODES</h2>
          <p className="text-xs text-zonix-text-dim mt-0.5">Static proxy infrastructure & health monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zonix-text-dim font-mono">ORG:</span>
              <select
                value={selectedOrg}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedOrg(e.target.value);
                }}
                className="zonix-input font-mono bg-zonix-surface"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.displayName} ({org.name})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={() => { setEditingProxy(null); setShowModal(true); }} className="zonix-btn-primary">
            <Plus className="w-4 h-4 mr-1.5 inline" /> NEW PROXY
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center">
            <div className="w-6 h-6 border-2 border-zonix-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-zonix-text-dim font-mono">LOADING PROXIES...</p>
          </div>
        ) : proxies.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-xs text-zonix-text-muted font-mono">
            NO PROXY NODES CONFIGURED
          </div>
        ) : (
          proxies.map((proxy) => {
            const sc = statusConfig[proxy.status] || statusConfig.ACTIVE;
            return (
              <div key={proxy.id} className="zonix-card-hover p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-zonix-cyan" />
                    <h3 className="text-sm font-semibold">{proxy.name}</h3>
                  </div>
                  <span className={`zonix-badge ${sc.color}`}>
                    <Circle className={`w-2 h-2 fill-current mr-1 ${sc.dot}`} />
                    {proxy.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-zonix-text-dim">
                  <p>{proxy.protocol}://{proxy.host}:{proxy.port}</p>
                  {proxy.username && <p>User: {proxy.username}</p>}
                  <p>Sessions: {proxy._count?.sessions || 0}/{proxy.maxSessions}</p>
                  {proxy.lastHealthCheck && (
                    <p className={proxy.lastHealthCheck.status === 'ACTIVE' ? 'text-green-400' : 'text-zonix-crimson'}>
                      Last check: {proxy.lastHealthCheck.latencyMs != null && proxy.lastHealthCheck.latencyMs >= 0
                        ? `${proxy.lastHealthCheck.latencyMs}ms`
                        : 'failed'}
                    </p>
                  )}
                  {testResults[proxy.id] && !testResults[proxy.id].testing && (
                    <p className={testResults[proxy.id].reachable ? 'text-green-400' : 'text-zonix-crimson'}>
                      {testResults[proxy.id].reachable
                        ? `✓ Reachable — ${testResults[proxy.id].latencyMs}ms`
                        : `✗ ${testResults[proxy.id].error || 'Unreachable'}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-zonix-border/50">
                  <button
                    onClick={() => handleTest(proxy)}
                    disabled={testResults[proxy.id]?.testing}
                    title="Test proxy connectivity"
                    className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-cyan disabled:opacity-50"
                  >
                    {testResults[proxy.id]?.testing
                      ? <div className="w-3.5 h-3.5 border border-zonix-cyan border-t-transparent rounded-full animate-spin" />
                      : <Zap className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setEditingProxy(proxy); setShowModal(true); }}
                    className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-cyan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(proxy.id)}
                    className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-crimson"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <ProxyModal
          proxy={editingProxy}
          orgId={selectedOrg}
          onClose={() => { setShowModal(false); setEditingProxy(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
