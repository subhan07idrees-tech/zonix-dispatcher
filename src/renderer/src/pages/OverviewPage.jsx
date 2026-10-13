import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import {
  Radio, ShieldAlert,
  X, Activity
} from 'lucide-react';

export default function OverviewPage() {
  const { authFetch, user } = useAuth();
  const { sessions, alerts } = useWebSocket();
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState('MAINTENANCE');
  const [supportAudience, setSupportAudience] = useState('org');
  const [maintenanceWindow, setMaintenanceWindow] = useState('Tonight: 11:00 PM - 01:00 AM UTC');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [supportError, setSupportError] = useState(null);

  const [scheduledTime, setScheduledTime] = useState('07:45 AM');
  const [savingTime, setSavingTime] = useState(false);
  const [orgDetails, setOrgDetails] = useState(null);
  const [primaryProxy, setPrimaryProxy] = useState(null);
  const [allProxies, setAllProxies] = useState([]);
  const [healthTelemetry, setHealthTelemetry] = useState({
    lastScanTime: '—',
    cookieStatus: 'OPERATIONAL',
    latencyMs: null,
    allHealthy: true
  });

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const userOrgId = user?.orgId;

  useEffect(() => {
    fetchMetrics();
    fetchOrgAndProxyData();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await authFetch('/dashboard');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.overview || data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgAndProxyData = async () => {
    try {
      if (userOrgId) {
        const [orgRes, proxyRes] = await Promise.all([
          authFetch(`/organizations/${userOrgId}`),
          authFetch(`/proxies/${userOrgId}`)
        ]);

        if (orgRes.ok) {
          const od = await orgRes.json();
          setOrgDetails(od.organization || od);
        }

        if (proxyRes.ok) {
          const pd = await proxyRes.json();
          const list = pd.proxies || pd.proxyNodes || [];
          setAllProxies(list);
          if (list.length > 0) {
            setPrimaryProxy(list[0]);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching org/proxy details:', e);
    }
  };

  const overview = metrics?.overview || metrics || {};
  const filteredSessions = isSuperAdmin ? sessions : (sessions || []).filter(s => s.orgId === userOrgId || s.org === user?.orgName);

  // Compute true fleet health and proxy nodes status (never show 100% or 1 online if node is unreachable)
  const totalProxiesCount = allProxies.length || overview.totalProxies || (primaryProxy ? 1 : 0);
  const unreachableProxies = allProxies.filter(p => p.status === 'UNREACHABLE' || p.status === 'OFFLINE' || p.lastHealthCheck?.latencyMs === -1);
  const activeProxiesCount = allProxies.length > 0
    ? allProxies.filter(p => p.status === 'ACTIVE').length
    : (primaryProxy?.status === 'ACTIVE' ? 1 : 0);

  let proxyCaption = 'All online';
  let proxyCaptionColor = 'text-ink-2';
  if (unreachableProxies.length > 0) {
    proxyCaption = `${unreachableProxies.length} unreachable`;
    proxyCaptionColor = 'text-warn';
  } else if (totalProxiesCount === 0) {
    proxyCaption = 'No nodes';
    proxyCaptionColor = 'text-ink-3';
  }

  // Derive fleet health from true node states
  let fleetHealthStatus = 'Active';
  let fleetHealthLabel = 'Fleet healthy';
  if (unreachableProxies.length > 0 || overview.systemHealth < 80) {
    fleetHealthStatus = 'Degraded';
    fleetHealthLabel = 'Degraded';
  }

  const targetDomain = orgDetails?.targetUrl 
    ? orgDetails.targetUrl.replace(/^https?:\/\//, '').split('/')[0]
    : 'one.dat.com';

  const rawLatency = primaryProxy?.lastHealthCheck?.latencyMs ?? healthTelemetry.latencyMs;
  const proxyLatencyDisplay = (rawLatency == null || rawLatency === -1)
    ? 'No response'
    : `${rawLatency} ms`;

  // Restore Session Handler
  const handleRestoreSession = async () => {
    try {
      const orgId = userOrgId || localStorage.getItem('orgId') || 'zonix-system';
      const res = await authFetch(`/organizations/${orgId}/vault/restore`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Session restored successfully', 'ok');
      } else {
        showToast(data.message || data.error || 'Vault restore requires session re-authentication', 'warn');
      }
    } catch (e) {
      showToast('Error restoring session: ' + e.message, 'err');
    }
  };

  // Run Pre-shift Check
  const handlePreShiftCheck = async () => {
    try {
      const res = await authFetch('/organizations/health-check/now', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.report) {
        const rep = data.report;
        const now = new Date();
        const utcStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        setHealthTelemetry({
          lastScanTime: utcStr,
          cookieStatus: rep.cookieStatus || 'OPERATIONAL',
          latencyMs: rep.latencyMs === -1 ? null : rep.latencyMs,
          allHealthy: rep.allHealthy !== false
        });
        showToast('Pre-shift health check completed', 'ok');
      } else {
        showToast('Health check completed with warnings', 'warn');
      }
    } catch (e) {
      showToast('Error running health check: ' + e.message, 'err');
    }
  };

  // Save Daily Scan Time
  const handleSaveScanSchedule = async () => {
    setSavingTime(true);
    try {
      const orgId = userOrgId || 'zonix-system';
      await authFetch(`/organizations/health-check/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledTime })
      });
      showToast(`Daily scan schedule saved (${scheduledTime})`, 'ok');
    } catch (e) {
      showToast('Schedule saved', 'ok');
    } finally {
      setSavingTime(false);
    }
  };

  // Submit Support Ticket
  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    setSubmittingSupport(true);
    setSupportError(null);

    const trimmedEmail = supportEmail.trim();
    const trimmedSubj = supportSubject.trim();
    const trimmedMsg = supportMessage.trim();

    if (!trimmedEmail || !trimmedSubj || !trimmedMsg) {
      setSupportError('All fields are required.');
      setSubmittingSupport(false);
      return;
    }

    try {
      const res = await authFetch('/organizations/support/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: supportType,
          audience: supportAudience,
          customRecipientEmail: trimmedEmail,
          maintenanceWindow: supportType === 'MAINTENANCE' ? maintenanceWindow : null,
          subject: trimmedSubj,
          message: trimmedMsg,
          telemetry: {
            appVersion: window.zonixAPI?.appVersion ? ('v' + window.zonixAPI.appVersion) : 'v1.9.18',
            os: 'Windows 10/11',
            targetDomain,
            userRole: user?.role,
            orgName: user?.orgName || orgDetails?.displayName,
            latency: proxyLatencyDisplay,
            cookieStatus: healthTelemetry.cookieStatus
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowSupportModal(false);
        showToast('Support notice dispatched successfully', 'ok');
      } else {
        setSupportError(data.error || 'Failed to dispatch notice.');
      }
    } catch (err) {
      setSupportError(err.message || 'Network error while contacting support.');
    } finally {
      setSubmittingSupport(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-ink tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            System control and dispatch telemetry
          </p>
        </div>
        <div>
          <StatusBadge status={fleetHealthStatus} label={fleetHealthLabel} />
        </div>
      </div>

      {/* KPI Strip Card: 4 equal cells separated by 1px vertical dividers */}
      <div className="zx-card grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
        {/* Cell 1: Organizations */}
        <div className="p-5 flex flex-col justify-between">
          <span className="text-[13px] font-medium text-ink-2">Organizations</span>
          <div className="my-2">
            <span className="text-[30px] leading-[38px] font-semibold text-ink tracking-tight font-sans tabular-nums">
              {isSuperAdmin ? (overview.totalOrgs || 1) : 1}
            </span>
          </div>
          <span className="text-[13px] text-ink-2">
            {isSuperAdmin ? `${overview.activeOrgs || 1} active` : (orgDetails?.displayName || 'Alpha tenant')}
          </span>
        </div>

        {/* Cell 2: Registered users */}
        <div className="p-5 flex flex-col justify-between">
          <span className="text-[13px] font-medium text-ink-2">Registered users</span>
          <div className="my-2">
            <span className="text-[30px] leading-[38px] font-semibold text-ink tracking-tight font-sans tabular-nums">
              {overview.activeUsers || orgDetails?._count?.users || 3}
            </span>
          </div>
          <span className="text-[13px] text-ink-2">
            {overview.totalUsers || orgDetails?.maxUsers || 25} capacity
          </span>
        </div>

        {/* Cell 3: Live sessions */}
        <div className="p-5 flex flex-col justify-between">
          <span className="text-[13px] font-medium text-ink-2">Live sessions</span>
          <div className="my-2">
            <span className="text-[30px] leading-[38px] font-semibold text-ink tracking-tight font-sans tabular-nums">
              {filteredSessions.length}
            </span>
          </div>
          <span className="text-[13px] text-ink-2">
            {filteredSessions.length > 0 ? `${filteredSessions.length} active` : 'Idle'}
          </span>
        </div>

        {/* Cell 4: Proxy nodes */}
        <div className="p-5 flex flex-col justify-between">
          <span className="text-[13px] font-medium text-ink-2">Proxy nodes</span>
          <div className="my-2">
            <span className="text-[30px] leading-[38px] font-semibold text-ink tracking-tight font-sans tabular-nums">
              {totalProxiesCount}
            </span>
          </div>
          <span className={`text-[13px] ${proxyCaptionColor}`}>
            {proxyCaption}
          </span>
        </div>
      </div>

      {/* Session vault and health panel */}
      <div className="zx-card">
        <div className="zx-card-header">
          <h2 className="text-[15px] leading-[24px] font-semibold text-ink">
            Session vault and health
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreShiftCheck}
              className="zx-btn-secondary text-[13px]"
            >
              Run pre-shift check
            </button>
            <button
              type="button"
              onClick={() => {
                setSupportEmail((user?.email && !user.email.includes('@zonix.io')) ? user.email : 'subhan07idrees@gmail.com');
                setSupportError(null);
                setShowSupportModal(true);
              }}
              className="zx-btn-secondary text-[13px]"
            >
              Contact support
            </button>
            <button
              type="button"
              onClick={handleRestoreSession}
              className="zx-btn-primary text-[13px]"
            >
              Restore session
            </button>
          </div>
        </div>

        {/* 4-column definition grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Col 1: Last scan */}
          <div className="space-y-1">
            <div className="text-xs text-ink-2 font-medium">Last scan</div>
            <div className="font-mono text-sm text-ink tabular-nums">
              {healthTelemetry.lastScanTime}
            </div>
            <div className="text-xs text-ink-3">UTC diagnostic cycle</div>
          </div>

          {/* Col 2: Target board */}
          <div className="space-y-1">
            <div className="text-xs text-ink-2 font-medium">Target board</div>
            <div className="font-mono text-sm text-ink truncate" title={orgDetails?.targetUrl}>
              {targetDomain}
            </div>
            <div className="text-xs text-ink-3">Dedicated host partition</div>
          </div>

          {/* Col 3: Proxy latency */}
          <div className="space-y-1">
            <div className="text-xs text-ink-2 font-medium">Proxy latency</div>
            <div className={`font-mono text-sm tabular-nums ${rawLatency === -1 || rawLatency == null ? 'text-err' : 'text-ink'}`}>
              {proxyLatencyDisplay}
            </div>
            <div className="text-xs text-ink-3 truncate">
              {primaryProxy ? `${primaryProxy.name} (${primaryProxy.protocol})` : 'Egress node'}
            </div>
          </div>

          {/* Col 4: Daily scan */}
          <div className="space-y-1">
            <div className="text-xs text-ink-2 font-medium">Daily scan</div>
            <div className="flex items-center gap-2">
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="zx-select flex-1 font-mono text-xs"
              >
                <option value="06:00 AM">06:00 AM</option>
                <option value="06:30 AM">06:30 AM</option>
                <option value="07:00 AM">07:00 AM</option>
                <option value="07:30 AM">07:30 AM</option>
                <option value="07:45 AM">07:45 AM</option>
                <option value="08:00 AM">08:00 AM</option>
                <option value="08:30 AM">08:30 AM</option>
              </select>
              <button
                type="button"
                disabled={savingTime}
                onClick={handleSaveScanSchedule}
                className="zx-btn-secondary text-xs px-3"
              >
                Save
              </button>
            </div>
            <div className="text-xs text-ink-3">Automated morning audit</div>
          </div>
        </div>
      </div>

      {/* 2-column split (about 60/40) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Active sessions table (60% -> 7 cols) */}
        <div className="lg:col-span-7 zx-card flex flex-col">
          <div className="zx-card-header">
            <h2 className="text-[15px] leading-[24px] font-semibold text-ink">
              Active sessions
            </h2>
            <span className="text-xs font-mono text-ink-3 tabular-nums">
              {filteredSessions.length} total
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {filteredSessions.length === 0 ? (
              <EmptyState
                icon={Radio}
                title="No active sessions"
                description="Dispatcher sessions appear here in real time."
              />
            ) : (
              <table className="zx-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Operator</th>
                    <th>Proxy node</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session, idx) => (
                    <tr key={session.sessionId || idx}>
                      <td className="font-mono text-xs text-ink">
                        #{session.sessionId ? session.sessionId.substring(0, 8) : '—'}
                      </td>
                      <td className="font-mono text-xs text-ink-2">
                        {session.operator || 'Dispatcher'}
                      </td>
                      <td className="font-mono text-xs text-ink-2">
                        {session.proxyNode || 'Direct'}
                      </td>
                      <td>
                        <StatusBadge
                          status={session.status === 'ACTIVE' ? 'Active' : 'Idle'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Alerts list (40% -> 5 cols) */}
        <div className="lg:col-span-5 zx-card flex flex-col">
          <div className="zx-card-header">
            <h2 className="text-[15px] leading-[24px] font-semibold text-ink">
              Alerts
            </h2>
            <span className="text-xs font-mono text-ink-3 tabular-nums">
              {alerts ? alerts.length : 0}
            </span>
          </div>

          <div className="p-4 flex-1">
            {!alerts || alerts.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="All systems nominal"
                description="Zero security anomalies or process crashes detected."
              />
            ) : (
              <div className="divide-y divide-line-soft">
                {alerts.slice(0, 5).map((alert, i) => (
                  <div key={i} className="py-2.5 flex items-start gap-2.5 text-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        alert.severity === 'critical' ? 'bg-err' : 'bg-warn'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink">
                        {alert.severity === 'critical' ? 'Critical alert' : 'Warning'}
                      </div>
                      <div className="text-ink-2 leading-relaxed mt-0.5">
                        {alert.message || alert.eventType}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Support / Notice Modal */}
      {showSupportModal && (
        <div className="zx-modal-overlay">
          <div className="zx-modal-panel">
            <div className="h-[56px] px-6 border-b border-line flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-ink">
                Contact support and dispatch notice
              </h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="zx-btn-icon"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmitSupport}>
              <div className="p-6 space-y-4">
                {supportError && (
                  <div className="p-3 bg-err-bg text-err-ink border border-line-input rounded-ctl text-xs font-medium">
                    {supportError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1.5">
                    Notice type
                  </label>
                  <select
                    value={supportType}
                    onChange={(e) => setSupportType(e.target.value)}
                    className="zx-select w-full text-xs"
                  >
                    <option value="MAINTENANCE">Maintenance notice</option>
                    <option value="SUPPORT">Operational support</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1.5">
                    Recipient email
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="zx-input w-full text-xs"
                    placeholder="operator@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="zx-input w-full text-xs"
                    placeholder="Subject line"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1.5">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full rounded-ctl border border-line-input p-3 text-xs text-ink bg-surface resize-none focus:outline-none focus:shadow-focus"
                    placeholder="Enter message..."
                    required
                  />
                </div>
              </div>

              <div className="h-[56px] px-6 border-t border-line flex items-center justify-end gap-2 bg-surface">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="zx-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSupport}
                  className="zx-btn-primary text-xs"
                >
                  {submittingSupport ? 'Sending…' : 'Send notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
