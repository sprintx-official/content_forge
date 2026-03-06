import { useState, useEffect, useCallback } from 'react'
import { Rss, Plus, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface Feed {
  id: string
  title: string
  url: string
  description: string
  tier: string
  status: string
  article_count: number
}

interface PipelineSettings {
  pipeline_enabled: string | null
  pipeline_interval: string | null
}

export default function PipelineFeedsTab({ agentId }: { agentId: string }) {
  const [settings, setSettings] = useState<PipelineSettings>({ pipeline_enabled: null, pipeline_interval: null })
  const [subscribedFeeds, setSubscribedFeeds] = useState<Feed[]>([])
  const [allFeeds, setAllFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const [s, sub, all] = await Promise.all([
        api.get<PipelineSettings>(`/api/pipeline/settings/${agentId}`),
        api.get<{ feeds: Feed[] }>(`/api/feeds/agent/${agentId}`),
        api.get<{ feeds: Feed[] }>('/api/feeds'),
      ])
      setSettings(s)
      setSubscribedFeeds(sub.feeds)
      setAllFeeds(all.feeds)
    } catch {
      setMessage('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  const saveSettings = async (updates: Partial<PipelineSettings>) => {
    setSaving(true)
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    try {
      await api.put(`/api/pipeline/settings/${agentId}`, newSettings)
      setMessage('Settings saved')
    } catch {
      setMessage('Failed to save')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const addFeed = async () => {
    if (!newFeedUrl.trim()) return
    setAdding(true)
    try {
      // Create the feed (or get existing)
      let feedId: string
      try {
        const created = await api.post<{ id: string }>('/api/feeds', { url: newFeedUrl.trim() })
        feedId = created.id
      } catch (e) {
        // Feed might already exist (409)
        const err = e as Error
        const match = err.message.match(/Feed already exists/)
        if (match) {
          const existing = allFeeds.find(f => f.url === newFeedUrl.trim())
          if (existing) feedId = existing.id
          else throw e
        } else throw e
      }

      await api.post(`/api/feeds/agent/${agentId}/subscribe`, { feedIds: [feedId] })
      setNewFeedUrl('')
      await load()
      setMessage('Feed added')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to add feed')
    } finally {
      setAdding(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const subscribeFeed = async (feedId: string) => {
    await api.post(`/api/feeds/agent/${agentId}/subscribe`, { feedIds: [feedId] })
    await load()
  }

  const unsubscribeFeed = async (feedId: string) => {
    await api.delete(`/api/feeds/agent/${agentId}/${feedId}`)
    await load()
  }

  const subscribedIds = new Set(subscribedFeeds.map(f => f.id))
  const availableFeeds = allFeeds.filter(f => !subscribedIds.has(f.id))

  if (loading) return <div className="text-[#9ca3af] py-4">Loading...</div>

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/20 rounded-lg px-4 py-2 text-sm text-[#00f0ff]">
          {message}
        </div>
      )}

      {/* Pipeline Toggle */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[#f9fafb]">Pipeline</h4>
        <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
          <div>
            <p className="text-sm text-[#f9fafb]">Auto-generate coverage</p>
            <p className="text-xs text-[#9ca3af]">Pipeline monitors feeds and generates posts automatically</p>
          </div>
          <button
            onClick={() => saveSettings({ pipeline_enabled: settings.pipeline_enabled === 'true' ? 'false' : 'true' })}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.pipeline_enabled === 'true' ? 'bg-[#00f0ff]' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.pipeline_enabled === 'true' ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div>
          <label className="text-xs text-[#9ca3af] mb-1 block">Run interval</label>
          <select
            value={settings.pipeline_interval || '30'}
            onChange={e => saveSettings({ pipeline_interval: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          >
            <option value="15">Every 15 minutes</option>
            <option value="30">Every 30 minutes</option>
            <option value="60">Every hour</option>
            <option value="120">Every 2 hours</option>
            <option value="360">Every 6 hours</option>
          </select>
        </div>
      </div>

      {/* Add Feed */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-[#f9fafb]">RSS Feeds ({subscribedFeeds.length})</h4>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Paste RSS feed URL..."
            value={newFeedUrl}
            onChange={e => setNewFeedUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFeed()}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          />
          <button
            onClick={addFeed}
            disabled={adding || !newFeedUrl.trim()}
            className="bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>
      </div>

      {/* Subscribed Feeds */}
      <div className="space-y-2">
        {subscribedFeeds.length === 0 && (
          <p className="text-xs text-[#9ca3af] text-center py-4">No feeds subscribed. Add an RSS feed URL above.</p>
        )}
        {subscribedFeeds.map(f => (
          <div key={f.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Rss className="h-3.5 w-3.5 text-[#00f0ff] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-[#f9fafb] truncate">{f.title || f.url}</p>
                <p className="text-xs text-[#9ca3af] truncate">{f.url}</p>
              </div>
              {f.status === 'active' ? (
                <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 text-red-400 shrink-0" />
              )}
            </div>
            <button onClick={() => unsubscribeFeed(f.id)} className="text-[#9ca3af] hover:text-red-400 p-1 shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Available Feeds to Subscribe */}
      {availableFeeds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-[#9ca3af] uppercase tracking-wider">Available feeds</h4>
          {availableFeeds.slice(0, 10).map(f => (
            <div key={f.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-[#9ca3af] truncate">{f.title || f.url}</p>
              </div>
              <button
                onClick={() => subscribeFeed(f.id)}
                className="text-xs text-[#00f0ff] hover:text-[#00f0ff]/80 px-2 py-1 rounded bg-[#00f0ff]/10 shrink-0"
              >
                Subscribe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
