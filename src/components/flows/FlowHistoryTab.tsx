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
    return (
      <div className="p-4 text-center">
        <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-400">Loading history...</p>
      </div>
    )
  }

  if (error) {
    return <div className="p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded">Error: {error}</div>
  }

  const hasManualRuns = historyItems.length > 0
  const hasAutomatedPosts = coveragePosts.length > 0

  if (!hasManualRuns && !hasAutomatedPosts) {
    return <div className="p-4 text-gray-400 text-center">No history yet</div>
  }

  return (
    <div className="space-y-6">
      {hasManualRuns && (
        <div>
          <h3 className="font-semibold text-lg text-white mb-3">Manual Runs</h3>
          <div className="space-y-2">
            {historyItems.map((item) => (
              <div key={item.id} className="p-3 border border-white/10 rounded bg-white/5">
                <p className="font-medium text-sm text-white">
                  {item.output?.content?.slice(0, 100)}...
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAutomatedPosts && (
        <div>
          <h3 className="font-semibold text-lg text-white mb-3">Automated Posts</h3>
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
