import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wifi, Plus, Edit2, Trash2, X, Zap, Server, Activity, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#0A0F1D]/75 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-modal-backdrop" onClick={onClose}>
      <div className="relative my-auto w-full max-w-md bg-white border border-[#CBD5E1] rounded-xl shadow-2xl p-6 space-y-5 animate-modal-content max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center">
              <Server className="w-4 h-4 text-[#1E40AF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                {proxy ? 'Edit Proxy Node' : 'Provision Proxy Node'}
              </h3>
              <p className="text-xs text-[#475569]">Configure dedicated static egress tunnel</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Node Label / Identifier</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="zonix-input w-full text-xs font-semibold"
              placeholder="e.g. us-east-residential-01"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Host Address / IP</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className="zonix-input w-full text-xs font-mono"
                placeholder="proxy.residential-pool.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Port</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 8080 })}
                className="zonix-input w-full text-xs font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Tunnel Protocol</label>
              <select
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                className="zonix-select w-full text-xs font-mono font-medium"
              >
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SOCKS5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Max Sessions Quota</label>
              <input
                type="number"
                value={form.maxSessions}
                onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value) || 1 })}
                className="zonix-input w-full text-xs font-mono font-bold"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Username (Optional)</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
              placeholder="proxy-auth-username"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Password (Optional)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
              placeholder={proxy ? 'Leave empty to preserve existing password' : 'proxy-auth-password'}
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#E2E8F0]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              {loading ? 'Saving Node...' : 'Save Proxy Node'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
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
    const confirmed = await showConfirm('Delete this proxy node? Active dispatcher sessions routed through this node may be interrupted.', 'Delete Proxy Node', 'error');
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
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            Proxy Nodes &amp; Infrastructure
            <span className="zonix-badge-cyan text-[11px] font-mono">Dedicated Tunnels</span>
          </h2>
          <p className="text-xs text-[#475569] mt-1 font-medium">
            Dedicated static IP proxy pools, latency telemetry, and concurrent session bandwidth quotas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#475569]">Tenant:</span>
              <select
                value={selectedOrg}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedOrg(e.target.value);
                }}
                className="zonix-select text-xs py-1 h-[36px] font-medium"
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
            className="zonix-btn-primary gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Proxy Node</span>
          </button>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-xs text-[#475569]">
            <div className="w-6 h-6 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-medium">Loading proxy node infrastructure...</p>
          </div>
        ) : proxies.length === 0 ? (
          <div className="col-span-3 zonix-card p-12 text-center text-xs text-[#475569] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center mx-auto text-[#64748B]">
              <Wifi className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-[#0F172A]">No proxy nodes configured</p>
            <p className="text-[#475569] max-w-sm mx-auto">
              Add a dedicated residential or static datacenter proxy node to route load board dispatchers securely.
            </p>
            <button 
              onClick={() => { setEditingProxy(null); setShowModal(true); }} 
              className="zonix-btn-primary inline-flex mt-2 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Provision First Node</span>
            </button>
          </div>
        ) : (
          proxies.map((proxy) => {
            const activeSessions = proxy._count?.sessions || 0;
            const maxSessions = proxy.maxSessions || 10;
            const usagePercent = Math.min(100, Math.round((activeSessions / maxSessions) * 100));
            const testResult = testResults[proxy.id];

            return (
              <div key={proxy.id} className="zonix-card p-5 space-y-4 hover:border-[#94A3B8] transition-all duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center font-bold">
                      <Wifi className="w-4 h-4 text-[#1E40AF]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">{proxy.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                          {proxy.protocol}
                        </span>
                        <span className="text-[11px] font-mono text-[#64748B]">Port {proxy.port}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`zonix-badge ${
                    proxy.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${proxy.status === 'ACTIVE' ? 'bg-[#047857]' : 'bg-[#B45309]'}`} />
                    {proxy.status === 'ACTIVE' ? 'Active' : proxy.status}
                  </span>
                </div>

                {/* Connection Address & Capacity */}
                <div className="space-y-2.5 text-xs text-[#0F172A] bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Tunnel Endpoint</span>
                    {proxy.username && (
                      <span className="text-[11px] font-mono text-[#475569] font-medium">Auth: {proxy.username}</span>
                    )}
                  </div>
                  <div className="font-mono text-xs font-bold text-[#1E40AF] bg-white px-2.5 py-1.5 rounded border border-[#CBD5E1] truncate">
                    {proxy.protocol.toLowerCase()}://{proxy.host}:{proxy.port}
                  </div>

                  {/* Capacity Bar */}
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#475569] font-medium">Session Capacity</span>
                      <span className="font-mono font-bold text-[#0F172A]">
                        {activeSessions} / {maxSessions} <span className="text-[#64748B]">({usagePercent}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          usagePercent >= 90 ? 'bg-[#B91C1C]' : usagePercent >= 70 ? 'bg-[#B45309]' : 'bg-[#1E40AF]'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Latency & Health telemetry */}
                  <div className="pt-1.5 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                    <span className="text-[#475569] font-medium flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#64748B]" />
                      Latency Ping:
                    </span>
                    {proxy.lastHealthCheck ? (
                      <span className={`font-mono font-bold ${
                        proxy.lastHealthCheck.status === 'ACTIVE' ? 'text-[#047857]' : 'text-[#B91C1C]'
                      }`}>
                        {proxy.lastHealthCheck.latencyMs != null && proxy.lastHealthCheck.latencyMs >= 0 
                          ? `${proxy.lastHealthCheck.latencyMs}ms` 
                          : 'Failed'}
                      </span>
                    ) : (
                      <span className="font-mono text-[#64748B]">Untested</span>
                    )}
                  </div>

                  {/* Immediate Test Feedback */}
                  {testResult && !testResult.testing && (
                    <div className={`p-2 rounded text-[11px] font-medium flex items-center gap-1.5 ${
                      testResult.reachable 
                        ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857]' 
                        : 'bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]'
                    }`}>
                      {testResult.reachable ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Reachable via socket ({testResult.latencyMs}ms roundtrip)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{testResult.error || 'Connection timed out'}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                  <button
                    onClick={() => handleTest(proxy)}
                    disabled={testResult?.testing}
                    title="Send immediate ICMP/TCP ping test"
                    className="zonix-btn-secondary py-1.5 px-3 text-xs h-[32px] gap-1.5"
                  >
                    {testResult?.testing ? (
                      <>
                        <div className="w-3.5 h-3.5 border border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
                        <span>Pinging...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-[#B45309]" />
                        <span>Ping Node</span>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingProxy(proxy); setShowModal(true); }}
                      className="zonix-btn-secondary py-1.5 px-2.5 text-xs h-[32px]"
                      title="Edit node parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#475569]" />
                    </button>
                    <button
                      onClick={() => handleDelete(proxy.id)}
                      className="zonix-btn-danger py-1.5 px-2.5 text-xs h-[32px]"
                      title="Delete proxy node"
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
