import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock, FileText, Workflow, Eye, Radio, Copy, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useForgeStore } from '@/stores/useForgeStore'
import { parseMultiFileContent } from '@/lib/fileParser'
import { timeAgo } from '@/lib/timeAgo'
import type { HistoryItem } from '@/types'

interface CoveragePost {
  id: string
  agentId: string
  title: string
  summary: string
  status: string
  createdAt: string
  agentName?: string
  workflowId?: string
}

type UnifiedItem =
  | { kind: 'history'; data: HistoryItem }
  | { kind: 'coverage'; data: CoveragePost }

const statusStyles: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-300' },
  published: { bg: 'bg-green-500/20', text: 'text-green-400' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

function CoverageCard({ post, onClick }: { post: CoveragePost; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const style = statusStyles[post.status] || statusStyles.draft

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${post.title}\n\n${post.summary}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClick = () => {
    if (post.workflowId) {
      onClick()
    } else {
      setExpanded(!expanded)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors group"
    >
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Radio className="size-4 text-[#6366f1] shrink-0" />
          <p className="font-medium text-sm text-white line-clamp-1">{post.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded font-medium whitespace-nowrap ${style.bg} ${style.text}`}>
            {post.status}
          </span>
          <span className="px-2 py-0.5 text-xs rounded font-medium whitespace-nowrap bg-[#6366f1]/20 text-[#a5b4fc]">
            Coverage
          </span>
          {post.workflowId && (
            <span className="text-xs text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Eye className="size-3" /> View
            </span>
          )}
          <span className="text-xs text-[#cbd5e1]/60 whitespace-nowrap">{timeAgo(post.createdAt)}</span>
        </div>
      </div>
      <p className={`text-sm text-[#cbd5e1] ml-6 ${expanded ? '' : 'line-clamp-2'}`}>
        {post.summary}
      </p>
      {!post.workflowId && expanded && (
        <div className="flex items-center justify-end mt-2">
          <span
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-white/10 text-[#cbd5e1] transition-colors cursor-pointer"
          >
            {copied ? <Check className="size-3 text-[#10b981]" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </span>
        </div>
      )}
      {post.agentName && (
        <div className="flex gap-3 mt-2 ml-6 text-xs text-[#cbd5e1]/50">
          <span>{post.agentName}</span>
        </div>
      )}
    </button>
  )
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [coveragePosts, setCoveragePosts] = useState<CoveragePost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch manual history items
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), limit: '30' })
        if (search.trim()) params.append('search', search.trim())
        const res = await api.get<{ data: HistoryItem[]; pagination: { totalPages: number } }>(
          `/api/history?${params.toString()}`
        )
        setItems(res.data || [])
        setTotalPages(res.pagination?.totalPages || 1)
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [page, search])

  // Fetch coverage posts
  useEffect(() => {
    const fetchCoverage = async () => {
      try {
        const res = await api.get<{ posts: CoveragePost[]; total: number }>(
          `/api/coverage?limit=50`
        )
        setCoveragePosts(res.posts || [])
      } catch {
        setCoveragePosts([])
      }
    }
    fetchCoverage()
  }, [])

  // Filter coverage posts by search (history is filtered server-side)
  const filteredCoverage = useMemo(() => {
    if (!search.trim()) return coveragePosts
    const q = search.toLowerCase()
    return coveragePosts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.agentName?.toLowerCase().includes(q)
    )
  }, [coveragePosts, search])

  // Build unified list sorted by createdAt descending
  const unified = useMemo<UnifiedItem[]>(() => {
    const all: UnifiedItem[] = [
      ...items.map((data) => ({ kind: 'history' as const, data })),
      ...filteredCoverage.map((data) => ({ kind: 'coverage' as const, data })),
    ]
    all.sort((a, b) => {
      const aDate = new Date(a.data.createdAt).getTime()
      const bDate = new Date(b.data.createdAt).getTime()
      return bDate - aDate
    })
    return all
  }, [items, filteredCoverage])

  // Group by workflow/agent name
  const grouped = useMemo(() => {
    const groups: Record<string, UnifiedItem[]> = {}
    for (const entry of unified) {
      let key: string
      if (entry.kind === 'history') {
        key = entry.data.workflowName || 'Ungrouped'
      } else {
        key = entry.data.agentName || 'Coverage Pipeline'
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    }
    return groups
  }, [unified])

  const isEmpty = unified.length === 0

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">History</h1>
          <p className="text-sm text-[#cbd5e1]">All generated content across flows</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#cbd5e1]/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by topic, title, or content..."
            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-[#f8fafc] placeholder:text-[#cbd5e1]/50 focus:outline-none focus:ring-1 focus:ring-[#10b981]/50"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[#cbd5e1]">Loading history...</p>
          </div>
        ) : isEmpty ? (
          <div className="p-16 text-center">
            <Clock className="size-10 text-[#cbd5e1]/30 mx-auto mb-3" />
            <p className="text-[#cbd5e1] mb-1">No history yet</p>
            <p className="text-sm text-[#cbd5e1]/60">Generate content from any flow to see it here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, groupItems]) => (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-3">
                  <Workflow className="size-4 text-[#10b981]" />
                  <h2 className="text-sm font-semibold text-white">{groupName}</h2>
                  <span className="text-xs text-[#cbd5e1]/50">({groupItems.length})</span>
                </div>
                <div className="space-y-2">
                  {groupItems.map((entry) => {
                    if (entry.kind === 'coverage') {
                      return (
                        <CoverageCard
                          key={`cov-${entry.data.id}`}
                          post={entry.data}
                          onClick={() => {
                            if (entry.data.workflowId) {
                              navigate(`/flows/${entry.data.workflowId}?tab=history`)
                            }
                          }}
                        />
                      )
                    }

                    const item = entry.data
                    return (
                      <button
                        key={`hist-${item.id}`}
                        onClick={() => {
                          if (item.output) {
                            const parsedFiles = parseMultiFileContent(item.output.content)
                            useForgeStore.setState({
                              output: item.output,
                              parsedFiles,
                              activeFileIndex: 0,
                              isProcessing: false,
                              error: null,
                            })
                            if (item.input) useForgeStore.getState().setInput(item.input)
                          }
                          if (item.workflowId) {
                            navigate(`/flows/${item.workflowId}?tab=run`)
                          }
                        }}
                        className="w-full text-left p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="size-4 text-[#cbd5e1]/50 shrink-0" />
                            <p className="font-medium text-sm text-white line-clamp-1">
                              {item.input?.topic || 'Untitled'}
                            </p>
                          </div>
                          <span className="text-xs text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Eye className="size-3" /> View
                          </span>
                          <span className="text-xs text-[#cbd5e1]/60 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                        </div>
                        <p className="text-sm text-[#cbd5e1] line-clamp-2 ml-6">
                          {item.output?.content?.slice(0, 200)}
                        </p>
                        {item.output?.metrics && (
                          <div className="flex gap-3 mt-2 ml-6 text-xs text-[#cbd5e1]/50">
                            <span>{item.output.metrics.wordCount} words</span>
                            <span>{item.output.metrics.readTimeMinutes}min read</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-[#cbd5e1] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-[#cbd5e1]/60">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-[#cbd5e1] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
