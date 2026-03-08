import { Users, Bot, GitBranch, Key, DollarSign, SlidersHorizontal, Bell, Webhook, Eye, type LucideIcon } from 'lucide-react'
import type { AdminTab } from '@/stores/useAdminStore'

export type NavItem = { id: AdminTab; label: string; icon: LucideIcon }

export const SETTINGS_NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [
      { id: 'team', label: 'Team', icon: Users },
      { id: 'agents', label: 'Agents', icon: Bot },
      { id: 'workflows', label: 'Workflows', icon: GitBranch },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { id: 'content-options', label: 'Content Options', icon: SlidersHorizontal },
      { id: 'api-keys', label: 'API Keys', icon: Key },
      { id: 'pricing', label: 'Pricing', icon: DollarSign },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'webhooks', label: 'Webhooks', icon: Webhook },
      { id: 'brand-monitor', label: 'Brand Monitor', icon: Eye },
    ],
  },
]
