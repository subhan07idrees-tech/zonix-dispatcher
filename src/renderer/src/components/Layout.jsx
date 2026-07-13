import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WebSocketProvider, useWebSocket } from '../contexts/WebSocketContext';
import {
  LayoutDashboard, Building2, Users, Wifi, Radio, FileText,
  LogOut, Menu, X, Circle, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/organizations', label: 'Organizations', icon: Building2 },
  { path: '/users', label: 'User Registry', icon: Users },
  { path: '/proxies', label: 'Proxy Nodes', icon: Wifi },
  { path: '/sessions', label: 'Active Sessions', icon: Radio },
  { path: '/logs', label: 'System Logs', icon: FileText },
];

function TopBar() {
  const { user, logout } = useAuth();
  const { connected, sessions } = useWebSocket();
  const [utcTime, setUtcTime] = useState('');

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ').slice(4, 5).join(' '));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-12 border-b border-zonix-border bg-zonix-surface/85 backdrop-blur-md flex items-center justify-between pl-4 flex-shrink-0 select-none" style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-widest text-zonix-cyan">ZONIX</h1>
          <span className="text-zonix-border text-xs">//</span>
          <span className="text-xs text-zonix-text-muted tracking-wider font-mono">SYSTEM CONTROL NODE</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-zonix-text-dim h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-zonix-cyan shadow-[0_0_6px_#3b82f6]' : 'bg-zonix-crimson'} animate-pulse`} />
          <span className={connected ? 'text-zonix-cyan' : 'text-zonix-crimson'}>
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>

        <span className="text-zonix-border/50">|</span>

        <div className="flex items-center gap-1">
          <span className="text-zonix-text-muted">Active:</span>
          <span className="text-zonix-cyan font-bold">{sessions.length}</span>
        </div>

        <span className="text-zonix-border/50">|</span>
        <span className="text-zonix-text-muted">SysTime: <span className="text-zonix-text">{utcTime} UTC</span></span>
        <span className="text-zonix-border/50">|</span>

        <div className="flex items-center gap-2">
          <span className="text-zonix-text px-2 py-0.5 rounded bg-zonix-surface-light border border-zonix-border/40">
            {user?.username}
          </span>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-zonix-crimson/10 rounded transition-colors text-zonix-text-dim hover:text-zonix-crimson border border-transparent hover:border-zonix-crimson/30 mr-2"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Custom Window control buttons */}
        <div className="flex items-center h-full border-l border-zonix-border/50">
          <button
            onClick={() => window.zonixAPI.minimizeWindow()}
            className="w-12 h-full flex items-center justify-center text-zonix-text-dim hover:text-zonix-text hover:bg-zonix-surface-light transition-colors"
            title="Minimize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0 5h10v1H0z" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI.maximizeWindow()}
            className="w-12 h-full flex items-center justify-center text-zonix-text-dim hover:text-zonix-text hover:bg-zonix-surface-light transition-colors"
            title="Maximize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor"><rect x="1" y="1" width="8" height="8" strokeWidth="1.2"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI.closeWindow()}
            className="w-12 h-full flex items-center justify-center text-zonix-text-dim hover:text-white hover:bg-zonix-crimson transition-colors"
            title="Close"
          >
            <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const { sessions } = useWebSocket();
  const activeSessionCount = sessions.length;

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-56'} bg-zonix-surface border-r border-zonix-border flex flex-col transition-all duration-200 flex-shrink-0`}
      style={{ background: 'linear-gradient(180deg, rgba(18,24,36,0.98) 0%, rgba(11,15,25,0.98) 100%)' }}
    >
      {/* Logo area */}
      <div className={`flex items-center border-b border-zonix-border/60 ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3 justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="./logo.png"
                alt="ZONIX Logo"
                className="w-9 h-9 object-contain rounded-lg"
                style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.5))' }}
              />
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest" style={{ background: 'linear-gradient(90deg,#3b82f6,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ZONIX
              </p>
              <p className="text-[9px] text-zonix-text-muted tracking-widest font-mono">
                v{window.zonixAPI?.appVersion || '1.1.0'} // SECURE
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <img
            src="./logo.png"
            alt="Z"
            className="w-8 h-8 object-contain"
            style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.4))' }}
          />
        )}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-zonix-surface-light rounded transition-colors text-zonix-text-dim hover:text-zonix-cyan flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const label = item.path === '/organizations' && user?.role !== 'SUPER_ADMIN' ? 'Org Settings' : item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-zonix-cyan/15 to-transparent text-zonix-cyan border border-zonix-cyan/20'
                    : 'text-zonix-text-dim hover:text-zonix-text hover:bg-zonix-surface-light border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-zonix-cyan rounded-r shadow-[0_0_8px_#3b82f6]" />
                  )}
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-zonix-cyan' : ''}`} />
                  {!collapsed && (
                    <span className="font-medium tracking-wide">{label}</span>
                  )}
                  {!collapsed && item.label === 'Active Sessions' && (
                    <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      activeSessionCount > 0 ? 'bg-zonix-cyan/20 text-zonix-cyan' : 'bg-zonix-surface-light text-zonix-text-muted'
                    }`}>
                      {activeSessionCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-3 border-t border-zonix-border/60">
        {!collapsed ? (
          <div className="text-[10px] text-zonix-text-muted font-mono space-y-0.5 px-1">
            <p className="truncate">Org: {user?.orgId?.substring(0, 12)}...</p>
            <p>Role: <span className="text-zonix-cyan">{user?.role}</span></p>
          </div>
        ) : (
          <div className="flex justify-center">
            <Circle className="w-2 h-2 text-zonix-cyan fill-current" style={{ filter: 'drop-shadow(0 0 4px #00F0FF)' }} />
          </div>
        )}
      </div>
    </aside>
  );
}

function LayoutContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-zonix-base overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <WebSocketProvider>
      <LayoutContent />
    </WebSocketProvider>
  );
}
