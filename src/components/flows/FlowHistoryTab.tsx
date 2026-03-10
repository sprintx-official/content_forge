import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AnyFlow, HistoryItem } from '../../types'
import { api } from '../../lib/api'
import { useForgeStore } from '@/stores/useForgeStore'
import { parseMultiFileContent } from '@/lib/fileParser'
import { Search, Clock, FileText, Eye, Radio } from 'lucide-react'
import { timeAgo } from '@/lib/timeAgo'

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
  const [, setSearchParams] = useSearchParams()
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [coveragePosts, setCoveragePosts] = useState<CoveragePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const handleViewItem = (item: HistoryItem) => {
    const store = useForgeStore.getState()
    if (item.input) {
      store.setInput(item.input)
    }
    if (item.output) {
      const parsedFiles = parseMultiFileContent(item.output.content)
      useForgeStore.setState({
        output: item.output,
        parsedFiles,
        activeFileIndex: 0,
        isProcessing: false,
        error: null,
      })
    }
    setSearchParams({ tab: 'run' })
  }

  const handleViewCoveragePost = (post: CoveragePost) => {
    // Build an output object from the coverage post and load into Run tab
    const content = `# ${post.title}\n\n${post.summary}`
    const wordCount = content.split(/\s+/).length
    const sentences = content.split(/[.!?]+/).length - 1
    const parsedFiles = parseMultiFileContent(content)
    useForgeStore.setState({
      output: {
        content,
        metrics: {
          wordCount,
          readTimeMinutes: Math.ceil(wordCount / 200),
          sentenceCount: sentences,
          avgSentenceLength: sentences > 0 ? Math.round(wordCount / sentences) : 0,
          readabilityScore: 0,
          gradeLevel: 0,
        },
        tips: [],
        generatedAt: post.createdAt,
      },
      parsedFiles,
      activeFileIndex: 0,
      isProcessing: false,
      error: null,
    })
    useForgeStore.getState().setInput({ topic: post.title })
    setSearchParams({ tab: 'run' })
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const historyData = await api.get<{ data: HistoryItem[]; pagination: unknown }>(
          `/api/history?workflowId=${workflowId}&limit=50`
        )
        setHistoryItems(historyData.data || [])

        if ('mode' in flow && (flow.mode === 'automated' || flow.mode === 'both')) {
          try {
            const agentParam = 'pipelineAgentId' in flow && flow.pipelineAgentId
              ? `&agentId=${flow.pipelineAgentId}`
              : ''
            const coverageData = await api.get<{ posts: CoveragePost[] }>(
              `/api/coverage?workflowId=${workflowId}${agentParam}&limit=50`
            )
            setCoveragePosts(coverageData.posts || [])
          } catch (err) {
            console.error('Failed to fetch coverage posts:', err)
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

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return historyItems
    const q = search.toLowerCase()
    return historyItems.filter(
      (item) =>
        item.output?.content?.toLowerCase().includes(q) ||
        item.input?.topic?.toLowerCase().includes(q)
    )
  }, [historyItems, search])

  const filteredPosts = useMemo(() => {
    if (!search.trim()) return coveragePosts
    const q = search.toLowerCase()
    return coveragePosts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q)
    )
  }, [coveragePosts, search])

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-[#cbd5e1]">Loading history...</p>
      </div>
    )
  }

  if (error) {
    return <div className="p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded">Error: {error}</div>
  }

  const hasManualRuns = historyItems.length > 0
  const hasAutomatedPosts = coveragePosts.length > 0

  const isAutomatedOnly = 'mode' in flow && flow.mode === 'automated'

  if (!hasManualRuns && !hasAutomatedPosts) {
    return (
      <div className="p-12 text-center">
        <Clock className="size-10 text-[#cbd5e1]/30 mx-auto mb-3" />
        <p className="text-[#cbd5e1] mb-1">
          {isAutomatedOnly ? 'No posts generated yet' : 'No history yet'}
        </p>
        <p className="text-sm text-[#cbd5e1]/60">
          {isAutomatedOnly
            ? 'Check the Monitor tab for pipeline status.'
            : 'Run this flow to see results here'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      {(historyItems.length > 3 || coveragePosts.length > 3) && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#cbd5e1]/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-[#f8fafc] placeholder:text-[#cbd5e1]/50 focus:outline-none focus:ring-1 focus:ring-[#10b981]/50"
          />
        </div>
      )}

      {hasManualRuns && (
        <div>
          <h3 className="font-semibold text-lg text-white mb-3 flex items-center gap-2">
            <FileText className="size-4" />
            Manual Runs
            <span className="text-xs text-[#cbd5e1]/60 font-normal">({filteredHistory.length})</span>
          </h3>
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-[#cbd5e1]/60 py-4">No results match your search</p>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleViewItem(item)}
                  className="w-full text-left p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <p className="font-medium text-sm text-white line-clamp-1 flex-1">
                      {item.input?.topic || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Eye className="size-3" /> View
                      </span>
                      <span className="text-xs text-[#cbd5e1]/60 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#cbd5e1] line-clamp-2">
                    {item.output?.content?.slice(0, 200)}
                  </p>
                  {item.output?.metrics && (
                    <div className="flex gap-3 mt-2 text-xs text-[#cbd5e1]/50">
                      <span>{item.output.metrics.wordCount} words</span>
                      <span>{item.output.metrics.readTimeMinutes}min read</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {hasAutomatedPosts && (
        <div>
          <h3 className="font-semibold text-lg text-white mb-3 flex items-center gap-2">
            <Radio className="size-4 text-[#6366f1]" />
            Automated Posts
            <span className="text-xs text-[#cbd5e1]/60 font-normal">({filteredPosts.length})</span>
          </h3>
          {filteredPosts.length === 0 ? (
            <p className="text-sm text-[#cbd5e1]/60 py-4">No results match your search</p>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handleViewCoveragePost(post)}
                  className="w-full text-left p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <p className="font-medium text-sm text-white line-clamp-1 flex-1">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                        post.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {post.status}
                      </span>
                      <span className="text-xs text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Eye className="size-3" /> View
                      </span>
                      <span className="text-xs text-[#cbd5e1]/60 whitespace-nowrap">{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#cbd5e1] line-clamp-2">
                    {post.summary?.slice(0, 200)}
                  </p>
                  {post.agentName && (
                    <div className="flex gap-3 mt-2 text-xs text-[#cbd5e1]/50">
                      <span>{post.agentName}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
