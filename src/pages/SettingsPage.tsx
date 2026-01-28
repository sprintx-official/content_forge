import { Users, Bot, GitBranch, Key, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/stores/useAdminStore'
import TeamTab from '@/components/settings/TeamTab'
import AgentsTab from '@/components/settings/AgentsTab'
import WorkflowsTab from '@/components/settings/WorkflowsTab'
import ApiKeysTab from '@/components/settings/ApiKeysTab'
import PricingTab from '@/components/settings/PricingTab'

const TABS = [
  { id: 'team' as const, label: 'Team', icon: Users },
  { id: 'agents' as const, label: 'Agents', icon: Bot },
  { id: 'workflows' as const, label: 'Workflows', icon: GitBranch },
  { id: 'api-keys' as const, label: 'API Keys', icon: Key },
  { id: 'pricing' as const, label: 'Pricing', icon: DollarSign },
]

export default function SettingsPage() {
  const { activeTab, setActiveTab } = useAdminStore()

  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-[#9ca3af]">
            Manage your team, configure agents, and build workflows.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                activeTab === id
                  ? 'bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                  : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-white/5',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'agents' && <AgentsTab />}
          {activeTab === 'workflows' && <WorkflowsTab />}
          {activeTab === 'api-keys' && <ApiKeysTab />}
          {activeTab === 'pricing' && <PricingTab />}
        </div>
      </div>
    </div>
  )
}
