import { useEffect, useState } from 'react'
import { Cpu, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import { getAvailableModels } from '@/services/apiKeyService'
import { Badge } from '@/components/ui/badge'
import { getTagVariant } from '@/lib/modelTagColors'
import type { AiModel } from '@/types'

// Cheapest / fastest Veo model should be auto-selected
const PREFERRED_AUTO_MODEL = 'veo-3.1-fast-generate-preview'

function isVideoModel(model: AiModel): boolean {
  return model.id.startsWith('veo-')
}

export function VideoModelSelector() {
  const selectedModel = useForgeStore((s) => s.selectedModel)
  const setModel = useForgeStore((s) => s.setModel)
  const [allModels, setAllModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const videoModels = allModels.filter(isVideoModel)

  useEffect(() => {
    setLoading(true)
    getAvailableModels()
      .then((models) => {
        setAllModels(models)
        // Auto-select cheapest video model if nothing selected or current selection is not a video model
        const vModels = models.filter(isVideoModel)
        if (vModels.length > 0) {
          const currentIsVideo = selectedModel && vModels.some((m) => m.id === selectedModel.modelId)
          if (!currentIsVideo) {
            const preferred = vModels.find((m) => m.id === PREFERRED_AUTO_MODEL) ?? vModels[vModels.length - 1]
            setModel({ modelId: preferred.id, provider: preferred.provider })
          }
        }
      })
      .catch(() => setAllModels([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">
          <Cpu className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Video Model
        </label>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/20">
          Loading models...
        </div>
      </div>
    )
  }

  if (videoModels.length === 0) {
    return (
      <div>
        <label className="block text-xs font-medium text-white/40 mb-2">
          <Cpu className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Video Model
        </label>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/30">
          No video models available — add a Google API key in Settings
        </div>
      </div>
    )
  }

  const selectedLabel = videoModels.find((m) => m.id === selectedModel?.modelId)?.name || selectedModel?.modelId || 'Select a model...'

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-white/40 mb-2">
        <Cpu className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        Video Model
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between',
          'bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-left',
          'hover:border-white/20 transition-all cursor-pointer',
          selectedModel ? 'text-[#f9fafb]' : 'text-white/30',
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform shrink-0 ml-1', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#0f1420] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {videoModels.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                setModel({ modelId: model.id, provider: model.provider })
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-4 py-2.5 transition-colors cursor-pointer',
                selectedModel?.modelId === model.id
                  ? 'bg-[#00f0ff]/10'
                  : 'hover:bg-white/5',
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'text-sm',
                  selectedModel?.modelId === model.id ? 'text-[#00f0ff]' : 'text-[#d1d5db]',
                )}>
                  {model.name}
                </span>
                {model.tags?.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant={getTagVariant(tag)} className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
              {model.description && (
                <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-1">{model.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
