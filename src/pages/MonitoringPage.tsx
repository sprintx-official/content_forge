import { useState, useEffect, useMemo } from 'react'
import { Activity, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/timeAgo'
import type { Workflow } from '@/types'

interface FlowStatus {
  id: string
  name: string
  status: 'running' | 'idle' | 'error'
  lastRun?: string
  nextRun?: string
  totalRuns: number
  successfulRuns: number
  failedRuns: number
}

interface RunHistory {
  id: string
  flowName: string
  flowId: string
  startTime: string
  duration: string
  itemsProcessed: number
  itemsSuccess: number
  itemsFailed: number
  status: 'done' | 'failed' | 'running'
  message?: string
}

export default function MonitoringPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedFlow, setSelectedFlow] = useState<string>('all')

  useEffect(() => {
    document.title = 'Monitoring — ContentForge'
    return () => { document.title = 'ContentForge' }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.get<Workflow[]>('/api/workflows').catch(() => [])
        setWorkflows(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch workflows:', err)
      }
    }

    fetchData()
  }, [])

  const [pipelineData, setPipelineData] = useState<Record<string, { status: string; runs: any[] }>>({})

  useEffect(() => {
    const fetchPipelineData = async () => {
      const automated = workflows.filter((w) => w.mode === 'automated' || w.mode === 'both')
      const data: Record<string, { status: string; runs: any[] }> = {}
      for (const w of automated) {
        if (w.pipelineAgentId) {
          try {
            const res = await api.get<{ status: string; runs: any[] }>(`/api/pipeline/${w.pipelineAgentId}`)
            data[w.id] = res
          } catch {
            data[w.id] = { status: 'idle', runs: [] }
          }
        }
      }
      setPipelineData(data)
    }
    if (workflows.length > 0) fetchPipelineData()
  }, [workflows])

  const flowStatuses: FlowStatus[] = useMemo(() =>
    workflows
      .filter((w) => w.mode === 'automated' || w.mode === 'both')
      .map((w) => {
        const pd = pipelineData[w.id]
        const runs = pd?.runs || []
        const totalRuns = runs.length
        const successfulRuns = runs.filter((r: any) => r.completedAt && !r.error).length
        const failedRuns = runs.filter((r: any) => r.error).length
        const lastRun = runs[0]
        return {
          id: w.id,
          name: w.name,
          status: (pd?.status === 'running' ? 'running' : totalRuns > 0 && failedRuns === totalRuns ? 'error' : 'idle') as 'running' | 'idle' | 'error',
          lastRun: lastRun?.startedAt ? timeAgo(lastRun.startedAt) : 'Never',
          nextRun: w.frequency ? `Every ${w.frequency}min` : 'Manual only',
          totalRuns,
          successfulRuns,
          failedRuns,
        }
      }),
    [workflows, pipelineData],
  )

  const runHistory: RunHistory[] = useMemo(() => {
    const allRuns: RunHistory[] = []
    for (const w of workflows.filter((w) => w.mode === 'automated' || w.mode === 'both')) {
      const pd = pipelineData[w.id]
      for (const run of (pd?.runs || [])) {
        allRuns.push({
          id: run.id,
          flowName: w.name,
          flowId: w.id,
          startTime: run.startedAt ? timeAgo(run.startedAt) : '-',
          duration: run.completedAt && run.startedAt
            ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
            : run.completedAt ? '-' : 'Running...',
          itemsProcessed: run.articlesFound ?? 0,
          itemsSuccess: run.postsGenerated ?? 0,
          itemsFailed: run.error ? 1 : 0,
          status: !run.completedAt ? 'running' : run.error ? 'failed' : 'done',
        })
      }
    }
    return allRuns.sort((a, b) => b.id.localeCompare(a.id))
  }, [workflows, pipelineData])

  const filteredHistory =
    selectedFlow === 'all' ? runHistory : runHistory.filter((h) => h.flowId === selectedFlow)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Flow Monitoring</h1>
          <p className="text-gray-400">Track automated flows, agents, and execution history</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-400">Live</span>
        </div>
      </div>

      {/* Flow Status Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Automated Flows Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flowStatuses.length === 0 ? (
            <div className="col-span-full bg-white/[0.03] border border-white/10 rounded-lg p-8 text-center">
              <Activity className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-gray-400">No automated flows configured yet</p>
            </div>
          ) : (
            flowStatuses.map((flow) => (
              <div
                key={flow.id}
                className="bg-white/[0.03] border border-white/10 rounded-lg p-5 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white truncate">{flow.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          flow.status === 'running'
                            ? 'bg-yellow-400 animate-pulse'
                            : flow.status === 'error'
                              ? 'bg-red-400'
                              : 'bg-green-400'
                        }`}
                      />
                      <span className="text-xs text-gray-400 capitalize">{flow.status}</span>
                    </div>
                  </div>
                  {flow.status === 'running' ? (
                    <Zap className="h-5 w-5 text-yellow-400" />
                  ) : flow.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last run</span>
                    <span className="text-gray-300">{flow.lastRun}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total runs</span>
                    <span className="text-gray-300">{flow.totalRuns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Success rate</span>
                    <span className="text-green-400">
                      {flow.totalRuns > 0 ? Math.round((flow.successfulRuns / flow.totalRuns) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/5">
                    <span className="text-gray-500">Failed runs</span>
                    <span className={flow.failedRuns > 0 ? 'text-red-400' : 'text-gray-300'}>
                      {flow.failedRuns}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Run History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Run History</h2>
          <select
            value={selectedFlow}
            onChange={(e) => setSelectedFlow(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
          >
            <option value="all">All flows</option>
            {flowStatuses.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Flow
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Started
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                    Processed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                    Success
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                    Failed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No runs found
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-white truncate max-w-xs block">
                          {run.flowName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{run.startTime}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{run.duration}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-300">
                        {run.itemsProcessed}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-400">
                        {run.itemsSuccess}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={run.itemsFailed > 0 ? 'text-red-400' : 'text-gray-400'}>
                          {run.itemsFailed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            run.status === 'done'
                              ? 'bg-green-500/20 text-green-400'
                              : run.status === 'running'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {run.status === 'done' ? '✓ Done' : run.status === 'running' ? '⟳ Running' : '✕ Failed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
