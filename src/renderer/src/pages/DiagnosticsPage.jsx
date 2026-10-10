import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Wifi, WifiOff, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, User, Database, ShieldAlert, Activity, Key
} from 'lucide-react';

function StatusBadge({ ok, label }) {
  if (ok === null || ok === undefined) {
    return (
      <span className="zonix-badge-warning gap-1.5 font-medium">
        <AlertCircle className="w-3.5 h-3.5 text-[#B45309]" />
        {label || 'Unknown'}
      </span>
    );
  }
  return ok ? (
    <span className="zonix-badge-active gap-1.5 font-medium">
      <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
      {label || 'Operational'}
    </span>
  ) : (
    <span className="zonix-badge-error gap-1.5 font-medium">
      <XCircle className="w-3.5 h-3.5 text-[#B91C1C]" />
      {label || 'Needs Authentication'}
    </span>
  );
}

function DiagMetric({ label, value, valueClass = 'text-[#0F172A]' }) {
  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3.5 space-y-1">
      <span className="text-xs font-semibold text-[#64748B] block">{label}</span>
      <span className={`text-sm font-mono font-bold block truncate ${valueClass}`}>{value ?? '—'}</span>
    </div>
  );
}

export default function DiagnosticsPage() {
  const { authFetch, user: currentUser } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(currentUser?.orgId || '');
  const [users, setUsers] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [cookieStatus, setCookieStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [orgData, setOrgData] = useState(null);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await authFetch('/organizations');
      if (res.ok) {
        const data = await res.json();
        const list = data.organizations || [];
        setOrgs(list);
        if (!selectedOrg && list.length > 0) setSelectedOrg(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }, [authFetch]);

  const fetchDiagnostics = useCallback(async () => {
    if (!selectedOrg) return;
    setLoading(true);
    try {
      let currentOrgData = orgData;
      const orgRes = await authFetch(`/organizations/${selectedOrg}`);
      if (orgRes.ok) {
        const d = await orgRes.json();
        currentOrgData = d.organization || d;
        setOrgData(currentOrgData);
      }

      let dispatchers = [];
      const usersRes = await authFetch(`/users/${selectedOrg}`);
      if (usersRes.ok) {
        const d = await usersRes.json();
        const all = d.users || [];
        setUsers(all);
        dispatchers = all.filter(u => u.role === 'DISPATCHER');
      }

      const proxiesRes = await authFetch(`/proxies/${selectedOrg}`);
      if (proxiesRes.ok) {
        const d = await proxiesRes.json();
        setProxies(d.proxies || []);
      }

      let targetDomain = '';
      try {
        if (currentOrgData?.targetUrl) {
          targetDomain = new URL(currentOrgData.targetUrl).hostname;
        }
      } catch {}

      const statusMap = {};
      await Promise.all(
        dispatchers.map(async (disp) => {
          try {
            const domToFetch = (targetDomain && targetDomain !== '—') ? targetDomain : 'one.dat.com';
            const url = `/cookies/retrieve/${selectedOrg}/${disp.id}/${encodeURIComponent(domToFetch)}`;
            const cRes = await authFetch(url);
            if (cRes.ok) {
              const cData = await cRes.json();
              statusMap[disp.id] = {
                cookieCount: cData.cookies?.length || 0,
                hasLocalStorage: !!(cData.localStorage && cData.localStorage !== '{}'),
                capturedAt: cData.capturedAt || cData.updatedAt || cData.createdAt,
                hasData: true
              };
            } else {
              statusMap[disp.id] = { hasData: false, cookieCount: 0 };
            }
          } catch {
            statusMap[disp.id] = { hasData: false, cookieCount: 0 };
          }
        })
      );
      setCookieStatus(statusMap);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('[Diagnostics] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedOrg, authFetch]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  useEffect(() => {
    if (selectedOrg) fetchDiagnostics();
  }, [selectedOrg, fetchDiagnostics]);

  const dispatchers = users.filter(u => u.role === 'DISPATCHER');
  let targetDomain = '—';
  try {
    if (orgData?.targetUrl) targetDomain = new URL(orgData.targetUrl).hostname;
  } catch {}

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            System Diagnostics &amp; Health Audit
            <span className="zonix-badge-active text-[11px] font-mono">Vault Telemetry</span>
          </h2>
          <p className="text-xs text-[#475569] mt-1 font-medium">
            Real-time session vault integrity, cookie synchronization audit, and proxy infrastructure telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#475569]">Tenant:</span>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="zonix-select text-xs py-1 h-[36px] font-medium"
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
            onClick={fetchDiagnostics}
            disabled={loading}
            className="zonix-btn-secondary gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#475569] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit</span>
          </button>
        </div>
      </div>

      {/* Organization overview card */}
      <div className="zonix-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] flex items-center justify-center font-bold">
              <Database className="w-5 h-5 text-[#1E40AF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">{orgData?.displayName || selectedOrg}</h3>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">{orgData?.name} // {selectedOrg}</p>
            </div>
          </div>
          {lastRefresh && (
            <span className="text-xs font-mono font-medium text-[#475569] bg-[#F1F5F9] px-2.5 py-1 rounded border border-[#CBD5E1]">
              Audited: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DiagMetric label="Target Load Board URL" value={targetDomain} valueClass="text-[#1E40AF]" />
          <DiagMetric label="Max Sessions Quota" value={`${orgData?.maxSessions || '—'} sessions`} />
          <DiagMetric label="Max Tab Seats per User" value={`${orgData?.maxTabs || 5} tabs`} />
          <DiagMetric label="Registered Dispatchers" value={`${dispatchers.length} operators`} valueClass="text-[#047857]" />
        </div>
      </div>

      {/* Dispatcher cookie status */}
      <div className="zonix-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1E40AF]" />
            <h3 className="text-xs font-semibold text-[#0F172A]">
              Dispatcher Session Vault Audit <span className="text-[#64748B] font-normal font-sans">({targetDomain})</span>
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-[#475569]">
            <div className="w-6 h-6 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-medium">Auditing dispatcher session vaults...</p>
          </div>
        ) : dispatchers.length === 0 ? (
          <p className="text-xs text-[#64748B] text-center py-8">No dispatchers registered in this organization.</p>
        ) : (
          <div className="space-y-3.5">
            {dispatchers.map(u => {
              const cs = cookieStatus[u.id];
              const hasCookies = cs?.hasData && cs.cookieCount > 0;
              const hasTokens = cs?.hasLocalStorage;
              const isOperational = hasCookies || hasTokens;

              let statusLabel = 'Needs Authentication';
              if (hasCookies && hasTokens) {
                statusLabel = `${cs.cookieCount} Cookies & Token Synced`;
              } else if (hasCookies) {
                statusLabel = `${cs.cookieCount} Cookies Synced`;
              } else if (hasTokens) {
                statusLabel = 'Token Vault Synced';
              }

              return (
                <div key={u.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-3 hover:border-[#94A3B8] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569]">
                        <User className="w-4 h-4 text-[#1E40AF]" />
                      </div>
                      <span className="text-xs font-mono text-[#0F172A] font-bold">{u.username}</span>
                      <span className={`zonix-badge ${
                        u.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-[#047857]' : 'bg-[#B45309]'}`} />
                        {u.status === 'ACTIVE' ? 'Active' : u.status}
                      </span>
                    </div>
                    <StatusBadge ok={isOperational} label={statusLabel} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 space-y-1 border border-[#E2E8F0]">
                      <div className="text-[11px] text-[#475569] font-bold">Synced Cookies</div>
                      <div className={`text-base font-mono font-bold ${hasCookies ? 'text-[#047857]' : (hasTokens ? 'text-[#047857]' : 'text-[#B91C1C]')}`}>
                        {hasCookies ? `${cs.cookieCount} Cookies` : (hasTokens ? 'Synced via Token Vault' : '0')}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 space-y-1 border border-[#E2E8F0]">
                      <div className="text-[11px] text-[#475569] font-bold">Local Storage Vault</div>
                      <div className={`text-base font-mono font-bold ${cs?.hasLocalStorage ? 'text-[#047857]' : 'text-[#64748B]'}`}>
                        {cs?.hasLocalStorage ? 'Synced (Active)' : 'None'}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 space-y-1 border border-[#E2E8F0]">
                      <div className="text-[11px] text-[#475569] font-bold">Last Vault Capture</div>
                      <div className="text-xs font-mono text-[#0F172A] font-semibold truncate pt-1">
                        {cs?.capturedAt ? new Date(cs.capturedAt).toLocaleString() : 'Never Captured'}
                      </div>
                    </div>
                  </div>

                  {!isOperational && (
                    <div className="flex items-center gap-2.5 text-xs text-[#B45309] font-medium bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-lg">
                      <Key className="w-4 h-4 flex-shrink-0 text-[#B45309]" />
                      <span>
                        Missing authentication session. Open <strong>User Registry</strong> and click the <strong>Authenticate (Key)</strong> button to capture fresh credentials for this dispatcher.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proxy nodes list */}
      <div className="zonix-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <h3 className="text-xs font-semibold text-[#0F172A]">
            Proxy Node Infrastructure Status
          </h3>
        </div>
        {proxies.length === 0 ? (
          <p className="text-xs text-[#64748B] text-center py-6">No proxy nodes configured for this organization.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proxies.map(p => (
              <div key={p.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3.5 flex items-center justify-between text-xs hover:border-[#94A3B8] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center">
                    {p.status === 'ACTIVE'
                      ? <Wifi className="w-4 h-4 text-[#047857]" />
                      : <WifiOff className="w-4 h-4 text-[#64748B]" />}
                  </div>
                  <div>
                    <div className="font-mono text-[#0F172A] font-bold">{p.host}:{p.port}</div>
                    <div className="font-mono text-[#475569] text-[11px] mt-0.5">
                      {p.name} {p.username ? `• user: ${p.username}` : ''}
                    </div>
                  </div>
                </div>
                <span className="zonix-badge-active">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
                  {p.status === 'ACTIVE' ? 'Active' : p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}