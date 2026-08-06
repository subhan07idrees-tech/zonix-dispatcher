import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Edit2, Trash2, X, Users, Radio, Wifi, Layers, RefreshCw } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-semibold text-slate-100">
            {org ? 'Edit organization' : 'New organization'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Organization identifier</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
              required
              disabled={!!org}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Display name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-slate-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max users</label>
              <input
                type="number"
                value={form.maxUsers}
                onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) })}
                className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
                min="1"
              />
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
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max tabs</label>
              <input
                type="number"
                value={form.maxTabs}
                onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) })}
                className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Target URL</label>
            <input
              type="url"
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
              placeholder="https://one.dat.com/search-loads"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition">
              {loading ? 'Saving...' : 'Save organization'}
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
        showAlert(errorData.error || 'Failed to save organization', 'Error', 'error');
        return;
      }

      setShowModal(false);
      setEditingOrg(null);
      fetchOrgs();
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'Error', 'error');
    }
  };

  const handleDelete = async (orgId) => {
    const confirmed = await showConfirm('Delete this organization? This is irreversible.', 'Delete organization', 'error');
    if (!confirmed) return;
    try {
      await authFetch(`/organizations/${orgId}`, { method: 'DELETE' });
      fetchOrgs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast notification modal */}
      {notification && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4">
            <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center text-base font-semibold ${notification.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
              {notification.type === 'error' ? '!' : '✓'}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">{notification.title}</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100 tracking-normal">Organizations</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage company boundaries and seat quotas</p>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <button 
            onClick={() => { setEditingOrg(null); setShowModal(true); }} 
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New organization</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400">Loading organizations...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="bg-[#0D121F] border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/80 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
                    <Building2 className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{org.displayName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{org.name} // {org.id?.substring(0, 8)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong className="text-slate-200 font-mono">{org._count?.users || 0}</strong>/{org.maxUsers} users</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong className="text-slate-200 font-mono">{org._count?.sessions || 0}</strong>/{org.maxSessions} sessions</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Max tabs per user">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong className="text-slate-200 font-mono">{org.maxTabs || 5}</strong> tabs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong className="text-slate-200 font-mono">{org._count?.proxyNodes || 0}</strong> proxies</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {org.status === 'ACTIVE' ? 'Active' : org.status}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          const res = await authFetch(`/organizations/${org.id}/vault/restore`, { method: 'POST' });
                          const data = await res.json();
                          if (data.success) {
                            setNotification({
                              type: 'success',
                              title: 'Session restored',
                              message: `1-Click Session Restore complete for ${org.displayName}.`
                            });
                          } else {
                            setNotification({
                              type: 'error',
                              title: 'Restore notice',
                              message: data.message || data.error || 'Vault restore requires session re-authentication.'
                            });
                          }
                        } catch (e) {
                          setNotification({
                            type: 'error',
                            title: 'System error',
                            message: 'Error restoring session: ' + e.message
                          });
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-800 border border-slate-700/60 text-slate-300 rounded-md text-xs font-medium hover:bg-slate-700/60 transition flex items-center gap-1"
                      title="1-Click session restore"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-400" />
                      <span>Restore</span>
                    </button>

                    <button
                      onClick={() => { setEditingOrg(org); setShowModal(true); }}
                      className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                      title="Edit organization"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {user?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition"
                        title="Delete organization"
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
