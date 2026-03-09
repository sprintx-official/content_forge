import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { ToastProvider } from '@/components/ui/Toast'
import AuthGuard from '@/components/auth/AuthGuard'
import AdminGuard from '@/components/auth/AdminGuard'
import { useAuthStore } from '@/stores/useAuthStore'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CommandPalette = lazy(() => import('@/components/CommandPalette'))
const FlowsPage = lazy(() => import('@/pages/FlowsPage'))
const CreateFlowPage = lazy(() => import('@/pages/CreateFlowPage'))
const FlowDetailPage = lazy(() => import('@/pages/FlowDetailPage'))
const MonitoringPage = lazy(() => import('@/pages/MonitoringPage'))

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#cbd5e1]">Loading...</p>
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#cbd5e1]">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ToastProvider>
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
            {/* Dashboard */}
            <Route
              path="/"
              element={
                <AuthGuard>
                  <DashboardPage />
                </AuthGuard>
              }
            />

            {/* Flows routes */}
            <Route
              path="/flows"
              element={
                <AuthGuard>
                  <FlowsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/flows/new"
              element={
                <AuthGuard>
                  <AdminGuard>
                    <CreateFlowPage />
                  </AdminGuard>
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
            <Route
              path="/monitoring"
              element={
                <AuthGuard>
                  <MonitoringPage />
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
              element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />}
            />
          </Routes>
        </Suspense>
      </Layout>
      </ToastProvider>
    </BrowserRouter>
  )
}
