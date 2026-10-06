import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wifi, Plus, Edit2, Trash2, X, Zap, Server } from 'lucide-react';

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
    <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white border border-[#D9DEE7] rounded-lg shadow-lg w-full max-w-md p-6 space-y-5 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#EFF4FA] border border-[#D9DEE7] text-[#245B9E] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#172033]">
              {proxy ? 'Edit Proxy Node' : 'New Proxy Node'}
            </h3>
          </div>
          <button onClick={onClose} className="zonix-btn-ghost p-1 h-auto">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Node Label</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="zonix-input w-full text-xs"
              placeholder="e.g. proxy-eu-west"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#172033] mb-1">Host Address</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className="zonix-input w-full text-xs font-mono"
                placeholder="eu-west.proxy.example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#172033] mb-1">Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
                className="zonix-input w-full text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#172033] mb-1">Protocol</label>
              <select
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                className="zonix-select w-full text-xs"
              >
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SOCKS5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#172033] mb-1">Max Sessions</label>
              <input
                type="number"
                value={form.maxSessions}
                onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value) })}
                className="zonix-input w-full text-xs font-mono"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Username (Optional)</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Password (Optional)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#D9DEE7]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              {loading ? 'Saving Node...' : 'Save Proxy Node'}
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
  const [testResults, setTestResults] = useState({});

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
      setProxies(data.proxies || data.proxyNodes || []);
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
    const confirmed = await showConfirm('Delete this proxy node?', 'Delete Proxy Node', 'error');
    if (!confirmed) return;
    try {
      await authFetch(`/proxies/${selectedOrg}/${proxyId}`, { method: 'DELETE' });
      fetchProxies();
    } catch (err) {
      console.error(err);
    }
  };

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
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DEE7] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#172033] tracking-tight flex items-center gap-2">
            Proxy Nodes &amp; Infrastructure
            <span className="zonix-badge-cyan text-[11px]">Static Tunnel</span>
          </h2>
          <p className="text-xs text-[#667085] mt-1">Dedicated US proxy pools, IP latency telemetry, and worker allocation limits</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#667085]">Org:</span>
              <select
                value={selectedOrg}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedOrg(e.target.value);
                }}
                className="zonix-select text-xs py-1 h-[36px]"
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
            className="zonix-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Proxy Node</span>
          </button>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-xs text-[#667085]">
            <div className="w-5 h-5 border-2 border-[#245B9E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading proxy node infrastructure...
          </div>
        ) : proxies.length === 0 ? (
          <div className="col-span-3 zonix-card p-12 text-center text-xs text-[#667085] space-y-2">
            <Wifi className="w-8 h-8 text-[#98A2B3] mx-auto" />
            <p className="font-semibold text-[#172033]">No proxy nodes configured</p>
            <p className="text-[#667085]">Add a dedicated proxy node to assign static tunnels to dispatchers.</p>
          </div>
        ) : (
          proxies.map((proxy) => {
            return (
              <div key={proxy.id} className="zonix-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-[#EFF4FA] border border-[#D9DEE7] text-[#245B9E] flex items-center justify-center font-bold">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-[#172033]">{proxy.name}</h3>
                      <span className="text-[10px] font-mono text-[#667085] uppercase">{proxy.protocol} Tunnel</span>
                    </div>
                  </div>
                  <span className={`zonix-badge ${
                    proxy.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${proxy.status === 'ACTIVE' ? 'bg-[#2E7D5B]' : 'bg-[#B7791F]'}`} />
                    {proxy.status === 'ACTIVE' ? 'Active' : proxy.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#172033] font-mono bg-[#F8FAFC] p-3 rounded-md border border-[#D9DEE7]">
                  <p className="text-[#245B9E] font-semibold truncate">{proxy.protocol.toLowerCase()}://{proxy.host}:{proxy.port}</p>
                  {proxy.username && <p className="text-[#667085] text-[11px]">User: {proxy.username}</p>}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-[#667085]">
                    <span>Active Capacity:</span>
                    <span className="text-[#172033] font-bold">{proxy._count?.sessions || 0} / {proxy.maxSessions} sessions</span>
                  </div>
                  
                  {proxy.lastHealthCheck && (
                    <p className={`text-[11px] font-sans pt-1 ${proxy.lastHealthCheck.status === 'ACTIVE' ? 'text-[#2E7D5B]' : 'text-[#B54747]'}`}>
                      Latency: <span className="font-mono font-bold">{proxy.lastHealthCheck.latencyMs != null && proxy.lastHealthCheck.latencyMs >= 0 ? `${proxy.lastHealthCheck.latencyMs}ms` : 'Failed'}</span>
                    </p>
                  )}
                  {testResults[proxy.id] && !testResults[proxy.id].testing && (
                    <p className={`text-[11px] font-sans pt-1 ${testResults[proxy.id].reachable ? 'text-[#2E7D5B]' : 'text-[#B54747]'}`}>
                      {testResults[proxy.id].reachable
                        ? `✓ Reachable (${testResults[proxy.id].latencyMs}ms)`
                        : `✗ ${testResults[proxy.id].error || 'Unreachable'}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#D9DEE7]">
                  <button
                    onClick={() => handleTest(proxy)}
                    disabled={testResults[proxy.id]?.testing}
                    title="Test node ping"
                    className="zonix-btn-secondary py-1 px-3 text-xs h-[32px]"
                  >
                    {testResults[proxy.id]?.testing ? (
                      <div className="w-3.5 h-3.5 border border-[#245B9E] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-[#B7791F]" />
                        <span>Ping Node</span>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingProxy(proxy); setShowModal(true); }}
                      className="zonix-btn-secondary py-1 px-2.5 text-xs h-[32px]"
                      title="Edit node"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#667085]" />
                    </button>
                    <button
                      onClick={() => handleDelete(proxy.id)}
                      className="zonix-btn-danger py-1 px-2.5 text-xs h-[32px]"
                      title="Delete node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
