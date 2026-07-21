import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, X, Shield, ShieldOff, Key } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="zonix-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold tracking-wide">
            {user ? 'EDIT USER' : 'NEW USER'}
          </h3>
          <button onClick={onClose} className="text-zonix-text-dim hover:text-zonix-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">USERNAME</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="zonix-input w-full font-mono"
              required
              disabled={!!user}
            />
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">EMAIL</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="zonix-input w-full font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">
              {user ? 'NEW PASSWORD (LEAVE BLANK TO KEEP CURRENT)' : 'PASSWORD'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="zonix-input w-full font-mono"
              required={!user}
              minLength={form.password ? 8 : undefined}
              placeholder={user ? "••••••••" : ""}
            />
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">MAX ALLOWED TABS / SESSIONS</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.maxTabs}
              onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value) || 1 })}
              className="zonix-input w-full font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-zonix-text-dim mb-1 font-mono">ROLE</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="zonix-input w-full font-mono"
            >
              <option value="DISPATCHER">Dispatcher</option>
              <option value="ADMIN">Org Admin</option>
              {currentUser?.role === 'SUPER_ADMIN' && (
                <option value="SUPER_ADMIN">Super Admin</option>
              )}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="zonix-btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="zonix-btn-primary flex-1">
              {loading ? 'SAVING...' : 'SAVE'}
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(currentUser?.orgId || '');
  const [orgs, setOrgs] = useState([]);
  const [selectedDispatcherId, setSelectedDispatcherId] = useState('');

  const dispatchers = users.filter(u => u.role === 'DISPATCHER');

  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') {
      fetchOrgs();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedOrg) fetchUsers();
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

  const handleSave = async (form) => {
    try {
      let res;
      if (editingUser) {
        const body = { role: form.role, email: form.email, maxTabs: form.maxTabs };
        if (form.password) {
          body.password = form.password;
        }
        res = await authFetch(`/users/${selectedOrg}/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        res = await authFetch(`/users/${selectedOrg}`, {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        showAlert(errorData.error || 'Failed to save user', 'ERROR', 'error');
        return;
      }

      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'ERROR', 'error');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await authFetch(`/users/${selectedOrg}/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      const res = await authFetch(`/users/${selectedOrg}/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errorData = await res.json();
        showAlert(errorData.error || 'Failed to delete user', 'ERROR', 'error');
        return;
      }
      showAlert('User deleted successfully', 'DELETED', 'success');
      fetchUsers();
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'An error occurred', 'ERROR', 'error');
    }
  };

  const handleAuthenticateSite = async (targetUserId) => {
    let targetOrg = null;
    if (currentUser?.role === 'SUPER_ADMIN') {
      targetOrg = orgs.find(o => o.id === selectedOrg);
    } else {
      targetOrg = orgs.find(o => o.id === currentUser?.orgId);
    }

    const targetUrl = targetOrg?.targetUrl;
    if (!targetUrl) {
      await showAlert('Please configure a Target URL for this organization in Org Settings / Organizations first.', 'CONFIGURATION REQUIRED', 'warning');
      return;
    }

    const displayUsername = targetUserId === 'system' 
      ? 'Organization-wide (All Dispatchers)' 
      : (users.find(u => u.id === targetUserId)?.username || 'dispatcher');

    await showAlert(
      `Launching session capture window for "${displayUsername}".\n\n1. A new browser window will open loading "${targetUrl}".\n2. Please enter credentials and log in to the site.\n3. Once authenticated and logged in, simply CLOSE the window.\n4. ZONIX will automatically capture the login session.`,
      'CAPTURE INSTUCTIONS',
      'info'
    );

    try {
      const result = await window.zonixAPI.captureCookies({
        targetUrl,
        orgId: selectedOrg,
        userId: targetUserId
      });

      if (result.success && result.cookies) {
        const storeRes = await authFetch('/cookies/store', {
          method: 'POST',
          body: JSON.stringify({
            orgId: selectedOrg,
            userId: targetUserId,
            targetDomain: result.targetDomain,
            cookies: result.cookies,
            localStorage: result.localStorageData || '{}'
          })
        });

        if (storeRes.ok) {
          await showAlert(`Successfully authenticated and saved secure login session for "${displayUsername}"!`, 'AUTHENTICATED', 'success');
        } else {
          const storeData = await storeRes.json();
          await showAlert(`Failed to save captured session: ${storeData.error || 'Unknown error'}`, 'SAVE FAILED', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      await showAlert(`Error authenticating site: ${err.message}`, 'AUTHENTICATION ERROR', 'error');
    }
  };

  const roleColors = {
    SUPER_ADMIN: 'zonix-badge-error',
    ADMIN: 'zonix-badge-warning',
    MANAGER: 'zonix-badge-purple',
    DISPATCHER: 'zonix-badge-active',
    VIEWER: 'zonix-badge'
  };

  return (
    <div className="p-6 space-y-6">
      {/* LOCKED SITE SESSION PROVISIONING PANEL */}
      <div className="zonix-card p-6 border border-zonix-cyan/20 bg-zonix-cyan/5 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-zonix-cyan/10 border border-zonix-cyan/30 flex items-center justify-center">
            <Key className="w-4 h-4 text-zonix-cyan animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-zonix-cyan">
              LOCKED SITE SESSION PROVISIONING
            </h3>
            <p className="text-[10px] text-zonix-text-dim font-mono">Capture secure credentials/cookies for dispatchers</p>
          </div>
        </div>
        <p className="text-xs text-zonix-text-dim max-w-3xl mb-4 leading-relaxed font-mono">
          [INSTRUCTIONS] Launching the auth window opens the target website. Log in to the site manually. Once authenticated, CLOSE the window. ZONIX will intercept and encrypt the cookies, allowing the dispatcher to bypass credentials and log in automatically.
        </p>

        <div className="flex flex-wrap items-end gap-4 border-t border-zonix-border/40 pt-4">
          <div className="w-72">
            <label className="block text-[9px] text-zonix-text-dim font-mono mb-1.5 uppercase tracking-wider">
              SELECT TARGET DISPATCHER
            </label>
            <select
              value={selectedDispatcherId}
              onChange={(e) => setSelectedDispatcherId(e.target.value)}
              className="zonix-input w-full font-mono bg-zonix-surface"
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
            onClick={async () => {
              if (selectedDispatcherId) {
                handleAuthenticateSite(selectedDispatcherId);
              } else {
                await showAlert('Please select a session provisioning target.', 'SELECTION REQUIRED', 'warning');
              }
            }}
            disabled={dispatchers.length === 0}
            className="zonix-btn-primary bg-zonix-cyan/15 border border-zonix-cyan/40 text-zonix-cyan hover:bg-zonix-cyan/30 px-6 font-mono text-xs tracking-wider transition-all"
          >
            LAUNCH AUTHENTICATION WINDOW
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-wide">USER REGISTRY</h2>
          <p className="text-xs text-zonix-text-dim mt-0.5">Manage dispatcher accounts & access control</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zonix-text-dim font-mono">ORG:</span>
              <select
                value={selectedOrg}
                onChange={(e) => {
                  setLoading(true);
                  setSelectedOrg(e.target.value);
                }}
                className="zonix-input font-mono bg-zonix-surface"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.displayName} ({org.name})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={() => { setEditingUser(null); setShowModal(true); }} className="zonix-btn-primary">
            <Plus className="w-4 h-4 mr-1.5 inline" /> NEW USER
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zonix-border text-xs text-zonix-text-dim font-mono">
              <th className="py-2 px-3 text-left">USERNAME</th>
              <th className="py-2 px-3 text-left">EMAIL</th>
              <th className="py-2 px-3 text-left">ROLE</th>
              <th className="py-2 px-3 text-left">STATUS</th>
              <th className="py-2 px-3 text-left">ACTIVE TABS / MAX</th>
              <th className="py-2 px-3 text-left">LAST LOGIN</th>
              <th className="py-2 px-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <div className="w-5 h-5 border-2 border-zonix-cyan border-t-transparent rounded-full animate-spin mx-auto"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-zonix-text-muted font-mono">
                  NO USERS FOUND
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-zonix-border/50 hover:bg-zonix-surface-light/30">
                  <td className="py-2 px-3 text-sm font-mono text-zonix-text">{u.username}</td>
                  <td className="py-2 px-3 text-xs text-zonix-text-dim font-mono">{u.email || '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`zonix-badge ${roleColors[u.role] || 'zonix-badge'}`}>{u.role}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`zonix-badge ${u.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-error'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-zonix-text-dim">
                    <span className="text-zonix-cyan font-semibold">{u._count?.sessions || 0}</span> / {u.maxTabs || 5}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-zonix-text-dim">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.role === 'DISPATCHER' && (
                        <button
                          onClick={() => handleAuthenticateSite(u.id)}
                          className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-cyan"
                          title="Authenticate Locked Site"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingUser(u); setShowModal(true); }}
                        className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-cyan"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u.id, u.status)}
                        className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-yellow-400"
                        title={u.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                      >
                        {u.status === 'ACTIVE' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </button>
                      {currentUser?.id !== u.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-red-400"
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

      {showModal && (
        <UserModal
          user={editingUser}
          orgId={selectedOrg}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
