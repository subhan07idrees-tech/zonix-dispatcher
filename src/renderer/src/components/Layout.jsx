import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WebSocketProvider, useWebSocket } from '../contexts/WebSocketContext';
import {
  LayoutDashboard, Building2, Users, Wifi, Radio, FileText,
  LogOut, Menu, ChevronRight, ShieldCheck
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/organizations', label: 'Organizations', icon: Building2 },
  { path: '/users', label: 'User registry', icon: Users },
  { path: '/proxies', label: 'Proxy nodes', icon: Wifi },
  { path: '/sessions', label: 'Active sessions', icon: Radio },
  { path: '/diagnostics', label: 'Diagnostics', icon: ShieldCheck },
  { path: '/logs', label: 'System logs', icon: FileText },
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
    <header className="h-11 border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md flex items-center justify-between pl-4 flex-shrink-0 select-none" style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xs font-semibold tracking-wider text-slate-100">ZONIX</h1>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-xs text-slate-400 font-normal">System control node</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-sans text-slate-400 h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <span className="text-slate-800">|</span>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Active:</span>
          <span className="text-slate-200 font-mono font-medium">{sessions.length}</span>
        </div>

        <span className="text-slate-800">|</span>
        <span className="text-xs text-slate-400">Time: <span className="font-mono text-slate-200">{utcTime} UTC</span></span>
        <span className="text-slate-800">|</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">
            {user?.username}
          </span>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-slate-800/60 rounded transition-colors text-slate-400 hover:text-slate-200 mr-2"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Custom Window control buttons */}
        <div className="flex items-center h-full border-l border-slate-800/60">
          <button
            onClick={() => window.zonixAPI.minimizeWindow()}
            className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Minimize"
          >
            <svg viewBox="0 0 10 10" width="9" height="9"><path d="M0 5h10v1H0z" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI.maximizeWindow()}
            className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Maximize"
          >
            <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor"><rect x="1" y="1" width="8" height="8" strokeWidth="1.2"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI.closeWindow()}
            className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600/80 transition-colors"
            title="Close"
          >
            <svg viewBox="0 0 10 10" width="9" height="9"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
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
      className={`${collapsed ? 'w-16' : 'w-56'} bg-[#0B0F17] border-r border-slate-800/80 flex flex-col transition-all duration-200 flex-shrink-0`}
    >
      {/* Logo area */}
      <div className={`flex items-center border-b border-slate-800/60 ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3 justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img
              src="./logo.png"
              alt="ZONIX Logo"
              className="w-7 h-7 object-contain rounded-lg"
            />
            <div>
              <p className="text-xs font-semibold text-slate-100 tracking-wider">
                ZONIX
              </p>
              <p className="text-[10px] text-slate-400 font-normal">
                v{window.zonixAPI?.appVersion || '1.8.3'}
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <img
            src="./logo.png"
            alt="Z"
            className="w-7 h-7 object-contain"
          />
        )}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-slate-800/60 rounded-md transition-colors text-slate-400 hover:text-slate-200 flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-1 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const label = item.path === '/organizations' && user?.role !== 'SUPER_ADMIN' ? 'Org settings' : item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-slate-800/80 text-emerald-400 border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-400 rounded-r" />
                  )}
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {!collapsed && (
                    <span className="tracking-normal">{label}</span>
                  )}
                  {!collapsed && item.label === 'Active sessions' && (
                    <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      activeSessionCount > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
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
      <div className="p-3 border-t border-slate-800/60">
        {!collapsed ? (
          <div className="text-[11px] text-slate-400 space-y-0.5 px-1">
            <p className="truncate font-mono">Org: {user?.orgId?.substring(0, 12)}...</p>
            <p>Role: <span className="text-slate-200 font-medium">{user?.role}</span></p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        )}
      </div>
    </aside>
  );
}

function LayoutContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-[#070A10] text-slate-200 overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-auto bg-[#070A10]">
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
