import { Users, Bot, GitBranch, Key, DollarSign, SlidersHorizontal, Bell, Webhook, Eye, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStore, type AdminTab } from '@/stores/useAdminStore'
import TeamTab from '@/components/settings/TeamTab'
import AgentsTab from '@/components/settings/AgentsTab'
import WorkflowsTab from '@/components/settings/WorkflowsTab'
import ApiKeysTab from '@/components/settings/ApiKeysTab'
import PricingTab from '@/components/settings/PricingTab'
import ContentOptionsTab from '@/components/settings/ContentOptionsTab'
import NotificationsTab from '@/components/settings/NotificationsTab'
import WebhooksTab from '@/components/settings/WebhooksTab'
import BrandMonitorTab from '@/components/settings/BrandMonitorTab'

type NavItem = { id: AdminTab; label: string; icon: LucideIcon }

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
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

const FLAT_ITEMS = NAV_SECTIONS.flatMap((s) => s.items)

export default function SettingsPage() {
  const { activeTab, setActiveTab } = useAdminStore()

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white/90">Settings</h1>
        <p className="text-sm text-white/40 mt-1">
          Manage your team, configure agents, and build workflows.
        </p>
      </div>

      {/* Mobile: horizontal scrollable nav */}
      <div className="md:hidden mb-6 -mx-2 px-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {FLAT_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors',
                activeTab === id
                  ? 'bg-white/[0.06] text-[#00f0ff]'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: sidebar + content layout */}
      <div className="flex gap-8">
        {/* Sidebar nav — hidden on mobile */}
        <nav className="hidden md:block w-52 shrink-0">
          <div className="sticky top-6 flex flex-col gap-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <span className="block text-[11px] font-medium uppercase tracking-wider text-white/30 mb-2 px-3">
                  {section.label}
                </span>
                <div className="flex flex-col gap-0.5">
                  {section.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-r-lg px-3 py-2 text-sm transition-colors text-left w-full',
                        activeTab === id
                          ? 'bg-white/[0.06] text-white border-l-2 border-[#00f0ff]'
                          : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04] border-l-2 border-transparent',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Content area — no border/bg wrapper */}
        <div className="flex-1 min-w-0">
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'agents' && <AgentsTab />}
          {activeTab === 'workflows' && <WorkflowsTab />}
          {activeTab === 'content-options' && <ContentOptionsTab />}
          {activeTab === 'api-keys' && <ApiKeysTab />}
          {activeTab === 'pricing' && <PricingTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'webhooks' && <WebhooksTab />}
          {activeTab === 'brand-monitor' && <BrandMonitorTab />}
        </div>
      </div>
    </div>
  )
}
