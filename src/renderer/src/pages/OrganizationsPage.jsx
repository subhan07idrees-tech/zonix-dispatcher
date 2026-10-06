import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Edit2, Trash2, X, ShieldAlert, ArrowUpRight, Lock, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                {org ? 'Edit Organization Settings' : 'Create New Tenant Organization'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {org ? `Update concurrency and parameters for ${org.displayName}` : 'Provision a new multi-tenant dispatcher organization'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#F1F5F9] rounded-md text-[#64748B] hover:text-[#0F172A] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              Organization Identifier (Slug)
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
              className="zonix-input w-full font-mono"
              placeholder="e.g. beta-logistics"
              required
              disabled={!!org}
            />
            <p className="text-[11px] text-[#64748B] mt-1">Unique slug used by dispatchers on the login window.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Display Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="zonix-input w-full"
              placeholder="e.g. Beta Logistics Fleet"
              required
            />
          </div>

          <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#0F172A] font-bold">Allocation &amp; Seat Quotas</span>
              {!isSuperAdmin && (
                <span className="text-[11px] text-[#B45309] font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Managed by Super Admin
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#64748B] font-medium mb-1">Max Users</label>
                <input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) || 1 })}
                  disabled={!isSuperAdmin}
                  className={`zonix-input w-full font-mono ${!isSuperAdmin ? 'bg-[#F1F5F9] cursor-not-allowed opacity-75' : ''}`}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748B] font-medium mb-1">Max Sessions</label>
                <input
                  type="number"
                  value={form.maxSessions}
                  onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value) || 1 })}
                  disabled={!isSuperAdmin}
                  className={`zonix-input w-full font-mono ${!isSuperAdmin ? 'bg-[#F1F5F9] cursor-not-allowed opacity-75' : ''}`}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748B] font-medium mb-1">Max Tabs / Seat</label>
                <input
                  type="number"
                  value={form.maxTabs}
                  onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
                  disabled={!isSuperAdmin}
                  className={`zonix-input w-full font-mono ${!isSuperAdmin ? 'bg-[#F1F5F9] cursor-not-allowed opacity-75' : ''}`}
                  min="1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Target Load Board URL</label>
            <input
              type="text"
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              className="zonix-input w-full font-mono"
              placeholder="https://one.dat.com/search-loads"
            />
            <p className="text-[11px] text-[#64748B] mt-1">Direct URL dispatched inside the locked browser wrapper.</p>
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#E2E8F0]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              {loading ? 'Saving...' : org ? 'Update Organization' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuperAdminRequiredModal({ onClose, onSwitchUser }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3.5 border-b border-[#E2E8F0] pb-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Super Administrator Privileges Required</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Multi-tenant organization provisioning policy</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-[#334155] leading-relaxed">
          <p>
            You are currently logged in with <strong className="text-[#0F172A]">Organization Admin</strong> role. Org admins are scoped to manage users and proxies for their assigned tenant.
          </p>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1.5 font-mono text-[11px]">
            <p className="font-bold text-[#0F172A] font-sans">To create a new tenant organization:</p>
            <p>1. Sign out of this session.</p>
            <p>2. Leave <span className="text-[#1E40AF] font-bold">Organization ID</span> blank.</p>
            <p>3. Enter username: <span className="text-[#1E40AF] font-bold">superadmin</span>.</p>
            <p>4. Enter the master superadmin password.</p>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-[#E2E8F0]">
          <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">
            Dismiss
          </button>
          <button type="button" onClick={onSwitchUser} className="zonix-btn-primary flex-1 py-2 text-xs">
            Log In as Super Admin
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const { authFetch, user, showConfirm, logout } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuperAdminNotice, setShowSuperAdminNotice] = useState(false);
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

  const handleCreateClick = () => {
    if (isSuperAdmin) {
      setEditingOrg(null);
      setShowModal(true);
    } else {
      setShowSuperAdminNotice(true);
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
    const confirmed = await showConfirm('Permanently delete this organization and revoke all its user seats?', 'Delete Organization', 'error');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Organization Registry &amp; Settings
            </h2>
            <span className="zonix-badge-cyan text-[11px] font-semibold">Multi-Tenant</span>
            {!isSuperAdmin && (
              <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                Single-Tenant View
              </span>
            )}
          </div>
          <p className="text-xs text-[#475569] mt-1 font-medium">
            Tenant configuration profiles, concurrency tab limits, target load board URLs, and user seat quotas
          </p>
        </div>

        <button
          onClick={handleCreateClick}
          className="zonix-btn-primary self-start sm:self-auto"
          title={isSuperAdmin ? "Create new organization" : "Requires Super Administrator role"}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Organization</span>
        </button>
      </div>

      {/* Grid view of organizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-xs text-[#64748B]">
            <div className="w-5 h-5 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading organization registry...
          </div>
        ) : organizations.length === 0 ? (
          <div className="col-span-3 zonix-card p-12 text-center text-xs text-[#64748B] space-y-3">
            <Building2 className="w-10 h-10 text-[#94A3B8] mx-auto" />
            <p className="font-bold text-[#0F172A] text-sm">No organizations found</p>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              You are not currently assigned to any active organizations.
            </p>
          </div>
        ) : (
          organizations.map((org) => {
            const userPct = Math.min(100, Math.round(((org._count?.users || 0) / (org.maxUsers || 1)) * 100));
            const sessionPct = Math.min(100, Math.round(((org._count?.sessions || 0) / (org.maxSessions || 1)) * 100));

            return (
              <div key={org.id} className="zonix-card flex flex-col justify-between hover:border-[#94A3B8]">
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A] leading-tight">{org.displayName}</h3>
                        <p className="text-[11px] font-mono text-[#64748B] mt-0.5 font-medium">{org.name}</p>
                      </div>
                    </div>
                    <span className={`zonix-badge ${org.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'ACTIVE' ? 'bg-[#047857]' : 'bg-[#B45309]'}`} />
                      {org.status}
                    </span>
                  </div>

                  {/* Quotas & Capacity Grid */}
                  <div className="p-4 space-y-3.5">
                    <div className="grid grid-cols-3 gap-2 text-center bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                      <div>
                        <span className="text-[10px] text-[#64748B] font-semibold block uppercase">Users</span>
                        <span className="text-[#0F172A] font-bold text-sm font-mono">{org._count?.users || 0}/{org.maxUsers}</span>
                      </div>
                      <div className="border-x border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] font-semibold block uppercase">Sessions</span>
                        <span className="text-[#0F172A] font-bold text-sm font-mono">{org._count?.sessions || 0}/{org.maxSessions}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#64748B] font-semibold block uppercase">Max Tabs</span>
                        <span className="text-[#0F172A] font-bold text-sm font-mono">{org.maxTabs} seats</span>
                      </div>
                    </div>

                    {/* Utilization Bars */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
                          <span>User Capacity</span>
                          <span className="font-mono font-semibold text-[#0F172A]">{userPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#1E40AF] rounded-full" style={{ width: `${userPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
                          <span>Active Concurrency</span>
                          <span className="font-mono font-semibold text-[#0F172A]">{sessionPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#047857] rounded-full" style={{ width: `${sessionPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Target URL */}
                    <div className="pt-2 border-t border-[#E2E8F0] text-xs">
                      <span className="text-[#64748B] block text-[11px] font-medium mb-0.5">Target Load Board:</span>
                      <a
                        href={org.targetUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1E40AF] hover:underline font-mono text-[11px] font-semibold truncate block flex items-center gap-1"
                      >
                        <span className="truncate">{org.targetUrl || 'Not configured'}</span>
                        {org.targetUrl && <ArrowUpRight className="w-3 h-3 flex-shrink-0" />}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                  <span className="text-[10px] text-[#64748B] font-mono">
                    ID: {org.id.substring(0, 8)}...
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingOrg(org); setShowModal(true); }}
                      className="zonix-btn-secondary text-xs h-[32px] px-3"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#475569]" />
                      <span>Edit</span>
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="zonix-btn-danger text-xs h-[32px] px-2.5"
                        title="Delete organization"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
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

      {showSuperAdminNotice && (
        <SuperAdminRequiredModal
          onClose={() => setShowSuperAdminNotice(false)}
          onSwitchUser={() => logout()}
        />
      )}
    </div>
  );
}
