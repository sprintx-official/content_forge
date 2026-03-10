import { useState, useEffect, useMemo, useCallback } from 'react'
import { Activity, CheckCircle, AlertTriangle, Zap, RefreshCw, Rss, FileText, Clock, ChevronDown, ChevronRight, Play, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/timeAgo'
import type { Workflow } from '@/types'

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
  duration_ms: number | null
}

interface Diagnostics {
  subscribed_feeds: number
  active_feeds: number
  total_articles: number
  total_relevant: number
  pipeline_enabled: string | null
  pipeline_interval: string | null
}

interface PipelineInfo {
  runs: PipelineRun[]
  diagnostics: Diagnostics | null
}

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued',
  filter: 'Filtering articles',
  cluster: 'Clustering topics',
  dedup: 'Checking duplicates',
  research: 'Researching context',
  generate: 'Generating content',
  done: 'Completed',
  cancelled: 'Cancelled',
  error: 'Error',
}

const STEP_ORDER = ['queued', 'filter', 'cluster', 'dedup', 'research', 'generate', 'done']

function StepProgress({ currentStep, error }: { currentStep: string; error: string | null }) {
  if (error) return null
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  if (currentIndex < 0) return null

  return (
    <div className="flex items-center gap-1 mt-2">
      {STEP_ORDER.slice(1, -1).map((step, i) => {
        const stepIndex = i + 1
        const isActive = stepIndex === currentIndex
        const isDone = stepIndex < currentIndex
        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={`h-1.5 w-8 rounded-full transition-all ${
                isDone ? 'bg-[#10b981]' : isActive ? 'bg-[#10b981] animate-pulse' : 'bg-white/10'
              }`}
              title={STEP_LABELS[step]}
            />
          </div>
        )
      })}
      <span className="text-xs text-[#cbd5e1] ml-1.5">{STEP_LABELS[currentStep] || currentStep}</span>
    </div>
  )
}

function formatDuration(ms: number | null, startedAt: string, completedAt: string | null): string {
  if (ms) {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
  }
  if (completedAt && startedAt) {
    const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime()
    if (diff < 1000) return `${diff}ms`
    if (diff < 60000) return `${Math.round(diff / 1000)}s`
    return `${Math.round(diff / 60000)}m`
  }
  return '-'
}

