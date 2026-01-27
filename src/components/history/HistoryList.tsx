import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Zap, Trash2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { useAuthStore } from '@/stores/useAuthStore'
import Loader from '@/components/ui/Loader'
import HistoryCard from '@/components/history/HistoryCard'
import HistoryViewModal from '@/components/history/HistoryViewModal'
import type { HistoryItem } from '@/types'

export default function HistoryList() {
  const items = useHistoryStore((s) => s.items)
  const loading = useHistoryStore((s) => s.loading)
  const loadHistory = useHistoryStore((s) => s.loadHistory)
  const removeItem = useHistoryStore((s) => s.removeItem)
  const clearHistory = useHistoryStore((s) => s.clearHistory)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const [viewItem, setViewItem] = useState<HistoryItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load history when debounced search changes
  const stableLoadHistory = useCallback(loadHistory, [loadHistory])

  useEffect(() => {
    if (isAdmin && debouncedSearch) {
      stableLoadHistory(debouncedSearch)
    } else {
      stableLoadHistory()
    }
  }, [debouncedSearch, isAdmin, stableLoadHistory])

  const handleClearAll = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all history? This action cannot be undone.',
    )
    if (confirmed) clearHistory()
  }

  const hasSearch = isAdmin && searchQuery.trim().length > 0

  // Loading state
  if (loading) {
    return <Loader label="Loading history..." />
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        {/* Search bar for admin even in empty state */}
        {isAdmin && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#f9fafb]">
              Content History
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type="text"
                placeholder="Search by user name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'pl-9 pr-4 py-2 rounded-xl text-sm',
                  'bg-white/5 border border-white/10 text-[#f9fafb] placeholder-[#6b7280]',
                  'focus:outline-none focus:border-[#00f0ff]/50 focus:ring-1 focus:ring-[#00f0ff]/30',
                  'transition-all w-64',
                )}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white/5 border border-white/10 rounded-full p-5 mb-6">
            <Clock className="h-10 w-10 text-[#9ca3af]" />
          </div>
          <h2 className="text-xl font-semibold text-[#f9fafb] mb-2">
            {hasSearch ? 'No results found' : 'No content yet'}
          </h2>
          <p className="text-[#9ca3af] mb-6 max-w-sm">
            {hasSearch
              ? 'Try a different search term or clear the search.'
              : 'Start creating content in the Forge and your history will appear here.'}
          </p>
          {!hasSearch && (
            <Link
              to="/forge"
              className={cn(
                'inline-flex items-center gap-2',
                'bg-[#00f0ff] text-[#0a0e1a] font-semibold px-6 py-3 rounded-xl',
                'hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all',
              )}
            >
              <Zap className="h-5 w-5" />
              Go to Forge
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[#f9fafb]">
            Content History
          </h2>
          <span
            className={cn(
              'text-xs font-medium px-2.5 py-0.5 rounded-full',
              'bg-[#00f0ff]/10 text-[#00f0ff]',
            )}
          >
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type="text"
                placeholder="Search by user name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'pl-9 pr-4 py-2 rounded-xl text-sm',
                  'bg-white/5 border border-white/10 text-[#f9fafb] placeholder-[#6b7280]',
                  'focus:outline-none focus:border-[#00f0ff]/50 focus:ring-1 focus:ring-[#00f0ff]/30',
                  'transition-all w-64',
                )}
              />
            </div>
          )}
          {isAdmin && (
            <button
              onClick={handleClearAll}
              className={cn(
                'inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300',
                'transition-colors cursor-pointer',
              )}
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            onDelete={removeItem}
            onView={setViewItem}
          />
        ))}
      </div>

      {/* View modal */}
      {viewItem && (
        <HistoryViewModal item={viewItem} onClose={() => setViewItem(null)} />
      )}
    </div>
  )
}
