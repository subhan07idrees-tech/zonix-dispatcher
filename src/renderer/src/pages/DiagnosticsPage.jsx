import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Wifi, WifiOff, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, User
} from 'lucide-react';

function StatusBadge({ ok, label }) {
  if (ok === null || ok === undefined) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-400 font-normal">
        <AlertCircle className="w-3.5 h-3.5" />
        {label || 'Unknown'}
      </span>
    );
  }
  return ok ? (
    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-normal">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {label || 'Operational'}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs text-red-400 font-normal">
      <XCircle className="w-3.5 h-3.5" />
      {label || 'Needs authentication'}
    </span>
  );
}

function DiagRow({ label, value, valueClass = 'text-slate-200' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/40 text-xs">
      <span className="text-slate-400 font-normal">{label}</span>
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 tracking-normal">Diagnostics &amp; telemetry</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time session vault, cookie sync, and network proxy health audit</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Org:</span>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
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
            onClick={fetchDiagnostics}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium hover:bg-slate-700/60 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh diagnostics</span>
          </button>
        </div>
      </div>

      {/* Organization overview card */}
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{orgData?.displayName || selectedOrg}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{orgData?.name} // {selectedOrg}</p>
          </div>
          {lastRefresh && (
            <span className="text-[11px] font-mono text-slate-400">
              Refreshed: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <DiagRow label="Target load board URL" value={targetDomain} valueClass="text-slate-200 font-mono" />
          <DiagRow label="Max sessions quota" value={`${orgData?.maxSessions || '—'} sessions`} valueClass="text-slate-200" />
          <DiagRow label="Max tab seats per user" value={`${orgData?.maxTabs || 5} tabs`} valueClass="text-slate-200" />
          <DiagRow label="Active dispatchers count" value={`${dispatchers.length} dispatchers`} valueClass="text-slate-200" />
        </div>
      </div>

      {/* Dispatcher cookie status */}
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-xs font-semibold text-slate-100">
            Dispatcher cookie status <span className="text-slate-400 font-normal">for {targetDomain}</span>
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Auditing dispatcher session vaults...
          </div>
        ) : dispatchers.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No dispatchers registered in this organization.</p>
        ) : (
          <div className="space-y-3">
            {dispatchers.map(u => {
              const cs = cookieStatus[u.id];
              const hasCookies = cs?.hasData && cs.cookieCount > 0;

              return (
                <div key={u.id} className="bg-[#070A10] border border-slate-800/80 rounded-lg p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-mono text-slate-200 font-medium">{u.username}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.status === 'ACTIVE' ? 'Active' : u.status}
                      </span>
                    </div>
                    <StatusBadge ok={hasCookies} label={hasCookies ? `${cs.cookieCount} cookies synced` : 'Needs authentication'} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#0D121F] rounded-md p-2.5 space-y-0.5">
                      <div className="text-[11px] text-slate-400 font-normal">Cookies</div>
                      <div className={`text-sm font-mono font-medium ${hasCookies ? 'text-emerald-400' : 'text-red-400'}`}>
                        {cs ? cs.cookieCount : '—'}
                      </div>
                    </div>
                    <div className="bg-[#0D121F] rounded-md p-2.5 space-y-0.5">
                      <div className="text-[11px] text-slate-400 font-normal">Local storage</div>
                      <div className={`text-sm font-mono font-medium ${cs?.hasLocalStorage ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {cs?.hasLocalStorage ? 'Synced' : 'None'}
                      </div>
                    </div>
                    <div className="bg-[#0D121F] rounded-md p-2.5 space-y-0.5">
                      <div className="text-[11px] text-slate-400 font-normal">Captured</div>
                      <div className="text-xs font-mono text-slate-200">
                        {cs?.capturedAt ? new Date(cs.capturedAt).toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>

                  {!hasCookies && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Go to User Registry ➔ click the key icon next to this dispatcher to capture a fresh session.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proxy nodes list */}
      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-xs font-semibold text-slate-100">Proxy node connectivity</h3>
        </div>
        {proxies.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No proxy nodes configured.</p>
        ) : (
          <div className="space-y-2">
            {proxies.map(p => (
              <div key={p.id} className="bg-[#070A10] border border-slate-800/80 rounded-lg p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {p.status === 'ACTIVE'
                    ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    : <WifiOff className="w-3.5 h-3.5 text-slate-400" />}
                  <div>
                    <div className="font-mono text-slate-200">{p.host}:{p.port}</div>
                    {p.username && (
                      <div className="font-mono text-slate-400 text-[11px]">Auth: {p.username}</div>
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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