import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Zap,
  Trash2,
  Search,
  PenTool,
  MessageSquare,
  ImageIcon,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { useAuthStore } from '@/stores/useAuthStore'
import * as chatService from '@/services/chatService'
import * as imageService from '@/services/imageService'
import Loader from '@/components/ui/Loader'
import HistoryCard from '@/components/history/HistoryCard'
import ChatHistoryCard from '@/components/history/ChatHistoryCard'
import ImageHistoryCard from '@/components/history/ImageHistoryCard'
import HistoryViewModal from '@/components/history/HistoryViewModal'
import ChatViewModal from '@/components/history/ChatViewModal'
import ImageViewModal from '@/components/history/ImageViewModal'
import type { HistoryItem, ChatConversation, GeneratedImage } from '@/types'

type HistoryTab = 'all' | 'content' | 'chat' | 'image'

const TABS: { id: HistoryTab; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { id: 'content', label: 'Content', icon: <PenTool className="h-3.5 w-3.5" /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 'image', label: 'Image', icon: <ImageIcon className="h-3.5 w-3.5" /> },
]

// Unified item wrapper for sorting across types
interface UnifiedItem {
  type: 'content' | 'chat' | 'image'
  date: string
  content?: HistoryItem
  chat?: ChatConversation
  image?: GeneratedImage
}

export default function HistoryList() {
  const contentItems = useHistoryStore((s) => s.items)
  const loading = useHistoryStore((s) => s.loading)
  const loadHistory = useHistoryStore((s) => s.loadHistory)
  const removeItem = useHistoryStore((s) => s.removeItem)
  const clearHistory = useHistoryStore((s) => s.clearHistory)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const [activeTab, setActiveTab] = useState<HistoryTab>('all')
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([])
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loadingChat, setLoadingChat] = useState(true)
  const [loadingImages, setLoadingImages] = useState(true)

  const [viewContentItem, setViewContentItem] = useState<HistoryItem | null>(null)
  const [viewChatItem, setViewChatItem] = useState<ChatConversation | null>(null)
  const [viewImageItem, setViewImageItem] = useState<GeneratedImage | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load content history
  const stableLoadHistory = useCallback(loadHistory, [loadHistory])

  useEffect(() => {
    if (isAdmin && debouncedSearch) {
      stableLoadHistory(debouncedSearch)
    } else {
      stableLoadHistory()
    }
  }, [debouncedSearch, isAdmin, stableLoadHistory])

  // Load chat conversations
  useEffect(() => {
    setLoadingChat(true)
    chatService
      .getConversations()
      .then(setChatConversations)
      .catch(() => setChatConversations([]))
      .finally(() => setLoadingChat(false))
  }, [])

  // Load images
  useEffect(() => {
    setLoadingImages(true)
    imageService
      .getImages()
      .then(setImages)
      .catch(() => setImages([]))
      .finally(() => setLoadingImages(false))
  }, [])

  const handleClearAll = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all content history? This action cannot be undone.',
    )
    if (confirmed) clearHistory()
  }

  const handleDeleteChat = async (id: string) => {
    try {
      await chatService.deleteConversation(id)
      setChatConversations((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // ignore
    }
  }

  const handleDeleteImage = async (id: string) => {
    try {
      await imageService.deleteImage(id)
      setImages((prev) => prev.filter((img) => img.id !== id))
    } catch {
      // ignore
    }
  }

  // Build unified list sorted by date
  const unifiedItems: UnifiedItem[] = []

  if (activeTab === 'all' || activeTab === 'content') {
    for (const item of contentItems) {
      unifiedItems.push({ type: 'content', date: item.createdAt, content: item })
    }
  }

  if (activeTab === 'all' || activeTab === 'chat') {
    for (const conv of chatConversations) {
      unifiedItems.push({ type: 'chat', date: conv.updatedAt, chat: conv })
    }
  }

  if (activeTab === 'all' || activeTab === 'image') {
    for (const img of images) {
      unifiedItems.push({ type: 'image', date: img.createdAt, image: img })
    }
  }

  unifiedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Count per tab
  const counts: Record<HistoryTab, number> = {
    all: contentItems.length + chatConversations.length + images.length,
    content: contentItems.length,
    chat: chatConversations.length,
    image: images.length,
  }

  const isLoading = loading || loadingChat || loadingImages
  const hasSearch = isAdmin && searchQuery.trim().length > 0

  // Loading state
  if (isLoading) {
    return <Loader label="Loading history..." />
  }

  // Tab bar component
  const tabBar = (
    <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
            activeTab === tab.id
              ? 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20'
              : 'text-white/40 hover:text-white/60 border border-transparent',
          )}
        >
          {tab.icon}
          {tab.label}
          {counts[tab.id] > 0 && (
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                activeTab === tab.id
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                  : 'bg-white/5 text-white/30',
              )}
            >
              {counts[tab.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )

  // Empty state
  if (unifiedItems.length === 0) {
    return (
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#f9fafb]">History</h2>
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
          </div>
        </div>

        {tabBar}

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white/5 border border-white/10 rounded-full p-5 mb-6">
            <Clock className="h-10 w-10 text-[#9ca3af]" />
          </div>
          <h2 className="text-xl font-semibold text-[#f9fafb] mb-2">
            {hasSearch ? 'No results found' : 'Nothing here yet'}
          </h2>
          <p className="text-[#9ca3af] mb-6 max-w-sm">
            {hasSearch
              ? 'Try a different search term or clear the search.'
              : 'Start creating in the Forge and your history will appear here.'}
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[#f9fafb]">History</h2>
          <span
            className={cn(
              'text-xs font-medium px-2.5 py-0.5 rounded-full',
              'bg-[#00f0ff]/10 text-[#00f0ff]',
            )}
          >
            {counts[activeTab]}
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

      {/* Tab bar */}
      {tabBar}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {unifiedItems.map((item) => {
          if (item.type === 'content' && item.content) {
            return (
              <HistoryCard
                key={`content-${item.content.id}`}
                item={item.content}
                onDelete={removeItem}
                onView={setViewContentItem}
              />
            )
          }
          if (item.type === 'chat' && item.chat) {
            return (
              <ChatHistoryCard
                key={`chat-${item.chat.id}`}
                conversation={item.chat}
                onDelete={handleDeleteChat}
                onView={setViewChatItem}
              />
            )
          }
          if (item.type === 'image' && item.image) {
            return (
              <ImageHistoryCard
                key={`image-${item.image.id}`}
                image={item.image}
                onDelete={handleDeleteImage}
                onView={setViewImageItem}
              />
            )
          }
          return null
        })}
      </div>

      {/* View modals */}
      {viewContentItem && (
        <HistoryViewModal item={viewContentItem} onClose={() => setViewContentItem(null)} />
      )}
      {viewChatItem && (
        <ChatViewModal conversation={viewChatItem} onClose={() => setViewChatItem(null)} />
      )}
      {viewImageItem && (
        <ImageViewModal image={viewImageItem} onClose={() => setViewImageItem(null)} />
      )}
    </div>
  )
}
