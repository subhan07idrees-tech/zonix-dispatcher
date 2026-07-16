import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Wifi, WifiOff, Cookie, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Clock, User
} from 'lucide-react';

function StatusBadge({ ok, label }) {
  if (ok === null || ok === undefined) {
    return (
      <span className="flex items-center gap-1 text-xs font-mono text-zonix-text-dim">
        <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
        {label || 'UNKNOWN'}
      </span>
    );
  }
  return ok ? (
    <span className="flex items-center gap-1 text-xs font-mono text-green-400">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {label || 'OK'}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs font-mono text-red-400">
      <XCircle className="w-3.5 h-3.5" />
      {label || 'FAIL'}
    </span>
  );
}

function DiagRow({ label, value, valueClass = 'text-zonix-text' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zonix-border/30">
      <span className="text-xs font-mono text-zonix-text-dim">{label}</span>
      <span className={`text-xs font-mono ${valueClass}`}>{value ?? '—'}</span>
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
      // Org details
      let currentOrgData = orgData;
      const orgRes = await authFetch(`/organizations/${selectedOrg}`);
      if (orgRes.ok) {
        const d = await orgRes.json();
        currentOrgData = d.organization || d;
        setOrgData(currentOrgData);
      }

      // Users
      let dispatchers = [];
      const usersRes = await authFetch(`/users/${selectedOrg}`);
      if (usersRes.ok) {
        const d = await usersRes.json();
        const all = d.users || [];
        setUsers(all);
        dispatchers = all.filter(u => u.role === 'DISPATCHER');
      }

      // Proxies
      const proxiesRes = await authFetch(`/proxies/${selectedOrg}`);
      if (proxiesRes.ok) {
        const d = await proxiesRes.json();
        setProxies(d.proxies || []);
      }

      // Cookie status per dispatcher
      let targetDomain = '';
      try {
        if (currentOrgData?.targetUrl) {
          targetDomain = new URL(currentOrgData.targetUrl).hostname;
        }
      } catch {}

      const statusMap = {};
      await Promise.all(dispatchers.map(async (u) => {
        try {
          const res = await authFetch(`/cookies/retrieve/${selectedOrg}/${u.id}/${targetDomain || 'unknown'}`);
          if (res.ok) {
            const data = await res.json();
            statusMap[u.id] = {
              hasData: true,
              cookieCount: (data.cookies || []).length,
              hasLocalStorage: !!(data.localStorage && data.localStorage !== '{}'),
              capturedAt: data.capturedAt,
              domain: targetDomain,
            };
          } else {
            statusMap[u.id] = { hasData: false, cookieCount: 0, domain: targetDomain };
          }
        } catch {
          statusMap[u.id] = { hasData: false, cookieCount: 0, domain: targetDomain };
        }
      }));

      setCookieStatus(statusMap);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [selectedOrg, authFetch]);

  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') {
      fetchOrgs();
    } else if (currentUser?.orgId) {
      setSelectedOrg(currentUser.orgId);
    }
  }, []);

  useEffect(() => {
    if (selectedOrg) fetchDiagnostics();
  }, [selectedOrg]);

  const dispatchers = users.filter(u => u.role === 'DISPATCHER');
  const activeProxy = proxies.find(p => p.status === 'ACTIVE');
  const targetDomain = (() => {
    try { return orgData?.targetUrl ? new URL(orgData.targetUrl).hostname : '—'; }
    catch { return orgData?.targetUrl || '—'; }
  })();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-widest text-zonix-cyan font-mono">SESSION DIAGNOSTICS</h2>
          <p className="text-xs text-zonix-text-dim mt-1 font-mono">Cookie sync · Proxy assignment · Dispatcher health</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs font-mono text-zonix-text-dim flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchDiagnostics} disabled={loading}
            className="zonix-btn-ghost text-xs flex items-center gap-1.5 px-3 py-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Org Selector */}
      {orgs.length > 1 && (
        <div className="zonix-card p-4">
          <label className="block text-xs font-mono text-zonix-text-dim mb-2">ORGANIZATION</label>
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
            className="zonix-input w-full max-w-xs font-mono text-xs">
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {/* Org Overview */}
      <div className="zonix-card p-4 space-y-1">
        <h3 className="text-xs font-semibold tracking-widest font-mono text-zonix-text-dim mb-3">ORGANIZATION OVERVIEW</h3>
        <DiagRow label="Target URL" value={orgData?.targetUrl || '—'} valueClass="text-zonix-cyan" />
        <DiagRow label="Target Domain" value={targetDomain} />
        <DiagRow label="Max Tabs Per Dispatcher" value={orgData?.maxTabs ?? '—'} />
        <DiagRow label="Total Dispatchers" value={dispatchers.length} />
        <div className="flex items-center justify-between py-1.5 border-b border-zonix-border/30">
          <span className="text-xs font-mono text-zonix-text-dim">Active Proxy Node</span>
          {activeProxy ? (
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="text-xs font-mono text-green-400">{activeProxy.host}:{activeProxy.port}</span>
              {activeProxy.username && (
                <span className="text-xs font-mono text-zonix-text-dim">({activeProxy.username})</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-red-400" />
              <span className="text-xs font-mono text-red-400">NO ACTIVE PROXY</span>
            </div>
          )}
        </div>
      </div>

      {/* Dispatcher Cookie Status */}
      <div className="zonix-card p-4">
        <h3 className="text-xs font-semibold tracking-widest font-mono text-zonix-text-dim mb-4">
          DISPATCHER COOKIE STATUS
          {targetDomain !== '—' && (
            <span className="ml-2 text-zonix-text-muted normal-case font-normal">for {targetDomain}</span>
          )}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-zonix-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dispatchers.length === 0 ? (
          <p className="text-xs font-mono text-zonix-text-muted text-center py-4">NO DISPATCHERS FOUND</p>
        ) : (
          <div className="space-y-3">
            {dispatchers.map(u => {
              const cs = cookieStatus[u.id];
              const hasCookies = cs?.hasData && cs.cookieCount > 0;

              return (
                <div key={u.id}
                  className={`rounded-lg border p-3 ${hasCookies
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zonix-text-dim" />
                      <span className="text-xs font-mono font-semibold text-zonix-text">{u.username}</span>
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        u.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {u.status}
                      </span>
                    </div>
                    <StatusBadge ok={hasCookies}
                      label={hasCookies ? `${cs.cookieCount} COOKIES SYNCED` : 'NO COOKIES — NEEDS AUTH'} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="bg-zonix-surface/60 rounded p-2">
                      <div className="text-xs font-mono text-zonix-text-dim mb-0.5">COOKIES</div>
                      <div className={`text-sm font-bold font-mono ${hasCookies ? 'text-green-400' : 'text-red-400'}`}>
                        {cs ? cs.cookieCount : '—'}
                      </div>
                    </div>
                    <div className="bg-zonix-surface/60 rounded p-2">
                      <div className="text-xs font-mono text-zonix-text-dim mb-0.5">LOCAL STORAGE</div>
                      <div className={`text-sm font-bold font-mono ${cs?.hasLocalStorage ? 'text-green-400' : 'text-zonix-text-muted'}`}>
                        {cs?.hasLocalStorage ? 'YES' : 'NO'}
                      </div>
                    </div>
                    <div className="bg-zonix-surface/60 rounded p-2">
                      <div className="text-xs font-mono text-zonix-text-dim mb-0.5">CAPTURED</div>
                      <div className="text-xs font-mono text-zonix-text">
                        {cs?.capturedAt ? new Date(cs.capturedAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>

                  {!hasCookies && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-yellow-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Go to User Registry → click the 🔑 key icon next to this dispatcher to capture a fresh session.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proxy Nodes */}
      <div className="zonix-card p-4">
        <h3 className="text-xs font-semibold tracking-widest font-mono text-zonix-text-dim mb-4">PROXY NODES</h3>
        {proxies.length === 0 ? (
          <p className="text-xs font-mono text-zonix-text-muted text-center py-4">NO PROXY NODES CONFIGURED</p>
        ) : (
          <div className="space-y-2">
            {proxies.map(p => (
              <div key={p.id} className={`rounded border p-3 flex items-center justify-between ${
                p.status === 'ACTIVE' ? 'border-green-500/20 bg-green-500/5' : 'border-zonix-border bg-zonix-surface/30'}`}>
                <div className="flex items-center gap-3">
                  {p.status === 'ACTIVE'
                    ? <Wifi className="w-3.5 h-3.5 text-green-400" />
                    : <WifiOff className="w-3.5 h-3.5 text-zonix-text-dim" />}
                  <div>
                    <div className="text-xs font-mono font-semibold text-zonix-text">{p.host}:{p.port}</div>
                    {p.username && (
                      <div className="text-xs font-mono text-zonix-text-dim">Auth: {p.username}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    p.status === 'ACTIVE'
                      ? 'text-green-400 bg-green-500/10 border-green-500/20'
                      : 'text-zonix-text-dim border-zonix-border/30'}`}>
                    {p.status}
                  </span>
                  {p.type && <span className="text-xs font-mono text-zonix-text-muted">{p.type}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}