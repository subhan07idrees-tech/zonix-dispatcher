import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/StatusBadge';
import RoleBadge from '../components/RoleBadge';
import EmptyState from '../components/EmptyState';
import {
  Users, Plus, Edit2, Trash2, X, ShieldOff, ShieldCheck,
  Key, Mail, Send, Copy
} from 'lucide-react';

function InviteModal({ orgId, onClose, onSend }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({
    email: '',
    role: 'DISPATCHER',
    maxTabs: 5
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSend(form);
    setLoading(false);
  };

  return (
    <div className="zx-modal-overlay">
      <div className="zx-modal-panel">
        <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">
            Invite dispatcher via email
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
                Recipient email address
              </label>
              <input
                type="email"
                placeholder="dispatcher@fleetlogistics.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="zx-input w-full font-mono text-xs"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Max tabs
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.maxTabs}
                onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value, 10) || 1 })}
                className="zx-input w-full font-mono text-xs tabular-nums"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="zx-select w-full text-xs"
              >
                <option value="DISPATCHER">Dispatcher</option>
                <option value="ADMIN">Org Admin</option>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <option value="SUPER_ADMIN">Super Admin</option>
                )}
              </select>
            </div>

            <p className="text-xs text-ink-3">
              The recipient will receive an activation invitation with a secure setup link.
            </p>
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
              {loading ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({ user, orgId, onClose, onSave }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'DISPATCHER',
    maxTabs: user?.maxTabs || 5
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
            {user ? 'Edit dispatcher' : 'New dispatcher'}
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
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="zx-input w-full font-mono text-xs"
                placeholder="username"
                required
                disabled={!!user}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="zx-input w-full text-xs"
                placeholder="dispatcher@domain.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                {user ? 'New password (leave blank to keep current)' : 'Password'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="zx-input w-full font-mono text-xs"
                placeholder="••••••••••••"
                required={!user}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="zx-select w-full text-xs"
                  disabled={user?.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN'}
                >
                  <option value="DISPATCHER">Dispatcher</option>
                  <option value="ADMIN">Org Admin</option>
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <option value="SUPER_ADMIN">Super Admin</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Max tabs
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.maxTabs}
                  onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value, 10) || 1 })}
                  className="zx-input w-full font-mono text-xs tabular-nums"
                  required
                />
              </div>
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
              {loading ? 'Saving…' : user ? 'Save changes' : 'Create dispatcher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { authFetch, user: currentUser, showConfirm } = useAuth();
  const { showToast, copyToClipboard } = useToast();

  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [provisioningSeat, setProvisioningSeat] = useState('system');
  const [launchingCapture, setLaunchingCapture] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchUsers();
    }
  }, [selectedOrg]);

  const fetchOrgs = async () => {
    try {
      const res = await authFetch('/organizations');
      const data = await res.json();
      const orgList = data.organizations || [];
      setOrgs(orgList);
      if (orgList.length > 0) {
        if (!selectedOrg) {
          const defaultOrg = orgList.find((o) => o.id === currentUser?.orgId) || orgList[0];
          setSelectedOrg(defaultOrg.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await authFetch(`/users/${selectedOrg}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (form) => {
    try {
      const res = await authFetch(`/invites/${selectedOrg}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to send invite', 'err');
        return;
      }
      setShowInviteModal(false);
      showToast(`Invitation sent to ${form.email}`, 'ok');
    } catch (err) {
      showToast(err.message, 'err');
    }
  };

  const handleSaveUser = async (form) => {
    try {
      let res;
      if (editingUser) {
        res = await authFetch(`/users/${selectedOrg}/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        res = await authFetch(`/users/${selectedOrg}`, {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to save user', 'err');
        return;
      }

      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
      showToast('Dispatcher saved successfully', 'ok');
    } catch (err) {
      showToast(err.message || 'An error occurred', 'err');
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await authFetch(`/users/${selectedOrg}/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchUsers();
      showToast(`User status set to ${newStatus.toLowerCase()}`, 'ok');
    } catch (err) {
      showToast('Error updating status', 'err');
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this user? Their active sessions will be terminated.',
      'Delete User',
      'error'
    );
    if (!confirmed) return;
    try {
      await authFetch(`/users/${selectedOrg}/${userId}`, { method: 'DELETE' });
      fetchUsers();
      showToast('User deleted', 'ok');
    } catch (err) {
      showToast('Error deleting user', 'err');
    }
  };

  const handleAuthenticateSite = async (targetUserId) => {
    const targetOrg = orgs.find((o) => o.id === selectedOrg) || {
      id: selectedOrg,
      targetUrl: 'https://one.dat.com/search-loads'
    };
    let targetUrl = targetOrg.targetUrl || 'https://one.dat.com/search-loads';
    if (targetUrl === 'https://one.dat.com' || targetUrl === 'https://one.dat.com/') {
      targetUrl = 'https://one.dat.com/search-loads';
    }

    let displayUsername = 'Organization-wide';
    if (targetUserId !== 'system') {
      const found = users.find((u) => u.id === targetUserId);
      if (found) displayUsername = found.username;
    }

    setLaunchingCapture(true);
    try {
      const captureFn = window.zonixAPI?.launchCaptureWindow || window.zonixAPI?.captureCookies;
      if (captureFn) {
        let proxyToUse = null;
        try {
          const proxyRes = await authFetch(`/proxies/${selectedOrg}`);
          if (proxyRes.ok) {
            const pData = await proxyRes.json();
            const list = pData.proxies || pData.proxyNodes || [];
            if (list.length > 0) proxyToUse = list[0];
          }
        } catch (pe) {}

        showToast('Opening secure authentication window...', 'ok');
        await captureFn({
          orgId: selectedOrg,
          userId: targetUserId,
          targetUrl,
          proxy: proxyToUse
        });
        showToast(`Session authenticated & vault updated for ${displayUsername}`, 'ok');
      } else {
        showToast('Capture window is only available inside the ZONIX Desktop Application (not in web browser mode)', 'warn');
      }
    } catch (err) {
      showToast('Failed to open capture window: ' + err.message, 'err');
    } finally {
      setLaunchingCapture(false);
    }
  };

  const dispatchers = users.filter((u) => u.role !== 'SUPER_ADMIN');
  const totalAllocatedTabs = users.reduce((acc, u) => acc + (u.maxTabs || 0), 0);

  return (
    <div className="space-y-5">
      {/* Page Title FIRST */}
      <div>
        <h1 className="text-[24px] leading-[32px] font-semibold text-ink tracking-tight">
          User registry
        </h1>
        <p className="text-sm text-ink-2 mt-0.5">
          Dispatcher seats, concurrent tab limits, and session credentials
        </p>
      </div>

      {/* Dispatcher table card */}
      <div className="zx-card">
        {/* Header controls: org select, Invite by email, New dispatcher */}
        <div className="zx-card-header">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] leading-[24px] font-semibold text-ink">
              Dispatchers
            </h2>
            {orgs.length > 1 && (
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="zx-select h-[32px] text-xs font-medium"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.displayName || o.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="zx-btn-secondary text-xs"
            >
              <Mail className="w-4 h-4" strokeWidth={1.5} />
              <span>Invite by email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setShowModal(true);
              }}
              className="zx-btn-primary text-xs"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>New dispatcher</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-full zx-skeleton" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No dispatchers registered"
              description="Register seats or send invitations to provision dispatchers."
              action={
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="zx-btn-secondary text-xs"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span>New dispatcher</span>
                </button>
              }
            />
          ) : (
            <table className="zx-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Username</th>
                  <th>Email</th>
                  <th style={{ width: '130px' }}>Role</th>
                  <th style={{ width: '100px' }} className="text-right">Tabs</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '210px' }} className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isUserSuperAdmin = u.role === 'SUPER_ADMIN';
                  const activeTabs = u._count?.sessions || 0;
                  const maxTabs = u.maxTabs || 5;

                  return (
                    <tr key={u.id}>
                      {/* Username (mono) */}
                      <td className="font-mono text-xs font-medium text-ink">
                        {u.username}
                      </td>

                      {/* Email */}
                      <td className="text-xs text-ink-2 truncate max-w-[220px]" title={u.email}>
                        {u.email || '—'}
                      </td>

                      {/* Role (Role badge: neutral gray rectangle, 6px radius) */}
                      <td>
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Tabs (3 / 5, tabular) */}
                      <td className="font-mono text-xs tabular-nums text-right text-ink">
                        {activeTabs} / {maxTabs}
                      </td>

                      {/* Status badge */}
                      <td>
                        <StatusBadge
                          status={u.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                        />
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {/* Super admin rows have no Authenticate button */}
                          {!isUserSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleAuthenticateSite(u.id)}
                              className="zx-btn-secondary h-[28px] px-2.5 text-xs mr-1"
                              title="Capture session cookies"
                            >
                              <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                              <span>Authenticate</span>
                            </button>
                          )}

                          {/* Disable / Enable */}
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(u)}
                            className="zx-btn-icon w-7 h-7"
                            title={u.status === 'ACTIVE' ? 'Suspend seat' : 'Activate seat'}
                            aria-label={u.status === 'ACTIVE' ? 'Suspend seat' : 'Activate seat'}
                          >
                            {u.status === 'ACTIVE' ? (
                              <ShieldOff className="w-3.5 h-3.5 text-ink-2 hover:text-warn" strokeWidth={1.5} />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5 text-ok" strokeWidth={1.5} />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setShowModal(true);
                            }}
                            className="zx-btn-icon w-7 h-7"
                            title="Edit dispatcher"
                            aria-label="Edit dispatcher"
                          >
                            <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="zx-btn-icon w-7 h-7 text-ink-3 hover:text-err"
                            title="Delete dispatcher"
                            aria-label="Delete dispatcher"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Session Provisioning Card (Below the table) */}
      <div className="zx-card">
        <div className="zx-card-header">
          <h2 className="text-[15px] leading-[24px] font-semibold text-ink">
            Session provisioning
          </h2>
          <span className="font-mono text-xs text-ink-3 tabular-nums">
            Total allocated: {totalAllocatedTabs} tabs
          </span>
        </div>

        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-ink">
              Authenticate target load board session vault
            </p>
            <p className="text-xs text-ink-2">
              Opens an isolated browser window to capture session tokens and encrypt them into the local hardware vault.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={provisioningSeat}
              onChange={(e) => setProvisioningSeat(e.target.value)}
              className="zx-select text-xs font-mono"
            >
              <option value="system">Organization-wide (All dispatchers)</option>
              {dispatchers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.username} ({d.maxTabs || 5} tabs)
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={launchingCapture}
              onClick={() => handleAuthenticateSite(provisioningSeat)}
              className="zx-btn-primary text-xs"
            >
              <Key className="w-4 h-4" strokeWidth={1.5} />
              <span>Launch authentication window</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          orgId={selectedOrg}
          onClose={() => setShowInviteModal(false)}
          onSend={handleSendInvite}
        />
      )}

      {/* User Modal */}
      {showModal && (
        <UserModal
          user={editingUser}
          orgId={selectedOrg}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
