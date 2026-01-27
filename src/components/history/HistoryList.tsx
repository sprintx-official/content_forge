import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Zap, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { useAuthStore } from '@/stores/useAuthStore'
import HistoryCard from '@/components/history/HistoryCard'
import HistoryViewModal from '@/components/history/HistoryViewModal'
import type { HistoryItem } from '@/types'

export default function HistoryList() {
  const items = useHistoryStore((s) => s.items)
  const loadHistory = useHistoryStore((s) => s.loadHistory)
  const removeItem = useHistoryStore((s) => s.removeItem)
  const clearHistory = useHistoryStore((s) => s.clearHistory)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const [viewItem, setViewItem] = useState<HistoryItem | null>(null)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleClearAll = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all history? This action cannot be undone.',
    )
    if (confirmed) clearHistory()
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-white/5 border border-white/10 rounded-full p-5 mb-6">
          <Clock className="h-10 w-10 text-[#9ca3af]" />
        </div>
        <h2 className="text-xl font-semibold text-[#f9fafb] mb-2">
          No content yet
        </h2>
        <p className="text-[#9ca3af] mb-6 max-w-sm">
          Start creating content in the Forge and your history will appear here.
        </p>
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
