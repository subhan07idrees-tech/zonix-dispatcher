import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import {
  Wifi, Plus, Edit2, Trash2, X, Activity,
  Copy, Eye, EyeOff
} from 'lucide-react';

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
    <div className="zx-modal-overlay">
      <div className="zx-modal-panel">
        <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">
            {proxy ? 'Edit proxy node' : 'New proxy node'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="zx-btn-icon"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Node name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="zx-input w-full text-xs font-medium"
                placeholder="e.g. us-east-residential-01"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Host address / IP
                </label>
                <input
                  type="text"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  className="zx-input w-full text-xs font-mono"
                  placeholder="proxy.pool.net"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Port
                </label>
                <input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: parseInt(e.target.value, 10) || 8080 })}
                  className="zx-input w-full text-xs font-mono tabular-nums"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Tunnel protocol
                </label>
                <select
                  value={form.protocol}
                  onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                  className="zx-select w-full text-xs font-mono"
                >
                  <option value="HTTP">HTTP</option>
                  <option value="HTTPS">HTTPS</option>
                  <option value="SOCKS5">SOCKS5</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Max sessions quota
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxSessions}
                  onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value, 10) || 1 })}
                  className="zx-input w-full text-xs font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Username (optional)
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="zx-input w-full text-xs font-mono"
                placeholder="proxy-username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Password {proxy ? '(leave blank to keep current)' : '(optional)'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="zx-input w-full text-xs font-mono"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div className="h-[56px] px-6 border-t border-line flex items-center justify-end gap-2 bg-surface">
            <button
              type="button"
              onClick={onClose}
              className="zx-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="zx-btn-primary text-xs"
            >
              {loading ? 'Saving…' : proxy ? 'Update proxy node' : 'Create proxy node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProxiesPage() {
  const { authFetch, user, showConfirm } = useAuth();
  const { showToast, copyToClipboard } = useToast();

  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProxy, setEditingProxy] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(user?.orgId || '');
  const [orgs, setOrgs] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [revealedSecrets, setRevealedSecrets] = useState({});

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
        showToast(errorData.error || 'Failed to save proxy node', 'err');
        return;
      }

      setShowModal(false);
      setEditingProxy(null);
      fetchProxies();
      showToast('Proxy node saved successfully', 'ok');
    } catch (err) {
      showToast(err.message || 'An error occurred', 'err');
    }
  };

  const handleDelete = async (proxyId) => {
    const confirmed = await showConfirm(
      'Delete this proxy node? Active dispatcher sessions routed through this node may be interrupted.',
      'Delete Proxy Node',
      'error'
    );
    if (!confirmed) return;
    try {
      await authFetch(`/proxies/${selectedOrg}/${proxyId}`, { method: 'DELETE' });
      fetchProxies();
      showToast('Proxy node deleted', 'ok');
    } catch (err) {
      showToast('Error deleting proxy node', 'err');
    }
  };

  const handleTest = async (proxy) => {
    setTestResults((prev) => ({ ...prev, [proxy.id]: { testing: true } }));
    try {
      const res = await authFetch(`/proxies/${selectedOrg}/${proxy.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [proxy.id]: { testing: false, ...data } }));
      fetchProxies();
      if (data.reachable) {
        showToast(`Node ${proxy.name} reachable (${data.latencyMs} ms)`, 'ok');
      } else {
        showToast(`Node ${proxy.name} unreachable: ${data.error || 'Timeout'}`, 'err');
      }
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [proxy.id]: { testing: false, reachable: false, error: err.message }
      }));
      showToast(`Node ${proxy.name} test failed: ${err.message}`, 'err');
    }
  };

  const toggleSecretReveal = (id) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-ink tracking-tight">
            Proxy nodes
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Dedicated static IP egress pools, latency telemetry, and tunnel quotas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {orgs.length > 1 && (
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="zx-select text-xs font-medium"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.displayName || o.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingProxy(null);
              setShowModal(true);
            }}
            className="zx-btn-primary text-xs"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            <span>New proxy node</span>
          </button>
        </div>
      </div>

      {/* Node Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="zx-card p-5 h-[260px] flex flex-col justify-between">
              <div className="h-4 w-32 zx-skeleton" />
              <div className="h-12 w-full zx-skeleton" />
              <div className="h-6 w-full zx-skeleton" />
            </div>
          ))}
        </div>
      ) : proxies.length === 0 ? (
        <div className="zx-card">
          <EmptyState
            icon={Wifi}
            title="No proxy nodes configured"
            description="Add dedicated static IP egress nodes to protect dispatcher sessions."
            action={
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="zx-btn-secondary text-xs"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                <span>Create proxy node</span>
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {proxies.map((proxy) => {
            const tr = testResults[proxy.id];
            const activeSessionsCount = proxy._count?.sessions || 0;
            const maxSessions = proxy.maxSessions || 10;

            // True latency: never show -1ms; show "No response" in err color, or a real value like "32 ms"
            const latencyValue = tr?.latencyMs ?? proxy.lastHealthCheck?.latencyMs;
            const isUnreachable = proxy.status === 'UNREACHABLE' || proxy.status === 'OFFLINE' || latencyValue === -1 || tr?.reachable === false;

            let latencyDisplay = '—';
            let latencyColor = 'text-ink-2';
            if (latencyValue != null && latencyValue !== -1) {
              latencyDisplay = `${latencyValue} ms`;
              latencyColor = 'text-ok-ink';
            } else if (isUnreachable) {
              latencyDisplay = 'No response';
              latencyColor = 'text-err';
            }

            const endpointStr = `${proxy.host}:${proxy.port}`;
            const isRevealed = !!revealedSecrets[proxy.id];
            const credentialDisplay = proxy.username
              ? `${proxy.username} : ${isRevealed ? (proxy.decryptedPassword || '••••••••') : '••••••••'}`
              : 'Anonymous auth';

            return (
              <div
                key={proxy.id}
                className="zx-card flex flex-col justify-between min-w-[360px] h-full"
              >
                <div>
                  {/* Card Header: name, HTTP and port as plain mono text (not badges), status badge */}
                  <div className="p-5 border-b border-line flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-ink truncate leading-snug">
                        {proxy.name}
                      </h3>
                      {/* Plain mono text, not badges */}
                      <p className="font-mono text-xs text-ink-2 mt-0.5">
                        {proxy.protocol} · {proxy.port}
                      </p>
                    </div>

                    <StatusBadge
                      status={isUnreachable ? 'Unreachable' : (proxy.status === 'ACTIVE' ? 'Active' : 'Idle')}
                    />
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Tunnel endpoint in a mono read-only field with copy icon button */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ink-2">
                        Tunnel endpoint
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={endpointStr}
                          className="zx-input flex-1 font-mono text-xs bg-bg text-ink cursor-default"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(endpointStr, 'Copied endpoint')}
                          className="zx-btn-icon flex-shrink-0"
                          title="Copy endpoint"
                          aria-label="Copy endpoint"
                        >
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Masked auth credential */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ink-2">
                        Authentication credential
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={credentialDisplay}
                          className="zx-input flex-1 font-mono text-xs bg-bg text-ink cursor-default"
                        />
                        {proxy.username && (
                          <button
                            type="button"
                            onClick={() => toggleSecretReveal(proxy.id)}
                            className="zx-btn-icon flex-shrink-0"
                            title={isRevealed ? 'Hide credential' : 'Show credential'}
                            aria-label={isRevealed ? 'Hide credential' : 'Show credential'}
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                            ) : (
                              <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => copyToClipboard(proxy.username ? `${proxy.username}` : endpointStr, 'Copied auth')}
                          className="zx-btn-icon flex-shrink-0"
                          title="Copy credential"
                          aria-label="Copy credential"
                        >
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Session capacity bar (3 / 1500) */}
                    <div>
                      <ProgressBar
                        label={`Session capacity (${activeSessionsCount} / ${maxSessions})`}
                        current={activeSessionsCount}
                        max={maxSessions}
                      />
                    </div>

                    {/* Latency line */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-line-soft">
                      <span className="text-ink-2 font-medium">Latency</span>
                      <span className={`font-mono tabular-nums font-semibold ${latencyColor}`}>
                        {latencyDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: "Ping node" (secondary) plus edit and delete icon buttons */}
                <div className="p-4 border-t border-line flex items-center justify-between bg-surface">
                  <button
                    type="button"
                    disabled={tr?.testing}
                    onClick={() => handleTest(proxy)}
                    className="zx-btn-secondary h-[32px] text-xs px-3"
                  >
                    <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{tr?.testing ? 'Testing…' : 'Ping node'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProxy(proxy);
                        setShowModal(true);
                      }}
                      className="zx-btn-icon w-8 h-8"
                      title="Edit proxy node"
                      aria-label="Edit proxy node"
                    >
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(proxy.id)}
                      className="zx-btn-icon w-8 h-8 text-ink-3 hover:text-err"
                      title="Delete proxy node"
                      aria-label="Delete proxy node"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Proxy Modal */}
      {showModal && (
        <ProxyModal
          proxy={editingProxy}
          orgId={selectedOrg}
          onClose={() => {
            setShowModal(false);
            setEditingProxy(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
