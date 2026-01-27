import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Zap,
  Hammer,
  Clock,
  LogIn,
  LogOut,
  Menu,
  X,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useForgeStore } from '@/stores/useForgeStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/forge', label: 'Forge', icon: Hammer },
  { to: '/history', label: 'History', icon: Clock },
]

export default function Header() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore()
  const resetForge = useForgeStore((s) => s.reset)
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to={isAuthenticated ? '/forge' : '/login'} onClick={resetForge} className="flex items-center gap-2 group">
          <Zap className="h-6 w-6 text-[#00f0ff] transition-transform duration-200 group-hover:scale-110" />
          <span
            className="text-xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ContentForge
          </span>
        </Link>

        {/* Desktop Nav - only show when authenticated */}
        {isAuthenticated && (
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive(to)
                    ? 'text-[#00f0ff] bg-[#00f0ff]/10'
                    : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/settings"
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive('/settings')
                    ? 'text-[#00f0ff] bg-[#00f0ff]/10'
                    : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-white/5'
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            )}
          </nav>
        )}

        {/* Desktop Auth */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-[#9ca3af]">
                {user?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="inline-flex items-center justify-center rounded-lg p-2 text-[#9ca3af] transition-colors hover:bg-white/5 hover:text-[#f9fafb] md:hidden"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#0a0e1a]/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-4 py-3">
            {isAuthenticated &&
              navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(to)
                      ? 'text-[#00f0ff] bg-[#00f0ff]/10'
                      : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-white/5'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            {isAuthenticated && isAdmin && (
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive('/settings')
                    ? 'text-[#00f0ff] bg-[#00f0ff]/10'
                    : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-white/5'
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            )}

            <div className="my-2 border-t border-white/10" />

            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 text-sm text-[#9ca3af]">
                  Signed in as <span className="text-[#f9fafb]">{user?.name}</span>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[#9ca3af] transition-colors hover:bg-white/5 hover:text-[#f9fafb]"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[#9ca3af] transition-colors hover:bg-white/5 hover:text-[#f9fafb]"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
