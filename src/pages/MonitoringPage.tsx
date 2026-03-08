import { useState, useEffect } from 'react'
import { Activity, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { api } from '@/lib/api'
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

  // Mock flow statuses based on workflows
  const flowStatuses: FlowStatus[] = workflows
    .filter((w) => w.mode === 'automated' || w.mode === 'both')
    .map((w) => ({
      id: w.id,
      name: w.name,
      status: Math.random() > 0.1 ? 'idle' : 'running',
      lastRun: new Date(Date.now() - Math.random() * 3600000).toLocaleString(),
      nextRun: new Date(Date.now() + Math.random() * 3600000).toLocaleString(),
      totalRuns: Math.floor(Math.random() * 100) + 10,
      successfulRuns: Math.floor(Math.random() * 95) + 5,
      failedRuns: Math.floor(Math.random() * 10),
    }))

  // Mock run history
  const runHistory: RunHistory[] = [
    ...flowStatuses.slice(0, 8).map((flow, idx) => ({
      id: `${flow.id}-${idx}`,
      flowName: flow.name,
      flowId: flow.id,
      startTime: new Date(Date.now() - idx * 600000).toLocaleString(),
      duration: `${Math.floor(Math.random() * 60)}s`,
      itemsProcessed: Math.floor(Math.random() * 100) + 10,
      itemsSuccess: Math.floor(Math.random() * 95) + 5,
      itemsFailed: Math.floor(Math.random() * 10),
      status: (Math.random() > 0.15 ? 'done' : 'failed') as 'done' | 'failed',
    })),
  ]

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
                      {Math.round((flow.successfulRuns / flow.totalRuns) * 100)}%
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
