import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Radio, RotateCcw, Square } from 'lucide-react';

export default function SessionsPage() {
  const { authFetch, showConfirm } = useAuth();
  const { sessions, sendCommand, connected } = useWebSocket();

  const handleKillSession = async (sessionId) => {
    const confirmed = await showConfirm(`Kill session #${sessionId.substring(0, 8)}?`, 'Terminate session', 'error');
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100 tracking-normal">Active sessions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time dispatch session monitoring
            <span className={`ml-2 text-[11px] font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              {connected ? '● Live' : '○ Offline'}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-[#0D121F] border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs text-slate-400 font-normal">
                <th className="py-2.5 px-3 text-left">Session ID</th>
                <th className="py-2.5 px-3 text-left">Organization</th>
                <th className="py-2.5 px-3 text-left">Operator</th>
                <th className="py-2.5 px-3 text-left">Proxy node</th>
                <th className="py-2.5 px-3 text-left">Status</th>
                <th className="py-2.5 px-3 text-left">Uptime</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    <Radio className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                    <p className="font-normal text-slate-300">No active dispatch sessions</p>
                    <p className="text-[11px] text-slate-400 mt-1">Sessions will appear here when dispatchers connect</p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  return (
                    <tr key={session.sessionId} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-mono text-slate-200">
                        #{session.sessionId?.substring(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-200">{session.org || session.orgId?.substring(0, 8)}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-400 font-mono">{session.operator}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-400 font-mono">{session.proxyNode}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {session.status === 'ACTIVE' ? 'Active' : session.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-slate-400">
                        {formatUptime(session.startedAt)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleRestartSession(session.sessionId)}
                            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-amber-400 transition"
                            title="Restart session"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleKillSession(session.sessionId)}
                            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-400 transition"
                            title="Kill session"
                          >
                            <Square className="w-3.5 h-3.5" />
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
