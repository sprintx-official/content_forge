import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import AuthGuard from '@/components/auth/AuthGuard'
import AdminGuard from '@/components/auth/AdminGuard'
import { useAuthStore } from '@/stores/useAuthStore'

// Lazy load pages for code splitting
const ForgePage = lazy(() => import('@/pages/ForgePage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

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

  useEffect(() => {
    initialize()
  }, [initialize])

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
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes - redirect to dashboard if already logged in */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/forge" replace /> : <LoginPage />}
            />

            {/* Protected routes - require authentication */}
            <Route
              path="/forge"
              element={
                <AuthGuard>
                  <ForgePage />
                </AuthGuard>
              }
            />
            <Route
              path="/history"
              element={
                <AuthGuard>
                  <HistoryPage />
                </AuthGuard>
              }
            />
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
              element={<Navigate to={isAuthenticated ? '/forge' : '/login'} replace />}
            />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
