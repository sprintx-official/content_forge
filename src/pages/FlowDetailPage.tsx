import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import type { AnyFlow, Workflow, User } from '../types'
import { SYSTEM_FLOWS } from '../constants/systemFlows'
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
          const res = await fetch(`/api/workflows/${flowId}`)
          if (!res.ok) {
            if (res.status === 404) {
              setError('Flow not found')
            } else {
              throw new Error('Failed to fetch flow')
            }
            return
          }
          const workflow: Workflow = await res.json()
          setFlow(workflow)
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
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const user: User = await res.json()
          setCurrentUser(user)
        }
      } catch {
        // User not authenticated or endpoint doesn't exist
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return <div className="p-4 text-center">Loading flow...</div>
  }

  if (error || !flow) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-red-600">Error: {error || 'Flow not found'}</div>
        <button
          onClick={() => navigate('/flows')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Flows
        </button>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={() => navigate('/flows')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Flows
        </button>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{flow.name}</h1>
          <p className="text-gray-600 mb-4">{flow.description}</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 font-medium">
              {flow.type}
            </span>
            <span className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 font-medium">
              {flow.mode}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg">
          <div className="border-b border-gray-200 flex gap-2 px-6">
            {tabItems.map((t) => (
              <button
                key={t.id}
                onClick={() => setSearchParams({ tab: t.id })}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
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
