import { useEffect, useState } from 'react'
import type { AnyFlow } from '../../types'
import { Play } from 'lucide-react'

interface PipelineRun {
  id: string
  agentId: string
  startedAt: string
  completedAt: string | null
  currentStep: string
  articlesFound: number
  articlesRelevant: number
  clustersFound: number
  postsGenerated: number
  error: string | null
}

interface FlowMonitorTabProps {
  flow: AnyFlow
}

export function FlowMonitorTab({ flow }: FlowMonitorTabProps) {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningManual, setRunningManual] = useState(false)

  // Only show monitor tab for automated/both flows
  const isAutomated =
    'mode' in flow && (flow.mode === 'automated' || flow.mode === 'both')

  useEffect(() => {
    if (!isAutomated || !('pipelineAgentId' in flow) || !flow.pipelineAgentId) {
      return
    }

    const fetchRuns = async () => {
      try {
        setLoading(true)
        setError(null)
        // TODO: Implement pipeline runs endpoint if needed
        setRuns([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchRuns()
  }, [flow, isAutomated])

  const handleManualRun = async () => {
    if (!('pipelineAgentId' in flow) || !flow.pipelineAgentId) return

    try {
      setRunningManual(true)
      // TODO: Implement manual pipeline trigger if needed
      // await fetch(`/api/pipeline/trigger`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ agentId: flow.pipelineAgentId }),
      // })
      setRunningManual(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setRunningManual(false)
    }
  }

  if (!isAutomated) {
    return (
      <div className="p-4 text-center text-gray-500">
        Monitor is only available for automated flows
      </div>
    )
  }

  if (loading) {
    return <div className="p-4 text-center">Loading pipeline status...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Pipeline Status</h3>
        <button
          onClick={handleManualRun}
          disabled={runningManual}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Play size={16} />
          {runningManual ? 'Running...' : 'Run Now'}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>}

      {runs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No pipeline runs yet. Click "Run Now" to start.
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="p-3 border rounded bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-sm">
                  {run.currentStep.charAt(0).toUpperCase() + run.currentStep.slice(1)}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(run.startedAt).toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Articles: {run.articlesRelevant}/{run.articlesFound}</p>
                <p>Clusters: {run.clustersFound}</p>
                <p>Posts: {run.postsGenerated}</p>
                {run.error && <p className="text-red-600">{run.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
