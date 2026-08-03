import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, X, Shield, ShieldOff, Key, Mail, Send, Copy, Check, Clock } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-medium">
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Invite user via email</h3>
              <p className="text-xs text-slate-400">Send an invitation email to create credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Recipient email address</label>
            <input
              type="email"
              placeholder="dispatcher@fleetlogistics.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Max allowed tabs / sessions</label>
            <input
              type="number"
              min="1"
              max="50"
              value={form.maxTabs}
              onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Assigned role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:border-slate-600 focus:outline-none"
            >
              <option value="DISPATCHER">Dispatcher</option>
              <option value="ADMIN">Org Admin</option>
              {currentUser?.role === 'SUPER_ADMIN' && (
                <option value="SUPER_ADMIN">Super Admin</option>
              )}
            </select>
          </div>

          <div className="p-3 bg-[#070A10] border border-slate-800/80 rounded-lg text-xs text-slate-400 leading-relaxed">
            The recipient will receive an email from <span className="text-slate-200 font-mono font-medium">invites@thezonix.com</span> with a secure 48-hour link.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Sending...' : 'Send invite'}</span>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-semibold text-slate-100">
            {user ? 'Edit user' : 'New user'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
              required
              disabled={!!user}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {user ? 'New password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
              required={!user}
              minLength={form.password ? 6 : undefined}
              placeholder={user ? "••••••••" : ""}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Max allowed tabs / sessions</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.maxTabs}
              onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-slate-600 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-[#070A10] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:border-slate-600 focus:outline-none"
            >
              <option value="DISPATCHER">Dispatcher</option>
              <option value="ADMIN">Org Admin</option>
              {currentUser?.role === 'SUPER_ADMIN' && (
                <option value="SUPER_ADMIN">Super Admin</option>
              )}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition">
              {loading ? 'Saving...' : 'Save user'}
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
  const [selectedDispatcherId, setSelectedDispatcherId] = useState('');
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

  useEffect(() => {
    setSelectedDispatcherId('system');
  }, [users]);

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
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInvite = async (form) => {
    try {
      const res = await authFetch(`/invites/${selectedOrg}`, {
        method: 'POST',
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || 'Failed to send invitation', 'Invite failed', 'error');
        return;
      }

      setShowInviteModal(false);
      showAlert(`Invitation email sent to ${form.email}!`, 'Invitation sent', 'success');
      fetchInvites();
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'Error', 'error');
    }
  };

  const handleCancelInvite = async (inviteId) => {
    if (!window.confirm("Cancel this invitation?")) return;
    try {
      const res = await authFetch(`/invites/${selectedOrg}/${inviteId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showAlert('Invitation cancelled', 'Cancelled', 'info');
        fetchInvites();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyInviteLink = (invite) => {
    const link = `https://thezonix.com/join.html?token=${invite.token}`;
    navigator.clipboard.writeText(link);
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  const handleSave = async (form) => {
    try {
      let res;
      if (editingUser) {
        res = await authFetch(`/users/${editingUser.id}`, {
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
      console.error(err);
      showAlert(err.message || 'An error occurred', 'Error', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await authFetch(`/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await authFetch(`/users/${selectedOrg}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        showAlert(data.error || 'Failed to update user status', 'Status Error', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'Status Error', 'error');
    }
  };

  const handleAuthenticateSite = async (targetUserId) => {
    const targetOrg = orgs.find(o => o.id === selectedOrg) || { id: selectedOrg, targetUrl: 'https://one.dat.com/search/loads' };
    const targetUrl = targetOrg.targetUrl || 'https://one.dat.com/search/loads';
    let displayUsername = 'Organization-wide (All Dispatchers)';

    if (targetUserId !== 'system') {
      const foundDispatcher = dispatchers.find(d => d.id === targetUserId);
      if (foundDispatcher) {
        displayUsername = foundDispatcher.username;
      }
    }

    showAlert(
      `Launching session authentication window for ${displayUsername}.\nTarget site: ${targetUrl}\n\nPlease log in on the window that opens, complete 2FA, then close the window to save the session vault.`,
      'Session provisioning',
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
        await showAlert('Session capture is only available inside the ZONIX Desktop App.', 'Desktop app required', 'warning');
        return;
      }

      if (captureRes && captureRes.success) {
        await showAlert(`Successfully authenticated and saved secure login session for "${displayUsername}"!`, 'Authenticated', 'success');
      }

      fetchUsers();
    } catch (err) {
      console.error('[ZONIX] Authentication window launch error:', err);
      showAlert(err.message || 'An error occurred while launching session capture window', 'Authentication error', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Session Provisioning Panel */}
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-medium">
            <Key className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Locked site session provisioning
            </h3>
            <p className="text-xs text-slate-400">Capture secure 30-day credentials and cookies for dispatchers</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Launching the authentication window opens the target website. Log in to the site manually and complete 2FA. Once authenticated, close the window. ZONIX will automatically intercept and save the cookies.
        </p>

        <div className="flex flex-wrap items-end gap-4 border-t border-slate-800/60 pt-4">
          <div className="w-72">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Target dispatcher
            </label>
            <select
              value={selectedDispatcherId}
              onChange={(e) => setSelectedDispatcherId(e.target.value)}
              className="w-full bg-[#070A10] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:border-slate-600 focus:outline-none"
            >
              <option value="system">Organization-wide (All dispatchers)</option>
              {dispatchers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.username} [{d.email || 'no-email'}]
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={async () => {
              if (selectedDispatcherId) {
                handleAuthenticateSite(selectedDispatcherId);
              } else {
                await showAlert('Please select a session provisioning target.', 'Selection required', 'warning');
              }
            }}
            disabled={dispatchers.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Launch authentication window</span>
          </button>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 tracking-normal">User registry</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage dispatcher accounts and role permissions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Org:</span>
              <select
                value={selectedOrg}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedOrg(e.target.value);
                }}
                className="bg-[#0D121F] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
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
            className="px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium hover:bg-slate-700/60 transition flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Invite via email</span>
          </button>

          <button 
            onClick={() => { setEditingUser(null); setShowModal(true); }} 
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New user</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs text-slate-400 font-normal">
                <th className="py-2.5 px-3 text-left">Username</th>
                <th className="py-2.5 px-3 text-left">Email</th>
                <th className="py-2.5 px-3 text-left">Role</th>
                <th className="py-2.5 px-3 text-left">Status</th>
                <th className="py-2.5 px-3 text-left">Active tabs / max</th>
                <th className="py-2.5 px-3 text-left">Last login</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading user registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No users registered in this organization.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-200">{u.username}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400">{u.email || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                        {u.role === 'DISPATCHER' ? 'Dispatcher' : u.role === 'ADMIN' ? 'Org Admin' : u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                        u.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                        {u.status === 'ACTIVE' ? 'Active' : u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400">
                      <span className="text-slate-200 font-semibold">{u._count?.sessions || 0}</span> / {u.maxTabs || 5}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.role === 'DISPATCHER' && (
                          <button
                            onClick={() => handleAuthenticateSite(u.id)}
                            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                            title="Authenticate Locked Site"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingUser(u); setShowModal(true); }}
                          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-amber-400 transition"
                          title={u.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                        >
                          {u.status === 'ACTIVE' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        </button>
                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invites.filter(i => i.status === 'PENDING').length > 0 && (
        <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-100">
              Pending invitations ({invites.filter(i => i.status === 'PENDING').length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80 text-xs text-slate-400 font-normal">
                  <th className="py-2.5 px-3 text-left">Recipient email</th>
                  <th className="py-2.5 px-3 text-left">Role</th>
                  <th className="py-2.5 px-3 text-left">Max tabs</th>
                  <th className="py-2.5 px-3 text-left">Status</th>
                  <th className="py-2.5 px-3 text-left">Expires at</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.filter(i => i.status === 'PENDING').map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-200">{inv.email}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                        {inv.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400">{inv.maxTabs}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Pending
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400">
                      {new Date(inv.expiresAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleCopyInviteLink(inv)}
                          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                          title="Copy invite link"
                        >
                          {copiedInviteId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition"
                          title="Cancel invitation"
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
          onSave={handleSave}
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
