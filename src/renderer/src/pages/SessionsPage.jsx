import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Radio, RotateCcw, Square, Server, UserCheck } from 'lucide-react';

export default function SessionsPage() {
  const { authFetch, showConfirm } = useAuth();
  const { sessions, sendCommand, connected } = useWebSocket();

  const handleKillSession = async (sessionId) => {
    const confirmed = await showConfirm(`Kill session #${sessionId.substring(0, 8)}?`, 'Terminate Session', 'error');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DEE7] pb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#172033] tracking-tight flex items-center gap-2">
            Active Dispatch Sessions
            <span className={`zonix-badge ${connected ? 'zonix-badge-active' : 'zonix-badge-error'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#2E7D5B]' : 'bg-[#B54747]'}`} />
              {connected ? 'WebSocket Live' : 'Offline'}
            </span>
          </h2>
          <p className="text-xs text-[#667085] mt-1">Real-time dispatcher telemetry, remote restart triggers, and instant session termination</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-md bg-white border border-[#D9DEE7] text-xs font-mono text-[#172033]">
            Active Workers: <span className="text-[#2E7D5B] font-bold">{sessions.length}</span>
          </div>
        </div>
      </div>

      {/* Main sessions table card */}
      <div className="zonix-card overflow-hidden">
        <div className="p-4 border-b border-[#D9DEE7] flex items-center justify-between bg-[#F8FAFC]">
          <h3 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
            Dispatcher Session Registry
          </h3>
          <span className="text-xs text-[#667085] font-mono">Telemetry Poll: 500ms</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D9DEE7] text-[11px] text-[#667085] uppercase bg-[#F8FAFC]">
                <th className="py-2.5 px-4 text-left font-semibold">Session ID</th>
                <th className="py-2.5 px-4 text-left font-semibold">Organization</th>
                <th className="py-2.5 px-4 text-left font-semibold">Operator</th>
                <th className="py-2.5 px-4 text-left font-semibold">Proxy Node</th>
                <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                <th className="py-2.5 px-4 text-left font-semibold">Uptime</th>
                <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs text-[#667085]">
                    <Radio className="w-8 h-8 text-[#98A2B3] mx-auto mb-3" />
                    <p className="font-semibold text-[#172033] text-sm">No Active Dispatch Sessions</p>
                    <p className="text-[#667085] text-xs mt-1">All operators are currently offline. Worker sessions will appear here when dispatchers connect.</p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  return (
                    <tr key={session.sessionId} className="border-b border-[#D9DEE7] hover:bg-[#F8FAFC] transition-colors duration-150 h-[44px]">
                      <td className="py-2.5 px-4 text-xs font-mono text-[#172033] font-bold">
                        #{session.sessionId?.substring(0, 8)}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#172033]">
                        {session.org || session.orgId?.substring(0, 8)}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#667085] font-mono flex items-center gap-1.5 mt-2">
                        <UserCheck className="w-3.5 h-3.5 text-[#667085]" />
                        {session.operator}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#667085] font-mono flex items-center gap-1.5 mt-2">
                        <Server className="w-3.5 h-3.5 text-[#667085]" />
                        {session.proxyNode}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="zonix-badge-active">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D5B]" />
                          {session.status === 'ACTIVE' ? 'Active' : session.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono text-[#667085]">
                        {formatUptime(session.startedAt)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRestartSession(session.sessionId)}
                            className="zonix-btn-secondary py-1 px-2.5 text-xs h-[32px]"
                            title="Restart session worker"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#B7791F]" />
                            <span>Restart</span>
                          </button>
                          <button
                            onClick={() => handleKillSession(session.sessionId)}
                            className="zonix-btn-danger py-1 px-2.5 text-xs h-[32px]"
                            title="Kill session worker"
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
