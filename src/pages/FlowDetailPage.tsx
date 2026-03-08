import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import type { AnyFlow, Workflow, User } from '../types'
import { SYSTEM_FLOWS } from '../constants/systemFlows'
import { api } from '../lib/api'
import { formatFrequency } from '../lib/frequency'
import { FlowRunTab } from '../components/flows/FlowRunTab'
import { FlowHistoryTab } from '../components/flows/FlowHistoryTab'
import { FlowMonitorTab } from '../components/flows/FlowMonitorTab'
import { FlowSettingsTab } from '../components/flows/FlowSettingsTab'
import { ArrowLeft } from 'lucide-react'

type TabName = 'run' | 'history' | 'monitor' | 'settings'

function FlowDetailPage() {
  const { flowId } = useParams<{ flowId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [flow, setFlow] = useState<AnyFlow | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tab = (searchParams.get('tab') || 'run') as TabName

  // Fetch flow data (system or database)
  useEffect(() => {
    const fetchFlow = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if it's a system flow
        const systemFlow = SYSTEM_FLOWS.find((f) => f.id === flowId)
        if (systemFlow) {
          setFlow(systemFlow)
          return
        }

        // Otherwise fetch from database
        if (flowId) {
          try {
            const workflow = await api.get<Workflow>(`/api/workflows/${flowId}`)
            setFlow(workflow)
          } catch (err) {
            if (err instanceof Error && err.message.includes('404')) {
              setError('Flow not found')
            } else {
              throw err
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchFlow()
  }, [flowId])

  // Fetch current user for admin checks
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await api.get<User>('/api/auth/me')
        setCurrentUser(user)
      } catch {
        // User not authenticated or endpoint doesn't exist
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading flow...</p>
        </div>
      </div>
    )
  }

  if (error || !flow) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg mb-4">
            Error: {error || 'Flow not found'}
          </div>
          <button
            onClick={() => navigate('/flows')}
            className="px-4 py-2 bg-[#10b981] text-[#0f172a] font-medium rounded hover:bg-[#10b981]/90 transition-colors"
          >
            Back to Flows
          </button>
        </div>
      </div>
    )
  }

  const isAdmin = currentUser?.role === 'admin'
  const isSystem = 'isSystem' in flow && flow.isSystem
  const isAutomated = 'mode' in flow && (flow.mode === 'automated' || flow.mode === 'both')

  // Determine which tabs to show
  const showMonitor = !isSystem && isAutomated
  const showSettings = !isSystem && isAdmin

  const tabItems: Array<{ id: TabName; label: string }> = [
    { id: 'run', label: 'Run' },
    { id: 'history', label: 'History' },
    ...(showMonitor ? [{ id: 'monitor' as TabName, label: 'Monitor' }] : []),
    ...(showSettings ? [{ id: 'settings' as TabName, label: 'Settings' }] : []),
  ]

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={() => navigate('/flows')}
          className="flex items-center gap-2 text-[#10b981] hover:text-[#10b981]/80 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Flows
        </button>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{flow.name}</h1>
          <p className="text-gray-400 mb-4">{flow.description}</p>
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 text-sm rounded font-medium" style={{ backgroundColor: '#10b981' + '30', color: '#10b981' }}>
              {flow.type}
            </span>
            <span className="px-3 py-1 text-sm rounded font-medium bg-white/10 text-white/70">
              {flow.mode}
            </span>
            {'frequency' in flow && flow.frequency && (
              <span className="px-3 py-1 text-sm rounded font-medium bg-purple-500/20 text-purple-300">
                Every {formatFrequency(flow.frequency)}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-lg overflow-hidden">
          <div className="border-b border-white/10 flex gap-2 px-6">
            {tabItems.map((t) => (
              <button
                key={t.id}
                onClick={() => setSearchParams({ tab: t.id })}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-[#10b981] text-[#10b981]'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {tab === 'run' && <FlowRunTab flow={flow} workflowId={flow.id} />}
            {tab === 'history' && <FlowHistoryTab flow={flow} workflowId={flow.id} />}
            {tab === 'monitor' && showMonitor && <FlowMonitorTab flow={flow} />}
            {tab === 'settings' && showSettings && (
              <FlowSettingsTab flow={flow} isAdmin={isAdmin} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlowDetailPage
