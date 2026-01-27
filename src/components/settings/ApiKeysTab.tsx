import { useEffect, useState } from 'react'
import { Trash2, Check, Sparkles, AlertCircle, Loader2, BarChart3 } from 'lucide-react'
import { useAdminStore } from '@/stores/useAdminStore'
import { getProviderModels } from '@/services/apiKeyService'
import { getUsageStats } from '@/services/usageService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AiProvider, AiModel, ProviderUsageSummary } from '@/types'

const PROVIDERS: { id: AiProvider; name: string }[] = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'xai', name: 'xAI' },
  { id: 'google', name: 'Google' },
]

export default function ApiKeysTab() {
  const { apiKeys, loadApiKeys, saveApiKey, deleteApiKey } = useAdminStore()
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [providerModels, setProviderModels] = useState<Record<string, AiModel[]>>({})
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})
  const [usageByProvider, setUsageByProvider] = useState<Record<string, ProviderUsageSummary>>({})

  useEffect(() => {
    loadApiKeys()
    // Fetch usage stats
    getUsageStats()
      .then((stats) => {
        const map: Record<string, ProviderUsageSummary> = {}
        for (const row of stats.byProvider) {
          map[row.provider] = row
        }
        setUsageByProvider(map)
      })
      .catch(() => {})
  }, [loadApiKeys])

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
        .catch(() => {
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

  const handleDelete = async (provider: AiProvider) => {
    if (!confirm(`Remove the API key for ${PROVIDERS.find((p) => p.id === provider)?.name}?`)) return

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#f9fafb] mb-1">
          AI Provider API Keys
        </h3>
        <p className="text-sm text-[#9ca3af]">
          Configure API keys to enable AI models for content generation.
          Keys are validated before saving.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {PROVIDERS.map((provider) => {
          const config = getKeyConfig(provider.id)
          const isConnected = !!config && config.isActive
          const inputValue = keyInputs[provider.id] || ''
          const models = providerModels[provider.id]
          const isLoadingModels = loadingModels[provider.id]
          const usage = usageByProvider[provider.id]

          return (
            <div
              key={provider.id}
              className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Sparkles className="h-5 w-5 text-[#a855f7]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#f9fafb]">
                      {provider.name}
                    </p>
                    {isConnected && (
                      <p className="text-xs text-[#9ca3af]">{config.maskedKey}</p>
                    )}
                  </div>
                </div>
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
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(provider.id)}
                    loading={deleting === provider.id}
                    className="shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
                <div className="flex items-center gap-4 text-xs text-[#9ca3af] bg-white/5 rounded-lg px-3 py-2">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  <span>{usage.generation_count} generations</span>
                  <span>{usage.total_tokens.toLocaleString()} tokens</span>
                  <span className="text-emerald-400">${usage.total_cost_usd.toFixed(4)}</span>
                </div>
              )}

              {/* Models — dynamically fetched when connected */}
              {isConnected && (
                <div>
                  <p className="text-xs text-[#9ca3af] mb-1.5">Available models</p>
                  {isLoadingModels ? (
                    <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading models...
                    </div>
                  ) : models && models.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {models.map((model) => (
                        <Badge key={model.id} variant="purple">
                          {model.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6b7280]">No models found</p>
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
