import { useEffect, useState } from 'react'
import { Trash2, Plus, Save, DollarSign, AlertCircle } from 'lucide-react'
import { useAdminStore } from '@/stores/useAdminStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Loader from '@/components/ui/Loader'
import type { AiProvider, ModelPricing } from '@/types'

const PROVIDERS: { id: AiProvider; name: string }[] = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'xai', name: 'xAI' },
  { id: 'google', name: 'Google' },
]

interface EditingPricing {
  id?: string
  provider: AiProvider
  modelPattern: string
  inputPricePerMillion: string
  cachedInputPricePerMillion: string
  outputPricePerMillion: string
}

export default function PricingTab() {
  const { modelPricing, loading, loadPricing, savePricing, updatePricing, deletePricing } = useAdminStore()
  const [initialLoad, setInitialLoad] = useState(true)
  const [editing, setEditing] = useState<EditingPricing | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPricing().then(() => setInitialLoad(false))
  }, [loadPricing])

  const handleAdd = () => {
    setEditing({
      provider: 'openai',
      modelPattern: '',
      inputPricePerMillion: '',
      cachedInputPricePerMillion: '',
      outputPricePerMillion: '',
    })
    setError(null)
  }

  const handleEdit = (pricing: ModelPricing) => {
    setEditing({
      id: pricing.id,
      provider: pricing.provider,
      modelPattern: pricing.modelPattern,
      inputPricePerMillion: pricing.inputPricePerMillion.toString(),
      cachedInputPricePerMillion: pricing.cachedInputPricePerMillion.toString(),
      outputPricePerMillion: pricing.outputPricePerMillion.toString(),
    })
    setError(null)
  }

  const handleCancel = () => {
    setEditing(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editing) return

    const inputPrice = parseFloat(editing.inputPricePerMillion)
    const cachedInputPrice = parseFloat(editing.cachedInputPricePerMillion) || 0
    const outputPrice = parseFloat(editing.outputPricePerMillion)

    if (!editing.modelPattern.trim()) {
      setError('Model pattern is required')
      return
    }
    if (isNaN(inputPrice) || inputPrice < 0) {
      setError('Input price must be a valid positive number')
      return
    }
    if (isNaN(outputPrice) || outputPrice < 0) {
      setError('Output price must be a valid positive number')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editing.id) {
        await updatePricing(editing.id, {
          provider: editing.provider,
          modelPattern: editing.modelPattern,
          inputPricePerMillion: inputPrice,
          cachedInputPricePerMillion: cachedInputPrice,
          outputPricePerMillion: outputPrice,
        })
      } else {
        await savePricing({
          provider: editing.provider,
          modelPattern: editing.modelPattern,
          inputPricePerMillion: inputPrice,
          cachedInputPricePerMillion: cachedInputPrice,
          outputPricePerMillion: outputPrice,
        })
      }
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pricing entry?')) return

    setDeleting(id)
    await deletePricing(id)
    setDeleting(null)
  }

  if (initialLoad && loading) {
    return <Loader label="Loading pricing data..." />
  }

  // Group pricing by provider
  const pricingByProvider: Record<string, ModelPricing[]> = {}
  for (const p of modelPricing) {
    if (!pricingByProvider[p.provider]) {
      pricingByProvider[p.provider] = []
    }
    pricingByProvider[p.provider].push(p)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#f9fafb] mb-1">
            Model Pricing
          </h3>
          <p className="text-sm text-[#9ca3af]">
            Configure pricing per model to accurately calculate API costs.
            Prices are per 1 million tokens.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!!editing}>
          <Plus className="h-4 w-4 mr-1" />
          Add Pricing
        </Button>
      </div>

      {/* Add/Edit Form */}
      {editing && (
        <div className="rounded-xl border border-[#00f0ff]/30 bg-[#00f0ff]/5 p-5 space-y-4">
          <h4 className="text-sm font-medium text-[#f9fafb]">
            {editing.id ? 'Edit Pricing' : 'Add New Pricing'}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1">Provider</label>
              <select
                value={editing.provider}
                onChange={(e) => setEditing({ ...editing, provider: e.target.value as AiProvider })}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-[#f9fafb] focus:outline-none focus:border-[#00f0ff]/60"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a1a2e]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1">Model Pattern</label>
              <Input
                placeholder="e.g. gpt-4o-mini"
                value={editing.modelPattern}
                onChange={(e) => setEditing({ ...editing, modelPattern: e.target.value })}
              />
              <p className="text-[10px] text-[#6b7280] mt-1">Prefix match (e.g. "gpt-4" matches "gpt-4-turbo")</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1">Input ($/1M tokens)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 3.00"
                value={editing.inputPricePerMillion}
                onChange={(e) => setEditing({ ...editing, inputPricePerMillion: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1">Cached Input ($/1M)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 0.75"
                value={editing.cachedInputPricePerMillion}
                onChange={(e) => setEditing({ ...editing, cachedInputPricePerMillion: e.target.value })}
              />
              <p className="text-[10px] text-[#6b7280] mt-1">Usually ~25% of input price</p>
            </div>
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1">Output ($/1M tokens)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 12.00"
                value={editing.outputPricePerMillion}
                onChange={(e) => setEditing({ ...editing, outputPricePerMillion: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Pricing List by Provider */}
      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const providerPricing = pricingByProvider[provider.id] || []
          if (providerPricing.length === 0) return null

          return (
            <div
              key={provider.id}
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                <span className="text-sm font-medium text-[#f9fafb]">{provider.name}</span>
                <span className="text-xs text-[#6b7280] ml-2">
                  {providerPricing.length} model{providerPricing.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {providerPricing.map((pricing) => (
                  <div
                    key={pricing.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-[#f9fafb]">
                          {pricing.modelPattern}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#9ca3af] mt-0.5">
                          <span>
                            Input: <span className="text-[#00f0ff]">${pricing.inputPricePerMillion}</span>/1M
                          </span>
                          {pricing.cachedInputPricePerMillion > 0 && (
                            <span>
                              Cached: <span className="text-emerald-400">${pricing.cachedInputPricePerMillion}</span>/1M
                            </span>
                          )}
                          <span>
                            Output: <span className="text-[#a855f7]">${pricing.outputPricePerMillion}</span>/1M
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pricing)}
                        disabled={!!editing}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(pricing.id)}
                        loading={deleting === pricing.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {modelPricing.length === 0 && (
          <div className="text-center py-12 text-[#6b7280]">
            <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No pricing configured yet.</p>
            <p className="text-xs mt-1">Add model pricing to enable accurate cost tracking.</p>
          </div>
        )}
      </div>
    </div>
  )
}
