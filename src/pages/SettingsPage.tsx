import { useAdminStore } from '@/stores/useAdminStore'
import { SETTINGS_NAV_SECTIONS } from '@/constants/settingsNav'
import { cn } from '@/lib/utils'
import TeamTab from '@/components/settings/TeamTab'
import AgentsTab from '@/components/settings/AgentsTab'
import WorkflowsTab from '@/components/settings/WorkflowsTab'
import ApiKeysTab from '@/components/settings/ApiKeysTab'
import PricingTab from '@/components/settings/PricingTab'
import ContentOptionsTab from '@/components/settings/ContentOptionsTab'
import NotificationsTab from '@/components/settings/NotificationsTab'
import WebhooksTab from '@/components/settings/WebhooksTab'
import BrandMonitorTab from '@/components/settings/BrandMonitorTab'
import TemplatesTab from '@/components/settings/TemplatesTab'

const FLAT_ITEMS = SETTINGS_NAV_SECTIONS.flatMap((s) => s.items)

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
                  ? 'bg-white/[0.06] text-[#10b981]'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area — full width since sidebar nav moved to main sidebar */}
      <div>
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'agents' && <AgentsTab />}
        {activeTab === 'workflows' && <WorkflowsTab />}
        {activeTab === 'content-options' && <ContentOptionsTab />}
        {activeTab === 'api-keys' && <ApiKeysTab />}
        {activeTab === 'pricing' && <PricingTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'webhooks' && <WebhooksTab />}
        {activeTab === 'brand-monitor' && <BrandMonitorTab />}
        {activeTab === 'image-templates' && <TemplatesTab />}
      </div>
    </div>
  )
}
