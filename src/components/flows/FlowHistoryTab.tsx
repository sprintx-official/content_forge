import { useEffect, useState } from 'react'
import type { AnyFlow, HistoryItem } from '../../types'
import { CoveragePostCard } from './CoveragePostCard'
import { api } from '../../lib/api'

interface CoveragePost {
  id: string
  agentId: string
  title: string
  summary: string
  status: string
  createdAt: string
  agentName?: string
}

interface FlowHistoryTabProps {
  flow: AnyFlow
  workflowId: string
}

export function FlowHistoryTab({ flow, workflowId }: FlowHistoryTabProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [coveragePosts, setCoveragePosts] = useState<CoveragePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch history items for manual runs
        const historyData = await api.get<{ data: HistoryItem[]; pagination: unknown }>(
          `/api/history?workflowId=${workflowId}&limit=50`
        )
        setHistoryItems(historyData.data || [])

        // Fetch coverage posts if it's an automated/both flow
        if (
          'mode' in flow &&
          (flow.mode === 'automated' || flow.mode === 'both')
        ) {
          try {
            const coverageData = await api.get<{ posts: any[] }>(
              `/api/coverage?workflowId=${workflowId}&limit=50`
            )
            setCoveragePosts(coverageData.posts || [])
          } catch {
            // Coverage posts might not be available
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [flow, workflowId])

  if (loading) {
    return <div className="p-4 text-center">Loading history...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>
  }

  const hasManualRuns = historyItems.length > 0
  const hasAutomatedPosts = coveragePosts.length > 0

  if (!hasManualRuns && !hasAutomatedPosts) {
    return <div className="p-4 text-gray-500 text-center">No history yet</div>
  }

  return (
    <div className="space-y-6 p-4">
      {hasManualRuns && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Manual Runs</h3>
          <div className="space-y-2">
            {historyItems.map((item) => (
              <div key={item.id} className="p-3 border rounded bg-gray-50">
                <p className="font-medium text-sm">
                  {item.output?.content?.slice(0, 100)}...
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAutomatedPosts && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Automated Posts</h3>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {coveragePosts.map((post) => (
              <CoveragePostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
