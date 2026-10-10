import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Radio, RotateCcw, Square, Server, UserCheck, Activity, ShieldCheck } from 'lucide-react';

export default function SessionsPage() {
  const { authFetch, showConfirm } = useAuth();
  const { sessions, sendCommand, connected } = useWebSocket();

  const handleKillSession = async (sessionId) => {
    const confirmed = await showConfirm(
      `Terminate session #${sessionId.substring(0, 8)}? The remote worker process will be immediately halted.`,
      'Terminate Dispatcher Session',
      'error'
    );
    if (!confirmed) return;
    try {
      sendCommand('command:kill', { sessionId });
      await authFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestartSession = async (sessionId) => {
    try {
      sendCommand('command:restart', { sessionId });
      await authFetch(`/sessions/${sessionId}/restart`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  const formatUptime = (startedAt) => {
    if (!startedAt) return '—';
    const diff = Date.now() - new Date(startedAt).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            Active Dispatch Sessions
            <span className={`zonix-badge ${connected ? 'zonix-badge-active' : 'zonix-badge-error'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#047857]' : 'bg-[#B91C1C]'}`} />
              {connected ? 'WebSocket Live' : 'Offline'}
            </span>
          </h2>
          <p className="text-xs text-[#475569] mt-1 font-medium">
            Real-time dispatcher telemetry, remote restart triggers, and instant worker session termination
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono text-[#0F172A] shadow-xs flex items-center gap-2">
            <span className="text-[#475569] font-medium">Active Workers:</span>
            <span className="text-[#047857] font-bold text-sm">{sessions.length}</span>
          </div>
        </div>
      </div>

      {/* Main sessions table card */}
      <div className="zonix-card overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#1E40AF]" />
            <h3 className="text-xs font-semibold text-[#0F172A]">
              Dispatcher Session Registry
            </h3>
          </div>
          <span className="text-xs text-[#64748B] font-mono">Telemetry Poll: 500ms</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#475569] bg-[#F8FAFC]">
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Session ID</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Organization</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Operator</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Proxy Node</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-left font-bold whitespace-nowrap">Uptime</th>
                <th className="py-3 px-4 text-right font-bold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-[#475569]">
                    <div className="w-12 h-12 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3 text-[#64748B]">
                      <Radio className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-[#0F172A]">No Active Dispatch Sessions</p>
                    <p className="text-[#475569] max-w-md mx-auto text-xs mt-1">
                      All operators are currently idle or offline. Connected dispatcher worker sessions will stream here in real time.
                    </p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  return (
                    <tr key={session.sessionId} className="hover:bg-[#F8FAFC] transition-colors h-[48px] animate-fadeIn">
                      <td className="py-3 px-4 text-xs font-mono text-[#0F172A] font-bold">
                        #{session.sessionId?.substring(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#0F172A]">
                        {session.org || session.orgId?.substring(0, 8) || 'System'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#475569] font-mono">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#1E40AF]" />
                          <span>{session.operator || 'Dispatcher'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#475569] font-mono">
                        <div className="flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-[#1E40AF]" />
                          <span>{session.proxyNode || 'Direct'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`zonix-badge ${
                          session.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-warning'
                        }`}>
                          {session.status === 'ACTIVE' ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#047857]" />
                            </span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
                          )}
                          {session.status === 'ACTIVE' ? 'Active' : session.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono font-medium text-[#475569]">
                        {formatUptime(session.startedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestartSession(session.sessionId)}
                            className="zonix-btn-secondary py-1.5 px-3 text-xs h-[32px] gap-1.5"
                            title="Restart session worker process"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#B45309]" />
                            <span>Restart</span>
                          </button>
                          <button
                            onClick={() => handleKillSession(session.sessionId)}
                            className="zonix-btn-danger py-1.5 px-3 text-xs h-[32px] gap-1.5"
                            title="Halt and terminate session"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>Kill</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
