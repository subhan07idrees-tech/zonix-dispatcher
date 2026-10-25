import React, { useState, useEffect, useCallback } from 'react';
import { Mail, CheckCircle, XCircle, Eye, EyeOff, Loader2, Shield, AlertTriangle, Send, BookTemplate, Trash2, Edit2, Plus, X, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://zonix-backend-0ggt.onrender.com';

// ─── Token badge component ────────────────────────────────────────────────────
function VarToken({ v }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-accent/10 text-accent border border-accent/20 mr-1 mb-1">
      {v}
    </span>
  );
}

// ─── Template Form Modal ──────────────────────────────────────────────────────
function TemplateModal({ template, orgId, token, onClose, onSave }) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [bodyText, setBodyText] = useState(template?.bodyText || '');
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const TOKENS = ['{{broker_name}}', '{{origin}}', '{{destination}}', '{{rate}}', '{{equipment}}', '{{date}}', '{{dispatcher_name}}', '{{load_id}}'];

  function insertToken(token_var) {
    setBodyText(prev => prev + token_var);
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim() || !bodyText.trim()) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = template
        ? `${API}/api/templates/${orgId}/${template.id}`
        : `${API}/api/templates/${orgId}`;
      const method = template ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, subject, bodyText, isDefault })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template');
      onSave(data.template);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border border-line rounded-[var(--r-card)] w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-[15px] font-semibold text-ink">
            {template ? 'Edit Template' : 'New Email Template'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-hover text-ink-3 hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-ctl)] bg-err-bg border border-err/20 text-err-ink text-[13px]">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Template Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rate Intro — Van"
              className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Email Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Available — {{origin}} to {{destination}}"
              className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          {/* Variable tokens */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Insert Variable</label>
            <div className="flex flex-wrap gap-1">
              {TOKENS.map(t => (
                <button
                  key={t}
                  onClick={() => insertToken(t)}
                  className="px-2 py-1 rounded text-[11px] font-mono font-semibold bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Email Body</label>
            <textarea
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              rows={8}
              placeholder="Hi {{broker_name}},&#10;&#10;We are available and interested in the load from {{origin}} to {{destination}}...&#10;&#10;Best regards,&#10;{{dispatcher_name}}"
              className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-mono resize-none"
            />
            <p className="text-[11px] text-ink-3 mt-1">{bodyText.length}/5000 characters</p>
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsDefault(p => !p)}
              className={`w-9 h-5 rounded-full transition-colors relative ${isDefault ? 'bg-accent' : 'bg-line-input'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDefault ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[13px] text-ink">Set as default template</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-ink-2 hover:text-ink rounded-[var(--r-ctl)] hover:bg-surface-hover transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold bg-accent text-white rounded-[var(--r-ctl)] hover:bg-accent-hover disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ templates, token, onClose }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Variable fill values
  const [vars, setVars] = useState({
    broker_name: '', origin: '', destination: '', rate: '',
    equipment: '', date: new Date().toLocaleDateString('en-US'), dispatcher_name: '', load_id: ''
  });

  function applyTemplate(tplId) {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;
    setSelectedTemplate(tplId);
    setSubject(tpl.subject);
    setBody(tpl.bodyText);
  }

  function resolveVars(text) {
    return text
      .replace(/\{\{broker_name\}\}/g, vars.broker_name)
      .replace(/\{\{origin\}\}/g, vars.origin)
      .replace(/\{\{destination\}\}/g, vars.destination)
      .replace(/\{\{rate\}\}/g, vars.rate)
      .replace(/\{\{equipment\}\}/g, vars.equipment)
      .replace(/\{\{date\}\}/g, vars.date)
      .replace(/\{\{dispatcher_name\}\}/g, vars.dispatcher_name)
      .replace(/\{\{load_id\}\}/g, vars.load_id);
  }

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Recipient, subject, and message body are required');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/email-settings/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          to: to.trim(),
          subject: resolveVars(subject),
          body: resolveVars(body)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  // Detect variables used in current body+subject
  const usedVars = ['broker_name', 'origin', 'destination', 'rate', 'equipment', 'date', 'dispatcher_name', 'load_id']
    .filter(v => (body + subject).includes(`{{${v}}}`));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border border-line rounded-[var(--r-card)] w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[var(--r-ctl)] bg-accent/10 flex items-center justify-center">
              <Send size={14} className="text-accent" />
            </div>
            <h2 className="text-[15px] font-semibold text-ink">Compose Email</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-hover text-ink-3 hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
            <CheckCircle size={40} className="text-ok" />
            <p className="text-[15px] font-semibold text-ink">Email Sent Successfully</p>
            <p className="text-[13px] text-ink-2">Delivered to <span className="font-medium">{to}</span></p>
            <button onClick={onClose} className="mt-2 px-4 py-2 text-[13px] font-semibold bg-accent text-white rounded-[var(--r-ctl)] hover:bg-accent-hover transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-ctl)] bg-err-bg border border-err/20 text-err-ink text-[13px]">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Template picker */}
            {templates.length > 0 && (
              <div>
                <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Load Template</label>
                <select
                  value={selectedTemplate}
                  onChange={e => applyTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                >
                  <option value="">— Select a template —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' ★' : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* To */}
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">To (Broker Email)</label>
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="rates@brokercompany.com"
                className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Available — Chicago, IL to Columbus, OH"
                className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>

            {/* Variable fill-in (only shown if template has vars) */}
            {usedVars.length > 0 && (
              <div className="rounded-[var(--r-ctl)] border border-line-soft bg-bg p-3">
                <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wider mb-2">Fill in Variables</p>
                <div className="grid grid-cols-2 gap-2">
                  {usedVars.map(v => (
                    <div key={v}>
                      <label className="block text-[11px] text-ink-3 mb-0.5">{`{{${v}}}`}</label>
                      <input
                        value={vars[v]}
                        onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                        placeholder={v.replace(/_/g, ' ')}
                        className="w-full px-2 py-1.5 rounded-[6px] bg-surface border border-line-input text-[12px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={7}
                placeholder="Write your message here..."
                className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-mono resize-none"
              />
            </div>
          </div>
        )}

        {!sent && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-ink-2 hover:text-ink rounded-[var(--r-ctl)] hover:bg-surface-hover transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold bg-accent text-white rounded-[var(--r-ctl)] hover:bg-accent-hover disabled:opacity-60 transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmailPage() {
  const { token, user } = useAuth();
  const [gmailStatus, setGmailStatus] = useState({ connected: false, gmailAddress: null });
  const [templates, setTemplates] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Gmail connect form
  const [gmailInput, setGmailInput] = useState('');
  const [appPassInput, setAppPassInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState('');

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const orgId = user?.orgId;

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API}/api/email-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setGmailStatus(await res.json());
    } catch (e) { /* silent */ }
    setLoadingStatus(false);
  }, [token]);

  const fetchTemplates = useCallback(async () => {
    if (!orgId) return;
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${API}/api/templates/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) { /* silent */ }
    setLoadingTemplates(false);
  }, [token, orgId]);

  useEffect(() => {
    fetchStatus();
    fetchTemplates();
  }, [fetchStatus, fetchTemplates]);

  async function handleConnect() {
    setConnecting(true);
    setConnectError('');
    setConnectSuccess('');
    try {
      const res = await fetch(`${API}/api/email-settings/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gmailAddress: gmailInput, appPassword: appPassInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnectSuccess(`Gmail connected: ${data.gmailAddress}`);
      setGmailInput('');
      setAppPassInput('');
      fetchStatus();
    } catch (e) {
      setConnectError(e.message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`${API}/api/email-settings/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnectSuccess('');
      fetchStatus();
    } catch (e) { /* silent */ }
    setDisconnecting(false);
  }

  async function handleDeleteTemplate(id) {
    setDeletingId(id);
    try {
      await fetch(`${API}/api/templates/${orgId}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) { /* silent */ }
    setDeletingId(null);
  }

  const canManageTemplates = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-line">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold text-ink tracking-tight">Email</h1>
            <p className="text-[13px] text-ink-2 mt-0.5">Connect your Gmail and manage dispatch email templates</p>
          </div>
          {gmailStatus.connected && (
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold bg-accent text-white rounded-[var(--r-ctl)] hover:bg-accent-hover transition-colors"
            >
              <Send size={14} />
              Compose
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Gmail Connection Card ─────────────────────────────────────────── */}
        <div className="bg-surface border border-line rounded-[var(--r-card)] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-[var(--r-ctl)] bg-surface-hover flex items-center justify-center">
              <Mail size={16} className="text-ink-2" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Gmail Account</h2>
              <p className="text-[12px] text-ink-3">Send emails directly from your own Gmail address</p>
            </div>
            <div className="ml-auto">
              {loadingStatus ? (
                <Loader2 size={16} className="text-ink-3 animate-spin" />
              ) : gmailStatus.connected ? (
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-ok-ink bg-ok-bg px-2.5 py-1 rounded-[var(--r-pill)] border border-ok/20">
                  <CheckCircle size={12} /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3 bg-bg px-2.5 py-1 rounded-[var(--r-pill)] border border-line">
                  <XCircle size={12} /> Not connected
                </span>
              )}
            </div>
          </div>

          {gmailStatus.connected ? (
            <div className="flex items-center justify-between p-3 rounded-[var(--r-ctl)] bg-ok-bg border border-ok/20">
              <div>
                <p className="text-[13px] font-semibold text-ok-ink">{gmailStatus.gmailAddress}</p>
                <p className="text-[11px] text-ok-ink/70 mt-0.5">Credentials stored encrypted · Never exposed</p>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-err-ink bg-err-bg border border-err/20 rounded-[var(--r-ctl)] hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Info callout */}
              <div className="flex items-start gap-2.5 p-3 rounded-[var(--r-ctl)] bg-accent-wash border border-accent/20">
                <Shield size={14} className="text-accent mt-0.5 flex-shrink-0" />
                <div className="text-[12px] text-ink-2 leading-relaxed">
                  <strong className="text-ink">Requires a Gmail App Password</strong> — not your regular password.
                  Go to <strong>Google Account → Security → 2-Step Verification → App passwords</strong> and generate one for "Mail".
                </div>
              </div>

              {connectError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-ctl)] bg-err-bg border border-err/20 text-err-ink text-[13px]">
                  <AlertTriangle size={14} /> {connectError}
                </div>
              )}
              {connectSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-ctl)] bg-ok-bg border border-ok/20 text-ok-ink text-[13px]">
                  <CheckCircle size={14} /> {connectSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Gmail Address</label>
                  <input
                    type="email"
                    value={gmailInput}
                    onChange={e => setGmailInput(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-3 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">App Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={appPassInput}
                      onChange={e => setAppPassInput(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full pl-3 pr-9 py-2 rounded-[var(--r-ctl)] bg-bg border border-line-input text-[13px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConnect}
                disabled={connecting || !gmailInput || !appPassInput}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold bg-accent text-white rounded-[var(--r-ctl)] hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {connecting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {connecting ? 'Verifying…' : 'Connect Gmail'}
              </button>
            </div>
          )}
        </div>

        {/* ── Email Templates ───────────────────────────────────────────────── */}
        <div className="bg-surface border border-line rounded-[var(--r-card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--r-ctl)] bg-surface-hover flex items-center justify-center">
                <Mail size={16} className="text-ink-2" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-ink">Email Templates</h2>
                <p className="text-[12px] text-ink-3">{templates.length} template{templates.length !== 1 ? 's' : ''} · org-wide</p>
              </div>
            </div>
            {canManageTemplates && (
              <button
                onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold bg-accent text-white rounded-[var(--r-ctl)] hover:bg-accent-hover transition-colors"
              >
                <Plus size={14} /> New Template
              </button>
            )}
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-ink-3" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <div className="w-10 h-10 rounded-[var(--r-card)] bg-surface-hover flex items-center justify-center">
                <Mail size={18} className="text-ink-3" />
              </div>
              <p className="text-[14px] font-medium text-ink">No templates yet</p>
              <p className="text-[13px] text-ink-3 max-w-xs">
                {canManageTemplates
                  ? 'Create reusable email templates with variables to speed up broker outreach.'
                  : 'No email templates have been created for your organization yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {templates.map(tpl => {
                const vars = (() => { try { return JSON.parse(tpl.variables); } catch { return []; } })();
                return (
                  <div key={tpl.id} className="flex items-start gap-4 px-5 py-4 hover:bg-row-hover transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-ink truncate">{tpl.name}</span>
                        {tpl.isDefault && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-warn-ink bg-warn-bg border border-warn/20 rounded">
                            <Star size={9} /> DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-ink-2 truncate mb-1.5">Subject: {tpl.subject}</p>
                      <p className="text-[12px] text-ink-3 line-clamp-2 leading-relaxed">{tpl.bodyText}</p>
                      {vars.length > 0 && (
                        <div className="mt-2 flex flex-wrap">
                          {vars.map(v => <VarToken key={v} v={v} />)}
                        </div>
                      )}
                    </div>
                    {canManageTemplates && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => { setEditingTemplate(tpl); setShowTemplateModal(true); }}
                          className="p-1.5 rounded hover:bg-surface-hover text-ink-3 hover:text-ink transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          disabled={deletingId === tpl.id}
                          className="p-1.5 rounded hover:bg-err-bg text-ink-3 hover:text-err-ink transition-colors"
                          title="Delete"
                        >
                          {deletingId === tpl.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          orgId={orgId}
          token={token}
          onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
          onSave={saved => {
            setTemplates(prev => {
              const idx = prev.findIndex(t => t.id === saved.id);
              if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
              return [...prev, saved];
            });
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
        />
      )}
      {showCompose && (
        <ComposeModal templates={templates} token={token} onClose={() => setShowCompose(false)} />
      )}
    </div>
  );
}
