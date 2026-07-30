import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Edit2, Trash2, X, Users, Radio, Wifi, Layers } from 'lucide-react';

function OrgModal({ org, onClose, onSave }) {
  const [form, setForm] = useState({
    name: org?.name || '',
    displayName: org?.displayName || '',
    maxUsers: org?.maxUsers || 50,
    maxSessions: org?.maxSessions || 25,
    maxTabs: org?.maxTabs || 5,
    targetUrl: org?.targetUrl || ''
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
            {org ? 'EDIT ORGANIZATION' : 'NEW ORGANIZATION'}
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
              required
              disabled={!!org}
            />
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">DISPLAY NAME</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="zonix-input w-full"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] text-zonix-text-dim mb-1 font-mono">MAX USERS</label>
              <input
                type="number"
                value={form.maxUsers}
                onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) })}
                className="zonix-input w-full font-mono text-xs"
                min="1"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zonix-text-dim mb-1 font-mono">MAX SESSIONS</label>
              <input
                type="number"
                value={form.maxSessions}
                onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value) })}
                className="zonix-input w-full font-mono text-xs"
                min="1"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zonix-text-dim mb-1 font-mono">MAX TABS</label>
              <input
                type="number"
                value={form.maxTabs}
                onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) })}
                className="zonix-input w-full font-mono text-xs"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">TARGET URL</label>
            <input
              type="url"
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              className="zonix-input w-full font-mono"
              placeholder="https://app.example.com"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="zonix-btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1">
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const { authFetch, user, showConfirm, showAlert } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchOrgs(); }, []);

  const fetchOrgs = async () => {
    try {
      const res = await authFetch('/organizations');
      const data = await res.json();
      setOrgs(data.organizations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form) => {
    try {
      let res;
      if (editingOrg) {
        res = await authFetch(`/organizations/${editingOrg.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        res = await authFetch('/organizations', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        showAlert(errorData.error || 'Failed to save organization', 'ERROR', 'error');
        return;
      }

      setShowModal(false);
      setEditingOrg(null);
      fetchOrgs();
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'ERROR', 'error');
    }
  };

  const handleDelete = async (orgId) => {
    const confirmed = await showConfirm('Delete this organization? This is irreversible.', 'DELETE ORGANIZATION', 'error');
    if (!confirmed) return;
    try {
      await authFetch(`/organizations/${orgId}`, { method: 'DELETE' });
      fetchOrgs();
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors = {
    ACTIVE: 'zonix-badge-active',
    SUSPENDED: 'zonix-badge-warning',
    DEACTIVATED: 'zonix-badge-error'
  };

  return (
    <div className="p-6 space-y-6">
      {/* Custom Executive Notification Modal */}
      {notification && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0E15] border border-[#1E2638] rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold ${notification.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
              {notification.type === 'error' ? '!' : '✓'}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-100">{notification.title}</h4>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="w-full py-2.5 bg-[#1E2638] hover:bg-[#2B3752] text-gray-200 text-xs font-semibold rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-wide">ORGANIZATIONS</h2>
          <p className="text-xs text-zonix-text-dim mt-0.5">Manage multi-tenant organization boundaries</p>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <button onClick={() => { setEditingOrg(null); setShowModal(true); }} className="zonix-btn-primary">
            <Plus className="w-4 h-4 mr-1.5 inline" /> NEW ORG
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-zonix-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-zonix-text-dim font-mono">LOADING...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="zonix-card-hover p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zonix-purple/10 border border-zonix-purple/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-zonix-purple" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{org.displayName}</h3>
                    <p className="text-xs text-zonix-text-dim font-mono">{org.name} // {org.id?.substring(0, 8)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono text-zonix-text-dim">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    <span>{org._count?.users || 0}/{org.maxUsers}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3 h-3" />
                    <span>{org._count?.sessions || 0}/{org.maxSessions}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Max Tabs Per User">
                    <Layers className="w-3 h-3" />
                    <span>{org.maxTabs || 5} TABS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3" />
                    <span>{org._count?.proxyNodes || 0}</span>
                  </div>
                  <span className={statusColors[org.status] || 'zonix-badge'}>
                    {org.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        try {
                          const res = await authFetch(`/organizations/${org.id}/vault/restore`, { method: 'POST' });
                          const data = await res.json();
                          if (data.success) {
                            setNotification({
                              type: 'success',
                              title: 'Session Restored',
                              message: `1-Click Session Restore complete for ${org.displayName}. All sessions updated in <0.5s.`
                            });
                          } else {
                            setNotification({
                              type: 'error',
                              title: 'Restore Notice',
                              message: data.message || data.error || 'Vault restore requires session re-authentication.'
                            });
                          }
                        } catch (e) {
                          setNotification({
                            type: 'error',
                            title: 'System Error',
                            message: 'Error restoring session: ' + e.message
                          });
                        }
                      }}
                      className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-[11px] font-mono hover:bg-green-500/20"
                      title="1-Click Session Restore"
                    >
                      🔄 RESTORE
                    </button>
                    <button
                      onClick={() => { setEditingOrg(org); setShowModal(true); }}
                      className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-cyan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {user?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-crimson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <OrgModal
          org={editingOrg}
          onClose={() => { setShowModal(false); setEditingOrg(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
