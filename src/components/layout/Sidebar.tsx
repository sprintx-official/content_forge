import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Zap,
  Hammer,
  Newspaper,
  Clock,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Command,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useForgeStore } from '@/stores/useForgeStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/forge', label: 'Forge', icon: Hammer, section: 'main' },
  { to: '/newsroom', label: 'Newsroom', icon: Newspaper, section: 'main' },
  { to: '/history', label: 'History', icon: Clock, section: 'main' },
]

export default function Sidebar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore()
  const resetForge = useForgeStore((s) => s.reset)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cf_sidebar') === 'collapsed')

  const isActive = (path: string) => location.pathname === path

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('cf_sidebar', next ? 'collapsed' : 'expanded')
  }

  if (!isAuthenticated) return null

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen flex flex-col border-r border-white/[0.06] bg-[#0c1021]/90 backdrop-blur-xl transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[220px]',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-4 border-b border-white/[0.06]">
        <Link to="/forge" onClick={resetForge} className="flex items-center gap-2.5 group min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#a855f7] flex items-center justify-center shrink-0">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ContentForge
            </span>
          )}
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Search trigger */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className={cn(
            'flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all mb-3',
            collapsed && 'justify-center px-0',
          )}
        >
          <Command className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-xs">Search...</span>
              <kbd className="text-[10px] text-white/30 bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5">⌘K</kbd>
            </>
          )}
        </button>

        <div className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-2.5 mb-2">
          {!collapsed && 'Workspace'}
        </div>

        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 group',
              collapsed && 'justify-center px-0',
              isActive(to)
                ? 'bg-[#00f0ff]/[0.08] text-[#00f0ff]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive(to) && 'drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]')} />
            {!collapsed && <span>{label}</span>}
            {isActive(to) && (
              <div className="absolute left-0 w-[3px] h-5 rounded-r-full bg-[#00f0ff]" />
            )}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-white/[0.04]" />
            <div className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-2.5 mb-2">
              {!collapsed && 'Admin'}
            </div>
            <Link
              to="/settings"
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-0',
                isActive('/settings')
                  ? 'bg-[#00f0ff]/[0.08] text-[#00f0ff]'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
              )}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings className={cn('h-[18px] w-[18px] shrink-0', isActive('/settings') && 'drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]')} />
              {!collapsed && <span>Settings</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        {/* User */}
        <div className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2', collapsed && 'justify-center px-0')}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#a855f7] to-[#00f0ff] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{user?.name}</p>
              <p className="text-[10px] text-white/30 truncate">{isAdmin ? 'Admin' : 'User'}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className={cn(
              'flex items-center justify-center rounded-lg p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all',
              collapsed ? 'w-full' : '',
            )}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
          {!collapsed && (
            <button
              onClick={logout}
              className="flex items-center gap-2 flex-1 rounded-lg px-2.5 py-2 text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
