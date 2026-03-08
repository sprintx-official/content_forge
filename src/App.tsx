import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import AuthGuard from '@/components/auth/AuthGuard'
import AdminGuard from '@/components/auth/AdminGuard'
import { useAuthStore } from '@/stores/useAuthStore'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CommandPalette = lazy(() => import('@/components/CommandPalette'))
const FlowsPage = lazy(() => import('@/pages/FlowsPage'))
const FlowDetailPage = lazy(() => import('@/pages/FlowDetailPage'))

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#9ca3af]">Loading...</p>
      </div>
    </div>
  )
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const loadOptions = useForgeOptionsStore((s) => s.loadOptions)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Load forge options (content types, tones, audiences) once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadOptions()
    }
  }, [isAuthenticated, loadOptions])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9ca3af]">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Layout>
        {isAuthenticated && (
          <Suspense fallback={null}>
            <CommandPalette />
          </Suspense>
        )}
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes - redirect to dashboard if already logged in */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/flows" replace /> : <LoginPage />}
            />

            {/* Protected routes - require authentication */}
            {/* New Flows routes */}
            <Route
              path="/flows"
              element={
                <AuthGuard>
                  <FlowsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/flows/:flowId"
              element={
                <AuthGuard>
                  <FlowDetailPage />
                </AuthGuard>
              }
            />

            {/* Legacy routes - redirect to new flows */}
            <Route
              path="/forge"
              element={
                <AuthGuard>
                  <Navigate to="/flows/system-write" replace />
                </AuthGuard>
              }
            />
            <Route
              path="/newsroom"
              element={
                <AuthGuard>
                  <Navigate to="/flows" replace />
                </AuthGuard>
              }
            />
            <Route
              path="/history"
              element={
                <AuthGuard>
                  <Navigate to="/flows/system-write?tab=history" replace />
                </AuthGuard>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <AuthGuard>
                  <AdminGuard>
                    <SettingsPage />
                  </AdminGuard>
                </AuthGuard>
              }
            />

            {/* Root redirects based on auth state */}
            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? '/flows' : '/login'} replace />}
            />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
