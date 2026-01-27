import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin)

  if (!isAdmin) {
    return <Navigate to="/forge" replace />
  }

  return <>{children}</>
}
