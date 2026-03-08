import { useState, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/useAuthStore'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const showSidebar = isAuthenticated && !isLoginPage

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('cf_sidebar') === 'collapsed'
  )

  // Listen for sidebar toggle via storage event or custom event
  useEffect(() => {
    const check = () => setSidebarCollapsed(localStorage.getItem('cf_sidebar') === 'collapsed')
    // Poll periodically is simplest since sidebar toggle is in same window
    const interval = setInterval(check, 200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
      {showSidebar && <Sidebar />}

      <main
        className="min-h-screen transition-[margin] duration-300"
        style={{
          marginLeft: showSidebar ? (sidebarCollapsed ? 68 : 220) : 0,
        }}
      >
        <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
