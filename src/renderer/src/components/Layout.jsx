import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { WebSocketProvider, useWebSocket } from '../contexts/WebSocketContext';
import ZonixLogo from './ZonixLogo';
import {
  LayoutDashboard, Building2, Users, Wifi, Radio, ShieldCheck, FileText,
  LogOut, PanelLeftClose, PanelLeft, Sun, Moon
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

function formatMiddleEllipsis(str, maxLen = 12) {
  if (!str) return '—';
  if (str.length <= maxLen) return str;
  const chars = Math.floor((maxLen - 3) / 2);
  return `${str.substring(0, chars)}…${str.substring(str.length - chars)}`;
}

function TopBar() {
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();
  const { isDark, toggleTheme } = useTheme();
  const [utcTime, setUtcTime] = useState('');
  const location = useLocation();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentItem = NAV_ITEMS.find((item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });
  const currentViewLabel = currentItem ? currentItem.label : 'Console';

  return (
    <header
      className="h-[44px] bg-surface border-b border-line flex items-center justify-between pl-4 select-none flex-shrink-0 z-30"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Breadcrumb Left */}
      <div className="flex items-center gap-1.5 text-[13px]" style={{ WebkitAppRegion: 'no-drag' }}>
        <span className="text-ink-2 font-medium">System</span>
        <span className="text-ink-3">/</span>
        <span className="text-ink font-semibold">{currentViewLabel}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 text-[13px] font-medium">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-ok' : 'bg-err'}`} />
          <span className={connected ? 'text-ok-ink' : 'text-err-ink'}>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* UTC Clock */}
        <div className="px-3 font-mono text-[13px] text-ink-2 tabular-nums border-l border-line h-5 flex items-center">
          {utcTime}
        </div>

        {/* Theme Switcher */}
        <div className="px-2 border-l border-line h-full flex items-center">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-ctl text-ink-2 hover:bg-surface-hover hover:text-ink transition-colors"
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
          </button>
        </div>

        {/* Operator Chip */}
        <div className="px-3 border-l border-line h-full flex items-center">
          <span
            className="text-xs font-mono text-ink-2 px-2 py-0.5 border border-line-input rounded-[6px] bg-surface cursor-default"
            title={`Logged in as ${user?.username} (${user?.role})`}
          >
            {user?.username || 'operator'}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center h-full border-l border-line ml-2">
          <button
            type="button"
            onClick={() => window.zonixAPI?.minimizeWindow?.()}
            className="w-[46px] h-full flex items-center justify-center text-ink-2 hover:bg-surface-hover hover:text-ink transition-colors"
            title="Minimize"
            aria-label="Minimize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10">
              <path d="M0 5h10v1H0z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => window.zonixAPI?.maximizeWindow?.()}
            className="w-[46px] h-full flex items-center justify-center text-ink-2 hover:bg-surface-hover hover:text-ink transition-colors"
            title="Maximize"
            aria-label="Maximize"
          >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor">
              <rect x="1" y="1" width="8" height="8" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => window.zonixAPI?.closeWindow?.()}
            className="w-[46px] h-full flex items-center justify-center text-ink-2 hover:bg-[#E81123] hover:text-white transition-colors"
            title="Close"
            aria-label="Close"
          >
            <svg viewBox="0 0 10 10" width="10" height="10">
              <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const { sessions } = useWebSocket();
  const { isDark } = useTheme();
  const activeSessionCount = sessions ? sessions.length : 0;

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
  const tenantId = user?.orgId || user?.tenantId || '';
  const shortTenant = formatMiddleEllipsis(tenantId, 10);

  return (
    <aside
      className={`${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      } bg-surface border-r border-line flex flex-col transition-all duration-120 flex-shrink-0 select-none z-20`}
    >
      {/* Sidebar Header 56px */}
      <div className="h-[56px] px-3.5 flex items-center justify-between border-b border-line flex-shrink-0">
        {!collapsed ? (
          <>
            <ZonixLogo size={24} showText={true} version="v1.9.30" dark={isDark} />
            <button
              type="button"
              onClick={onToggle}
              className="zx-btn-icon flex-shrink-0 text-ink-2 hover:text-ink"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              onClick={onToggle}
              className="zx-btn-icon text-ink-2 hover:text-ink"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ZonixLogo size={24} showText={false} dark={isDark} />
            </button>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  collapsed ? 'justify-center px-0' : 'px-3 gap-2.5'
                } h-[36px] rounded-ctl text-sm font-medium transition-colors duration-120 ${
                  isActive
                    ? 'bg-accent-wash text-accent font-semibold'
                    : 'text-ink-2 hover:bg-surface-hover hover:text-ink'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.path === '/sessions' && activeSessionCount > 0 && (
                <span className="ml-auto font-mono text-xs tabular-nums text-accent font-semibold">
                  {activeSessionCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-line bg-surface flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-accent-wash text-accent font-medium text-xs flex items-center justify-center flex-shrink-0 border border-line">
                {userInitial}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-medium text-ink truncate">
                  {user?.username || 'Operator'}
                </span>
                <span
                  className="font-mono text-xs text-ink-3 truncate"
                  title={tenantId ? `Tenant ID: ${tenantId}` : user?.role}
                >
                  {user?.role || 'OPERATOR'} {tenantId ? `· ${shortTenant}` : ''}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="zx-btn-icon flex-shrink-0 text-ink-2 hover:text-err"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-7 h-7 rounded-full bg-accent-wash text-accent font-medium text-xs flex items-center justify-center border border-line cursor-default"
              title={`${user?.username || 'Operator'} (${user?.role})`}
            >
              {userInitial}
            </div>
            <button
              type="button"
              onClick={logout}
              className="zx-btn-icon text-ink-2 hover:text-err"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function LayoutContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-bg text-ink overflow-hidden font-sans select-none">
      <TopBar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main
          className="flex-1 overflow-y-auto bg-bg p-8 min-w-0"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div
            key={location.pathname}
            className="max-w-[1280px] mx-auto w-full space-y-5"
          >
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
