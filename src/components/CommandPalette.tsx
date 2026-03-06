import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Hammer,
  Newspaper,
  Clock,
  Settings,
  Bot,
  GitBranch,
  Key,
  Bell,
  Eye,
  Plus,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAdminStore } from '@/stores/useAdminStore'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
  keywords?: string[]
  admin?: boolean
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const setActiveTab = useAdminStore(s => s.setActiveTab)

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      { id: 'forge', label: 'Go to Forge', icon: Hammer, action: () => navigate('/forge'), keywords: ['create', 'generate', 'content'] },
      { id: 'newsroom', label: 'Go to Newsroom', icon: Newspaper, action: () => navigate('/newsroom'), keywords: ['coverage', 'news', 'posts'] },
      { id: 'history', label: 'Go to History', icon: Clock, action: () => navigate('/history'), keywords: ['past', 'previous'] },
      { id: 'settings', label: 'Go to Settings', icon: Settings, action: () => navigate('/settings'), admin: true },
      { id: 'agents', label: 'Manage Agents', icon: Bot, action: () => { navigate('/settings'); setActiveTab('agents') }, admin: true, keywords: ['bot', 'ai'] },
      { id: 'workflows', label: 'Manage Workflows', icon: GitBranch, action: () => { navigate('/settings'); setActiveTab('workflows') }, admin: true, keywords: ['pipeline', 'steps'] },
      { id: 'api-keys', label: 'API Keys', icon: Key, action: () => { navigate('/settings'); setActiveTab('api-keys') }, admin: true, keywords: ['openai', 'google', 'anthropic'] },
      { id: 'notifications', label: 'Notification Settings', icon: Bell, action: () => { navigate('/settings'); setActiveTab('notifications') }, admin: true, keywords: ['email', 'push', 'digest'] },
      { id: 'brand', label: 'Brand Monitor', icon: Eye, action: () => { navigate('/settings'); setActiveTab('brand-monitor') }, admin: true, keywords: ['monitor', 'sentiment', 'llm'] },
      { id: 'new-content', label: 'New Content', icon: Plus, action: () => navigate('/forge'), keywords: ['create', 'write', 'generate'] },
    ]

    return cmds.filter(c => !c.admin || isAdmin)
  }, [isAdmin, navigate, setActiveTab])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.keywords?.some(k => k.includes(q))
    )
  }, [query, commands])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const execute = useCallback((cmd: Command) => {
    setOpen(false)
    setQuery('')
    cmd.action()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) execute(filtered[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery('') }} />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-[#0f1629] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="h-5 w-5 text-[#9ca3af] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-[#f9fafb] text-sm outline-none placeholder:text-[#9ca3af]"
          />
          <kbd className="text-xs text-[#9ca3af] bg-white/5 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-[#9ca3af] py-8">No commands found</p>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  i === selectedIndex
                    ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                    : 'text-[#9ca3af] hover:bg-white/5 hover:text-[#f9fafb]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-left">{cmd.label}</span>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4 text-xs text-[#9ca3af]">
          <span><kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 mr-1">↑↓</kbd> Navigate</span>
          <span><kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 mr-1">↵</kbd> Select</span>
          <span className="ml-auto"><kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 mr-1">⌘K</kbd> Toggle</span>
        </div>
      </div>
    </div>
  )
}
