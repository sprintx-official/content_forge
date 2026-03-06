import { useEffect, useState, useCallback } from 'react'
import { Newspaper, Radio, RefreshCw, Clock, AlertTriangle, TrendingUp, Rss, Search, ExternalLink, Upload, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'

interface CoveragePost {
  id: string
  agent_id: string
  agent_name: string
  title: string
  slug: string
  summary: string
  category: string
  urgency: string
  status: string
  confidence: number
  image_landscape: string | null
  image_headline: string
  cms_url: string | null
  cms_slug: string | null
  source_count: number
  created_at: string
}

interface DashboardStats {
  total_posts: number
  published_posts: number
  draft_posts: number
  posts_today: number
  total_articles: number
  articles_today: number
  active_feeds: number
  active_pipelines: number
}

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  developing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  routine: 'bg-white/[0.08] text-white/50 border-white/[0.1]',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-500/15 text-amber-300',
  published: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
}

export default function NewsroomPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [posts, setPosts] = useState<CoveragePost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [publishing, setPublishing] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      if (urgencyFilter) params.set('urgency', urgencyFilter)
      if (statusFilter) params.set('status', statusFilter)

      const [statsRes, postsRes] = await Promise.all([
        api.get<DashboardStats>('/api/coverage/stats/summary'),
        api.get<{ posts: CoveragePost[] }>(`/api/coverage?${params}`),
      ])
      setStats(statsRes)
      setPosts(postsRes.posts)
    } catch (err) {
      console.error('Failed to load newsroom data:', err)
    } finally {
      setLoading(false)
    }
  }, [search, urgencyFilter, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  const publishToCms = async (postId: string, status: 'draft' | 'published' = 'published') => {
    setPublishing(postId)
    try {
      const result = await api.post<{ success: boolean; url?: string; error?: string }>(`/api/coverage/${postId}/publish-cms`, { status })
      if (result.success) {
        setMessage(result.url ? `Published: ${result.url}` : 'Published to CMS')
        await loadData()
      } else {
        setMessage(result.error || 'Publish failed')
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(null)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="w-7 h-7 text-[#00f0ff]" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent">
            Newsroom
          </h1>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.08] transition-all"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Posts Today', value: stats.posts_today, icon: TrendingUp, color: 'text-[#00f0ff]' },
            { label: 'Active Feeds', value: stats.active_feeds, icon: Rss, color: 'text-emerald-400' },
            { label: 'Articles Today', value: stats.articles_today, icon: Newspaper, color: 'text-[#a855f7]' },
            { label: 'Pipelines', value: stats.active_pipelines, icon: Radio, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', color)} />
                <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-[#00f0ff]/50"
          />
        </div>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/70"
        >
          <option value="">All Urgencies</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="developing">Developing</option>
          <option value="routine">Routine</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/70"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/20 rounded-lg px-4 py-2 text-sm text-[#00f0ff]">
          {message}
        </div>
      )}

      {/* Posts grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <Newspaper className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/60 mb-2">No Coverage Posts Yet</h3>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-6">
            Set up an agent with RSS feeds and enable the pipeline to start generating coverage automatically.
          </p>
          <div className="max-w-sm mx-auto space-y-3 text-left">
            {[
              { step: '1', text: 'Go to Settings → Agents → Edit an agent' },
              { step: '2', text: 'Open the Pipeline & Feeds tab' },
              { step: '3', text: 'Add RSS feed URLs and enable the pipeline' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] text-xs flex items-center justify-center shrink-0">{step}</span>
                <span className="text-sm text-white/50">{text}</span>
              </div>
            ))}
          </div>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] text-sm font-medium hover:bg-[#00f0ff]/20 transition-colors"
          >
            Go to Agent Setup
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all p-5"
            >
              <div className="flex items-start gap-4">
                {/* Image */}
                {post.image_landscape && (
                  <img
                    src={post.image_landscape}
                    alt=""
                    className="w-32 h-20 rounded-lg object-cover shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className={cn('text-[10px]', URGENCY_COLORS[post.urgency])}>
                      {post.urgency}
                    </Badge>
                    <Badge className={cn('text-[10px]', STATUS_COLORS[post.status])}>
                      {post.status}
                    </Badge>
                    {post.category && (
                      <span className="text-[10px] text-white/30">{post.category}</span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-white mb-1 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-white/50 line-clamp-2 mb-2">{post.summary.slice(0, 200)}</p>

                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      {post.agent_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Newspaper className="w-3 h-3" />
                      {post.source_count} sources
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(post.created_at).toLocaleString()}
                    </span>
                    {post.confidence && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Confidence: {post.confidence}/5
                      </span>
                    )}
                  </div>

                  {/* CMS Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    {post.cms_url ? (
                      <a
                        href={post.cms_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3 h-3" />
                        Published to CMS
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <>
                        <button
                          onClick={() => publishToCms(post.id, 'published')}
                          disabled={publishing === post.id}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] disabled:opacity-50 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          {publishing === post.id ? 'Publishing...' : 'Publish to CMS'}
                        </button>
                        <button
                          onClick={() => publishToCms(post.id, 'draft')}
                          disabled={publishing === post.id}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/40 disabled:opacity-50 transition-colors"
                        >
                          Send as Draft
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
