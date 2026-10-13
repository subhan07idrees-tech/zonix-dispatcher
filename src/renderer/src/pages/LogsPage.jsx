import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import EmptyState from '../components/EmptyState';
import {
  FileText, Search, Filter, RefreshCw, ChevronLeft, ChevronRight
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
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function formatLogLocation(log) {
  let details = log.details;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      // not JSON
    }
  }
  const city = details?.city || log.city;
  const state = details?.state || log.state || details?.region;
  if (city && state && city !== 'Unknown' && state !== 'Unknown') {
    return `${city}, ${state}`;
  }
  if (city && city !== 'Unknown') return city;
  if (state && state !== 'Unknown') return state;
  if (details?.location) return details.location;
  if (log.location) return log.location;
  return '—';
}

function formatLogIp(log) {
  let ip = log.ipAddress || log.ip;
  if (!ip) return '—';
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  return ip;
}

export default function LogsPage() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ action: '', resource: '' });
  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: page * limit });
      if (filters.action) params.set('action', filters.action);
      if (filters.resource) params.set('resource', filters.resource);

      const res = await authFetch(`/dashboard/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      showToast('Error loading logs: ' + err.message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      {/* Page Header: Header has count caption "526 records" and Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-ink tracking-tight">
            System logs
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Immutable audit stream and operator activity records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-ink-3 tabular-nums">
            {total} records
          </span>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="zx-btn-secondary text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Row: action input with search icon, resource input with filter icon, Apply primary. All 36px high and aligned */}
      <form onSubmit={handleApplyFilters} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="Filter by action (e.g. POST, login)…"
            className="zx-input w-full pl-9 text-xs"
          />
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Filter className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
          <input
            type="text"
            value={filters.resource}
            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
            placeholder="Filter by resource (e.g. auth, users)…"
            className="zx-input w-full pl-9 text-xs"
          />
        </div>

        <button
          type="submit"
          className="zx-btn-primary text-xs"
        >
          Apply
        </button>
      </form>

      {/* Table Card */}
      <div className="zx-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 w-full zx-skeleton" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No log records found"
              description="System actions and audit events will appear here in chronological order."
            />
          ) : (
            <table className="zx-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Timestamp (UTC)</th>
                  <th style={{ width: '120px' }}>Operator</th>
                  <th style={{ width: '140px' }}>Organization</th>
                  <th style={{ width: '220px' }}>Action</th>
                  <th>Resource</th>
                  <th style={{ width: '130px' }}>IP Address</th>
                  <th style={{ width: '160px' }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const locText = formatLogLocation(log);
                  const ipText = formatLogIp(log);
                  const orgName = log.org?.displayName || log.org?.name || '—';
                  const operatorName = log.user?.username || log.operator || log.userId || 'system';
                  const resourceText = log.resource || (typeof log.details === 'string' ? log.details : '—');

                  return (
                    <tr key={log.id}>
                      {/* Timestamp: mono, ISO YYYY-MM-DD HH:mm:ss */}
                      <td className="font-mono text-xs tabular-nums text-ink-2 whitespace-nowrap">
                        {formatUtcTimestamp(log.createdAt || log.timestamp)}
                      </td>

                      {/* Operator */}
                      <td className="font-mono text-xs text-ink font-medium whitespace-nowrap">
                        {operatorName}
                      </td>

                      {/* Organization */}
                      <td className="text-xs text-ink-2 truncate max-w-[140px]" title={orgName}>
                        {orgName !== '—' ? orgName : <span className="text-ink-3">—</span>}
                      </td>

                      {/* Action: plain mono text, e.g. POST /auth/login */}
                      <td className="font-mono text-xs text-ink font-medium truncate max-w-[220px]" title={log.action}>
                        {log.action}
                      </td>

                      {/* Resource */}
                      <td className="text-xs text-ink-2 truncate max-w-[240px]" title={resourceText}>
                        {resourceText}
                      </td>

                      {/* IP Address */}
                      <td className="font-mono text-xs tabular-nums text-ink-2 whitespace-nowrap">
                        {ipText !== '—' ? ipText : <span className="text-ink-3">—</span>}
                      </td>

                      {/* Location */}
                      <td className="text-xs font-mono whitespace-nowrap">
                        {locText !== '—' ? (
                          <span className="text-ink font-medium">{locText}</span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer row: Page 1 of 11 on left, Previous and Next secondary buttons on right */}
        <div className="p-4 border-t border-line flex items-center justify-between text-xs bg-surface">
          <span className="font-mono text-ink-2 tabular-nums">
            Page {page + 1} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="zx-btn-secondary h-[32px] px-3 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="zx-btn-secondary h-[32px] px-3 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
