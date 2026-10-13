import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import {
  Building2, Plus, Edit2, Trash2, X, ShieldAlert,
  ExternalLink, Copy, Check
} from 'lucide-react';

function formatMiddleEllipsis(str, maxLen = 12) {
  if (!str) return '—';
  if (str.length <= maxLen) return str;
  const chars = Math.floor((maxLen - 3) / 2);
  return `${str.substring(0, chars)}…${str.substring(str.length - chars)}`;
}

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
    <div className="zx-modal-overlay">
      <div className="zx-modal-panel">
        <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">
            {org ? 'Edit organization' : 'New organization'}
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
                Organization slug
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })
                }
                className="zx-input w-full font-mono text-xs"
                placeholder="e.g. beta-logistics"
                required
                disabled={!!org}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Display name
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="zx-input w-full text-xs"
                placeholder="e.g. Beta Logistics Inc."
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Max users
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value, 10) || 1 })}
                  className="zx-input w-full text-xs font-mono tabular-nums"
                  disabled={!isSuperAdmin}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Max sessions
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxSessions}
                  onChange={(e) => setForm({ ...form, maxSessions: parseInt(e.target.value, 10) || 1 })}
                  className="zx-input w-full text-xs font-mono tabular-nums"
                  disabled={!isSuperAdmin}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Max tabs
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxTabs}
                  onChange={(e) => setForm({ ...form, maxTabs: parseInt(e.target.value, 10) || 1 })}
                  className="zx-input w-full text-xs font-mono tabular-nums"
                  disabled={!isSuperAdmin}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Target board URL
              </label>
              <input
                type="text"
                value={form.targetUrl}
                onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                className="zx-input w-full font-mono text-xs"
                placeholder="https://one.dat.com/search-loads"
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
              {loading ? 'Saving…' : org ? 'Update organization' : 'Create organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteOrgModal({ org, onClose, onConfirm }) {
  const [typedName, setTypedName] = useState('');
  const [loading, setLoading] = useState(false);

  const isMatch = typedName.trim() === org.name;

  const handleDelete = async () => {
    if (!isMatch) return;
    setLoading(true);
    await onConfirm(org.id);
    setLoading(false);
  };

  return (
    <div className="zx-modal-overlay">
      <div className="zx-modal-panel">
        <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-err">
            Delete organization
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

        <div className="p-6 space-y-4 text-xs leading-relaxed text-ink-2">
          <p>
            This action will permanently delete <strong className="text-ink font-semibold">{org.displayName}</strong> ({org.name}) and revoke all its user seats and active sessions. This action cannot be undone.
          </p>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Type <span className="font-mono font-semibold text-ink">{org.name}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="zx-input w-full font-mono text-xs"
              placeholder={org.name}
              autoFocus
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
            type="button"
            disabled={!isMatch || loading}
            onClick={handleDelete}
            className="zx-btn-destructive text-xs"
          >
            {loading ? 'Deleting…' : 'Delete organization'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const { authFetch, user, logout } = useAuth();
  const { copyToClipboard, showToast } = useToast();

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [deletingOrg, setDeletingOrg] = useState(null);
  const [showSuperAdminNotice, setShowSuperAdminNotice] = useState(false);

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
        showToast('Organization updated', 'ok');
      } else {
        await authFetch('/organizations', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        showToast('Organization created', 'ok');
      }
      setShowModal(false);
      setEditingOrg(null);
      fetchOrganizations();
    } catch (err) {
      showToast('Error saving organization', 'err');
    }
  };

  const handleConfirmDelete = async (orgId) => {
    try {
      await authFetch(`/organizations/${orgId}`, { method: 'DELETE' });
      showToast('Organization deleted', 'ok');
      setDeletingOrg(null);
      fetchOrganizations();
    } catch (err) {
      showToast('Error deleting organization', 'err');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-ink tracking-tight">
            Organizations
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Tenant configuration profiles, quotas, and target board endpoints
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateClick}
          className="zx-btn-primary text-xs"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          <span>New organization</span>
        </button>
      </div>

      {/* Grid of Cards (min 360px, equal height) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="zx-card p-5 h-[280px] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 zx-skeleton" />
                <div className="h-3 w-20 zx-skeleton" />
              </div>
              <div className="h-16 w-full zx-skeleton" />
              <div className="h-6 w-full zx-skeleton" />
            </div>
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <div className="zx-card">
          <EmptyState
            icon={Building2}
            title="No organizations"
            description="Tenant organizations provisioned in the console appear here."
            action={
              isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="zx-btn-secondary text-xs"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span>Create organization</span>
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {organizations.map((org) => {
            const userCount = org._count?.users || 0;
            const sessionCount = org._count?.sessions || 0;
            const maxUsers = org.maxUsers || 50;
            const maxSessions = org.maxSessions || 25;
            const maxTabs = org.maxTabs || 5;

            const domain = org.targetUrl
              ? org.targetUrl.replace(/^https?:\/\//, '').split('/')[0]
              : 'one.dat.com';

            return (
              <div
                key={org.id}
                className="zx-card flex flex-col justify-between min-w-[360px] h-full"
              >
                <div>
                  {/* Card Header: name plus status badge, slug in mono */}
                  <div className="p-5 border-b border-line flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-ink truncate leading-snug">
                        {org.displayName}
                      </h3>
                      <p className="font-mono text-xs text-ink-3 mt-0.5 truncate">
                        {org.name}
                      </p>
                    </div>
                    <StatusBadge
                      status={org.status === 'ACTIVE' ? 'Active' : 'Degraded'}
                    />
                  </div>

                  {/* 3-column stats with 18px mono numbers */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2 border-b border-line-soft pb-4 text-center">
                      <div>
                        <div className="text-xs text-ink-2 font-medium">Users</div>
                        <div className="font-mono text-[18px] font-medium text-ink tabular-nums mt-1">
                          {userCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-2 font-medium">Sessions</div>
                        <div className="font-mono text-[18px] font-medium text-ink tabular-nums mt-1">
                          {sessionCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-2 font-medium">Max tabs</div>
                        <div className="font-mono text-[18px] font-medium text-ink tabular-nums mt-1">
                          {maxTabs}
                        </div>
                      </div>
                    </div>

                    {/* Two progress bars */}
                    <div className="space-y-3">
                      <ProgressBar
                        label="User seats"
                        current={userCount}
                        max={maxUsers}
                      />
                      <ProgressBar
                        label="Session capacity"
                        current={sessionCount}
                        max={maxSessions}
                      />
                    </div>

                    {/* Target board URL (mono, external-link icon) */}
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-ink-2">Target board</span>
                      <a
                        href={org.targetUrl || 'https://one.dat.com'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-ink hover:text-accent flex items-center gap-1 truncate max-w-[200px]"
                        title={org.targetUrl || 'https://one.dat.com'}
                      >
                        <span className="truncate">{domain}</span>
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer with divider, truncated UUID plus copy icon on left, Edit plus Delete on right */}
                <div className="p-4 border-t border-line flex items-center justify-between text-xs bg-surface">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="font-mono text-xs text-ink-3 truncate cursor-default"
                      title={org.id}
                    >
                      {formatMiddleEllipsis(org.id, 12)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(org.id, 'Copied ID')}
                      className="zx-btn-icon w-6 h-6 text-ink-3 hover:text-ink"
                      title="Copy ID"
                      aria-label="Copy ID"
                    >
                      <Copy className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOrg(org);
                        setShowModal(true);
                      }}
                      className="zx-btn-secondary h-[28px] px-2.5 text-xs"
                    >
                      Edit
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeletingOrg(org)}
                        className="zx-btn-icon w-7 h-7 text-ink-3 hover:text-err"
                        title="Delete organization"
                        aria-label="Delete organization"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Org Modal */}
      {showModal && (
        <OrgModal
          org={editingOrg}
          user={user}
          onClose={() => {
            setShowModal(false);
            setEditingOrg(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal (Requires typing name) */}
      {deletingOrg && (
        <DeleteOrgModal
          org={deletingOrg}
          onClose={() => setDeletingOrg(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Super Admin Notice Modal */}
      {showSuperAdminNotice && (
        <div className="zx-modal-overlay">
          <div className="zx-modal-panel">
            <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-ink">
                Super admin privileges required
              </h3>
              <button
                type="button"
                onClick={() => setShowSuperAdminNotice(false)}
                className="zx-btn-icon"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs text-ink-2 leading-relaxed">
              <p>
                Only <strong className="text-ink font-semibold">Super Administrator</strong> accounts can provision new tenant organizations.
              </p>
              <div className="p-3 bg-bg border border-line rounded-ctl font-mono text-[11px] space-y-1">
                <p className="text-ink font-sans font-medium">To create an organization:</p>
                <p>1. Sign out of this session.</p>
                <p>2. Leave Organization ID blank.</p>
                <p>3. Enter username: <span className="font-semibold text-accent">superadmin</span>.</p>
              </div>
            </div>
            <div className="h-[56px] px-6 border-t border-line flex items-center justify-end gap-2 bg-surface">
              <button
                type="button"
                onClick={() => setShowSuperAdminNotice(false)}
                className="zx-btn-secondary text-xs"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={logout}
                className="zx-btn-primary text-xs"
              >
                Sign out to login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
