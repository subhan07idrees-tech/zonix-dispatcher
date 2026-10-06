import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Filter, RefreshCw, FileText, Search, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';

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
    if (action?.includes('DELETE') || action?.includes('failed')) return 'text-[#B54747] bg-[#FEE2E2] border-[#FCA5A5]';
    if (action?.includes('POST')) return 'text-[#2E7D5B] bg-[#E8F5E9] border-[#C8E6C9]';
    if (action?.includes('PUT')) return 'text-[#B7791F] bg-[#FEF3C7] border-[#FDE68A]';
    return 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]';
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
    return JSON.stringify(d).substring(0, 60);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DEE7] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#172033] tracking-tight flex items-center gap-2">
            System Audit &amp; Security Logs
            <span className="zonix-badge-cyan text-[11px]">{total} Entries</span>
          </h2>
          <p className="text-xs text-[#667085] mt-1">Immutable audit stream, operator actions, and IP geolocation telemetry</p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="zonix-btn-secondary self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#667085] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-[#D9DEE7] shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="Filter by action (e.g. POST, login)..."
            className="zonix-input w-full pl-9 text-xs"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.resource}
            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
            placeholder="Filter by resource (e.g. auth, users)..."
            className="zonix-input w-full pl-9 text-xs"
          />
        </div>
        <button
          onClick={() => { setPage(0); fetchLogs(); }}
          className="zonix-btn-primary py-2 px-4 text-xs"
        >
          Apply Filters
        </button>
      </div>

      {/* Logs Table Card */}
      <div className="zonix-card overflow-hidden">
        <div className="p-4 border-b border-[#D9DEE7] flex items-center justify-between bg-[#F8FAFC]">
          <h3 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#667085]" />
            Audit History Stream
          </h3>
          <span className="text-xs text-[#667085] font-mono">Page {page + 1} of {totalPages || 1}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D9DEE7] text-[11px] text-[#667085] uppercase bg-[#F8FAFC]">
                <th className="py-2.5 px-4 text-left font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 text-left font-semibold">Action</th>
                <th className="py-2.5 px-4 text-left font-semibold">Resource</th>
                <th className="py-2.5 px-4 text-left font-semibold">Operator / User</th>
                <th className="py-2.5 px-4 text-left font-semibold">Details</th>
                <th className="py-2.5 px-4 text-right font-semibold">Location</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#667085]">
                    <div className="w-5 h-5 border-2 border-[#245B9E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Fetching audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#667085]">
                    <ShieldAlert className="w-8 h-8 text-[#98A2B3] mx-auto mb-2" />
                    <p className="font-semibold text-[#172033]">No logs found</p>
                    <p className="text-[#667085] text-xs mt-1">Try resetting your filter search parameters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#D9DEE7] hover:bg-[#F8FAFC] transition-colors duration-150 text-xs h-[44px]">
                    <td className="py-2.5 px-4 font-mono text-[#667085]">
                      {new Date(log.timestamp || log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#172033]">{log.resource || 'system'}</td>
                    <td className="py-2.5 px-4 font-mono text-[#172033] font-bold">{log.user?.username || log.userId?.substring(0, 8) || 'System'}</td>
                    <td className="py-2.5 px-4 font-mono text-[#667085] truncate max-w-xs">{formatDetails(log.details)}</td>
                    <td className="py-2.5 px-4 font-mono text-[#667085] text-right">{formatLocation(log.details)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#D9DEE7] flex items-center justify-between text-xs bg-[#F8FAFC]">
          <span className="text-[#667085] font-mono">Showing {logs.length} of {total} entries</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              className="zonix-btn-secondary py-1 px-3 text-xs h-[32px] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(prev => prev + 1)}
              className="zonix-btn-secondary py-1 px-3 text-xs h-[32px] disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
