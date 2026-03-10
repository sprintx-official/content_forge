import { useEffect, useState } from 'react'
import type { AnyFlow } from '../../types'
import { Play } from 'lucide-react'
import { api } from '../../lib/api'

interface PipelineRun {
  id: string
  agent_id: string
  started_at: string
  completed_at: string | null
  current_step: string
  articles_found: number
  articles_relevant: number
  clusters_found: number
  posts_generated: number
  error: string | null
}

interface AgentSummary {
  id: string
  name: string
  runs: PipelineRun[]
  diagnostics: Record<string, unknown> | null
}

interface FlowMonitorTabProps {
  flow: AnyFlow
}

export function FlowMonitorTab({ flow }: FlowMonitorTabProps) {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningManual, setRunningManual] = useState<string | false>(false)

  const isAutomated =
    flow.type === 'news' || ('mode' in flow && (flow.mode === 'automated' || flow.mode === 'both'))

  // Only show all-agents view for system-news (no pipelineAgentId)
  const hasPipelineAgent = 'pipelineAgentId' in flow && !!(flow as any).pipelineAgentId
  const isAllAgentsView = flow.type === 'news' && !hasPipelineAgent && 'isSystem' in flow

  useEffect(() => {
    if (!isAutomated) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (isAllAgentsView) {
          // System news flow: load all agents with pipeline enabled
          const allAgents = await api.get<{ id: string; name: string }[]>('/api/agents')
          const agentSummaries: AgentSummary[] = []
          for (const agent of allAgents) {
            try {
              const res = await api.get<{ runs: PipelineRun[]; diagnostics: Record<string, unknown> }>(
                `/api/pipeline/${agent.id}`
              )
              if (res.runs.length > 0 || res.diagnostics?.pipeline_enabled === 'true') {
                agentSummaries.push({ id: agent.id, name: agent.name, runs: res.runs || [], diagnostics: res.diagnostics })
              }
            } catch {
              // Agent has no pipeline data — skip
            }
          }
          setAgents(agentSummaries)
        } else if (hasPipelineAgent) {
          // User workflow with specific agent: show only that agent
          const res = await api.get<{ runs: PipelineRun[] }>(
            `/api/pipeline/${(flow as any).pipelineAgentId}`
          )
          setRuns(res.runs || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [flow, isAutomated, isAllAgentsView, hasPipelineAgent])

  const handleManualRun = async (agentId?: string) => {
    const targetId = agentId || ('pipelineAgentId' in flow ? (flow as any).pipelineAgentId : null)
    if (!targetId) return

    try {
      setRunningManual(targetId)
      await api.post(`/api/pipeline/${targetId}`)
      const res = await api.get<{ runs: PipelineRun[] }>(`/api/pipeline/${targetId}`)
      if (isAllAgentsView) {
        setAgents(prev => prev.map(a => a.id === targetId ? { ...a, runs: res.runs || [] } : a))
      } else {
        setRuns(res.runs || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger pipeline')
    } finally {
      setRunningManual(false)
    }
  }

  if (!isAutomated) {
    return (
      <div className="p-4 text-center text-gray-400">
        Monitor is only available for automated flows
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-400">Loading pipeline status...</p>
      </div>
    )
  }

  const renderRuns = (pipelineRuns: PipelineRun[]) => (
    <div className="space-y-2">
      {pipelineRuns.map((run) => (
        <div key={run.id} className="p-3 border border-white/10 rounded bg-white/5">
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium text-sm text-white">
              {(run.current_step || 'unknown').charAt(0).toUpperCase() + (run.current_step || 'unknown').slice(1)}
            </p>
            <p className="text-xs text-gray-500">
              {run.started_at ? new Date(run.started_at).toLocaleString() : '-'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <p>Articles: {run.articles_relevant}/{run.articles_found}</p>
            <p>Clusters: {run.clusters_found}</p>
            <p>Posts: {run.posts_generated}</p>
            {run.error && <p className="text-red-400 col-span-2">{run.error}</p>}
          </div>
        </div>
      ))}
    </div>
  )

  // System news: show all agents with their pipeline runs
  if (isAllAgentsView) {
    return (
      <div className="space-y-6">
        <h3 className="font-semibold text-lg text-white">News Pipeline Monitor</h3>
        {error && <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-sm">{error}</div>}
        {agents.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No agents have pipeline enabled yet. Enable the pipeline in an agent's settings to start monitoring.
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="border border-white/10 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-white/5">
                <div>
                  <h4 className="font-medium text-white">{agent.name}</h4>
                  <p className="text-xs text-gray-400">{agent.runs.length} recent runs</p>
                </div>
                <button
                  onClick={() => handleManualRun(agent.id)}
                  disabled={runningManual === agent.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#10b981] text-[#0f172a] font-medium rounded hover:bg-[#10b981]/90 disabled:opacity-50 transition-colors"
                >
                  <Play size={14} />
                  {runningManual === agent.id ? 'Running...' : 'Run Now'}
                </button>
              </div>
              <div className="p-4">
                {agent.runs.length === 0 ? (
                  <p className="text-sm text-gray-500">No runs yet</p>
                ) : renderRuns(agent.runs)}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  // Standard single-agent monitor
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg text-white">Pipeline Status</h3>
        <button
          onClick={() => handleManualRun()}
          disabled={!!runningManual}
          className="flex items-center gap-2 px-3 py-2 bg-[#10b981] text-[#0f172a] font-medium rounded hover:bg-[#10b981]/90 disabled:opacity-50 transition-colors"
        >
          <Play size={16} />
          {runningManual ? 'Running...' : 'Run Now'}
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-sm">{error}</div>}

      {runs.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No pipeline runs yet. Click "Run Now" to start.
        </div>
      ) : renderRuns(runs)}
    </div>
  )
}
