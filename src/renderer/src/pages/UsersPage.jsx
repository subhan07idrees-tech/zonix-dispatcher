import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Plus, Edit2, Trash2, X, Shield, ShieldOff,
  Key, Mail, Send, Copy, Check, Clock, ExternalLink
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#0A0F1D]/75 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-modal-backdrop" onClick={onClose}>
      <div className="relative my-auto w-full max-w-md bg-white border border-[#CBD5E1] rounded-xl shadow-2xl p-6 space-y-5 animate-modal-content max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Invite Dispatcher via Email</h3>
              <p className="text-xs text-[#64748B]">Send a secure invitation activation token</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#F1F5F9] rounded-md text-[#64748B] hover:text-[#0F172A]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Recipient Email Address</label>
            <input
              type="email"
              placeholder="dispatcher@fleetlogistics.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="zonix-input w-full font-mono text-xs"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Max Allowed Tabs / Seats</label>
            <input
              type="number"
              min="1"
              max="50"
              value={form.maxTabs}
              onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
              className="zonix-input w-full font-mono text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Assigned Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="zonix-select w-full text-xs"
            >
              <option value="DISPATCHER">Dispatcher</option>
              <option value="ADMIN">Org Admin</option>
              {currentUser?.role === 'SUPER_ADMIN' && (
                <option value="SUPER_ADMIN">Super Admin</option>
              )}
            </select>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#475569] leading-relaxed">
            The recipient will receive an activation email from <strong className="text-[#1E40AF] font-mono">invites@thezonix.com</strong> with a direct setup link.
          </div>

          <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Sending...' : 'Send Invite'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#0A0F1D]/75 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-modal-backdrop" onClick={onClose}>
      <div className="relative my-auto w-full max-w-md bg-white border border-[#CBD5E1] rounded-xl shadow-2xl p-6 space-y-4 animate-modal-content max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 className="text-sm font-bold text-[#0F172A]">
            {user ? 'Edit Dispatcher Credentials' : 'New User Registration'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[#F1F5F9] rounded-md text-[#64748B]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="zonix-input w-full font-mono text-xs"
              required
              disabled={!!user}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="zonix-input w-full font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              {user ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="zonix-input w-full font-mono text-xs"
              required={!user}
              minLength={form.password ? 6 : undefined}
              placeholder={user ? "••••••••" : ""}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Max Allowed Tabs / Seats</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.maxTabs}
              onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
              className="zonix-input w-full font-mono text-xs"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="zonix-select w-full text-xs"
            >
              <option value="DISPATCHER">Dispatcher</option>
              <option value="ADMIN">Org Admin</option>
              {currentUser?.role === 'SUPER_ADMIN' && (
                <option value="SUPER_ADMIN">Super Admin</option>
              )}
            </select>
          </div>
          <div className="flex gap-3 pt-2 border-t border-[#E2E8F0]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              {loading ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function UsersPage() {
  const { authFetch, user: currentUser, showAlert, showConfirm } = useAuth();
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(currentUser?.orgId || '');
  const [orgs, setOrgs] = useState([]);
  const [selectedDispatcherId, setSelectedDispatcherId] = useState('system');
  const [copiedInviteId, setCopiedInviteId] = useState(null);

  const dispatchers = users.filter(u => u.role === 'DISPATCHER');

  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') {
      fetchOrgs();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedOrg) {
      fetchUsers();
      fetchInvites();
    }
  }, [selectedOrg]);

  const fetchOrgs = async () => {
    try {
      const res = await authFetch('/organizations');
      const data = await res.json();
      const list = data.organizations || [];
      setOrgs(list);
      if (list.length > 0 && (!selectedOrg || !list.some(o => o.id === selectedOrg))) {
        setSelectedOrg(list[0].id);
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

  const fetchInvites = async () => {
    try {
      const res = await authFetch(`/invites/${selectedOrg}`);
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || data.invitations || []);
      }
    } catch (e) {}
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
        showAlert(data.error || 'Failed to send invite', 'Error', 'error');
        return;
      }
      setShowInviteModal(false);
      fetchInvites();
      showAlert(`Email invitation sent successfully to ${form.email}!`, 'Invite Sent', 'info');
    } catch (err) {
      showAlert(err.message, 'Error', 'error');
    }
  };

  const handleCancelInvite = async (inviteId) => {
    const confirmed = await showConfirm('Cancel this pending invitation link?', 'Cancel Invitation', 'warning');
    if (!confirmed) return;
    try {
      const res = await authFetch(`/invites/${selectedOrg}/${inviteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvites();
        showAlert('Invitation cancelled successfully.', 'Cancelled', 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyInviteLink = (inv) => {
    const link = `https://thezonix.com/join.html?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedInviteId(inv.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
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
        showAlert(errorData.error || 'Failed to save user', 'Error', 'error');
        return;
      }

      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      showAlert(err.message || 'An error occurred', 'Error', 'error');
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this user? Their active sessions will be terminated.', 'Delete User', 'error');
    if (!confirmed) return;
    try {
      await authFetch(`/users/${selectedOrg}/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthenticateSite = async (targetUserId) => {
    const targetOrg = orgs.find(o => o.id === selectedOrg) || { id: selectedOrg, targetUrl: 'https://one.dat.com/search-loads' };
    const targetUrl = targetOrg.targetUrl || 'https://one.dat.com/search-loads';
    let displayUsername = 'Organization-wide (All Dispatchers)';

    if (targetUserId !== 'system') {
      const foundDispatcher = dispatchers.find(d => d.id === targetUserId);
      if (foundDispatcher) {
        displayUsername = foundDispatcher.username;
      }
    }

    await showAlert(
      `Launching session authentication window for ${displayUsername}.\nTarget site: ${targetUrl}\n\nPlease log in on the window that opens, complete 2FA, then close the window to save the session vault.`,
      'Session Provisioning',
      'info'
    );

    try {
      const api = window.zonixAPI || window.electronAPI;
      let captureRes = null;
      if (api && api.captureCookies) {
        captureRes = await api.captureCookies({
          targetUrl,
          orgId: targetOrg.id,
          userId: targetUserId
        });
      } else if (api && api.invoke) {
        captureRes = await api.invoke('session:cookies:capture', {
          targetUrl,
          orgId: targetOrg.id,
          userId: targetUserId
        });
      } else {
        await showAlert('Session capture is only available inside the ZONIX Desktop App.', 'Desktop App Required', 'warning');
        return;
      }

      if (captureRes && captureRes.success) {
        await showAlert(`Successfully authenticated and saved secure login session for "${displayUsername}"!`, 'Authenticated', 'success');
      }

      fetchUsers();
    } catch (err) {
      console.error('[ZONIX] Authentication window launch error:', err);
      showAlert(err.message || 'An error occurred while launching session capture window', 'Authentication Error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Provisioning Panel */}
      <div className="zonix-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center font-bold">
            <Key className="w-4 h-4 text-[#1E40AF]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              Locked Site Session Provisioning (DAT One &amp; Portals)
            </h3>
            <p className="text-xs text-[#64748B]">Capture secure 30-day credentials and cookies for dispatchers</p>
          </div>
        </div>

        <p className="text-xs text-[#475569] max-w-3xl leading-relaxed">
          Launching the authentication window opens the target website in an isolated browser. Log in manually and complete 2FA. Once signed in, close the window — ZONIX will automatically intercept and securely store the authenticated cookies in the Session Vault.
        </p>

        <div className="flex flex-wrap items-end gap-3.5 pt-3 border-t border-[#E2E8F0]">
          <div className="w-80">
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              Target Dispatcher Seat
            </label>
            <select
              value={selectedDispatcherId}
              onChange={(e) => setSelectedDispatcherId(e.target.value)}
              className="zonix-select w-full text-xs font-mono"
            >
              <option value="system">Organization-wide (All Dispatchers)</option>
              {dispatchers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.username} [{d.email || 'no-email'}]
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleAuthenticateSite(selectedDispatcherId)}
            className="zonix-btn-primary text-xs h-[38px] px-4"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Launch Authentication Window</span>
          </button>
        </div>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              User &amp; Dispatcher Registry
            </h2>
            <span className="zonix-badge-cyan text-[11px] font-semibold">{users.length} Users</span>
          </div>
          <p className="text-xs text-[#475569] mt-1 font-medium">
            Manage dispatcher accounts, tab seat limits, role access, and email invitations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#475569]">Org:</span>
              <select
                value={selectedOrg}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedOrg(e.target.value);
                }}
                className="zonix-select text-xs h-[36px]"
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
            onClick={() => setShowInviteModal(true)}
            className="zonix-btn-secondary text-xs h-[36px]"
          >
            <Mail className="w-3.5 h-3.5 text-[#475569]" />
            <span>Invite via Email</span>
          </button>

          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="zonix-btn-primary text-xs h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Dispatcher</span>
          </button>
        </div>
      </div>

      {/* Users table card */}
      <div className="zonix-card overflow-hidden">
        <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase font-mono tracking-wider">
            Dispatcher Account Directory
          </h3>
          <span className="text-xs text-[#64748B] font-mono font-medium">
            Total Allocated: {users.reduce((acc, u) => acc + (u.maxTabs || 5), 0)} tabs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#CBD5E1] text-[11px] text-[#475569] uppercase bg-[#F8FAFC]">
                <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Username</th>
                <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Email</th>
                <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Role</th>
                <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Active / Max Tabs</th>
                <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 text-right font-bold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#64748B]">
                    <div className="w-5 h-5 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading user registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#64748B]">
                    <Users className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                    No registered users in this organization.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors h-[46px]">
                    <td className="py-2.5 px-4 text-xs font-mono text-[#0F172A] font-bold">
                      {u.username}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#475569] font-mono">{u.email || '—'}</td>
                    <td className="py-2.5 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#1E293B] border border-[#CBD5E1]">
                        {u.role === 'DISPATCHER' ? 'Dispatcher' : u.role === 'ADMIN' ? 'Org Admin' : u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono text-[#0F172A]">
                      <span className="font-bold">{u._count?.sessions || 0}</span> / {u.maxTabs || 5} tabs
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`zonix-badge ${u.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-[#047857]' : 'bg-[#B45309]'}`} />
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role === 'DISPATCHER' && (
                          <button
                            onClick={() => handleAuthenticateSite(u.id)}
                            className="zonix-btn-secondary py-1 px-2 text-xs h-[30px]"
                            title="Authenticate Locked Site Cookies"
                          >
                            <Key className="w-3.5 h-3.5 text-[#1E40AF]" />
                            <span className="hidden md:inline">Authenticate</span>
                          </button>
                        )}
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className="zonix-btn-secondary py-1 px-2 text-xs h-[30px]"
                          title={u.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                        >
                          {u.status === 'ACTIVE' ? <ShieldOff className="w-3.5 h-3.5 text-[#B45309]" /> : <Shield className="w-3.5 h-3.5 text-[#047857]" />}
                        </button>
                        <button
                          onClick={() => { setEditingUser(u); setShowModal(true); }}
                          className="zonix-btn-secondary py-1 px-2 text-xs h-[30px]"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#475569]" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="zonix-btn-danger py-1 px-2 text-xs h-[30px]"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations Table Card */}
      {invites.length > 0 && (
        <div className="zonix-card overflow-hidden">
          <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase font-mono tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1E40AF]" />
              Pending Email Invitations
            </h3>
            <span className="zonix-badge-cyan text-[10px] font-bold">{invites.length} Active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#CBD5E1] text-[11px] text-[#475569] uppercase bg-[#F8FAFC]">
                  <th className="py-2.5 px-4 text-left font-bold">Email Address</th>
                  <th className="py-2.5 px-4 text-left font-bold">Role</th>
                  <th className="py-2.5 px-4 text-left font-bold">Max Tabs</th>
                  <th className="py-2.5 px-4 text-left font-bold">Expires</th>
                  <th className="py-2.5 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors text-xs h-[44px]">
                    <td className="py-2.5 px-4 font-mono text-[#0F172A] font-semibold">{inv.email}</td>
                    <td className="py-2.5 px-4 font-mono text-[#475569]">{inv.role}</td>
                    <td className="py-2.5 px-4 font-mono text-[#475569]">{inv.maxTabs} tabs</td>
                    <td className="py-2.5 px-4 font-mono text-[#475569]">{new Date(inv.expiresAt).toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyInviteLink(inv)}
                          className="zonix-btn-secondary py-1 px-2.5 text-xs h-[30px]"
                          title="Copy direct invite URL"
                        >
                          {copiedInviteId === inv.id ? <Check className="w-3.5 h-3.5 text-[#047857]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedInviteId === inv.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="zonix-btn-danger py-1 px-2 text-xs h-[30px]"
                          title="Revoke invitation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <UserModal
          user={editingUser}
          orgId={selectedOrg}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSave={handleSaveUser}
        />
      )}

      {showInviteModal && (
        <InviteModal
          orgId={selectedOrg}
          onClose={() => setShowInviteModal(false)}
          onSend={handleSendInvite}
        />
      )}
    </div>
  );
}
