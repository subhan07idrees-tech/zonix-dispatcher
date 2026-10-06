import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Edit2, Trash2, X } from 'lucide-react';

function OrgModal({ org, onClose, onSave, user }) {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
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
    <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white border border-[#D9DEE7] rounded-lg shadow-lg w-full max-w-md p-6 space-y-5 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#EFF4FA] border border-[#D9DEE7] text-[#245B9E] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#172033]">
              {org ? 'Edit Organization' : 'New Organization'}
            </h3>
          </div>
          <button onClick={onClose} className="zonix-btn-ghost p-1 h-auto">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Organization Identifier</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
              required
              disabled={!!org}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Display Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="zonix-input w-full text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#172033] font-medium">Allocation Quotas</span>
              {!isSuperAdmin && (
                <span className="text-[10px] text-[#B7791F] font-mono">(Managed by Super Admin)</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#667085] mb-1">Max Users</label>
                <input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) })}
                  disabled={!isSuperAdmin}
                  className={`zonix-input w-full text-xs font-mono ${!isSuperAdmin ? 'opacity-60 cursor-not-allowed bg-[#F8FAFC]' : ''}`}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#667085] mb-1">Max Sessions</label>
                <input
                  type="number"
                  value={form.maxSessions}
                  onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value) })}
                  disabled={!isSuperAdmin}
                  className={`zonix-input w-full text-xs font-mono ${!isSuperAdmin ? 'opacity-60 cursor-not-allowed bg-[#F8FAFC]' : ''}`}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#667085] mb-1">Max Tabs</label>
                <input
                  type="number"
                  value={form.maxTabs}
                  onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) })}
                  disabled={!isSuperAdmin}
                  className={`zonix-input w-full text-xs font-mono ${!isSuperAdmin ? 'opacity-60 cursor-not-allowed bg-[#F8FAFC]' : ''}`}
                  min="1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Target Load Board URL</label>
            <input
              type="text"
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
              placeholder="e.g. https://portal.example.com"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#D9DEE7]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              {loading ? 'Saving...' : 'Save Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const { authFetch, user, showConfirm } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await authFetch('/organizations');
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form) => {
    try {
      if (editingOrg) {
        await authFetch(`/organizations/${editingOrg.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        await authFetch('/organizations', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }
      setShowModal(false);
      setEditingOrg(null);
      fetchOrganizations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (orgId) => {
    const confirmed = await showConfirm('Delete this organization?', 'Delete Organization', 'error');
    if (!confirmed) return;
    try {
      await authFetch(`/organizations/${orgId}`, { method: 'DELETE' });
      fetchOrganizations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DEE7] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#172033] tracking-tight flex items-center gap-2">
            Organization Registry &amp; Settings
            <span className="zonix-badge-cyan text-[11px]">Multi-Tenant</span>
          </h2>
          <p className="text-xs text-[#667085] mt-1">Tenant profiles, user seats, target load board bindings, and concurrency quotas</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { setEditingOrg(null); setShowModal(true); }}
            className="zonix-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Organization</span>
          </button>
        )}
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-xs text-[#667085]">
            <div className="w-5 h-5 border-2 border-[#245B9E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading organization registry...
          </div>
        ) : organizations.length === 0 ? (
          <div className="col-span-3 zonix-card p-12 text-center text-xs text-[#667085] space-y-2">
            <Building2 className="w-8 h-8 text-[#98A2B3] mx-auto" />
            <p className="font-semibold text-[#172033]">No organizations found</p>
          </div>
        ) : (
          organizations.map((org) => (
            <div key={org.id} className="zonix-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#EFF4FA] border border-[#D9DEE7] text-[#245B9E] flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#172033]">{org.displayName}</h3>
                    <p className="text-[10px] font-mono text-[#667085]">{org.name}</p>
                  </div>
                </div>
                <span className={`zonix-badge ${org.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'ACTIVE' ? 'bg-[#2E7D5B]' : 'bg-[#B7791F]'}`} />
                  {org.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#F8FAFC] p-3 rounded-md border border-[#D9DEE7]">
                <div>
                  <span className="text-[10px] text-[#667085] font-sans block">Users</span>
                  <span className="text-[#172033] font-bold">{org._count?.users || 0}/{org.maxUsers}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] font-sans block">Sessions</span>
                  <span className="text-[#172033] font-bold">{org._count?.sessions || 0}/{org.maxSessions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] font-sans block">Max Tabs</span>
                  <span className="text-[#172033] font-bold">{org.maxTabs} seats</span>
                </div>
              </div>

              <div className="text-xs font-mono text-[#667085] truncate">
                Target: <span className="text-[#245B9E] font-medium">{org.targetUrl || 'Not configured'}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9DEE7]">
                <button
                  onClick={() => { setEditingOrg(org); setShowModal(true); }}
                  className="zonix-btn-secondary py-1 px-3 text-xs h-[32px]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Edit</span>
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(org.id)}
                    className="zonix-btn-danger py-1 px-2.5 text-xs h-[32px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <OrgModal
          org={editingOrg}
          user={user}
          onClose={() => { setShowModal(false); setEditingOrg(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
