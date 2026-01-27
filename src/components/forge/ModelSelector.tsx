import { useEffect, useState } from 'react'
import { Cpu, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import { getAvailableModels } from '@/services/apiKeyService'
import type { AiModel } from '@/types'

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
  google: 'Google',
}

export default function ModelSelector() {
  const selectedModel = useForgeStore((s) => s.selectedModel)
  const setModel = useForgeStore((s) => s.setModel)
  const [models, setModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    getAvailableModels()
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoading(false))
  }, [])

  // Group models by provider
  const grouped = models.reduce<Record<string, AiModel[]>>((acc, model) => {
    const key = model.provider
    if (!acc[key]) acc[key] = []
    acc[key].push(model)
    return acc
  }, {})

  const selectedLabel = selectedModel
    ? models.find((m) => m.id === selectedModel.modelId)?.name || selectedModel.modelId
    : null

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-[#d1d5db] mb-2">
          <Cpu className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          AI Model
        </label>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#6b7280]">
          Loading models...
        </div>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-[#d1d5db] mb-2">
          <Cpu className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          AI Model
        </label>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#9ca3af]">
          No models available — configure API keys in Settings
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[#d1d5db] mb-2">
        <Cpu className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        AI Model
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between',
          'bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-left',
          'hover:border-white/20 transition-all cursor-pointer',
          selectedModel ? 'text-[#f9fafb]' : 'text-[#6b7280]',
        )}
      >
        <span>{selectedLabel || 'Select a model...'}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#0f1420] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <div key={provider}>
              <div className="px-4 py-2 text-xs font-semibold text-[#9ca3af] uppercase tracking-wider bg-white/5 sticky top-0">
                {PROVIDER_LABELS[provider] || provider}
              </div>
              {providerModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setModel({ modelId: model.id, provider: model.provider })
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer',
                    selectedModel?.modelId === model.id
                      ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                      : 'text-[#d1d5db] hover:bg-white/5',
                  )}
                >
                  {model.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
