import { useState, useEffect } from 'react'
import { Globe, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { AgentConfig } from '@/types'

interface PublishPanelProps {
  title: string
  content: string
  agents: AgentConfig[]
}

interface CmsSettings {
  cms_enabled: string | null
  cms_api_url: string | null
  cms_api_key: string | null
  cms_category: string | null
  cms_publish_status: string | null
}

export default function PublishPanel({ title, content, agents }: PublishPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [cmsSettings, setCmsSettings] = useState<CmsSettings | null>(null)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Load CMS settings when agent is selected
  useEffect(() => {
    if (!selectedAgentId) {
      setCmsSettings(null)
      return
    }
    setLoading(true)
    api.get<CmsSettings>(`/api/cms/settings/${selectedAgentId}`)
      .then(setCmsSettings)
      .catch(() => setCmsSettings(null))
      .finally(() => setLoading(false))
  }, [selectedAgentId])

  useEffect(() => {
    if (cmsSettings?.cms_publish_status) {
      setStatus(cmsSettings.cms_publish_status as 'draft' | 'published')
    }
  }, [cmsSettings])

  const handlePublish = async () => {
    if (!selectedAgentId) return
    setPublishing(true)
    setResult(null)
    try {
      const res = await api.post<{ success: boolean; url?: string; error?: string }>('/api/cms/publish', {
        agentId: selectedAgentId,
        title: title || 'Untitled',
        content,
        status,
      })
      setResult(res)
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Publish failed' })
    } finally {
      setPublishing(false)
    }
  }

  const cmsConfigured = cmsSettings?.cms_enabled === 'true' && cmsSettings?.cms_api_url

  return (
    <div className="space-y-6">
      {/* CMS Publishing */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00f0ff]/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-[#00f0ff]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Publish to CMS</h3>
            <p className="text-sm text-white/40">Push content to your website</p>
          </div>
        </div>

        {/* Agent selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">Select Agent</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-[#00f0ff]/50"
          >
            <option value="">Choose an agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading CMS settings...
          </div>
        )}

        {selectedAgentId && !loading && !cmsConfigured && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              CMS not configured for this agent. Go to Settings &rarr; Agents to set up CMS connection.
            </p>
          </div>
        )}

        {cmsConfigured && (
          <>
            {/* Status selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Publish Status</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    status === 'draft'
                      ? 'border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10'
                      : 'border-white/10 text-white/40 hover:text-white/60',
                  )}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                    status === 'published'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                      : 'border-white/10 text-white/40 hover:text-white/60',
                  )}
                >
                  Published
                </button>
              </div>
            </div>

            {/* CMS info */}
            <div className="text-xs text-white/30 space-y-1">
              <p>CMS: {cmsSettings?.cms_api_url}</p>
              <p>Category: {cmsSettings?.cms_category || 'auto-detect'}</p>
            </div>

            {/* Publish button */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all',
                publishing
                  ? 'bg-[#00f0ff]/30 text-[#00f0ff]/50 cursor-wait'
                  : 'bg-[#00f0ff] text-[#0a0e1a] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]',
              )}
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Publish to CMS
                </>
              )}
            </button>

            {/* Result */}
            {result && (
              <div
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border',
                  result.success
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-red-500/10 border-red-500/20',
                )}
              >
                {result.success ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-emerald-300">Published successfully!</span>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-sm text-[#00f0ff] hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm text-red-300">{result.error}</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
