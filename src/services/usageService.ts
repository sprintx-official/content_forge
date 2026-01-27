import { api } from '@/lib/api'
import type { UsageStats } from '@/types'

export async function getUsageStats(): Promise<UsageStats> {
  return api.get<UsageStats>('/api/keys/usage')
}
