import { api } from '@/lib/api'
import type { User, UserRole } from '@/types'

export async function getAllMembers(): Promise<User[]> {
  return api.get<User[]>('/api/team')
}

export async function createMember(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<User> {
  return api.post<User>('/api/team', { name, email, password, role })
}

export async function changeRole(userId: string, newRole: UserRole): Promise<User> {
  return api.patch<User>(`/api/team/${userId}/role`, { role: newRole })
}

export async function removeMember(userId: string): Promise<void> {
  await api.delete(`/api/team/${userId}`)
}

export async function getAdminCount(): Promise<number> {
  const data = await api.get<{ count: number }>('/api/team/admin-count')
  return data.count
}
