import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Filter, RefreshCw, FileText, Search, ShieldAlert, ChevronLeft, ChevronRight, Activity, MapPin } from 'lucide-react';

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

  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('FAIL') || act.includes('KILL')) {
      return 'text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]';
    }
    if (act.includes('POST') || act.includes('CREATE') || act.includes('LOGIN')) {
      return 'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]';
    }
    if (act.includes('PUT') || act.includes('UPDATE') || act.includes('PATCH')) {
      return 'text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]';
    }
    return 'text-[#1E40AF] bg-[#EFF6FF] border-[#BFDBFE]';
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
    return JSON.stringify(d).substring(0, 70);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            System Audit &amp; Security Logs
            <span className="zonix-badge-cyan text-[11px] font-mono">{total} Records</span>
          </h2>
          <p className="text-xs text-[#475569] mt-1 font-medium">
            Immutable audit stream, operator authentication events, and IP geolocation telemetry
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="zonix-btn-secondary self-start sm:self-auto gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#475569] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-[#CBD5E1] shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="Filter by action (e.g. POST, login)..."
            className="zonix-input w-full pl-9 text-xs"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
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
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1E40AF]" />
            <h3 className="text-xs font-semibold text-[#0F172A]">
              Audit Stream Ledger
            </h3>
          </div>
          <span className="text-xs text-[#475569] font-mono font-medium">Page {page + 1} of {totalPages || 1}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#475569] bg-[#F8FAFC]">
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Action</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Resource</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Operator / Subject</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Telemetry Details</th>
                <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Origin Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#475569]">
                    <div className="w-6 h-6 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="font-medium">Fetching audit trail stream...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-[#475569]">
                    <div className="w-12 h-12 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center mx-auto mb-3 text-[#64748B]">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-[#0F172A]">No Audit Entries Found</p>
                    <p className="text-[#475569] text-xs mt-1">Try resetting your search query or filter parameters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors text-xs h-[46px]">
                    <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                      {new Date(log.timestamp || log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#0F172A] whitespace-nowrap">
                      {log.resource || 'system'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#0F172A] font-bold whitespace-nowrap">
                      {log.user?.username || log.userId?.substring(0, 8) || 'System'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#475569] truncate max-w-sm" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>
                      {formatDetails(log.details)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#475569] text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <MapPin className="w-3 h-3 text-[#64748B]" />
                        <span>{formatLocation(log.details)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs bg-[#F8FAFC]">
          <span className="text-[#475569] font-mono font-medium">Showing {logs.length} of {total} entries</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              className="zonix-btn-secondary py-1.5 px-3 text-xs h-[32px] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(prev => prev + 1)}
              className="zonix-btn-secondary py-1.5 px-3 text-xs h-[32px] disabled:opacity-40"
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
