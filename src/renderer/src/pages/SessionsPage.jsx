import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { Radio, RotateCcw, XOctagon } from 'lucide-react';

export default function SessionsPage() {
  const { authFetch, showConfirm } = useAuth();
  const { sessions, sendCommand, connected } = useWebSocket();
  const { showToast } = useToast();

  const handleKillSession = async (sessionId) => {
    const shortId = sessionId.substring(0, 8);
    const confirmed = await showConfirm(
      `Terminate session #${shortId}? The remote dispatcher process will be halted immediately.`,
      'Terminate Session',
      'error'
    );
    if (!confirmed) return;
    try {
      sendCommand('command:kill', { sessionId });
      await authFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
      showToast(`Session #${shortId} terminated`, 'ok');
    } catch (err) {
      showToast('Error terminating session: ' + err.message, 'err');
    }
  };

  const handleRestartSession = async (sessionId) => {
    const shortId = sessionId.substring(0, 8);
    try {
      sendCommand('command:restart', { sessionId });
      await authFetch(`/sessions/${sessionId}/restart`, { method: 'POST' });
      showToast(`Restart command sent for session #${shortId}`, 'ok');
    } catch (err) {
      showToast('Error restarting session: ' + err.message, 'err');
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

  const activeWorkerCount = sessions ? sessions.length : 0;

  return (
    <div className="space-y-5">
      {/* Page Header: Header holds status badge "Live" (ok) and caption "Active workers 0" */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[32px] font-semibold text-ink tracking-tight">
            Active sessions
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Real-time worker concurrency, proxy bindings, and process controls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status="Live" label="Live" />
          <span className="font-mono text-xs text-ink-3 tabular-nums">
            Active workers {activeWorkerCount}
          </span>
        </div>
      </div>

      {/* Main sessions table card */}
      <div className="zx-card">
        <div className="zx-card-header">
          <h2 className="text-[15px] leading-[24px] font-semibold text-ink">
            Dispatcher sessions
          </h2>
          <span className="font-mono text-xs text-ink-3 tabular-nums">
            {activeWorkerCount} running
          </span>
        </div>

        <div className="overflow-x-auto">
          {!sessions || sessions.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No active sessions"
              description="Dispatcher sessions appear here in real time."
            />
          ) : (
            <table className="zx-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Session ID</th>
                  <th>Organization</th>
                  <th>Operator</th>
                  <th>Proxy node</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '100px' }} className="text-right">Uptime</th>
                  <th style={{ width: '180px' }} className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.sessionId}>
                    {/* Session ID (mono) */}
                    <td className="font-mono text-xs font-medium text-ink">
                      #{session.sessionId?.substring(0, 8) || '—'}
                    </td>

                    {/* Organization */}
                    <td className="text-xs text-ink font-medium">
                      {session.org || session.orgId?.substring(0, 8) || 'System'}
                    </td>

                    {/* Operator */}
                    <td className="font-mono text-xs text-ink-2">
                      {session.operator || 'Dispatcher'}
                    </td>

                    {/* Proxy node */}
                    <td className="font-mono text-xs text-ink-2">
                      {session.proxyNode || 'Direct'}
                    </td>

                    {/* Status badge */}
                    <td>
                      <StatusBadge
                        status={session.status === 'ACTIVE' ? 'Active' : 'Idle'}
                      />
                    </td>

                    {/* Uptime (mono, tabular, right-aligned) */}
                    <td className="font-mono text-xs tabular-nums text-right text-ink-2">
                      {formatUptime(session.startedAt)}
                    </td>

                    {/* Actions: Restart, Terminate */}
                    <td className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestartSession(session.sessionId)}
                          className="zx-btn-secondary h-[28px] px-2.5 text-xs"
                          title="Restart dispatcher session"
                        >
                          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Restart</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKillSession(session.sessionId)}
                          className="zx-btn-destructive h-[28px] px-2.5 text-xs"
                          title="Terminate session"
                        >
                          <XOctagon className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Terminate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
