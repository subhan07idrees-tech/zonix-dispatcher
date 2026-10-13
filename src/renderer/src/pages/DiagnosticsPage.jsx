import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import {
  ShieldCheck, RefreshCw, Check, Key,
  ShieldAlert, User
} from 'lucide-react';

function formatUtcTimestamp(dateOrIso) {
  if (!dateOrIso) return '—';
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return '—';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`;
}

export default function DiagnosticsPage() {
  const { authFetch, user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(currentUser?.orgId || '');
  const [users, setUsers] = useState([]);
  const [cookieStatus, setCookieStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastRefreshUtc, setLastRefreshUtc] = useState(null);
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
  }, [authFetch, selectedOrg]);

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

      let dispatchersList = [];
      const usersRes = await authFetch(`/users/${selectedOrg}`);
      if (usersRes.ok) {
        const d = await usersRes.json();
        const all = d.users || [];
        setUsers(all);
        dispatchersList = all.filter((u) => u.role === 'DISPATCHER');
      }

      let targetDomain = 'one.dat.com';
      try {
        if (currentOrgData?.targetUrl) {
          targetDomain = new URL(currentOrgData.targetUrl).hostname;
        }
      } catch {}

      const statusMap = {};
      await Promise.all(
        dispatchersList.map(async (disp) => {
          try {
            const url = `/cookies/retrieve/${selectedOrg}/${disp.id}/${encodeURIComponent(targetDomain)}`;
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
      setLastRefreshUtc(new Date());
      showToast('Diagnostic audit refreshed', 'ok');
    } catch (e) {
      showToast('Diagnostic fetch error: ' + e.message, 'err');
    } finally {
      setLoading(false);
    }
  }, [selectedOrg, authFetch, orgData, showToast]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  useEffect(() => {
    if (selectedOrg) fetchDiagnostics();
  }, [selectedOrg]);

  const dispatchers = users.filter((u) => u.role === 'DISPATCHER');
  let targetDomain = '—';
  try {
    if (orgData?.targetUrl) targetDomain = new URL(orgData.targetUrl).hostname;
  } catch {}

  return (
    <div className="space-y-5">
      {/* Page Header: tenant select and Refresh audit */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-ink tracking-tight">
            Diagnostics
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Session vault integrity, cookie synchronization audit, and storage telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'SUPER_ADMIN' && orgs.length > 0 && (
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="zx-select text-xs font-medium"
            >
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.displayName} ({org.name})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={fetchDiagnostics}
            disabled={loading}
            className="zx-btn-secondary text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            <span>Refresh audit</span>
          </button>
        </div>
      </div>

      {/* Tenant summary card */}
      <div className="zx-card p-5">
        <div className="flex items-start justify-between border-b border-line pb-4 mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              {orgData?.displayName || selectedOrg || 'Tenant organization'}
            </h2>
            <p className="font-mono text-xs text-ink-3 mt-0.5">
              {selectedOrg || '—'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-ink-2">Audited at</span>
            <div className="font-mono text-xs text-ink mt-0.5 tabular-nums">
              {lastRefreshUtc ? formatUtcTimestamp(lastRefreshUtc) : '—'}
            </div>
          </div>
        </div>

        {/* 4-column definition grid (Target board, Max sessions, Tabs per user, Dispatchers) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-medium text-ink-2">Target board</div>
            <div className="font-mono text-sm font-medium text-ink mt-1 truncate" title={orgData?.targetUrl}>
              {targetDomain}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-ink-2">Max sessions</div>
            <div className="font-mono text-sm font-medium text-ink mt-1 tabular-nums">
              {orgData?.maxSessions || '—'}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-ink-2">Tabs per user</div>
            <div className="font-mono text-sm font-medium text-ink mt-1 tabular-nums">
              {orgData?.maxTabs || 5}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-ink-2">Dispatchers</div>
            <div className="font-mono text-sm font-medium text-ink mt-1 tabular-nums">
              {dispatchers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Session vault card as a plain list, with one row per dispatcher separated by dividers (no nested cards!) */}
      <div className="zx-card">
        <div className="zx-card-header">
          <h2 className="text-[15px] leading-[24px] font-semibold text-ink">
            Session vault
          </h2>
          <span className="font-mono text-xs text-ink-3 tabular-nums">
            {dispatchers.length} seats
          </span>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full zx-skeleton" />
            ))}
          </div>
        ) : dispatchers.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No dispatchers found"
            description="Register dispatcher seats to audit session cookies."
          />
        ) : (
          <div className="divide-y divide-line">
            {dispatchers.map((disp) => {
              const cs = cookieStatus[disp.id];
              const hasCookies = cs?.hasData && cs.cookieCount > 0;
              const hasTokens = cs?.hasLocalStorage;
              const isOperational = hasCookies || hasTokens;

              return (
                <div key={disp.id} className="p-5 space-y-3">
                  {/* Row Top: username (mono) plus status badge on left, green check plus "15 cookies synced" on right (NO green highlighter!) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-ink">
                        {disp.username}
                      </span>
                      <StatusBadge
                        status={disp.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {isOperational ? (
                        <>
                          <Check className="w-4 h-4 text-ok" strokeWidth={2} />
                          <span className="text-ok font-medium">
                            {hasCookies ? `${cs.cookieCount} cookies synced` : 'Token vault synced'}
                          </span>
                        </>
                      ) : (
                        <span className="text-warn font-medium flex items-center gap-1">
                          <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Needs authentication
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3-column definition line: Synced cookies, Local storage vault, Last capture in UTC */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                    <div>
                      <span className="text-ink-2 block">Synced cookies</span>
                      <span className="font-mono text-ink mt-0.5 block tabular-nums">
                        {hasCookies ? `${cs.cookieCount} cookies` : '0'}
                      </span>
                    </div>

                    <div>
                      <span className="text-ink-2 block">Local storage vault</span>
                      <span className="font-mono text-ink mt-0.5 block">
                        {cs?.hasLocalStorage ? 'Synced' : 'None'}
                      </span>
                    </div>

                    <div>
                      <span className="text-ink-2 block">Last capture</span>
                      <span className="font-mono text-ink-2 mt-0.5 block tabular-nums">
                        {formatUtcTimestamp(cs?.capturedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}