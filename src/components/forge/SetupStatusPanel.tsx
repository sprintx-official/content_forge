import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/useAuthStore'

interface SetupStatus {
  hasApiKeys: boolean
  hasAgents: boolean
  hasWorkflows: boolean
}

export default function SetupStatusPanel() {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cf_setup_dismissed') === '1')
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    if (user?.role !== 'admin') return
    Promise.all([
      api.get<{ provider: string }[]>('/api/api-keys').catch(() => []),
      api.get<{ id: string }[]>('/api/agents').catch(() => []),
      api.get<{ id: string }[]>('/api/workflows').catch(() => []),
    ]).then(([keys, agents, workflows]) => {
      const keysArr = Array.isArray(keys) ? keys : []
      const agentsArr = Array.isArray(agents) ? agents : []
      const workflowsArr = Array.isArray(workflows) ? workflows : []
      setStatus({
        hasApiKeys: keysArr.some((k: Record<string, unknown>) => k.isActive),
        hasAgents: agentsArr.length > 0,
        hasWorkflows: workflowsArr.length > 0,
      })
    })
  }, [user])

  if (!status || user?.role !== 'admin') return null

  const allGood = status.hasApiKeys && status.hasAgents && status.hasWorkflows
  if (allGood && collapsed) return null

  const items = [
    { ok: status.hasApiKeys, label: 'API Keys configured', link: '/settings', action: 'Add an API key to enable AI models' },
    { ok: status.hasAgents, label: 'Agents created', link: '/settings', action: 'Create an agent to start generating content' },
    { ok: status.hasWorkflows, label: 'Workflows created', link: '/settings', action: 'Create a workflow to chain agents together' },
  ]

  const incomplete = items.filter(i => !i.ok)

  if (allGood) {
    return null
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden mb-6">
      <button
        onClick={() => {
          const next = !collapsed
          setCollapsed(next)
          localStorage.setItem('cf_setup_dismissed', next ? '1' : '0')
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-[#6366f1]" />
          <span className="text-sm font-medium text-[#f8fafc]">
            Setup ({items.filter(i => i.ok).length}/{items.length} complete)
          </span>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-[#cbd5e1]" /> : <ChevronUp className="h-4 w-4 text-[#cbd5e1]" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-2">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-3">
              {item.ok ? (
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${item.ok ? 'text-emerald-400' : 'text-[#f8fafc]'}`}>{item.label}</span>
                {!item.ok && (
                  <a href={item.link} className="text-xs text-[#10b981] hover:underline ml-2">
                    {item.action} →
                  </a>
                )}
              </div>
            </div>
          ))}
          {incomplete.length > 0 && (
            <p className="text-[10px] text-[#cbd5e1] mt-1">Complete setup in Settings to unlock all features.</p>
          )}
        </div>
      )}
    </div>
  )
}
