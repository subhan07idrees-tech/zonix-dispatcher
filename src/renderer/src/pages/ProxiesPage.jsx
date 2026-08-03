import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wifi, Plus, Edit2, Trash2, X, Activity, Zap } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-semibold text-slate-100">
            {proxy ? 'Edit proxy node' : 'New proxy node'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Node label</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-slate-600 focus:outline-none"
              placeholder="e.g. proxy-us-east"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Host address</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
                className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Protocol</label>
              <select
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                className="w-full bg-[#070A10] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:border-slate-600 focus:outline-none"
              >
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SOCKS5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max sessions</label>
              <input
                type="number"
                value={form.maxSessions}
                onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value) })}
                className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Username (optional)</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password (optional)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition">
              {loading ? 'Saving...' : 'Save proxy node'}
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
      const list = data.organizations || [];
      setOrgs(list);
      if (list.length > 0 && !selectedOrg) {
        setSelectedOrg(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProxies = async () => {
    try {
      const res = await authFetch(`/proxies/${selectedOrg}`);
      const data = await res.json();
      setProxies(data.proxyNodes || []);
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
        showAlert(errorData.error || 'Failed to save proxy node', 'Error', 'error');
        return;
      }

      setShowModal(false);
      setEditingProxy(null);
      fetchProxies();
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'Error', 'error');
    }
  };

  const handleDelete = async (proxyId) => {
    const confirmed = await showConfirm('Delete this proxy node?', 'Delete proxy node', 'error');
    if (!confirmed) return;
    try {
      await authFetch(`/proxies/${selectedOrg}/${proxyId}`, { method: 'DELETE' });
      fetchProxies();
    } catch (err) {
      console.error(err);
    }
  };

  const [testResults, setTestResults] = useState({});

  const handleTest = async (proxy) => {
    setTestResults(prev => ({ ...prev, [proxy.id]: { testing: true } }));
    try {
      const res = await authFetch(`/proxies/${selectedOrg}/${proxy.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [proxy.id]: { testing: false, ...data } }));
      fetchProxies();
    } catch (err) {
      setTestResults(prev => ({ ...prev, [proxy.id]: { testing: false, reachable: false, error: err.message } }));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 tracking-normal">Proxy nodes</h2>
          <p className="text-xs text-slate-400 mt-0.5">Static proxy infrastructure and IP ping telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Org:</span>
              <select
                value={selectedOrg}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedOrg(e.target.value);
                }}
                className="bg-[#0D121F] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.displayName} ({org.name})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={() => { setEditingProxy(null); setShowModal(true); }} 
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New proxy node</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-xs text-slate-400">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading proxy nodes...
          </div>
        ) : proxies.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-xs text-slate-400">
            No proxy nodes configured for this organization.
          </div>
        ) : (
          proxies.map((proxy) => {
            return (
              <div key={proxy.id} className="bg-[#0D121F] border border-slate-800/80 rounded-xl p-4 space-y-3 hover:border-slate-700/80 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-semibold text-slate-100">{proxy.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {proxy.status === 'ACTIVE' ? 'Active' : proxy.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400 font-mono">
                  <p className="text-slate-200">{proxy.protocol.toLowerCase()}://{proxy.host}:{proxy.port}</p>
                  {proxy.username && <p className="text-slate-400">user: {proxy.username}</p>}
                  <p className="text-slate-400">sessions: <span className="text-slate-200">{proxy._count?.sessions || 0}</span>/{proxy.maxSessions}</p>
                  
                  {proxy.lastHealthCheck && (
                    <p className={proxy.lastHealthCheck.status === 'ACTIVE' ? 'text-emerald-400 font-sans text-[11px]' : 'text-red-400 font-sans text-[11px]'}>
                      Last check: <span className="font-mono">{proxy.lastHealthCheck.latencyMs != null && proxy.lastHealthCheck.latencyMs >= 0 ? `${proxy.lastHealthCheck.latencyMs}ms` : 'Failed'}</span>
                    </p>
                  )}
                  {testResults[proxy.id] && !testResults[proxy.id].testing && (
                    <p className={testResults[proxy.id].reachable ? 'text-emerald-400 font-sans text-[11px]' : 'text-red-400 font-sans text-[11px]'}>
                      {testResults[proxy.id].reachable
                        ? `✓ Reachable — ${testResults[proxy.id].latencyMs}ms`
                        : `✗ ${testResults[proxy.id].error || 'Unreachable'}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleTest(proxy)}
                    disabled={testResults[proxy.id]?.testing}
                    title="Test proxy connectivity"
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition disabled:opacity-50"
                  >
                    {testResults[proxy.id]?.testing
                      ? <div className="w-3.5 h-3.5 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      : <Zap className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setEditingProxy(proxy); setShowModal(true); }}
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                    title="Edit proxy"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(proxy.id)}
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition"
                    title="Delete proxy"
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
