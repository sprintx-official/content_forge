import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock, FileText, Workflow } from 'lucide-react'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/timeAgo'
import type { HistoryItem } from '@/types'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

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

  const grouped = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {}
    for (const item of items) {
      const key = item.workflowName || 'Ungrouped'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [items])

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
            placeholder="Search by topic or content..."
            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-[#f8fafc] placeholder:text-[#cbd5e1]/50 focus:outline-none focus:ring-1 focus:ring-[#10b981]/50"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[#cbd5e1]">Loading history...</p>
          </div>
        ) : items.length === 0 ? (
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
                  {groupItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.workflowId) {
                          navigate(`/flows/${item.workflowId}?tab=history`)
                        }
                      }}
                      className="w-full text-left p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="size-4 text-[#cbd5e1]/50 shrink-0" />
                          <p className="font-medium text-sm text-white line-clamp-1">
                            {item.input?.topic || 'Untitled'}
                          </p>
                        </div>
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
                  ))}
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
