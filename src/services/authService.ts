import { api, setToken, clearToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthResponse {
  token: string
  user: User
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  const data = await api.post<AuthResponse>('/api/auth/login', { email, password })
  setToken(data.token)
  return { user: data.user }
}

export async function getMe(): Promise<User> {
  return api.get<User>('/api/auth/me')
}

export function logout(): void {
  clearToken()
}

export function hasToken(): boolean {
  return !!localStorage.getItem('cf_jwt')
}
