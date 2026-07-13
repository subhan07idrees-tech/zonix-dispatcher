import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Filter, RefreshCw } from 'lucide-react';

export default function LogsPage() {
  const { authFetch, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ action: '', resource: '' });
  const limit = 50;

  useEffect(() => { fetchLogs(); }, [page]);

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const actionColors = {
    'POST /auth/login': 'text-green-400',
    'event:kill-switch': 'text-zonix-crimson',
    'event:proxy-unreachable': 'text-yellow-400',
    'event:oidc-loop': 'text-zonix-purple'
  };

  const getActionColor = (action) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action?.includes(key)) return color;
    }
    if (action?.includes('DELETE')) return 'text-zonix-crimson';
    if (action?.includes('POST')) return 'text-zonix-cyan';
    if (action?.includes('PUT')) return 'text-yellow-400';
    return 'text-zonix-text-dim';
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-wide">SYSTEM LOGS</h2>
          <p className="text-xs text-zonix-text-dim mt-0.5">
            Audit trail & event history ({total} entries)
          </p>
        </div>
        <button onClick={fetchLogs} className="zonix-btn-ghost">
          <RefreshCw className="w-4 h-4 mr-1.5 inline" /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          placeholder="Filter by action..."
          className="zonix-input w-48 font-mono text-xs"
        />
        <input
          type="text"
          value={filters.resource}
          onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
          placeholder="Filter by resource..."
          className="zonix-input w-48 font-mono text-xs"
        />
        <button onClick={() => { setPage(0); fetchLogs(); }} className="zonix-btn-primary text-xs">
          <Filter className="w-3 h-3 mr-1 inline" /> Apply
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zonix-border text-xs text-zonix-text-dim font-mono">
              <th className="py-2 px-3 text-left">TIMESTAMP</th>
              <th className="py-2 px-3 text-left">USER</th>
              <th className="py-2 px-3 text-left">ORG</th>
              <th className="py-2 px-3 text-left">ACTION</th>
              <th className="py-2 px-3 text-left">RESOURCE</th>
              <th className="py-2 px-3 text-left">DETAILS</th>
              <th className="py-2 px-3 text-left">IP</th>
              <th className="py-2 px-3 text-left">LOCATION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <div className="w-5 h-5 border-2 border-zonix-cyan border-t-transparent rounded-full animate-spin mx-auto"></div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-zonix-text-muted font-mono">
                  NO LOG ENTRIES FOUND
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-zonix-border/50 hover:bg-zonix-surface-light/30">
                  <td className="py-2 px-3 text-xs font-mono text-zonix-text-dim whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-zonix-text">
                    {log.user?.username || log.details?.username || 'system'}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-zonix-purple">
                    {log.org?.displayName || log.org?.name || '—'}
                  </td>
                  <td className={`py-2 px-3 text-xs font-mono ${getActionColor(log.action)}`}>
                    {log.action}
                  </td>
                  <td className="py-2 px-3 text-xs text-zonix-text-dim font-mono">
                    {log.resource}
                    {log.resourceId && <span className="text-zonix-text-muted"> #{log.resourceId.substring(0, 6)}</span>}
                  </td>
                  <td className="py-2 px-3 text-xs text-zonix-text-dim font-mono max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details).substring(0, 60) : '—'}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-zonix-text-muted">
                    {log.ipAddress || '—'}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-zonix-cyan">
                    {log.details?.city && log.details?.state
                      ? `${log.details.city}, ${log.details.state}`
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zonix-text-dim font-mono">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="zonix-btn-ghost text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="zonix-btn-ghost text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
