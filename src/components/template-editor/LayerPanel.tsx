import { Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react'
import type { TemplateElement } from './templateTypes'

interface LayerPanelProps {
  elements: TemplateElement[]
  selectedId: string | null
  onSelect: (elementId: string) => void
  onToggleVisibility: (elementId: string) => void
  onReorder: (elementId: string, direction: 'up' | 'down') => void
}

const SOURCE_COLORS: Record<string, string> = {
  'ai-generated': 'bg-purple-500',
  'agent-branding': 'bg-blue-500',
  'post-derived': 'bg-green-500',
  static: 'bg-gray-400',
}

function getDisplayName(element: TemplateElement): string {
  const typeLabel = element.type.charAt(0).toUpperCase() + element.type.slice(1)
  if (element.binding) {
    return `${typeLabel}: ${element.binding}`
  }
  if (element.properties.text) {
    const preview = element.properties.text.slice(0, 16)
    return `${typeLabel}: "${preview}${element.properties.text.length > 16 ? '...' : ''}"`
  }
  return `${typeLabel}: ${element.id}`
}

export default function LayerPanel({
  elements,
  selectedId,
  onSelect,
  onToggleVisibility,
  onReorder,
}: LayerPanelProps) {
  // Sort by zIndex highest first (top of visual stack)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 pb-1">
        <h3 className="text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider">
          Layers
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 pb-2 space-y-0.5">
          {sorted.map((element) => {
            const isSelected = selectedId === element.id
            return (
              <div
                key={element.id}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                  isSelected
                    ? 'bg-[#10b981]/20 text-[#10b981]'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => onSelect(element.id)}
              >
                {/* Source color dot */}
                <span
                  className={`size-2 rounded-full shrink-0 ${
                    SOURCE_COLORS[element.source] ?? 'bg-gray-400'
                  }`}
                />

                {/* Element name */}
                <span className="flex-1 truncate text-[#f8fafc]">
                  {getDisplayName(element)}
                </span>

                {/* Visibility toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleVisibility(element.id)
                  }}
                  className="p-0.5 hover:bg-white/10 rounded shrink-0 text-[#cbd5e1]"
                >
                  {element.visible ? (
                    <Eye className="size-3" />
                  ) : (
                    <EyeOff className="size-3" />
                  )}
                </button>

                {/* Reorder buttons */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(element.id, 'up')
                  }}
                  className="p-0.5 hover:bg-white/10 rounded shrink-0 text-[#cbd5e1]"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(element.id, 'down')
                  }}
                  className="p-0.5 hover:bg-white/10 rounded shrink-0 text-[#cbd5e1]"
                >
                  <ArrowDown className="size-3" />
                </button>
              </div>
            )
          })}

          {sorted.length === 0 && (
            <p className="text-xs text-[#cbd5e1] text-center py-4">
              No elements yet. Add one from the panel above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
