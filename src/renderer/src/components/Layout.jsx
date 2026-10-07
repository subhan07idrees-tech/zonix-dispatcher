import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WebSocketProvider, useWebSocket } from '../contexts/WebSocketContext';
import ZonixLogo from './ZonixLogo';
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
    <header className="h-12 border-b border-[#CBD5E1] bg-white flex items-center justify-between pl-3 sm:pl-4 flex-shrink-0 select-none shadow-xs z-20" style={{ WebkitAppRegion: 'drag' }}>
      {/* Brand & Context */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex items-center gap-2.5">
          <ZonixLogo size={24} showText={false} />
          <span className="text-sm font-extrabold tracking-widest text-[#0F172A] font-mono">ZONIX</span>
          <span className="text-[#CBD5E1] text-xs">/</span>
          <span className="text-xs text-[#475569] font-medium hidden md:inline">System Control Node</span>
          <span className="text-[10px] text-[#475569] font-mono bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#CBD5E1] font-bold">
            v{window.zonixAPI?.appVersion || '1.8.18'}
          </span>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-sans text-[#475569] h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Connection status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] shadow-2xs">
          <span className="relative flex h-2 w-2">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-[#047857]' : 'bg-[#DC2626]'}`}></span>
          </span>
          <span className={`text-xs font-bold tracking-tight ${connected ? 'text-[#047857]' : 'text-[#DC2626]'}`}>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#CBD5E1]">
          <span className="text-[#64748B] font-medium">Active:</span>
          <span className="text-[#0F172A] font-mono font-bold">{sessions.length}</span>
        </div>

        <div className="hidden lg:flex items-center text-xs px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#CBD5E1]">
          <span className="text-[#64748B] mr-1.5 font-medium">Time:</span>
          <span className="font-mono text-[#0F172A] font-bold">{utcTime} UTC</span>
        </div>

        {/* User Pill & Logout */}
        <div className="flex items-center gap-1.5 pr-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]" />
            <span className="text-xs text-[#1E40AF] font-bold font-mono">
              {user?.username}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-md text-[#64748B] hover:text-[#B91C1C] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Window control buttons */}
        <div className="flex items-center h-full border-l border-[#CBD5E1]">
          <button
            onClick={() => window.zonixAPI?.minimizeWindow?.()}
            className="w-10 sm:w-11 h-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            title="Minimize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10"><path d="M0 5h10v1H0z" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI?.maximizeWindow?.()}
            className="w-10 sm:w-11 h-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            title="Maximize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor"><rect x="1" y="1" width="8" height="8" strokeWidth="1.2"/></svg>
          </button>
          <button
            onClick={() => window.zonixAPI?.closeWindow?.()}
            className="w-10 sm:w-11 h-full flex items-center justify-center text-[#64748B] hover:text-white hover:bg-[#DC2626] transition-colors"
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
      className={`${collapsed ? 'w-16' : 'w-[230px]'} bg-[#0F172A] text-white border-r border-[#1E293B] flex flex-col transition-all duration-200 flex-shrink-0 select-none shadow-md z-10`}
    >
      {/* Sidebar Header */}
      <div className={`border-b border-[#1E293B] ${collapsed ? 'py-2.5 px-2 flex flex-col items-center gap-2' : 'px-4 py-3 flex items-center justify-between'}`}>
        {collapsed ? (
          <>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-[#1E293B] rounded transition-colors text-[#94A3B8] hover:text-white"
              title="Expand sidebar"
            >
              <ZonixLogo size={22} showText={false} />
            </button>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-[#1E293B] rounded transition-colors text-[#94A3B8] hover:text-white"
              title="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <ZonixLogo size={24} showText={false} />
              <div>
                <p className="text-xs font-extrabold text-white tracking-widest font-mono">ZONIX</p>
                <p className="text-[10px] text-[#94A3B8] font-medium">System Administration</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-[#1E293B] rounded transition-colors text-[#94A3B8] hover:text-white flex-shrink-0"
              title="Collapse sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav Items */}
      <nav className={`flex-1 py-3 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-2.5'}`}>
        {NAV_ITEMS.map((item) => {
          const label = item.path === '/organizations' && user?.role === 'SUPER_ADMIN' ? 'Organizations' : item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} h-[40px] rounded-lg text-xs font-semibold transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#3B82F6] rounded-r" />
                  )}
                  <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-[#60A5FA]' : 'text-[#94A3B8] group-hover:text-white'}`} />
                  {!collapsed && (
                    <span className="tracking-normal flex-1 truncate">{label}</span>
                  )}
                  {!collapsed && item.label === 'Active sessions' && (
                    <span className={`ml-auto text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                      activeSessionCount > 0 ? 'bg-[#1E40AF] text-white animate-pulse' : 'bg-[#1E293B] text-[#94A3B8]'
                    }`}>
                      {activeSessionCount}
                    </span>
                  )}
                  {collapsed && item.label === 'Active sessions' && activeSessionCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer Info */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0A0F1D]">
        {!collapsed ? (
          <div className="text-[11px] text-[#94A3B8] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B] font-medium">Role:</span>
              <span className="text-white font-bold bg-[#1E293B] px-1.5 py-0.5 rounded font-mono text-[10px] border border-[#334155]">
                {user?.role}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[#64748B] font-medium">Org:</span>
              <span className="text-[#38BDF8] font-mono font-bold truncate max-w-[125px]" title={user?.orgId}>
                {user?.orgName || user?.orgId?.substring(0, 10)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title={`Role: ${user?.role || 'User'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
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
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="max-w-7xl mx-auto space-y-6 w-full">
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
