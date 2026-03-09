import { useEffect, useState } from 'react'
import { Trash2, Check, Sparkles, AlertCircle, Loader2, BarChart3, RefreshCw, Type, ImageIcon, Video, ChevronDown, ChevronRight, Zap, ShieldAlert, ShieldCheck, Activity } from 'lucide-react'
import { useAdminStore } from '@/stores/useAdminStore'
import { getProviderModels, checkProviderHealth, type ProviderHealth } from '@/services/apiKeyService'
import { getUsageStats } from '@/services/usageService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Loader from '@/components/ui/Loader'
import { getTagVariant } from '@/lib/modelTagColors'
import type { AiProvider, AiModel, ProviderUsageSummary } from '@/types'

const PROVIDERS: { id: AiProvider; name: string; icon: string }[] = [
  { id: 'openai', name: 'OpenAI', icon: 'O' },
  { id: 'anthropic', name: 'Anthropic', icon: 'A' },
  { id: 'xai', name: 'xAI', icon: 'X' },
  { id: 'google', name: 'Google', icon: 'G' },
]

type ModelCategory = 'text' | 'image' | 'video'

function categorizeModel(model: AiModel): ModelCategory {
  const tags = model.tags || []
  if (tags.some((t) => t.includes('Image'))) return 'image'
  if (tags.some((t) => t.includes('Video'))) return 'video'
  // Check by model ID patterns
  if (/dall-e|imagen|gpt-image|chatgpt-image|nano-banana/i.test(model.id)) return 'image'
  if (/veo/i.test(model.id)) return 'video'
  return 'text'
}

const CATEGORY_META: Record<ModelCategory, { label: string; icon: typeof Type; color: string }> = {
  text: { label: 'Text & Chat', icon: Type, color: '#10b981' },
  image: { label: 'Image Generation', icon: ImageIcon, color: '#6366f1' },
  video: { label: 'Video Generation', icon: Video, color: '#f59e0b' },
}

