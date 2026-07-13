import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Radio, Circle, Square, RotateCcw, ExternalLink } from 'lucide-react';

export default function SessionsPage() {
  const { authFetch, showConfirm } = useAuth();
  const { sessions, sendCommand, connected } = useWebSocket();

  const handleKillSession = async (sessionId) => {
    const confirmed = await showConfirm(`Kill session #${sessionId.substring(0, 8)}?`, 'TERMINATE SESSION', 'error');
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

  const statusConfig = {
    ACTIVE: { color: 'zonix-badge-active', dot: 'text-zonix-cyan', label: 'ACTIVE' },
    IDLE: { color: 'zonix-badge-warning', dot: 'text-yellow-400', label: 'IDLE' },
    ERROR: { color: 'zonix-badge-error', dot: 'text-zonix-crimson', label: 'ERROR' },
    DISCONNECTED: { color: 'zonix-badge', dot: 'text-zonix-text-muted', label: 'OFFLINE' }
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-wide">ACTIVE SESSIONS</h2>
          <p className="text-xs text-zonix-text-dim mt-0.5">
            Real-time dispatch session monitoring
            <span className={`ml-2 ${connected ? 'text-zonix-cyan' : 'text-zonix-crimson'}`}>
              {connected ? '● LIVE' : '○ OFFLINE'}
            </span>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zonix-border text-xs text-zonix-text-dim font-mono">
              <th className="py-2 px-3 text-left">SESSION ID</th>
              <th className="py-2 px-3 text-left">ORG</th>
              <th className="py-2 px-3 text-left">OPERATOR</th>
              <th className="py-2 px-3 text-left">PROXY NODE</th>
              <th className="py-2 px-3 text-left">STATUS</th>
              <th className="py-2 px-3 text-left">UPTIME</th>
              <th className="py-2 px-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Radio className="w-8 h-8 text-zonix-text-muted mx-auto mb-3" />
                  <p className="text-xs text-zonix-text-muted font-mono">NO ACTIVE DISPATCH SESSIONS</p>
                  <p className="text-[10px] text-zonix-text-muted mt-1">Sessions will appear here when dispatchers connect</p>
                </td>
              </tr>
            ) : (
              sessions.map((session) => {
                const sc = statusConfig[session.status] || statusConfig.ACTIVE;
                return (
                  <tr key={session.sessionId} className="border-b border-zonix-border/50 hover:bg-zonix-surface-light/30">
                    <td className="py-3 px-3 text-xs font-mono text-zonix-cyan">
                      #{session.sessionId?.substring(0, 8)}
                    </td>
                    <td className="py-3 px-3 text-xs text-zonix-text">{session.org || session.orgId?.substring(0, 8)}</td>
                    <td className="py-3 px-3 text-xs text-zonix-text-dim font-mono">{session.operator}</td>
                    <td className="py-3 px-3 text-xs text-zonix-text-dim font-mono">{session.proxyNode}</td>
                    <td className="py-3 px-3">
                      <span className={`zonix-badge ${sc.color}`}>
                        <Circle className={`w-2 h-2 fill-current mr-1 ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-zonix-text-dim">
                      {formatUptime(session.startedAt)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRestartSession(session.sessionId)}
                          className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-yellow-400"
                          title="Restart session"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleKillSession(session.sessionId)}
                          className="p-1.5 hover:bg-zonix-surface-light rounded text-zonix-text-dim hover:text-zonix-crimson"
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
  );
}
