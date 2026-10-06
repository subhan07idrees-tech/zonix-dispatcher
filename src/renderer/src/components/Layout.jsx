import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WebSocketProvider, useWebSocket } from '../contexts/WebSocketContext';
import {
  LayoutDashboard, Building2, Users, Wifi, Radio, FileText,
  LogOut, Menu, ChevronRight, ShieldCheck
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/organizations', label: 'Org settings', icon: Building2 },
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
    <header className="h-12 border-b border-[#CBD5E1] bg-white flex items-center justify-between pl-4 flex-shrink-0 select-none shadow-xs" style={{ WebkitAppRegion: 'drag' }}>
      {/* Brand & Context */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#0F172A] flex items-center justify-center text-white text-xs font-bold font-mono shadow-xs">
            Z
          </div>
          <span className="text-sm font-bold tracking-tight text-[#0F172A] font-mono">ZONIX</span>
          <span className="text-[#CBD5E1] text-xs">/</span>
          <span className="text-xs text-[#475569] font-medium hidden sm:inline">System control node</span>
          <span className="text-[11px] text-[#475569] font-mono bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#CBD5E1] font-semibold">
            v{window.zonixAPI?.appVersion || '1.8.18'}
          </span>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-3.5 text-xs font-sans text-[#475569] h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Connection status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="relative flex h-2 w-2">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-[#047857]' : 'bg-[#DC2626]'}`}></span>
          </span>
          <span className={`text-xs font-bold ${connected ? 'text-[#047857]' : 'text-[#DC2626]'}`}>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[#64748B]">Active:</span>
          <span className="text-[#0F172A] font-mono font-bold">{sessions.length}</span>
        </div>

        <div className="hidden lg:flex items-center text-xs px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[#64748B] mr-1.5">Time:</span>
          <span className="font-mono text-[#0F172A] font-bold">{utcTime} UTC</span>
        </div>

        <div className="flex items-center gap-2 pr-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]" />
            <span className="text-xs text-[#1E40AF] font-bold font-mono">
              {user?.username}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-md text-[#64748B] hover:text-[#0F172A] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Window control buttons */}
        <div className="flex items-center h-full border-l border-[#CBD5E1]">
          <button
            onClick={() => window.zonixAPI?.minimizeWindow?.()}
            className="w-11 h-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            title="Minimize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0 5h10v1H0z" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI?.maximizeWindow?.()}
            className="w-11 h-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            title="Maximize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor"><rect x="1" y="1" width="8" height="8" strokeWidth="1.2"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI?.closeWindow?.()}
            className="w-11 h-full flex items-center justify-center text-[#64748B] hover:text-white hover:bg-[#DC2626] transition-colors"
            title="Close"
          >
            <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
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
      className={`${collapsed ? 'w-14' : 'w-[230px]'} bg-[#0F172A] text-white border-r border-[#1E293B] flex flex-col transition-all duration-150 flex-shrink-0 select-none shadow-md`}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center border-b border-[#1E293B] ${collapsed ? 'justify-center p-3' : 'gap-2.5 px-4 py-3.5 justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#1E40AF] flex items-center justify-center text-white text-xs font-bold font-mono shadow-xs">
              Z
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wider font-mono">ZONIX</p>
              <p className="text-[10px] text-[#94A3B8] font-normal">System Administration</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-6 h-6 rounded bg-[#1E40AF] flex items-center justify-center text-white text-xs font-bold font-mono">
            Z
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-[#1E293B] rounded transition-colors text-[#94A3B8] hover:text-white flex-shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 space-y-1 overflow-y-auto px-2.5">
        {NAV_ITEMS.map((item) => {
          const label = item.path === '/organizations' && user?.role === 'SUPER_ADMIN' ? 'Organizations' : item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-[40px] rounded-lg text-xs font-medium transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-[#1E293B] text-white font-bold shadow-xs'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#3B82F6] rounded-r" />
                  )}
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#94A3B8]'}`} />
                  {!collapsed && (
                    <span className="tracking-normal flex-1 truncate">{label}</span>
                  )}
                  {!collapsed && item.label === 'Active sessions' && (
                    <span className={`ml-auto text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      activeSessionCount > 0 ? 'bg-[#1E40AF] text-white' : 'bg-[#1E293B] text-[#94A3B8]'
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
      <div className="p-3.5 border-t border-[#1E293B] bg-[#0A0F1D]">
        {!collapsed ? (
          <div className="text-[11px] text-[#94A3B8] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Role:</span>
              <span className="text-white font-bold bg-[#1E293B] px-1.5 py-0.5 rounded font-mono text-[10px]">
                {user?.role}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[#64748B]">Org:</span>
              <span className="text-[#CBD5E1] font-mono font-medium truncate max-w-[120px]" title={user?.orgId}>
                {user?.orgName || user?.orgId?.substring(0, 10)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" title={`Role: ${user?.role}`} />
          </div>
        )}
      </div>
    </aside>
  );
}

function LayoutContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans select-none">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-auto bg-[#F8FAFC] p-6 lg:p-8">
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