export default function ApiKeysTab() {
  const { apiKeys, loading, loadApiKeys, saveApiKey, deleteApiKey } = useAdminStore()
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [providerModels, setProviderModels] = useState<Record<string, AiModel[]>>({})
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})
  const [usageByProvider, setUsageByProvider] = useState<Record<string, ProviderUsageSummary>>({})
  const [initialLoad, setInitialLoad] = useState(true)
  const [confirmingDeleteProvider, setConfirmingDeleteProvider] = useState<string | null>(null)
  const [healthByProvider, setHealthByProvider] = useState<Record<string, ProviderHealth>>({})
  const [checkingHealth, setCheckingHealth] = useState(false)

  useEffect(() => {
    Promise.all([
      loadApiKeys(),
      getUsageStats()
        .then((stats) => {
          const map: Record<string, ProviderUsageSummary> = {}
          for (const row of stats.byProvider) {
            map[row.provider] = row
          }
          setUsageByProvider(map)
        })
        .catch((err) => {
          console.error('Failed to load usage stats:', err)
        }),
    ]).then(() => setInitialLoad(false))
  }, [loadApiKeys])

  // Auto-check health when keys are loaded
  useEffect(() => {
    const connectedProviders = apiKeys.filter((k) => k.isActive)
    if (connectedProviders.length === 0) return
    setCheckingHealth(true)
    checkProviderHealth()
      .then((results) => {
        const map: Record<string, ProviderHealth> = {}
        for (const r of results) map[r.provider] = r
        setHealthByProvider(map)
      })
      .catch((err) => console.error('Health check failed:', err))
      .finally(() => setCheckingHealth(false))
  }, [apiKeys])

  // Fetch models for each connected provider
  useEffect(() => {
    const connectedProviders = apiKeys.filter((k) => k.isActive).map((k) => k.provider)
    for (const provider of connectedProviders) {
      if (providerModels[provider] || loadingModels[provider]) continue
      setLoadingModels((prev) => ({ ...prev, [provider]: true }))
      getProviderModels(provider as AiProvider)
        .then((models) => {
          setProviderModels((prev) => ({ ...prev, [provider]: models }))
        })
        .catch((err) => {
          console.error(`Failed to load models for ${provider}:`, err)
          setProviderModels((prev) => ({ ...prev, [provider]: [] }))
        })
        .finally(() => {
          setLoadingModels((prev) => ({ ...prev, [provider]: false }))
        })
    }
  }, [apiKeys]) // eslint-disable-line react-hooks/exhaustive-deps

  const getKeyConfig = (provider: AiProvider) =>
    apiKeys.find((k) => k.provider === provider)

  const handleSave = async (provider: AiProvider) => {
    const value = keyInputs[provider]?.trim()
    if (!value) return

    setErrors((prev) => ({ ...prev, [provider]: '' }))
    setSaving(provider)
    try {
      const result = await saveApiKey(provider, value)
      if (result) {
        setKeyInputs((prev) => ({ ...prev, [provider]: '' }))
        // Refresh models for this provider after key change
        setProviderModels((prev) => {
          const next = { ...prev }
          delete next[provider]
          return next
        })
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [provider]: err instanceof Error ? err.message : 'Failed to validate API key',
      }))
    } finally {
      setSaving(null)
    }
  }

  const handleRefreshModels = async (provider: AiProvider) => {
    setLoadingModels((prev) => ({ ...prev, [provider]: true }))
    try {
      const models = await getProviderModels(provider)
      setProviderModels((prev) => ({ ...prev, [provider]: models }))
    } catch (err) {
      console.error(`Failed to refresh models for ${provider}:`, err)
    } finally {
      setLoadingModels((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const handleDelete = async (provider: AiProvider) => {
    setConfirmingDeleteProvider(null)
    setDeleting(provider)
    await deleteApiKey(provider)
    setDeleting(null)
    // Clear cached models for this provider
    setProviderModels((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })
  }

  if (initialLoad && loading) {
    return <Loader label="Loading API keys..." />
  }

  const handleCheckHealth = async () => {
    setCheckingHealth(true)
    try {
      const results = await checkProviderHealth()
      const map: Record<string, ProviderHealth> = {}
      for (const r of results) map[r.provider] = r
      setHealthByProvider(map)
    } catch (err) {
      console.error('Health check failed:', err)
    } finally {
      setCheckingHealth(false)
    }
  }

  const unhealthyProviders = Object.values(healthByProvider).filter(
    (h) => h.status === 'quota_exceeded' || h.status === 'invalid'
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-[#f8fafc]">
            AI Provider API Keys
          </h3>
          <button
            onClick={handleCheckHealth}
            disabled={checkingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-white/10 text-[#cbd5e1] hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            <Activity className={`h-3.5 w-3.5 ${checkingHealth ? 'animate-pulse' : ''}`} />
            {checkingHealth ? 'Checking...' : 'Check Health'}
          </button>
        </div>
        <p className="text-sm text-[#cbd5e1]">
          Configure API keys to enable AI models for content generation.
          Keys are validated before saving.
        </p>
      </div>

      {/* Health warning banner */}
      {unhealthyProviders.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {unhealthyProviders.length === 1
              ? '1 provider has issues'
              : `${unhealthyProviders.length} providers have issues`}
          </div>
          {unhealthyProviders.map((h) => (
            <div key={h.provider} className="flex items-start gap-2 text-xs text-red-300/80 ml-6">
              <span className="font-medium capitalize">{h.provider}:</span>
              <span>{h.message}</span>
            </div>
          ))}
          <p className="text-xs text-red-300/60 ml-6">
            Content generation will fail for these providers. Add credits or configure additional providers as fallback.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {PROVIDERS.map((provider) => {
          const config = getKeyConfig(provider.id)
          const isConnected = !!config && config.isActive
          const inputValue = keyInputs[provider.id] || ''
          const models = providerModels[provider.id]
          const isLoadingModels = loadingModels[provider.id]
          const usage = usageByProvider[provider.id]
          const health = healthByProvider[provider.id]

          return (
            <div
              key={provider.id}
              className={`rounded-xl border p-5 space-y-4 ${
                health?.status === 'quota_exceeded' ? 'border-red-500/30 bg-red-500/5' :
                health?.status === 'invalid' ? 'border-red-500/30 bg-red-500/5' :
                'border-white/10 bg-white/5'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Sparkles className="h-5 w-5 text-[#6366f1]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#f8fafc]">
                      {provider.name}
                    </p>
                    {isConnected && (
                      <p className="text-xs text-[#cbd5e1]">{config.maskedKey}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && health && (
                    <Badge variant={health.status === 'healthy' ? 'green' : 'rose'}>
                      <span className="flex items-center gap-1">
                        {health.status === 'healthy' ? (
                          <><ShieldCheck className="h-3 w-3" /> Healthy</>
                        ) : health.status === 'quota_exceeded' ? (
                          <><ShieldAlert className="h-3 w-3" /> Quota Exceeded</>
                        ) : health.status === 'invalid' ? (
                          <><ShieldAlert className="h-3 w-3" /> Invalid Key</>
                        ) : (
                          <><AlertCircle className="h-3 w-3" /> Error</>
                        )}
                      </span>
                    </Badge>
                  )}
                  {isConnected && checkingHealth && !health && (
                    <Badge variant="outline">
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                      </span>
                    </Badge>
                  )}
                  <Badge variant={isConnected ? 'green' : 'outline'}>
                    {isConnected ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    ) : (
                      'Not configured'
                    )}
                  </Badge>
                </div>
              </div>

              {/* Health warning */}
              {health && health.status !== 'healthy' && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{health.message}</span>
                </div>
              )}

              {/* Key Input */}
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={isConnected ? 'Enter new key to update' : 'Enter API key'}
                  value={inputValue}
                  onChange={(e) => {
                    setKeyInputs((prev) => ({
                      ...prev,
                      [provider.id]: e.target.value,
                    }))
                    if (errors[provider.id]) {
                      setErrors((prev) => ({ ...prev, [provider.id]: '' }))
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave(provider.id)
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleSave(provider.id)}
                  loading={saving === provider.id}
                  disabled={!inputValue.trim()}
                  className="shrink-0"
                >
                  Save
                </Button>
                {isConnected && (
                  confirmingDeleteProvider === provider.id ? (
                    <span className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteProvider(null)}
                        className="px-2 py-1 text-xs rounded bg-white/5 text-[#cbd5e1] border border-white/10 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmingDeleteProvider(provider.id)}
                      loading={deleting === provider.id}
                      className="shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )
                )}
              </div>

              {/* Validation error */}
              {errors[provider.id] && (
                <div className="flex items-start gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errors[provider.id]}</span>
                </div>
              )}

              {/* Usage stats */}
              {isConnected && usage && (
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                    <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium text-[#f8fafc]">Usage Summary</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-[#f8fafc]">{usage.generation_count}</p>
                      <p className="text-[10px] text-[#94a3b8]">Generations</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-[#f8fafc]">{(usage.total_tokens / 1000).toFixed(1)}k</p>
                      <p className="text-[10px] text-[#94a3b8]">Tokens used</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-emerald-400">${usage.total_cost_usd.toFixed(4)}</p>
                      <p className="text-[10px] text-[#94a3b8]">Total spent</p>
                    </div>
                  </div>
                </div>
              )}

              {isConnected && !usage && (
                <div className="flex items-center gap-2 text-xs text-[#94a3b8] bg-white/[0.03] rounded-lg px-3 py-2">
                  <Zap className="h-3.5 w-3.5" />
                  <span>No usage yet — start generating to see stats</span>
                </div>
              )}

              {/* Models — grouped by category */}
              {isConnected && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[#cbd5e1]">
                      Available models {models?.length ? `(${models.length})` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRefreshModels(provider.id)}
                      disabled={isLoadingModels}
                      className="flex items-center gap-1 text-xs text-[#cbd5e1] hover:text-[#10b981] transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  {isLoadingModels ? (
                    <div className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading models...
                    </div>
                  ) : models && models.length > 0 ? (
                    <ModelCategoryList models={models} />
                  ) : (
                    <p className="text-xs text-[#94a3b8]">No models found</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ModelCategoryList({ models }: { models: AiModel[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ text: true })

  // Group by category
  const grouped: Record<ModelCategory, AiModel[]> = { text: [], image: [], video: [] }
  for (const m of models) {
    grouped[categorizeModel(m)].push(m)
  }

  const categories = (['text', 'image', 'video'] as ModelCategory[]).filter((c) => grouped[c].length > 0)

  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat]
        const Icon = meta.icon
        const isOpen = expanded[cat] ?? false
        const catModels = grouped[cat]

        return (
          <div key={cat} className="rounded-lg border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }))}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/[0.03] transition-colors"
            >
              {isOpen ? <ChevronDown className="h-3 w-3 text-[#94a3b8]" /> : <ChevronRight className="h-3 w-3 text-[#94a3b8]" />}
              <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
              <span className="font-medium text-[#f8fafc]">{meta.label}</span>
              <span className="text-[#94a3b8] ml-auto">{catModels.length} model{catModels.length !== 1 ? 's' : ''}</span>
            </button>
            {isOpen && (
              <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                {catModels.map((model) => (
                  <div key={model.id} className="px-3 py-2 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#f8fafc]">{model.name}</span>
                      {model.tags?.map((tag) => (
                        <Badge key={tag} variant={getTagVariant(tag)} className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {model.description && (
                      <p className="text-xs text-[#94a3b8] leading-relaxed">{model.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
