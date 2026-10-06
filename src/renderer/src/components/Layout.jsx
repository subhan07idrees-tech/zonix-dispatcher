import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WebSocketProvider, useWebSocket } from '../contexts/WebSocketContext';
import {
  LayoutDashboard, Building2, Users, Wifi, Radio, FileText,
  LogOut, Menu, ChevronRight, ShieldCheck, Activity
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
    <header className="h-11 border-b border-[#D9DEE7] bg-white flex items-center justify-between pl-4 flex-shrink-0 select-none shadow-sm" style={{ WebkitAppRegion: 'drag' }}>
      {/* Brand & Context */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#172033] flex items-center justify-center text-white text-xs font-bold font-mono">
            Z
          </div>
          <h1 className="text-xs font-bold tracking-wider text-[#172033] uppercase font-mono">ZONIX</h1>
          <span className="text-[#98A2B3] text-xs">/</span>
          <span className="text-xs text-[#667085] font-normal">System control node</span>
          <span className="text-[10px] text-[#98A2B3] font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
            v{window.zonixAPI?.appVersion || '1.8.17'}
          </span>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-4 text-xs font-sans text-[#667085] h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#2E7D5B]' : 'bg-[#B54747]'}`} />
          <span className={`text-xs font-semibold ${connected ? 'text-[#2E7D5B]' : 'text-[#B54747]'}`}>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <span className="text-[#D9DEE7]">|</span>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#667085]">Active:</span>
          <span className="text-[#172033] font-mono font-semibold">{sessions.length}</span>
        </div>

        <span className="text-[#D9DEE7]">|</span>

        <span className="text-xs text-[#667085]">
          Time: <span className="font-mono text-[#172033] font-medium">{utcTime} UTC</span>
        </span>

        <span className="text-[#D9DEE7]">|</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#172033] font-medium px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#D9DEE7]">
            {user?.username}
          </span>
          <button
            onClick={logout}
            className="p-1 hover:bg-[#F1F5F9] rounded text-[#667085] hover:text-[#172033] transition-colors mr-2"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Custom Window control buttons */}
        <div className="flex items-center h-full border-l border-[#D9DEE7]">
          <button
            onClick={() => window.zonixAPI?.minimizeWindow?.()}
            className="w-10 h-full flex items-center justify-center text-[#667085] hover:text-[#172033] hover:bg-[#F1F5F9] transition-colors"
            title="Minimize"
          >
            <svg viewBox="0 0 10 10" width="9" height="9"><path d="M0 5h10v1H0z" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI?.maximizeWindow?.()}
            className="w-10 h-full flex items-center justify-center text-[#667085] hover:text-[#172033] hover:bg-[#F1F5F9] transition-colors"
            title="Maximize"
          >
            <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor"><rect x="1" y="1" width="8" height="8" strokeWidth="1.2"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI?.closeWindow?.()}
            className="w-10 h-full flex items-center justify-center text-[#667085] hover:text-white hover:bg-[#B54747] transition-colors"
            title="Close"
          >
            <svg viewBox="0 0 10 10" width="9" height="9"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
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
      className={`${collapsed ? 'w-14' : 'w-[220px]'} bg-[#172033] text-white border-r border-[#101726] flex flex-col transition-all duration-150 flex-shrink-0 select-none`}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center border-b border-[#243048] ${collapsed ? 'justify-center p-3' : 'gap-2.5 px-4 py-3 justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[#245B9E] flex items-center justify-center text-white text-[11px] font-bold font-mono">
              Z
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wider font-mono">ZONIX</p>
              <p className="text-[10px] text-[#98A2B3] font-normal">System Admin</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-5 h-5 rounded bg-[#245B9E] flex items-center justify-center text-white text-[11px] font-bold font-mono">
            Z
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-[#1F2937] rounded transition-colors text-[#98A2B3] hover:text-white flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const label = item.path === '/organizations' && user?.role !== 'SUPER_ADMIN' ? 'Org settings' : item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-[38px] rounded-md text-xs font-medium transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-[#1F2937] text-white font-semibold'
                    : 'text-[#98A2B3] hover:text-white hover:bg-[#1F2937]/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#245B9E] rounded-r" />
                  )}
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#98A2B3]'}`} />
                  {!collapsed && (
                    <span className="tracking-normal flex-1 truncate">{label}</span>
                  )}
                  {!collapsed && item.label === 'Active sessions' && (
                    <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      activeSessionCount > 0 ? 'bg-[#245B9E] text-white font-semibold' : 'bg-[#1F2937] text-[#98A2B3]'
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

      {/* Sidebar Footer Info */}
      <div className="p-3 border-t border-[#243048] bg-[#121A2A]">
        {!collapsed ? (
          <div className="text-[11px] text-[#98A2B3] space-y-0.5">
            <p className="truncate font-mono">Org ID: <span className="text-white font-medium">{user?.orgId?.substring(0, 12)}</span></p>
            <p>Role: <span className="text-white font-semibold">{user?.role}</span></p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-[#2E7D5B]" title={`Org: ${user?.orgId}`} />
          </div>
        )}
      </div>
    </aside>
  );
}

function LayoutContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-[#F5F7FA] text-[#172033] overflow-hidden font-sans select-none">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-auto bg-[#F5F7FA] p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
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
