import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, X, Shield, ShieldOff, Mail, Send, Copy, Check, Clock } from 'lucide-react';

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
    <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white border border-[#D9DEE7] rounded-lg shadow-lg w-full max-w-md p-6 space-y-5 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#EFF4FA] border border-[#D9DEE7] text-[#245B9E] flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172033]">Invite Dispatcher via Email</h3>
              <p className="text-xs text-[#667085]">Send an invitation token link</p>
            </div>
          </div>
          <button onClick={onClose} className="zonix-btn-ghost p-1 h-auto">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Recipient Email Address</label>
            <input
              type="email"
              placeholder="dispatcher@fleetlogistics.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Max Allowed Tabs / Seats</label>
            <input
              type="number"
              min="1"
              max="50"
              value={form.maxTabs}
              onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
              className="zonix-input w-full text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Assigned Role</label>
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

          <div className="p-3 bg-[#F8FAFC] border border-[#D9DEE7] rounded-md text-xs text-[#667085] leading-relaxed">
            The recipient will receive an invitation email from <span className="text-[#245B9E] font-mono font-semibold">invites@thezonix.com</span> with an activation link.
          </div>

          <div className="flex gap-3 pt-2 border-t border-[#D9DEE7]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Sending...' : 'Send Invite'}</span>
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
    <div className="fixed inset-0 bg-[#0F172A]/50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white border border-[#D9DEE7] rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3">
          <h3 className="text-sm font-semibold text-[#172033]">
            {user ? 'Edit Dispatcher Credentials' : 'New User Registration'}
          </h3>
          <button onClick={onClose} className="zonix-btn-ghost p-1 h-auto">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
              required
              disabled={!!user}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">
              {user ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="zonix-input w-full text-xs font-mono"
              required={!user}
              minLength={form.password ? 6 : undefined}
              placeholder={user ? "••••••••" : ""}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Max Allowed Tabs / Seats</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.maxTabs}
              onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
              className="zonix-input w-full text-xs font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#172033] mb-1">Role</label>
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
          <div className="flex gap-3 pt-2 border-t border-[#D9DEE7]">
            <button type="button" onClick={onClose} className="zonix-btn-secondary flex-1 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1 py-2 text-xs">
              {loading ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { authFetch, user: currentUser, showAlert } = useAuth();
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(currentUser?.orgId || '');
  const [orgs, setOrgs] = useState([]);
  const [copiedInviteId, setCopiedInviteId] = useState(null);

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
        setInvites(data.invitations || []);
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
      showAlert('Email invite sent successfully!', 'Invite Sent', 'info');
    } catch (err) {
      showAlert(err.message, 'Error', 'error');
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
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await authFetch(`/users/${selectedOrg}/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const copyInviteLink = (inv) => {
    const link = `${window.location.origin}/#/register?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedInviteId(inv.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DEE7] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#172033] tracking-tight flex items-center gap-2">
            User &amp; Dispatcher Registry
            <span className="zonix-badge-cyan text-[11px]">{users.length} Users</span>
          </h2>
          <p className="text-xs text-[#667085] mt-1">Manage dispatcher accounts, tab seat limits, role access, and email invitations</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
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
            onClick={() => setShowInviteModal(true)}
            className="zonix-btn-secondary text-xs"
          >
            <Mail className="w-3.5 h-3.5 text-[#667085]" />
            <span>Send Email Invite</span>
          </button>
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="zonix-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Dispatcher</span>
          </button>
        </div>
      </div>

      {/* Users table card */}
      <div className="zonix-card overflow-hidden">
        <div className="p-4 border-b border-[#D9DEE7] flex items-center justify-between bg-[#F8FAFC]">
          <h3 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
            Dispatcher Account Directory
          </h3>
          <span className="text-xs text-[#667085] font-mono">Total Seats: {users.reduce((acc, u) => acc + (u.maxTabs || 5), 0)} tabs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D9DEE7] text-[11px] text-[#667085] uppercase bg-[#F8FAFC]">
                <th className="py-2.5 px-4 text-left font-semibold">Username</th>
                <th className="py-2.5 px-4 text-left font-semibold">Email</th>
                <th className="py-2.5 px-4 text-left font-semibold">Role</th>
                <th className="py-2.5 px-4 text-left font-semibold">Tab Seats</th>
                <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#667085]">
                    <div className="w-5 h-5 border-2 border-[#245B9E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading user registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#667085]">
                    <Users className="w-8 h-8 text-[#98A2B3] mx-auto mb-2" />
                    No registered users in this organization.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-[#D9DEE7] hover:bg-[#F8FAFC] transition-colors duration-150 h-[44px]">
                    <td className="py-2.5 px-4 text-xs font-mono text-[#172033] font-bold">
                      {user.username}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#667085] font-mono">{user.email || '—'}</td>
                    <td className="py-2.5 px-4 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F8FAFC] text-[#172033] border border-[#D9DEE7]">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono text-[#172033]">
                      {user.maxTabs || 5} tabs
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`zonix-badge ${user.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-[#2E7D5B]' : 'bg-[#B7791F]'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className="zonix-btn-secondary py-1 px-2 text-xs h-[32px]"
                          title={user.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                        >
                          {user.status === 'ACTIVE' ? <ShieldOff className="w-3.5 h-3.5 text-[#B7791F]" /> : <Shield className="w-3.5 h-3.5 text-[#2E7D5B]" />}
                        </button>
                        <button
                          onClick={() => { setEditingUser(user); setShowModal(true); }}
                          className="zonix-btn-secondary py-1 px-2 text-xs h-[32px]"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#667085]" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="zonix-btn-danger py-1 px-2 text-xs h-[32px]"
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
          <div className="p-4 border-b border-[#D9DEE7] flex items-center justify-between bg-[#F8FAFC]">
            <h3 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#667085]" />
              Pending Email Invitations
            </h3>
            <span className="zonix-badge-cyan text-[10px]">{invites.length} Active Links</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#D9DEE7] text-[11px] text-[#667085] uppercase bg-[#F8FAFC]">
                  <th className="py-2.5 px-4 text-left font-semibold">Email Address</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Role</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Max Tabs</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Expires</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#D9DEE7] hover:bg-[#F8FAFC] transition-colors duration-150 text-xs h-[44px]">
                    <td className="py-2.5 px-4 font-mono text-[#172033]">{inv.email}</td>
                    <td className="py-2.5 px-4 font-mono text-[#667085]">{inv.role}</td>
                    <td className="py-2.5 px-4 font-mono text-[#667085]">{inv.maxTabs} tabs</td>
                    <td className="py-2.5 px-4 font-mono text-[#667085]">{new Date(inv.expiresAt).toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => copyInviteLink(inv)}
                        className="zonix-btn-secondary py-1 px-3 text-xs h-[32px]"
                      >
                        {copiedInviteId === inv.id ? <Check className="w-3.5 h-3.5 text-[#2E7D5B]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedInviteId === inv.id ? 'Copied' : 'Copy Link'}</span>
                      </button>
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
