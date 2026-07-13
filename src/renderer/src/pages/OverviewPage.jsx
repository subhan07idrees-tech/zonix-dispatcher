import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import {
  Building2, Users, Radio, Wifi, Activity, AlertTriangle,
  Circle, ArrowUpRight
} from 'lucide-react';

function MetricCard({ icon: Icon, label, value, accent = 'cyan', subtext }) {
  const colors = {
    cyan: 'border-zonix-cyan/30 text-zonix-cyan bg-zonix-cyan/5',
    purple: 'border-zonix-purple/30 text-zonix-purple bg-zonix-purple/5',
    crimson: 'border-zonix-crimson/30 text-zonix-crimson bg-zonix-crimson/5',
    green: 'border-green-500/30 text-green-400 bg-green-500/5'
  };

  return (
    <div className={`zonix-card p-4 border-l-2 ${colors[accent].split(' ')[0]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${colors[accent].split(' ')[1]}`} />
        <span className="text-xs text-zonix-text-muted font-mono">{subtext}</span>
      </div>
      <p className="text-2xl font-bold font-mono text-zonix-text">{value}</p>
      <p className="text-xs text-zonix-text-dim mt-1">{label}</p>
    </div>
  );
}

function LiveSessionRow({ session }) {
  const statusColors = {
    ACTIVE: 'text-zonix-cyan',
    IDLE: 'text-yellow-400',
    ERROR: 'text-zonix-crimson',
    DISCONNECTED: 'text-zonix-text-muted'
  };

  return (
    <tr className="border-b border-zonix-border/50 hover:bg-zonix-surface-light/30">
      <td className="py-2 px-3 text-xs font-mono text-zonix-text-dim">
        #{session.sessionId?.substring(0, 4)}
      </td>
      <td className="py-2 px-3 text-xs text-zonix-text">{session.org}</td>
      <td className="py-2 px-3 text-xs text-zonix-text-dim font-mono">{session.operator}</td>
      <td className="py-2 px-3 text-xs text-zonix-text-dim font-mono">{session.proxyNode}</td>
      <td className="py-2 px-3">
        <span className={`zonix-badge ${session.status === 'ACTIVE' ? 'zonix-badge-active' : 'zonix-badge-error'}`}>
          <Circle className={`w-2 h-2 fill-current mr-1 ${statusColors[session.status] || 'text-zonix-text-muted'}`} />
          {session.status}
        </span>
      </td>
    </tr>
  );
}

function AlertStream({ alerts }) {
  if (alerts.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zonix-text-muted font-mono">
        NO ALERTS // SYSTEM NOMINAL
      </div>
    );
  }

  return (
    <div className="max-h-40 overflow-y-auto space-y-1 p-2">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-2 p-2 rounded bg-zonix-base/50 text-xs">
          {alert.severity === 'critical' ? (
            <AlertTriangle className="w-3 h-3 text-zonix-crimson mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <span className={`font-mono ${alert.severity === 'critical' ? 'text-zonix-crimson' : 'text-yellow-400'}`}>
              {alert.severity?.toUpperCase()}:
            </span>
            <span className="text-zonix-text-dim ml-1">{alert.message || alert.eventType}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { authFetch } = useAuth();
  const { sessions, alerts } = useWebSocket();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await authFetch('/dashboard');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-zonix-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-zonix-text-dim font-mono">LOADING TELEMETRY...</p>
        </div>
      </div>
    );
  }

  const overview = metrics?.overview || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-wide">ORGANIZATION METRICS</h2>
          <p className="text-xs text-zonix-text-dim mt-0.5">Live dispatch counter & system health</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${overview.systemHealth >= 95 ? 'bg-green-400' : overview.systemHealth >= 80 ? 'bg-yellow-400' : 'bg-zonix-crimson'}`}></div>
          <span className="text-xs font-mono text-zonix-text-dim">
            Global Health: <span className="text-zonix-cyan">{overview.systemHealth || 0}%</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          label="Total Organizations"
          value={overview.totalOrgs || 0}
          accent="cyan"
          subtext={`${overview.activeOrgs || 0} active`}
        />
        <MetricCard
          icon={Users}
          label="Active Users"
          value={overview.activeUsers || 0}
          accent="purple"
          subtext={`${overview.totalUsers || 0} total`}
        />
        <MetricCard
          icon={Radio}
          label="Active Sessions"
          value={sessions.length || overview.activeSessions || 0}
          accent="green"
          subtext="real-time"
        />
        <MetricCard
          icon={Wifi}
          label="Proxy Nodes"
          value={overview.activeProxies || 0}
          accent="cyan"
          subtext={`${overview.totalProxies || 0} total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 zonix-card">
          <div className="p-4 border-b border-zonix-border">
            <h3 className="text-sm font-semibold tracking-wide">ACTIVE REAL-TIME DISPATCH SESSIONS</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zonix-border text-xs text-zonix-text-dim font-mono">
                  <th className="py-2 px-3 text-left">ID</th>
                  <th className="py-2 px-3 text-left">ORG</th>
                  <th className="py-2 px-3 text-left">OPERATOR</th>
                  <th className="py-2 px-3 text-left">PROXY NODE</th>
                  <th className="py-2 px-3 text-left">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length > 0 ? (
                  sessions.map((session, i) => (
                    <LiveSessionRow key={session.sessionId || i} session={session} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-zonix-text-muted font-mono">
                      NO ACTIVE SESSIONS
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="zonix-card">
          <div className="p-4 border-b border-zonix-border">
            <h3 className="text-sm font-semibold tracking-wide">ALERTS & TELEMETRY STREAM</h3>
          </div>
          <AlertStream alerts={alerts} />
        </div>
      </div>
    </div>
  );
}
