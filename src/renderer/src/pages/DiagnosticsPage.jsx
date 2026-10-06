import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Wifi, WifiOff, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, User, Database
} from 'lucide-react';

function StatusBadge({ ok, label }) {
  if (ok === null || ok === undefined) {
    return (
      <span className="zonix-badge-warning">
        <AlertCircle className="w-3.5 h-3.5 text-[#B7791F]" />
        {label || 'Unknown'}
      </span>
    );
  }
  return ok ? (
    <span className="zonix-badge-active">
      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D5B]" />
      {label || 'Operational'}
    </span>
  ) : (
    <span className="zonix-badge-error">
      <XCircle className="w-3.5 h-3.5 text-[#B54747]" />
      {label || 'Needs Authentication'}
    </span>
  );
}

function DiagRow({ label, value, valueClass = 'text-[#172033]' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#D9DEE7] text-xs">
      <span className="text-[#667085] font-medium">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value ?? '—'}</span>
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
    } catch (e) {}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DEE7] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#172033] tracking-tight flex items-center gap-2">
            System Diagnostics &amp; Health Audit
            <span className="zonix-badge-active text-[11px]">Vault Telemetry</span>
          </h2>
          <p className="text-xs text-[#667085] mt-1">Real-time session vault, cookie sync integrity, and proxy infrastructure audit</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#667085]">Org:</span>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
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
            onClick={fetchDiagnostics}
            disabled={loading}
            className="zonix-btn-secondary"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#667085] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit</span>
          </button>
        </div>
      </div>

      {/* Organization overview card */}
      <div className="zonix-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#EFF4FA] border border-[#D9DEE7] text-[#245B9E] flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#172033]">{orgData?.displayName || selectedOrg}</h3>
              <p className="text-xs text-[#667085] font-mono mt-0.5">{orgData?.name} // {selectedOrg}</p>
            </div>
          </div>
          {lastRefresh && (
            <span className="text-xs font-mono text-[#667085]">
              Audited: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <DiagRow label="Target Load Board URL" value={targetDomain} valueClass="text-[#245B9E] font-bold" />
          <DiagRow label="Max Sessions Quota" value={`${orgData?.maxSessions || '—'} sessions`} valueClass="text-[#172033]" />
          <DiagRow label="Max Tab Seats per User" value={`${orgData?.maxTabs || 5} tabs`} valueClass="text-[#172033]" />
          <DiagRow label="Active Dispatchers Count" value={`${dispatchers.length} dispatchers`} valueClass="text-[#172033] font-bold" />
        </div>
      </div>

      {/* Dispatcher cookie status */}
      <div className="zonix-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3.5">
          <h3 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
            Dispatcher Session Vault Status <span className="text-[#667085] font-normal">({targetDomain})</span>
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-[#667085]">
            <div className="w-5 h-5 border-2 border-[#245B9E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Auditing dispatcher session vaults...
          </div>
        ) : dispatchers.length === 0 ? (
          <p className="text-xs text-[#667085] text-center py-8">No dispatchers registered in this organization.</p>
        ) : (
          <div className="space-y-3">
            {dispatchers.map(u => {
              const cs = cookieStatus[u.id];
              const hasCookies = cs?.hasData && cs.cookieCount > 0;

              return (
                <div key={u.id} className="bg-[#F8FAFC] border border-[#D9DEE7] rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-[#667085]" />
                      <span className="text-xs font-mono text-[#172033] font-bold">{u.username}</span>
                      <span className={`zonix-badge ${
                        u.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-[#2E7D5B]' : 'bg-[#B7791F]'}`} />
                        {u.status === 'ACTIVE' ? 'Active' : u.status}
                      </span>
                    </div>
                    <StatusBadge ok={hasCookies} label={hasCookies ? `${cs.cookieCount} Cookies Synced` : 'Needs Authentication'} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-md p-3 space-y-1 border border-[#D9DEE7]">
                      <div className="text-[11px] text-[#667085] font-medium">Synced Cookies</div>
                      <div className={`text-sm font-mono font-bold ${hasCookies ? 'text-[#2E7D5B]' : 'text-[#B54747]'}`}>
                        {cs ? cs.cookieCount : '—'}
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-3 space-y-1 border border-[#D9DEE7]">
                      <div className="text-[11px] text-[#667085] font-medium">Local Storage Data</div>
                      <div className={`text-sm font-mono font-bold ${cs?.hasLocalStorage ? 'text-[#245B9E]' : 'text-[#667085]'}`}>
                        {cs?.hasLocalStorage ? 'Synced' : 'None'}
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-3 space-y-1 border border-[#D9DEE7]">
                      <div className="text-[11px] text-[#667085] font-medium">Last Session Capture</div>
                      <div className="text-xs font-mono text-[#172033] font-semibold truncate">
                        {cs?.capturedAt ? new Date(cs.capturedAt).toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>

                  {!hasCookies && (
                    <div className="flex items-center gap-2 text-xs text-[#B7791F] pt-1 font-sans bg-[#FEF3C7] border border-[#FDE68A] p-2.5 rounded-md">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Go to <strong>User Registry</strong> ➔ click the key icon next to this dispatcher to capture fresh session cookies.</span>
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
        <div className="flex items-center justify-between border-b border-[#D9DEE7] pb-3.5">
          <h3 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
            Proxy Node Infrastructure Status
          </h3>
        </div>
        {proxies.length === 0 ? (
          <p className="text-xs text-[#667085] text-center py-6">No proxy nodes configured for this organization.</p>
        ) : (
          <div className="space-y-2">
            {proxies.map(p => (
              <div key={p.id} className="bg-[#F8FAFC] border border-[#D9DEE7] rounded-md p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {p.status === 'ACTIVE'
                    ? <Wifi className="w-4 h-4 text-[#2E7D5B]" />
                    : <WifiOff className="w-4 h-4 text-[#667085]" />}
                  <div>
                    <div className="font-mono text-[#172033] font-bold">{p.host}:{p.port}</div>
                    {p.username && (
                      <div className="font-mono text-[#667085] text-[11px]">User: {p.username}</div>
                    )}
                  </div>
                </div>
                <span className="zonix-badge-active">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D5B]" />
                  {p.status === 'ACTIVE' ? 'Active Node' : p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}