import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Zap,
  Workflow,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Command,
  ChevronDown,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useForgeStore } from '@/stores/useForgeStore'
import { useAdminStore } from '@/stores/useAdminStore'
import { SETTINGS_NAV_SECTIONS } from '@/constants/settingsNav'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/flows', label: 'Flows', icon: Workflow, section: 'main' },
  { to: '/monitoring', label: 'Monitoring', icon: Activity, section: 'main' },
]

export default function Sidebar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore()
  const { activeTab, setActiveTab } = useAdminStore()
  const resetForge = useForgeStore((s) => s.reset)
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cf_sidebar') === 'collapsed')

  // State for each admin group
  const [expandedGroups, setExpandedGroups] = useState(() => ({
    Content: localStorage.getItem('cf_content_expanded') === 'true',
    Configuration: localStorage.getItem('cf_config_expanded') === 'true',
    Integrations: localStorage.getItem('cf_integrations_expanded') === 'true',
    Team: localStorage.getItem('cf_team_expanded') === 'true',
  }))

  const isActive = (path: string) => location.pathname === path

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('cf_sidebar', next ? 'collapsed' : 'expanded')
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [group]: !prev[group as keyof typeof prev] }
      localStorage.setItem(`cf_${group.toLowerCase()}_expanded`, String(next[group as keyof typeof next]))
      return next
    })
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
        <Link to="/" onClick={resetForge} className="flex items-center gap-2.5 group min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-white/70" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-white/90 truncate">
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
                ? 'bg-white/[0.06] text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{label}</span>}
            {isActive(to) && (
              <div className="absolute left-0 w-[2px] h-4 rounded-r-full bg-white/60" />
            )}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-white/[0.04]" />
            <div className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-2.5 mb-2">
              {!collapsed && 'Admin'}
            </div>

            {/* Admin groups */}
            <div className="space-y-1">
              {/* Content group */}
              <button
                onClick={() => toggleGroup('Content')}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 w-full',
                  collapsed && 'justify-center px-0',
                  'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                )}
                title={collapsed ? 'Content' : undefined}
              >
                {!collapsed && <span className="flex-1 text-left">Content</span>}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      expandedGroups.Content && 'rotate-180',
                    )}
                  />
                )}
              </button>
              {expandedGroups.Content && !collapsed && (
                <div className="mt-1 space-y-0.5 ml-2 border-l border-white/[0.05] pl-2">
                  {SETTINGS_NAV_SECTIONS.find(s => s.label === 'General')?.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id)
                        navigate('/settings')
                      }}
                      className={cn(
                        'flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-xs transition-all',
                        activeTab === id && location.pathname === '/settings'
                          ? 'bg-white/[0.08] text-[#10b981]'
                          : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Configuration group */}
              <button
                onClick={() => toggleGroup('Configuration')}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 w-full',
                  collapsed && 'justify-center px-0',
                  'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                )}
                title={collapsed ? 'Configuration' : undefined}
              >
                {!collapsed && <span className="flex-1 text-left">Configuration</span>}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      expandedGroups.Configuration && 'rotate-180',
                    )}
                  />
                )}
              </button>
              {expandedGroups.Configuration && !collapsed && (
                <div className="mt-1 space-y-0.5 ml-2 border-l border-white/[0.05] pl-2">
                  {SETTINGS_NAV_SECTIONS.find(s => s.label === 'Configuration')?.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id)
                        navigate('/settings')
                      }}
                      className={cn(
                        'flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-xs transition-all',
                        activeTab === id && location.pathname === '/settings'
                          ? 'bg-white/[0.08] text-[#10b981]'
                          : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Integrations group */}
              <button
                onClick={() => toggleGroup('Integrations')}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 w-full',
                  collapsed && 'justify-center px-0',
                  'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                )}
                title={collapsed ? 'Integrations' : undefined}
              >
                {!collapsed && <span className="flex-1 text-left">Integrations</span>}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      expandedGroups.Integrations && 'rotate-180',
                    )}
                  />
                )}
              </button>
              {expandedGroups.Integrations && !collapsed && (
                <div className="mt-1 space-y-0.5 ml-2 border-l border-white/[0.05] pl-2">
                  {SETTINGS_NAV_SECTIONS.find(s => s.label === 'Integrations')?.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id)
                        navigate('/settings')
                      }}
                      className={cn(
                        'flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-xs transition-all',
                        activeTab === id && location.pathname === '/settings'
                          ? 'bg-white/[0.08] text-[#10b981]'
                          : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Team group */}
              <button
                onClick={() => toggleGroup('Team')}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 w-full',
                  collapsed && 'justify-center px-0',
                  'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                )}
                title={collapsed ? 'Team' : undefined}
              >
                {!collapsed && <span className="flex-1 text-left">Team</span>}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      expandedGroups.Team && 'rotate-180',
                    )}
                  />
                )}
              </button>
              {expandedGroups.Team && !collapsed && (
                <div className="mt-1 space-y-0.5 ml-2 border-l border-white/[0.05] pl-2">
                  <button
                    onClick={() => {
                      setActiveTab('team')
                      navigate('/settings')
                    }}
                    className={cn(
                      'flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-xs transition-all',
                      activeTab === 'team' && location.pathname === '/settings'
                        ? 'bg-white/[0.08] text-[#10b981]'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]',
                    )}
                  >
                    <div className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left">Members</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        {/* User */}
        <div className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2', collapsed && 'justify-center px-0')}>
          <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-[11px] font-medium text-white/60 shrink-0">
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
