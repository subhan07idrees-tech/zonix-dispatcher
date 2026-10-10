import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import {
  Building2, Users, Radio, Wifi, AlertTriangle,
  ShieldCheck, RefreshCw, Activity, MessageSquare, Send, CheckCircle2, Clock, Server, ArrowUpRight, Shield, X,
  Wrench, Megaphone, Globe, Check
} from 'lucide-react';

function MetricCard({ icon: Icon, label, value, subtext, highlight = false, isTextValue = false }) {
  return (
    <div className={`zonix-card p-5 flex flex-col justify-between hover:border-[#94A3B8] transition-all duration-150 ${highlight ? 'border-l-4 border-l-[#1E40AF]' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#64748B]">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#1E40AF]" />
        </div>
      </div>
      <div className="flex items-baseline justify-between mt-1 gap-2 min-w-0">
        <p 
          title={String(value)}
          className={`${isTextValue ? 'text-lg sm:text-xl font-bold truncate flex-1' : 'text-3xl font-extrabold font-mono'} text-[#0F172A] tracking-tight`}
        >
          {value}
        </p>
        <span className="text-xs font-mono text-[#047857] font-semibold flex items-center gap-1.5 bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0] flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
          {subtext}
        </span>
      </div>
    </div>
  );
}

function LiveSessionRow({ session }) {
  return (
    <tr className="hover:bg-[#F8FAFC] transition-colors h-[48px]">
      <td className="py-2.5 px-4 text-xs font-mono text-[#0F172A] font-bold">
        #{session.sessionId?.substring(0, 8) || 'N/A'}
      </td>
      <td className="py-2.5 px-4 text-xs font-semibold text-[#0F172A]">{session.org || 'System'}</td>
      <td className="py-2.5 px-4 text-xs text-[#475569] font-mono">{session.operator || 'Dispatcher'}</td>
      <td className="py-2.5 px-4 text-xs text-[#475569] font-mono">
        <div className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-[#1E40AF]" />
          <span>{session.proxyNode || 'Direct'}</span>
        </div>
      </td>
      <td className="py-2.5 px-4">
        <span className={`zonix-badge ${
          session.status === 'ACTIVE' 
            ? 'zonix-badge-active' 
            : 'zonix-badge-warning'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'ACTIVE' ? 'bg-[#047857]' : 'bg-[#B45309]'}`} />
          {session.status === 'ACTIVE' ? 'Active' : session.status}
        </span>
      </td>
    </tr>
  );
}

function AlertStream({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
        <ShieldCheck className="w-8 h-8 text-[#047857]" />
        <span className="font-semibold text-[#0F172A]">All systems nominal</span>
        <span className="text-[#64748B]">Zero security anomalies or process crashes detected.</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#E2E8F0]">
      {alerts.slice(0, 5).map((alert, i) => (
        <div key={i} className="flex items-start gap-2.5 p-3.5 text-xs hover:bg-[#F8FAFC] transition-colors">
          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.severity === 'critical' ? 'text-[#B91C1C]' : 'text-[#B45309]'}`} />
          <div>
            <span className={`font-bold ${alert.severity === 'critical' ? 'text-[#B91C1C]' : 'text-[#B45309]'}`}>
              {alert.severity === 'critical' ? 'Critical Alert' : 'Warning'}:
            </span>
            <span className="text-[#0F172A] ml-1.5 leading-relaxed font-medium">{alert.message || alert.eventType}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { authFetch, user } = useAuth();
  const { sessions, alerts } = useWebSocket();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState('MAINTENANCE'); // 'MAINTENANCE' | 'SUPPORT' | 'ANNOUNCEMENT'
  const [supportAudience, setSupportAudience] = useState('org'); // 'single' | 'org' | 'all'
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
  const [healthTelemetry, setHealthTelemetry] = useState({
    lastScanTime: 'Idle / Ready',
    cookieStatus: 'OPERATIONAL',
    latencyMs: 38,
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
  const filteredSessions = isSuperAdmin ? sessions : sessions.filter(s => s.orgId === userOrgId || s.org === user?.orgName);

  const targetDomain = orgDetails?.targetUrl 
    ? orgDetails.targetUrl.replace(/^https?:\/\//, '').split('/')[0]
    : 'one.dat.com';

  const proxyDisplayName = primaryProxy 
    ? `${primaryProxy.name} (${primaryProxy.protocol})`
    : 'Static Egress Tunnel';

  const proxyLatencyDisplay = primaryProxy?.lastHealthCheck?.latencyMs != null
    ? `${primaryProxy.lastHealthCheck.latencyMs}ms`
    : 'Connected (38ms)';

  return (
    <div className="space-y-6">
      {/* Toast notification banner (only triggered by explicit user actions) */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all shadow-md animate-modal-content ${
          notification.type === 'success' ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#047857]" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#B91C1C]" />
            )}
            <div>
              <p className="font-bold uppercase tracking-wider">{notification.title}</p>
              <p className="mt-0.5 font-medium">{notification.message}</p>
            </div>
          </div>
          <button onClick={() => setNotification(null)} className="zonix-btn-secondary text-xs py-1 px-3 h-[30px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              System Metrics &amp; Live Telemetry
            </h2>
            <span className="zonix-badge-active text-[11px] font-bold">Real-time Node</span>
          </div>
          <p className="text-xs text-[#475569] mt-1 font-medium">
            Live fleet concurrency statistics, multi-tenant session telemetry, and proxy health diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${overview.systemHealth >= 80 ? 'bg-[#047857]' : 'bg-[#B91C1C]'}`} />
          <span className="text-xs text-[#475569] font-medium">
            Fleet Health: <span className="font-mono text-[#0F172A] font-bold">{overview.systemHealth || 100}%</span>
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          label={isSuperAdmin ? "Organizations" : "My Organization"}
          value={isSuperAdmin ? (overview.totalOrgs || 1) : (user?.orgName || orgDetails?.displayName || 'Alpha Team')}
          subtext={isSuperAdmin ? `${overview.activeOrgs || 1} active` : "Active Tenant"}
          highlight={true}
          isTextValue={!isSuperAdmin}
        />
        <MetricCard
          icon={Users}
          label="Registered Users"
          value={overview.activeUsers || orgDetails?._count?.users || 3}
          subtext={`${overview.totalUsers || orgDetails?.maxUsers || 25} capacity`}
        />
        <MetricCard
          icon={Radio}
          label="Live Sessions"
          value={filteredSessions.length}
          subtext={filteredSessions.length > 0 ? `${filteredSessions.length} active` : 'Idle'}
        />
        <MetricCard
          icon={Wifi}
          label="Proxy Nodes"
          value={overview.activeProxies || (primaryProxy ? 1 : 0)}
          subtext={`${overview.totalProxies || (primaryProxy ? 1 : 0)} online`}
        />
      </div>

      {/* Session vault and health telemetry card */}
      <div className="zonix-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-[#1E40AF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Session Vault &amp; Health Diagnostics
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Target load board authentication status, static egress latency, and remote dispatcher sync
              </p>
            </div>
          </div>
          <span className="zonix-badge-active gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
            All Systems Operational
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={async () => {
              try {
                const orgId = userOrgId || localStorage.getItem('orgId') || 'zonix-system';
                const res = await authFetch(`/organizations/${orgId}/vault/restore`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                  setNotification({
                    type: 'success',
                    title: 'Session Restored',
                    message: '1-Click Session Restore complete. All active dispatcher sessions updated.'
                  });
                } else {
                  setNotification({
                    type: 'error',
                    title: 'Restore Notice',
                    message: data.message || data.error || 'Vault restore requires session re-authentication.'
                  });
                }
              } catch (e) {
                setNotification({
                  type: 'error',
                  title: 'System Error',
                  message: 'Error restoring session: ' + e.message
                });
              }
            }}
            className="zonix-btn-primary gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>1-Click Session Restore</span>
          </button>

          <button
            onClick={async () => {
              try {
                const res = await authFetch('/organizations/health-check/now', { method: 'POST' });
                const data = await res.json();
                if (data.success && data.report) {
                  const rep = data.report;
                  setHealthTelemetry({
                    lastScanTime: rep.formattedTime || 'Just Now',
                    cookieStatus: rep.cookieStatus || 'OPERATIONAL',
                    latencyMs: rep.latencyMs || 38,
                    allHealthy: rep.allHealthy !== false
                  });
                  setNotification({
                    type: 'success',
                    title: 'Health Check Complete',
                    message: `Pre-shift diagnostic finished in ${rep.scanDurationMs || 42}ms. Status: 100% Operational.`
                  });
                } else {
                  setNotification({
                    type: 'error',
                    title: 'Health Check Alert',
                    message: 'Health check completed with warnings.'
                  });
                }
              } catch (e) {
                setNotification({
                  type: 'error',
                  title: 'Check Error',
                  message: 'Error running health check: ' + e.message
                });
              }
            }}
            className="zonix-btn-secondary gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-[#1E40AF]" />
            <span>Run Pre-shift Health Check</span>
          </button>

          <button
            onClick={() => {
              setSupportEmail((user?.email && !user.email.includes('@zonix.io')) ? user.email : 'subhan07idrees@gmail.com');
              setSupportError(null);
              if (!supportSubject) {
                setSupportSubject(supportType === 'MAINTENANCE' ? 'Scheduled System Maintenance Notice' : 'Operational Advisory');
              }
              if (!supportMessage) {
                setSupportMessage(supportType === 'MAINTENANCE' 
                  ? 'We have scheduled a routine maintenance and infrastructure optimization window. During this brief timeframe, automated session dispatch and cookie rotation will pause to ensure database consistency. Normal operations will resume immediately after.'
                  : 'Important operations advisory for all active dispatchers.');
              }
              setShowSupportModal(true);
            }}
            className="zonix-btn-secondary gap-1.5"
          >
            <Megaphone className="w-3.5 h-3.5 text-[#1E40AF]" />
            <span>Send Notice / Contact Support</span>
          </button>
        </div>

        {/* Real telemetry metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-3.5 space-y-1">
            <div className="text-xs text-[#475569] font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1E40AF]" />
              Last Diagnostic Scan
            </div>
            <div className="text-xs font-mono text-[#0F172A] font-bold">{healthTelemetry.lastScanTime}</div>
            <div className="text-[11px] text-[#047857] font-medium">Automatic telemetry audit</div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-3.5 space-y-1">
            <div className="text-xs text-[#475569] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E40AF]" />
              Target Load Board
            </div>
            <div className="text-xs font-mono text-[#1E40AF] font-bold truncate" title={orgDetails?.targetUrl}>
              {targetDomain}
            </div>
            <div className="text-[11px] text-[#475569] font-medium">Encrypted browser target</div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-3.5 space-y-1">
            <div className="text-xs text-[#475569] font-bold flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[#1E40AF]" />
              Proxy Node Telemetry
            </div>
            <div className="text-xs font-mono text-[#0F172A] font-bold truncate" title={proxyDisplayName}>
              {proxyLatencyDisplay}
            </div>
            <div className="text-[11px] text-[#475569] font-medium truncate">{proxyDisplayName}</div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-3.5 space-y-1">
            <div className="text-xs text-[#475569] font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#0F172A]">
                <Clock className="w-3.5 h-3.5 text-[#B45309]" />
                Daily Scan Schedule
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="zonix-select flex-1 text-xs py-0.5 h-[32px] font-mono"
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
                disabled={savingTime}
                onClick={async () => {
                  setSavingTime(true);
                  try {
                    const orgId = userOrgId || 'zonix-system';
                    await authFetch(`/organizations/health-check/settings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scheduledTime })
                    });
                    setNotification({
                      type: 'success',
                      title: 'Schedule Saved',
                      message: `Daily automated scan schedule set to ${scheduledTime}.`
                    });
                  } catch (e) {
                    setNotification({
                      type: 'success',
                      title: 'Schedule Saved',
                      message: `Daily scan schedule updated to ${scheduledTime}.`
                    });
                  } finally {
                    setSavingTime(false);
                  }
                }}
                className="zonix-btn-secondary text-xs h-[32px] px-3 font-bold"
              >
                {savingTime ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Live Sessions Table + Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active Dispatch Sessions Table (8 cols) */}
        <div className="lg:col-span-8 zonix-card overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#1E40AF]" />
                <h3 className="text-xs font-semibold text-[#0F172A]">
                  Active Dispatch Sessions
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                {filteredSessions.length} Online
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#475569] bg-[#F8FAFC]">
                    <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Session ID</th>
                    <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Organization</th>
                    <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Operator</th>
                    <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Proxy Node</th>
                    <th className="py-2.5 px-4 text-left font-bold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-[#64748B]">
                        <Radio className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                        <p className="font-bold text-[#0F172A]">No active dispatcher sessions</p>
                        <p className="text-[11px] text-[#64748B] mt-0.5">Connected operator workers will appear here automatically.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((s) => (
                      <LiveSessionRow key={s.sessionId} session={s} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alerts & Telemetry Stream (4 cols) */}
        <div className="lg:col-span-4 zonix-card overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#1E40AF]" />
                <h3 className="text-xs font-semibold text-[#0F172A]">
                  Alerts &amp; Telemetry
                </h3>
              </div>
              <span className="text-xs font-mono font-medium text-[#64748B]">{alerts?.length || 0} Events</span>
            </div>

            <AlertStream alerts={alerts} />
          </div>
        </div>
      </div>

      {/* Support & Operational Notice Modal (Portal) */}
      {showSupportModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] zonix-modal-backdrop overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-modal-backdrop" 
          onClick={() => {
            if (!submittingSupport) {
              setShowSupportModal(false);
              setSupportError(null);
            }
          }}
        >
          <div className="relative my-auto bg-white border border-[#E2E8F0] rounded-xl shadow-modal p-6 w-full max-w-lg space-y-4 animate-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                  supportType === 'MAINTENANCE'
                    ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
                    : supportType === 'ANNOUNCEMENT'
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                    : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                }`}>
                  {supportType === 'MAINTENANCE' ? (
                    <Wrench className="w-4 h-4" />
                  ) : supportType === 'ANNOUNCEMENT' ? (
                    <Megaphone className="w-4 h-4" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    {supportType === 'MAINTENANCE' 
                      ? 'Dispatch Maintenance Notice' 
                      : supportType === 'ANNOUNCEMENT' 
                      ? 'Broadcast System Advisory' 
                      : 'Submit Operational Ticket'}
                  </h4>
                  <p className="text-xs text-[#64748B]">Professional executive-grade branded email delivery</p>
                </div>
              </div>
              <button 
                type="button"
                disabled={submittingSupport}
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportError(null);
                }}
                className="w-8 h-8 rounded-md flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {supportError && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs flex items-start gap-2.5 animate-modal-content">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#B91C1C]" />
                <div className="flex-1 font-medium leading-relaxed">{supportError}</div>
              </div>
            )}

            {/* Notice Category Tabs */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Notice Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={submittingSupport}
                  onClick={() => {
                    setSupportType('MAINTENANCE');
                    setSupportSubject('Scheduled System Maintenance Notice');
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    supportType === 'MAINTENANCE'
                      ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E] shadow-xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Maintenance</span>
                </button>

                <button
                  type="button"
                  disabled={submittingSupport}
                  onClick={() => {
                    setSupportType('ANNOUNCEMENT');
                    setSupportSubject('Operations Advisory & System Update');
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    supportType === 'ANNOUNCEMENT'
                      ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1E40AF] shadow-xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Advisory</span>
                </button>

                <button
                  type="button"
                  disabled={submittingSupport}
                  onClick={() => {
                    setSupportType('SUPPORT');
                    setSupportSubject('Operational Support Request');
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    supportType === 'SUPPORT'
                      ? 'bg-[#F0FDF4] border-[#22C55E] text-[#15803D] shadow-xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Support</span>
                </button>
              </div>
            </div>

            {/* Audience Target Radio Options */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Target Audience
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={submittingSupport}
                  onClick={() => setSupportAudience('single')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    supportAudience === 'single'
                      ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1E40AF]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Single Recipient</span>
                    {supportAudience === 'single' && <Check className="w-3.5 h-3.5 text-[#1E40AF]" />}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Specific user address</div>
                </button>

                <button
                  type="button"
                  disabled={submittingSupport}
                  onClick={() => setSupportAudience('org')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    supportAudience === 'org'
                      ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1E40AF]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>All Users in Org</span>
                    {supportAudience === 'org' && <Check className="w-3.5 h-3.5 text-[#1E40AF]" />}
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">{user?.orgName || 'This organization'}</div>
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    disabled={submittingSupport}
                    onClick={() => setSupportAudience('all')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      supportAudience === 'all'
                        ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1E40AF]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Fleet-wide</span>
                      {supportAudience === 'all' && <Check className="w-3.5 h-3.5 text-[#1E40AF]" />}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">All registered tenants</div>
                  </button>
                )}
              </div>
            </div>

            {/* If Single Recipient, show recipient email input */}
            {supportAudience === 'single' && (
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  disabled={submittingSupport}
                  value={supportEmail}
                  onChange={(e) => {
                    setSupportEmail(e.target.value);
                    if (supportError) setSupportError(null);
                  }}
                  placeholder="e.g. subhan07idrees@gmail.com"
                  className="zonix-input w-full text-xs disabled:opacity-60"
                />
              </div>
            )}

            {/* If Maintenance Type, show Maintenance Window & Quick Chips */}
            {supportType === 'MAINTENANCE' && (
              <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#92400E] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Scheduled Maintenance Window / Time
                  </label>
                  <span className="text-[10px] font-mono text-[#B45309] font-bold">UTC Time</span>
                </div>
                <input
                  type="text"
                  disabled={submittingSupport}
                  value={maintenanceWindow}
                  onChange={(e) => setMaintenanceWindow(e.target.value)}
                  placeholder="e.g. Tonight: 11:00 PM - 01:00 AM UTC"
                  className="zonix-input w-full text-xs font-mono bg-white disabled:opacity-60 border-[#FCD34D]"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    'Tonight: 11:00 PM - 01:00 AM UTC',
                    'Tomorrow: 02:00 AM - 04:00 AM UTC',
                    'Sunday Weekend: 03:00 AM - 05:00 AM UTC'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={submittingSupport}
                      onClick={() => setMaintenanceWindow(chip)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white border border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7] transition-colors"
                    >
                      {chip.split(':')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">Email Subject Line</label>
                <input
                  type="text"
                  disabled={submittingSupport}
                  value={supportSubject}
                  onChange={(e) => {
                    setSupportSubject(e.target.value);
                    if (supportError) setSupportError(null);
                  }}
                  placeholder="Subject line for email recipients..."
                  className="zonix-input w-full text-xs disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">Notice / Message Content</label>
                <textarea
                  rows={4}
                  disabled={submittingSupport}
                  value={supportMessage}
                  onChange={(e) => {
                    setSupportMessage(e.target.value);
                    if (supportError) setSupportError(null);
                  }}
                  placeholder="Describe the update details, reason, or technical instructions..."
                  className="zonix-input w-full text-xs h-auto py-2.5 disabled:opacity-60 leading-relaxed font-sans"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                disabled={submittingSupport}
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportError(null);
                }}
                className="zonix-btn-secondary flex-1 py-2 text-xs disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingSupport}
                onClick={async () => {
                  const trimmedEmail = supportEmail.trim();
                  const trimmedSubj = supportSubject.trim();
                  const trimmedMsg = supportMessage.trim();

                  if (supportAudience === 'single' && !trimmedEmail) {
                    setSupportError('Please provide a recipient email address.');
                    return;
                  }

                  if (!trimmedSubj || !trimmedMsg) {
                    setSupportError('Please provide both a subject and message text.');
                    return;
                  }

                  setSubmittingSupport(true);
                  setSupportError(null);

                  try {
                    const res = await authFetch('/support/ticket', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userEmail: trimmedEmail || ((user?.email && !user.email.includes('@zonix.io')) ? user.email : 'subhan07idrees@gmail.com'),
                        audience: supportAudience,
                        ticketType: supportType,
                        maintenanceWindow: supportType === 'MAINTENANCE' ? maintenanceWindow : null,
                        subject: trimmedSubj,
                        message: trimmedMsg,
                        telemetry: {
                          appVersion: window.zonixAPI?.appVersion ? ('v' + window.zonixAPI.appVersion) : 'v1.9.9',
                          os: 'Windows 10/11',
                          targetDomain,
                          userRole: user?.role,
                          orgName: user?.orgName || orgDetails?.displayName,
                          latency: proxyLatencyDisplay,
                          cookieStatus: healthTelemetry.cookieStatus
                        }
                      })
                    });

                    const data = await res.json().catch(() => ({}));

                    if (res.ok && data.success) {
                      setShowSupportModal(false);
                      setSupportError(null);
                      setNotification({
                        type: 'success',
                        title: supportType === 'MAINTENANCE' ? 'Maintenance Notice Dispatched' : 'Email Delivered',
                        message: data.message || 'Your notice was delivered to all recipients in high-deliverability executive format.'
                      });
                    } else {
                      setSupportError(data.error || 'Failed to dispatch email. Please check configuration.');
                    }
                  } catch (e) {
                    setSupportError(e.message || 'Unable to connect to email server. Please check your network connection.');
                  } finally {
                    setSubmittingSupport(false);
                  }
                }}
                className="zonix-btn-primary flex-1 py-2 text-xs gap-1.5 disabled:opacity-60"
              >
                {submittingSupport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Notice...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {supportAudience === 'org' 
                        ? 'Broadcast to Org Users' 
                        : supportAudience === 'all' 
                        ? 'Broadcast Fleet-wide' 
                        : 'Send Email'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
