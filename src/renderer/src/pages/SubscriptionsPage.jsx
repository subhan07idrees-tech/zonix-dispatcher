import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import EmptyState from '../components/EmptyState';
import {
  CreditCard, Building2, Users, DollarSign, Calendar, Clock,
  AlertCircle, CheckCircle2, Search, RefreshCw, Edit3, X,
  ArrowUpRight, Wallet, Shield, Plus, Sparkles
} from 'lucide-react';

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return '—';
  }
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

function StatusPill({ status, label }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {label || 'Active'}
      </span>
    );
  }
  if (status === 'DUE_SOON') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
        <Clock className="w-3 h-3 text-amber-400" />
        {label || 'Due Soon'}
      </span>
    );
  }
  if (status === 'EXPIRED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25">
        <AlertCircle className="w-3 h-3 text-rose-400" />
        {label || 'Expired'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface text-ink-3 border border-line">
      Unset
    </span>
  );
}

// Edit Subscription Modal Component
function EditSubscriptionModal({ item, type, onClose, onSave }) {
  const isOrg = type === 'organization';
  const name = isOrg ? item.displayName || item.name : item.username;

  const [form, setForm] = useState({
    planName: item.planName || (isOrg ? 'Standard Company' : 'Individual Seat'),
    planPrice: item.planPrice ?? 0,
    billingCycle: item.billingCycle || 'monthly',
    paymentMethod: item.paymentMethod || 'Zelle',
    subscriptionStart: item.subscriptionStart ? item.subscriptionStart.substring(0, 10) : new Date().toISOString().substring(0, 10),
    subscriptionEnd: item.subscriptionEnd ? item.subscriptionEnd.substring(0, 10) : '',
    billingNotes: item.billingNotes || ''
  });

  const [saving, setSaving] = useState(false);

  // Quick Date presets (+30 Days, +1 Month, +1 Year)
  const applyPreset = (days) => {
    const base = form.subscriptionStart ? new Date(form.subscriptionStart) : new Date();
    base.setDate(base.getDate() + days);
    setForm(prev => ({
      ...prev,
      subscriptionEnd: base.toISOString().substring(0, 10)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(item.id, form);
    setSaving(false);
  };

  return (
    <div className="zx-modal-overlay">
      <div className="zx-modal-panel max-w-[560px]">
        {/* Header */}
        <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-wash text-accent flex items-center justify-center border border-accent/20">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-ink leading-tight">
                Edit Subscription &amp; Billing
              </h3>
              <p className="text-[11px] font-mono text-ink-3">
                {isOrg ? 'Organization' : 'Dispatcher'}: <span className="text-ink font-medium">{name}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="zx-btn-icon" aria-label="Close modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Plan Name / Tier
              </label>
              <input
                type="text"
                value={form.planName}
                onChange={e => setForm({ ...form, planName: e.target.value })}
                className="zx-input w-full"
                placeholder={isOrg ? 'e.g. 5-Seat Carrier' : 'e.g. Solo Dispatcher'}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Rate / Amount ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-ink-3 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.planPrice}
                  onChange={e => setForm({ ...form, planPrice: e.target.value })}
                  className="zx-input w-full pl-7 font-mono"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Billing Cycle
              </label>
              <select
                value={form.billingCycle}
                onChange={e => setForm({ ...form, billingCycle: e.target.value })}
                className="zx-input w-full cursor-pointer"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly (3 Months)</option>
                <option value="yearly">Yearly (12 Months)</option>
                <option value="custom">Custom Cycle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Payment Method
              </label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                className="zx-input w-full cursor-pointer"
              >
                <option value="Zelle">Zelle</option>
                <option value="Stripe">Stripe / Card</option>
                <option value="Wire / Bank">Wire / Bank Transfer</option>
                <option value="CashApp">CashApp</option>
                <option value="PayPal">PayPal</option>
                <option value="Crypto">USDT / Crypto</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Subscription Start Date
              </label>
              <input
                type="date"
                value={form.subscriptionStart}
                onChange={e => setForm({ ...form, subscriptionStart: e.target.value })}
                className="zx-input w-full font-mono text-xs"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-ink-2">
                  Renewal / Expiry Date
                </label>
                <span className="text-[10px] text-ink-3">Quick set:</span>
              </div>
              <input
                type="date"
                value={form.subscriptionEnd}
                onChange={e => setForm({ ...form, subscriptionEnd: e.target.value })}
                className="zx-input w-full font-mono text-xs"
                required
              />
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => applyPreset(30)}
                  className="px-2 py-0.5 text-[10.5px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(90)}
                  className="px-2 py-0.5 text-[10.5px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +3 Months
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(365)}
                  className="px-2 py-0.5 text-[10.5px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +1 Year
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Accounting Notes &amp; Payment Reference
            </label>
            <textarea
              rows={2}
              value={form.billingNotes}
              onChange={e => setForm({ ...form, billingNotes: e.target.value })}
              className="zx-input w-full resize-none text-xs"
              placeholder="e.g. Paid via Zelle on Nov 10, Confirmed by Subhan, Ref #9482"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="zx-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="zx-btn-primary text-xs flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Assign Subscription Modal Component (For manually binding existing users & companies)
function AssignSubscriptionModal({ organizations, users, initialType, onClose, onSave }) {
  const [type, setType] = useState(initialType || 'organization'); // 'organization' | 'user'
  const isOrg = type === 'organization';

  const availableList = isOrg ? organizations : users;
  const [selectedId, setSelectedId] = useState(() => (availableList.length > 0 ? availableList[0].id : ''));

  const [form, setForm] = useState({
    planName: isOrg ? 'Standard Company' : 'Individual Seat',
    planPrice: isOrg ? 150 : 75,
    billingCycle: 'monthly',
    paymentMethod: 'Zelle',
    subscriptionStart: new Date().toISOString().substring(0, 10),
    subscriptionEnd: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    billingNotes: ''
  });

  const [saving, setSaving] = useState(false);

  // Helper to prefill form based on selected entity
  const populateFromItem = (item, currentType) => {
    if (!item) return;
    const isCurrentOrg = currentType === 'organization';
    const startStr = item.subscriptionStart ? item.subscriptionStart.substring(0, 10) : new Date().toISOString().substring(0, 10);
    let endStr = item.subscriptionEnd ? item.subscriptionEnd.substring(0, 10) : '';
    if (!endStr) {
      const d = new Date(startStr);
      d.setDate(d.getDate() + 30);
      endStr = d.toISOString().substring(0, 10);
    }

    setForm({
      planName: item.planName || (isCurrentOrg ? 'Standard Company' : 'Individual Seat'),
      planPrice: item.planPrice ?? (isCurrentOrg ? 150 : 75),
      billingCycle: item.billingCycle || 'monthly',
      paymentMethod: item.paymentMethod || 'Zelle',
      subscriptionStart: startStr,
      subscriptionEnd: endStr,
      billingNotes: item.billingNotes || ''
    });
  };

  // Sync selectedId when type or lists change
  useEffect(() => {
    const list = type === 'organization' ? organizations : users;
    if (list.length > 0) {
      setSelectedId(list[0].id);
      populateFromItem(list[0], type);
    } else {
      setSelectedId('');
      setForm(prev => ({
        ...prev,
        planName: type === 'organization' ? 'Standard Company' : 'Individual Seat',
        planPrice: type === 'organization' ? 150 : 75
      }));
    }
  }, [type, organizations, users]);

  const handleSelectChange = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    const item = availableList.find(i => i.id === id);
    if (item) populateFromItem(item, type);
  };

  // Quick Date presets (+7, +14, +30, +90, +365)
  const applyPreset = (days) => {
    const base = form.subscriptionStart ? new Date(form.subscriptionStart) : new Date();
    base.setDate(base.getDate() + days);
    setForm(prev => ({
      ...prev,
      subscriptionEnd: base.toISOString().substring(0, 10)
    }));
  };

  // Quick Plan Presets
  const applyPlanPreset = (name, price) => {
    setForm(prev => ({
      ...prev,
      planName: name,
      planPrice: price
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    await onSave(selectedId, type, form);
    setSaving(false);
  };

  return (
    <div className="zx-modal-overlay">
      <div className="zx-modal-panel max-w-[580px]">
        {/* Header */}
        <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-wash text-accent flex items-center justify-center border border-accent/20">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-ink leading-tight">
                Assign Subscription Plan
              </h3>
              <p className="text-[11px] text-ink-3">
                Bind an existing company or dispatcher seat to a billing schedule
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="zx-btn-icon" aria-label="Close modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Type Selector (Segmented Toggle) */}
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Target Entity
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-hover rounded-lg border border-line">
              <button
                type="button"
                onClick={() => setType('organization')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                  isOrg
                    ? 'bg-surface text-ink shadow-sm border border-line'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-accent" />
                <span>Company / Org Plan</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-hover text-ink-3">
                  {organizations.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setType('user')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                  !isOrg
                    ? 'bg-surface text-ink shadow-sm border border-line'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-accent" />
                <span>Individual Dispatcher</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-hover text-ink-3">
                  {users.length}
                </span>
              </button>
            </div>
          </div>

          {/* Target Dropdown Selector */}
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              {isOrg ? 'Select Company / Client' : 'Select Registered Dispatcher'} <span className="text-rose-400">*</span>
            </label>
            {availableList.length === 0 ? (
              <div className="p-3 text-xs text-ink-3 bg-surface rounded-lg border border-line">
                No existing {isOrg ? 'companies' : 'dispatchers'} found.
              </div>
            ) : (
              <select
                value={selectedId}
                onChange={handleSelectChange}
                className="zx-input w-full cursor-pointer font-medium"
                required
              >
                {availableList.map(item => (
                  <option key={item.id} value={item.id}>
                    {isOrg
                      ? `${item.displayName || item.name} (${item.name})`
                      : `${item.username} ${item.email ? `(${item.email})` : ''} — ${item.org?.displayName || item.org?.name || 'Unassigned'}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Plan Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-ink-2">
                Plan Tier &amp; Rate Presets
              </label>
              <span className="text-[10.5px] text-ink-3">Click to apply:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {isOrg ? (
                <>
                  <button
                    type="button"
                    onClick={() => applyPlanPreset('Standard Company', 150)}
                    className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                  >
                    Standard ($150)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlanPreset('Carrier Fleet Pro', 250)}
                    className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                  >
                    Fleet Pro ($250)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlanPreset('Enterprise Unlimited', 500)}
                    className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                  >
                    Enterprise ($500)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => applyPlanPreset('Individual Seat', 75)}
                    className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                  >
                    Standard Seat ($75)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlanPreset('Solo Dispatcher Pro', 120)}
                    className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                  >
                    Solo Pro ($120)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlanPreset('Trial Pass (7 Days)', 0)}
                    className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                  >
                    Free Trial ($0)
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Plan Name / Tier
              </label>
              <input
                type="text"
                value={form.planName}
                onChange={e => setForm({ ...form, planName: e.target.value })}
                className="zx-input w-full text-xs"
                placeholder={isOrg ? 'e.g. Standard Company' : 'e.g. Individual Seat'}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Rate / Amount ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-ink-3 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.planPrice}
                  onChange={e => setForm({ ...form, planPrice: e.target.value })}
                  className="zx-input w-full pl-7 font-mono text-xs"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Billing Cycle
              </label>
              <select
                value={form.billingCycle}
                onChange={e => setForm({ ...form, billingCycle: e.target.value })}
                className="zx-input w-full cursor-pointer text-xs"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly (3 Months)</option>
                <option value="yearly">Yearly (12 Months)</option>
                <option value="custom">Custom Cycle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Payment Method
              </label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                className="zx-input w-full cursor-pointer text-xs"
              >
                <option value="Zelle">Zelle</option>
                <option value="Stripe">Stripe / Card</option>
                <option value="Wire / Bank">Wire / Bank Transfer</option>
                <option value="CashApp">CashApp</option>
                <option value="PayPal">PayPal</option>
                <option value="Crypto">USDT / Crypto</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Subscription Start Date
              </label>
              <input
                type="date"
                value={form.subscriptionStart}
                onChange={e => setForm({ ...form, subscriptionStart: e.target.value })}
                className="zx-input w-full font-mono text-xs"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-ink-2">
                  Renewal / Expiry Date
                </label>
                <span className="text-[10px] text-ink-3">Quick set:</span>
              </div>
              <input
                type="date"
                value={form.subscriptionEnd}
                onChange={e => setForm({ ...form, subscriptionEnd: e.target.value })}
                className="zx-input w-full font-mono text-xs"
                required
              />
              <div className="flex items-center gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(7)}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +7D
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(14)}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +14D
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(30)}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +30D
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(90)}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +3M
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(365)}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface hover:bg-surface-hover text-ink-2 hover:text-ink border border-line transition-colors"
                >
                  +1Y
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Accounting Notes &amp; Payment Reference
            </label>
            <textarea
              rows={2}
              value={form.billingNotes}
              onChange={e => setForm({ ...form, billingNotes: e.target.value })}
              className="zx-input w-full resize-none text-xs"
              placeholder="e.g. Paid via Zelle on Nov 14, Ref #9482, Confirmed by Subhan"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="zx-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedId}
              className="zx-btn-primary text-xs flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Assign Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

class SubscriptionsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[SubscriptionsErrorBoundary] Caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 zx-card text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-ink">Subscriptions View Recovered</h3>
          <p className="text-xs text-ink-3 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="zx-btn-primary text-xs"
          >
            Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SubscriptionsPageContent() {
  const { authFetch, user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('organizations'); // 'organizations' | 'users'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    metrics: { mrr: 0, activeCount: 0, dueSoonCount: 0, expiredCount: 0 },
    organizations: [],
    users: []
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DUE_SOON' | 'EXPIRED'
  const [editingItem, setEditingItem] = useState(null); // { item, type }
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignInitialType, setAssignInitialType] = useState('organization');
  const [extraOrgs, setExtraOrgs] = useState([]);
  const [extraUsers, setExtraUsers] = useState([]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/subscriptions');
      if (!res.ok) throw new Error('Failed to load subscriptions');
      const resData = await res.json();
      setData(resData);
    } catch (err) {
      console.error('[Subscriptions] Fetch error:', err);
      showToast(err.message, 'err');
      // Graceful fallback: load raw organizations and users so assign dropdown always has accounts
      try {
        const [orgRes, userRes] = await Promise.all([
          authFetch('/organizations').catch(() => null),
          authFetch('/users').catch(() => null)
        ]);
        if (orgRes && orgRes.ok) {
          const od = await orgRes.json();
          setExtraOrgs(od.organizations || []);
        }
        if (userRes && userRes.ok) {
          const ud = await userRes.json();
          setExtraUsers(ud.users || []);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSaveSubscription = async (id, form) => {
    const isOrg = editingItem.type === 'organization';
    const endpoint = isOrg ? `/subscriptions/organization/${id}` : `/subscriptions/user/${id}`;

    try {
      const res = await authFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to save subscription');

      showToast('Subscription updated successfully', 'ok');
      setEditingItem(null);
      await fetchSubscriptions();
    } catch (err) {
      showToast(err.message, 'err');
    }
  };

  const handleAssignSubscription = async (id, type, form) => {
    const isOrg = type === 'organization';
    const endpoint = isOrg ? `/subscriptions/organization/${id}` : `/subscriptions/user/${id}`;

    try {
      const res = await authFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to assign subscription');
      }

      showToast(`Subscription assigned to ${isOrg ? 'organization' : 'dispatcher'} successfully`, 'ok');
      setShowAssignModal(false);
      await fetchSubscriptions();
    } catch (err) {
      showToast(err.message, 'err');
    }
  };

  // Filter Logic
  const allAvailableOrgs = data.organizations && data.organizations.length > 0 ? data.organizations : extraOrgs;
  const allAvailableUsers = data.users && data.users.length > 0 ? data.users : extraUsers;

  const orgList = data.organizations || [];
  const userList = data.users || [];

  const filterRecords = (list, isOrg) => {
    return list.filter(item => {
      // Search match
      const query = search.toLowerCase().trim();
      let matchesSearch = true;
      if (query) {
        if (isOrg) {
          matchesSearch = (
            (item.name || '').toLowerCase().includes(query) ||
            (item.displayName || '').toLowerCase().includes(query) ||
            (item.billingNotes || '').toLowerCase().includes(query) ||
            (item.paymentMethod || '').toLowerCase().includes(query)
          );
        } else {
          matchesSearch = (
            (item.username || '').toLowerCase().includes(query) ||
            (item.email || '').toLowerCase().includes(query) ||
            (item.org?.displayName || item.org?.name || '').toLowerCase().includes(query) ||
            (item.billingNotes || '').toLowerCase().includes(query)
          );
        }
      }

      // Status match
      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = item.subscriptionStatus === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  };

  const filteredOrgs = filterRecords(orgList, true);
  const filteredUsers = filterRecords(userList, false);

  const metrics = data?.metrics || { mrr: 0, activeCount: 0, dueSoonCount: 0, expiredCount: 0 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-accent" />
            Client Subscriptions &amp; Billing
          </h1>
          <p className="text-xs text-ink-3 mt-1">
            Track user creation dates, active plans, renewal countdowns, and payment history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAssignInitialType(activeTab === 'organizations' ? 'organization' : 'user');
              setShowAssignModal(true);
            }}
            className="zx-btn-primary text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Subscription</span>
          </button>
          <button
            type="button"
            onClick={fetchSubscriptions}
            disabled={loading}
            className="zx-btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cockpit Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="zx-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Monthly Revenue (MRR)
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-ink tracking-tight">
            {formatCurrency(metrics.mrr || 0)}
          </div>
          <p className="text-[11px] text-ink-3 mt-1">Active recurring monthly pipeline</p>
        </div>

        {/* Active Subscriptions Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`zx-card p-4 cursor-pointer transition-all hover:border-line-hover ${statusFilter === 'ACTIVE' ? 'ring-1 ring-emerald-500/50' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Active Subscriptions
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {metrics.activeCount || 0}
          </div>
          <p className="text-[11px] text-ink-3 mt-1">Accounts in active paid status</p>
        </div>

        {/* Renewals Due Soon (<= 7 days) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'DUE_SOON' ? 'ALL' : 'DUE_SOON')}
          className={`zx-card p-4 cursor-pointer transition-all hover:border-line-hover ${statusFilter === 'DUE_SOON' ? 'ring-1 ring-amber-500/50' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Renewals Due (7 Days)
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            {metrics.dueSoonCount || 0}
          </div>
          <p className="text-[11px] text-ink-3 mt-1">Due for renewal within next week</p>
        </div>

        {/* Expired / Overdue */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          className={`zx-card p-4 cursor-pointer transition-all hover:border-line-hover ${statusFilter === 'EXPIRED' ? 'ring-1 ring-rose-500/50' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Past Due / Expired
            </span>
            <div className="w-7 h-7 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
            {metrics.expiredCount || 0}
          </div>
          <p className="text-[11px] text-ink-3 mt-1">Expired accounts needing follow-up</p>
        </div>
      </div>

      {/* Segmented Tab Navigation & Filters Bar */}
      <div className="zx-card p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-surface-hover rounded-lg border border-line">
            <button
              type="button"
              onClick={() => setActiveTab('organizations')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'organizations'
                  ? 'bg-surface text-ink shadow-sm border border-line'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-accent" />
              <span>Company Plans</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-hover text-ink-3">
                {orgList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-surface text-ink shadow-sm border border-line'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-accent" />
              <span>Individual Dispatchers</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-hover text-ink-3">
                {userList.length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by name, email, or notes..."
              className="zx-input w-full pl-8 text-xs h-8"
            />
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-line text-xs">
          <span className="text-[11px] text-ink-3">Status Filter:</span>
          {['ALL', 'ACTIVE', 'DUE_SOON', 'EXPIRED'].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-accent text-accent-contrast'
                  : 'text-ink-2 hover:text-ink hover:bg-surface-hover'
              }`}
            >
              {f === 'ALL' && 'All Accounts'}
              {f === 'ACTIVE' && 'Active Only'}
              {f === 'DUE_SOON' && 'Due Soon (7d)'}
              {f === 'EXPIRED' && 'Expired'}
            </button>
          ))}
          {statusFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="text-[11px] text-accent underline ml-auto cursor-pointer"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Subscription Data Tables */}
      <div className="zx-card overflow-hidden">
        {activeTab === 'organizations' ? (
          /* TAB 1: ORGANIZATIONS */
          <div className="overflow-x-auto">
            <table className="zx-table w-full">
              <thead>
                <tr>
                  <th>Company / Client</th>
                  <th>Created Date</th>
                  <th>Plan Tier</th>
                  <th className="text-right">Rate ($)</th>
                  <th>Method</th>
                  <th>Cycle Window</th>
                  <th>Status &amp; Renewal</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center">
                      <EmptyState
                        icon={Building2}
                        title="No matching companies found"
                        description={search ? 'Try clearing your search query.' : 'Assign a subscription plan to one of your existing organizations.'}
                        action={!search ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignInitialType('organization');
                              setShowAssignModal(true);
                            }}
                            className="zx-btn-secondary text-xs flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Company Plan</span>
                          </button>
                        ) : null}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map(org => (
                    <tr key={org.id} className="hover:bg-surface-hover/50 transition-colors">
                      {/* Name */}
                      <td>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-ink">
                            {org.displayName || org.name}
                          </span>
                          <span className="font-mono text-[10.5px] text-ink-3">
                            {org.name} · {org._count?.users || 0} users
                          </span>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="font-mono text-xs text-ink-2">
                        {formatDate(org.createdAt)}
                      </td>

                      {/* Plan Tier */}
                      <td>
                        <span className="text-xs font-medium text-ink">
                          {org.planName || 'Standard Company'}
                        </span>
                        <div className="text-[10px] text-ink-3 capitalize">
                          {org.billingCycle || 'monthly'}
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="text-right font-mono text-xs font-bold text-ink">
                        {formatCurrency(org.planPrice)}
                      </td>

                      {/* Payment Method */}
                      <td>
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface border border-line text-ink-2 font-mono">
                          <Wallet className="w-3 h-3 text-ink-3" />
                          {org.paymentMethod || 'Zelle'}
                        </span>
                      </td>

                      {/* Cycle Window */}
                      <td>
                        <div className="flex flex-col font-mono text-[11px]">
                          <span className="text-ink-2">{formatDate(org.subscriptionStart)}</span>
                          <span className="text-ink-3">to {formatDate(org.subscriptionEnd)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusPill
                          status={org.subscriptionStatus}
                          label={org.subscriptionLabel}
                        />
                      </td>

                      {/* Action */}
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => setEditingItem({ item: org, type: 'organization' })}
                          className="zx-btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-accent" />
                          <span>Edit Billing</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: INDIVIDUAL USERS */
          <div className="overflow-x-auto">
            <table className="zx-table w-full">
              <thead>
                <tr>
                  <th>Dispatcher / User</th>
                  <th>Assigned Company</th>
                  <th>Created Date</th>
                  <th>Plan Tier</th>
                  <th className="text-right">Seat Rate ($)</th>
                  <th>Method</th>
                  <th>Renewal Date</th>
                  <th>Status &amp; Renewal</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center">
                      <EmptyState
                        icon={Users}
                        title="No matching dispatchers found"
                        description={search ? 'Try clearing your search query.' : 'Assign a subscription plan to one of your existing dispatchers.'}
                        action={!search ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignInitialType('user');
                              setShowAssignModal(true);
                            }}
                            className="zx-btn-secondary text-xs flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Dispatcher Seat</span>
                          </button>
                        ) : null}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-surface-hover/50 transition-colors">
                      {/* User */}
                      <td>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-ink font-mono">
                            {user.username}
                          </span>
                          <span className="text-[10.5px] text-ink-3">
                            {user.email || 'No email attached'}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td>
                        <span className="text-xs text-ink-2 font-medium">
                          {user.org?.displayName || user.org?.name || '—'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="font-mono text-xs text-ink-2">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Plan Tier */}
                      <td>
                        <span className="text-xs font-medium text-ink">
                          {user.planName || 'Individual Seat'}
                        </span>
                        <div className="text-[10px] text-ink-3 capitalize">
                          {user.billingCycle || 'monthly'}
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="text-right font-mono text-xs font-bold text-ink">
                        {formatCurrency(user.planPrice)}
                      </td>

                      {/* Payment Method */}
                      <td>
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface border border-line text-ink-2 font-mono">
                          <Wallet className="w-3 h-3 text-ink-3" />
                          {user.paymentMethod || 'Zelle'}
                        </span>
                      </td>

                      {/* Renewal Date */}
                      <td className="font-mono text-xs text-ink-2">
                        {formatDate(user.subscriptionEnd)}
                      </td>

                      {/* Status */}
                      <td>
                        <StatusPill
                          status={user.subscriptionStatus}
                          label={user.subscriptionLabel}
                        />
                      </td>

                      {/* Action */}
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => setEditingItem({ item: user, type: 'user' })}
                          className="zx-btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-accent" />
                          <span>Edit Billing</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <EditSubscriptionModal
          item={editingItem.item}
          type={editingItem.type}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveSubscription}
        />
      )}

      {/* Assign Modal (For manually binding existing users & companies) */}
      {showAssignModal && (
        <AssignSubscriptionModal
          organizations={allAvailableOrgs}
          users={allAvailableUsers}
          initialType={assignInitialType}
          onClose={() => setShowAssignModal(false)}
          onSave={handleAssignSubscription}
        />
      )}
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <SubscriptionsErrorBoundary>
      <SubscriptionsPageContent />
    </SubscriptionsErrorBoundary>
  );
}

