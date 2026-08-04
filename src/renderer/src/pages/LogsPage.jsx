import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Filter, RefreshCw } from 'lucide-react';

export default function LogsPage() {
  const { authFetch } = useAuth();
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

  const getActionColor = (action) => {
    if (action?.includes('DELETE')) return 'text-red-400';
    if (action?.includes('POST')) return 'text-emerald-400';
    if (action?.includes('PUT')) return 'text-amber-400';
    return 'text-slate-300';
  };

  const formatLocation = (details) => {
    if (!details) return '—';
    let d = details;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch(e) { return '—'; }
    }
    const parts = [];
    if (d.city) parts.push(d.city);
    if (d.state) parts.push(d.state);
    if (d.country) parts.push(d.country);
    return parts.length > 0 ? parts.join(', ') : (d.location || '—');
  };

  const formatDetails = (details) => {
    if (!details) return '—';
    let d = details;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch(e) { return details; }
    }
    if (d.error) return `Error: ${d.error}`;
    if (d.message) return d.message;
    if (d.status) return `Status: ${d.status}`;
    return JSON.stringify(d).substring(0, 50);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 tracking-normal">System logs</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit trail and security event history ({total} entries)
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium hover:bg-slate-700/60 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Refresh logs</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          placeholder="Filter by action..."
          className="bg-[#0D121F] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-48 focus:border-slate-600 focus:outline-none"
        />
        <input
          type="text"
          value={filters.resource}
          onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
          placeholder="Filter by resource..."
          className="bg-[#0D121F] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-48 focus:border-slate-600 focus:outline-none"
        />
        <button 
          onClick={() => { setPage(0); fetchLogs(); }} 
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Apply filter</span>
        </button>
      </div>

      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs text-slate-400 font-normal">
                <th className="py-2.5 px-3 text-left">Timestamp</th>
                <th className="py-2.5 px-3 text-left">User</th>
                <th className="py-2.5 px-3 text-left">Organization</th>
                <th className="py-2.5 px-3 text-left">Action</th>
                <th className="py-2.5 px-3 text-left">Location</th>
                <th className="py-2.5 px-3 text-left">IP address</th>
                <th className="py-2.5 px-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-200">
                      {log.user?.username || log.details?.username || 'system'}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-300">
                      {log.org?.displayName || log.org?.name || '—'}
                    </td>
                    <td className={`py-2.5 px-3 text-xs font-mono ${getActionColor(log.action)}`}>
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-emerald-400/90 whitespace-nowrap">
                      {formatLocation(log.details)}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-slate-400">
                      {log.ipAddress || log.details?.ip || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-400 font-mono max-w-xs truncate">
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