export default function MonitoringPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [pipelineData, setPipelineData] = useState<Record<string, PipelineInfo>>({})
  const [selectedFlow, setSelectedFlow] = useState<string>('all')
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [triggeringAgent, setTriggeringAgent] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Monitoring — ContentForge'
    return () => { document.title = 'ContentForge' }
  }, [])

  const fetchWorkflows = useCallback(async () => {
    try {
      const data = await api.get<Workflow[]>('/api/workflows').catch(() => [])
      setWorkflows(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }, [])

  const fetchPipelineData = useCallback(async (wfs: Workflow[]) => {
    const automated = wfs.filter((w) => w.mode === 'automated' || w.mode === 'both')
    const data: Record<string, PipelineInfo> = {}
    await Promise.all(
      automated.map(async (w) => {
        if (w.pipelineAgentId) {
          try {
            const res = await api.get<PipelineInfo>(`/api/pipeline/${w.pipelineAgentId}`)
            data[w.id] = { runs: res.runs || [], diagnostics: res.diagnostics || null }
          } catch {
            data[w.id] = { runs: [], diagnostics: null }
          }
        }
      })
    )
    setPipelineData(data)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  useEffect(() => {
    if (workflows.length > 0) fetchPipelineData(workflows)
  }, [workflows, fetchPipelineData])

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      if (workflows.length > 0) fetchPipelineData(workflows)
    }, 15000)
    return () => clearInterval(interval)
  }, [workflows, fetchPipelineData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchWorkflows()
    const wfs = await api.get<Workflow[]>('/api/workflows').catch(() => [])
    await fetchPipelineData(Array.isArray(wfs) ? wfs : [])
    setRefreshing(false)
  }

  const handleTrigger = async (agentId: string) => {
    setTriggeringAgent(agentId)
    try {
      await api.post(`/api/pipeline/${agentId}`, {})
      // Refresh after trigger
      setTimeout(() => fetchPipelineData(workflows), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger pipeline')
    } finally {
      setTriggeringAgent(null)
    }
  }

  const automatedWorkflows = useMemo(
    () => workflows.filter((w) => w.mode === 'automated' || w.mode === 'both'),
    [workflows]
  )

  const allRuns = useMemo(() => {
    const runs: (PipelineRun & { flowName: string; flowId: string; agentId: string })[] = []
    for (const w of automatedWorkflows) {
      const pd = pipelineData[w.id]
      for (const run of (pd?.runs || [])) {
        runs.push({ ...run, flowName: w.name, flowId: w.id, agentId: w.pipelineAgentId || '' })
      }
    }
    return runs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [automatedWorkflows, pipelineData])

  const filteredRuns = selectedFlow === 'all' ? allRuns : allRuns.filter((r) => r.flowId === selectedFlow)

  const toggleExpand = (id: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Monitoring</h1>
          <p className="text-[#cbd5e1] text-sm">Automated pipeline status and execution history</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#94a3b8]">Updated {timeAgo(lastRefresh.toISOString())}</span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-[#cbd5e1] hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Flow Status Cards */}
      {automatedWorkflows.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-12 text-center">
          <Activity className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-[#cbd5e1] mb-1">No automated flows configured</p>
          <p className="text-xs text-[#94a3b8]">Create a workflow with "Automated" or "Both" mode in Settings &gt; Workflows</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {automatedWorkflows.map((w) => {
            const pd = pipelineData[w.id]
            const runs = pd?.runs || []
            const diag = pd?.diagnostics
            const latestRun = runs[0]
            const isRunning = latestRun && !latestRun.completed_at
            const hasError = latestRun?.error
            const successRuns = runs.filter((r) => r.completed_at && !r.error).length
            const failedRuns = runs.filter((r) => r.error).length
            const pipelineEnabled = diag?.pipeline_enabled === 'true'

            let statusColor = 'bg-[#94a3b8]'
            let statusLabel = 'No runs yet'
            let StatusIcon = Clock

            if (isRunning) {
              statusColor = 'bg-yellow-400 animate-pulse'
              statusLabel = STEP_LABELS[latestRun.current_step] || 'Running'
              StatusIcon = Zap
            } else if (hasError) {
              statusColor = 'bg-red-400'
              statusLabel = 'Last run failed'
              StatusIcon = AlertTriangle
            } else if (latestRun?.completed_at) {
              statusColor = 'bg-[#10b981]'
              statusLabel = `Completed ${timeAgo(latestRun.completed_at)}`
              StatusIcon = CheckCircle
            }

            return (
              <div
                key={w.id}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:bg-white/[0.05] transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{w.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                      <span className="text-xs text-[#cbd5e1]">{statusLabel}</span>
                    </div>
                  </div>
                  <StatusIcon className={`size-5 shrink-0 ${
                    isRunning ? 'text-yellow-400' : hasError ? 'text-red-400' : latestRun?.completed_at ? 'text-[#10b981]' : 'text-[#94a3b8]'
                  }`} />
                </div>

                {/* Step progress for running pipeline */}
                {isRunning && <StepProgress currentStep={latestRun.current_step} error={null} />}

                {/* Error message */}
                {hasError && !isRunning && (
                  <div className="mt-2 mb-3 px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 line-clamp-2">{latestRun.error}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[#94a3b8]">
                    <Rss className="size-3" />
                    <span>{diag?.active_feeds ?? '?'} active feeds</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#94a3b8]">
                    <FileText className="size-3" />
                    <span>{diag?.total_relevant ?? 0} relevant articles</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#94a3b8]">
                    <CheckCircle className="size-3" />
                    <span>{successRuns} successful</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#94a3b8]">
                    <AlertTriangle className="size-3" />
                    <span className={failedRuns > 0 ? 'text-red-400' : ''}>{failedRuns} failed</span>
                  </div>
                </div>

                {/* Schedule + last run */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#94a3b8]">
                  <span>
                    {pipelineEnabled
                      ? `Runs every ${diag?.pipeline_interval ? `${Math.round(Number(diag.pipeline_interval) / 60)}m` : `${w.frequency || '?'}m`}`
                      : 'Pipeline disabled'}
                  </span>
                  <span>
                    {latestRun?.started_at
                      ? `Last: ${timeAgo(latestRun.started_at)}`
                      : 'Never run'}
                  </span>
                </div>

                {/* Trigger button */}
                {w.pipelineAgentId && (
                  <button
                    onClick={() => handleTrigger(w.pipelineAgentId!)}
                    disabled={isRunning || triggeringAgent === w.pipelineAgentId}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-white/10 text-[#cbd5e1] hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="size-3" />
                    {isRunning ? 'Running...' : triggeringAgent === w.pipelineAgentId ? 'Triggering...' : 'Run Now'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Run History */}
      {automatedWorkflows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Run History</h2>
            {automatedWorkflows.length > 1 && (
              <select
                value={selectedFlow}
                onChange={(e) => setSelectedFlow(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              >
                <option value="all">All flows</option>
                {automatedWorkflows.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            )}
          </div>

          {filteredRuns.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-8 text-center">
              <Clock className="size-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-[#94a3b8]">No pipeline runs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRuns.map((run) => {
                const isRunning = !run.completed_at
                const hasFailed = !!run.error
                const isExpanded = expandedRuns.has(run.id)

                return (
                  <div
                    key={run.id}
                    className={`border rounded-xl transition-colors ${
                      hasFailed ? 'border-red-500/20 bg-red-500/[0.03]' : isRunning ? 'border-yellow-500/20 bg-yellow-500/[0.03]' : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    {/* Row header */}
                    <button
                      onClick={() => toggleExpand(run.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
                    >
                      {isExpanded ? <ChevronDown className="size-4 text-[#94a3b8] shrink-0" /> : <ChevronRight className="size-4 text-[#94a3b8] shrink-0" />}

                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isRunning ? 'bg-yellow-400 animate-pulse' : hasFailed ? 'bg-red-400' : 'bg-[#10b981]'
                      }`} />

                      {/* Flow name */}
                      <span className="text-sm font-medium text-white truncate min-w-0">{run.flowName}</span>

                      {/* Current step for running */}
                      {isRunning && (
                        <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full shrink-0">
                          {STEP_LABELS[run.current_step] || run.current_step}
                        </span>
                      )}

                      {/* Error badge */}
                      {hasFailed && !isRunning && (
                        <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <XCircle className="size-3" /> Failed
                        </span>
                      )}

                      {/* Success badge */}
                      {!isRunning && !hasFailed && (
                        <span className="text-xs text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <CheckCircle className="size-3" /> Done
                        </span>
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Summary stats */}
                      <div className="flex items-center gap-4 text-xs text-[#94a3b8] shrink-0">
                        {run.posts_generated > 0 && (
                          <span className="text-[#10b981]">{run.posts_generated} posts</span>
                        )}
                        <span>{run.articles_found} articles</span>
                        <span>{isRunning ? 'In progress' : formatDuration(run.duration_ms, run.started_at, run.completed_at)}</span>
                        <span>{timeAgo(run.started_at)}</span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 ml-7">
                        {/* Step progress */}
                        {isRunning && (
                          <div className="mb-3">
                            <StepProgress currentStep={run.current_step} error={run.error} />
                          </div>
                        )}

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                            <p className="text-xs text-[#94a3b8]">Articles Found</p>
                            <p className="text-lg font-semibold text-white">{run.articles_found}</p>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                            <p className="text-xs text-[#94a3b8]">Relevant</p>
                            <p className="text-lg font-semibold text-white">{run.articles_relevant}</p>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                            <p className="text-xs text-[#94a3b8]">Clusters</p>
                            <p className="text-lg font-semibold text-white">{run.clusters_found}</p>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                            <p className="text-xs text-[#94a3b8]">Posts Generated</p>
                            <p className="text-lg font-semibold text-[#10b981]">{run.posts_generated}</p>
                          </div>
                        </div>

                        {/* Timing */}
                        <div className="flex items-center gap-4 text-xs text-[#94a3b8] mb-2">
                          <span>Started: {new Date(run.started_at).toLocaleString()}</span>
                          {run.completed_at && <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>}
                          {run.duration_ms && <span>Duration: {formatDuration(run.duration_ms, run.started_at, run.completed_at)}</span>}
                        </div>

                        {/* Error message */}
                        {run.error && (
                          <div className="mt-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs font-medium text-red-400 mb-0.5">Error</p>
                            <p className="text-xs text-red-300/80 whitespace-pre-wrap break-words">{run.error}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
