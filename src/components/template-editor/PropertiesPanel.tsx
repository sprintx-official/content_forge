import { Trash2 } from 'lucide-react'
import type { TemplateElement, ElementSource } from './templateTypes'
import { SOURCE_BINDINGS } from './templateTypes'

interface PropertiesPanelProps {
  element: TemplateElement | null
  onUpdate: (element: TemplateElement) => void
  onDelete: (elementId: string) => void
}

const SOURCE_OPTIONS: { value: ElementSource; label: string }[] = [
  { value: 'ai-generated', label: 'AI-generated' },
  { value: 'agent-branding', label: 'Agent branding' },
  { value: 'post-derived', label: 'Post-derived' },
  { value: 'static', label: 'Static' },
]

export default function PropertiesPanel({
  element,
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="p-4 text-center text-[#cbd5e1] text-sm">
        Select an element to edit its properties
      </div>
    )
  }

  // Helpers to update fields
  function updateField<K extends keyof TemplateElement>(
    key: K,
    value: TemplateElement[K]
  ) {
    if (!element) return
    onUpdate({ ...element, [key]: value })
  }

  function updateProperty(key: string, value: unknown) {
    if (!element) return
    onUpdate({
      ...element,
      properties: { ...element.properties, [key]: value },
    })
  }

  const bindings = SOURCE_BINDINGS[element.source] ?? []

  return (
    <div className="p-4 space-y-4">
      {/* Element ID / type header */}
      <div>
        <p className="text-xs text-[#cbd5e1]">
          {element.type} &middot; {element.id}
        </p>
      </div>

      {/* Position section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider">
          Position
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[#cbd5e1] block mb-1">X (%)</label>
            <input
              type="number"
              step={0.1}
              value={element.x}
              onChange={(e) => updateField('x', parseFloat(e.target.value) || 0)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
            />
          </div>
          <div>
            <label className="text-xs text-[#cbd5e1] block mb-1">Y (%)</label>
            <input
              type="number"
              step={0.1}
              value={element.y}
              onChange={(e) => updateField('y', parseFloat(e.target.value) || 0)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
            />
          </div>
          <div>
            <label className="text-xs text-[#cbd5e1] block mb-1">Width (%)</label>
            <input
              type="number"
              step={0.1}
              value={element.width}
              onChange={(e) =>
                updateField('width', parseFloat(e.target.value) || 0)
              }
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
            />
          </div>
          <div>
            <label className="text-xs text-[#cbd5e1] block mb-1">Height (%)</label>
            <input
              type="number"
              step={0.1}
              value={element.height}
              onChange={(e) =>
                updateField('height', parseFloat(e.target.value) || 0)
              }
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[#cbd5e1] block mb-1">Rotation</label>
            <input
              type="number"
              step={1}
              value={element.rotation ?? 0}
              onChange={(e) =>
                updateField('rotation', parseFloat(e.target.value) || 0)
              }
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10" />

      {/* Source section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider">
          Source
        </h4>
        <div className="space-y-1">
          {SOURCE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-xs cursor-pointer text-[#f8fafc]"
            >
              <input
                type="radio"
                name={`source-${element.id}`}
                checked={element.source === opt.value}
                onChange={() => {
                  const newBindings = SOURCE_BINDINGS[opt.value]
                  updateField('source', opt.value)
                  // Clear binding when switching source if current binding not valid
                  if (
                    element.binding &&
                    !newBindings.includes(element.binding)
                  ) {
                    onUpdate({
                      ...element,
                      source: opt.value,
                      binding: newBindings[0] ?? undefined,
                    })
                  }
                }}
                className="accent-[#10b981]"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {element.source !== 'static' && bindings.length > 0 && (
          <div>
            <label className="text-xs text-[#cbd5e1] block mb-1">Binding</label>
            <select
              className="bg-[#1e293b] border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
              value={element.binding ?? ''}
              onChange={(e) => updateField('binding', e.target.value || undefined)}
            >
              <option value="">-- none --</option>
              {bindings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-t border-white/10" />

      {/* Style section - varies by type */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider">
          Style
        </h4>

        {/* TEXT properties */}
        {element.type === 'text' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-[#cbd5e1] block mb-1">Font Family</label>
              <input
                value={element.properties.fontFamily ?? ''}
                onChange={(e) => updateProperty('fontFamily', e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                placeholder="Inter Display"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Font Size</label>
                <input
                  type="number"
                  step={0.1}
                  value={element.properties.fontSize ?? 4}
                  onChange={(e) =>
                    updateProperty('fontSize', parseFloat(e.target.value) || 4)
                  }
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                />
              </div>
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Font Weight</label>
                <select
                  className="bg-[#1e293b] border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  value={element.properties.fontWeight ?? 'normal'}
                  onChange={(e) => updateProperty('fontWeight', e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#cbd5e1] block mb-1">Color</label>
              <input
                value={element.properties.color ?? '#ffffff'}
                onChange={(e) => updateProperty('color', e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                placeholder="#ffffff"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Text Align</label>
                <select
                  className="bg-[#1e293b] border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  value={element.properties.textAlign ?? 'left'}
                  onChange={(e) => updateProperty('textAlign', e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Line Height</label>
                <input
                  type="number"
                  step={0.05}
                  value={element.properties.lineHeight ?? 1.3}
                  onChange={(e) =>
                    updateProperty(
                      'lineHeight',
                      parseFloat(e.target.value) || 1.3
                    )
                  }
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                />
              </div>
            </div>
            {element.source === 'static' && (
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Text</label>
                <input
                  value={element.properties.text ?? ''}
                  onChange={(e) => updateProperty('text', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  placeholder="Enter text..."
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.properties.autoFit ?? false}
                onChange={(e) =>
                  updateProperty('autoFit', e.target.checked)
                }
                className="accent-[#10b981]"
              />
              <label className="text-xs text-[#f8fafc]">Auto-fit text</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.properties.highlightKeywords ?? false}
                onChange={(e) =>
                  updateProperty('highlightKeywords', e.target.checked)
                }
                className="accent-[#10b981]"
              />
              <label className="text-xs text-[#f8fafc]">Highlight keywords</label>
            </div>
          </div>
        )}

        {/* IMAGE properties */}
        {element.type === 'image' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.properties.adaptToBrightness ?? false}
                onChange={(e) =>
                  updateProperty('adaptToBrightness', e.target.checked)
                }
                className="accent-[#10b981]"
              />
              <label className="text-xs text-[#f8fafc]">Adapt to brightness</label>
            </div>
          </div>
        )}

        {/* SHAPE properties */}
        {element.type === 'shape' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-[#cbd5e1] block mb-1">Fill</label>
              <input
                value={element.properties.fill ?? '#cccccc'}
                onChange={(e) => updateProperty('fill', e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                placeholder="#cccccc"
              />
            </div>
            <div>
              <label className="text-xs text-[#cbd5e1] block mb-1">Stroke</label>
              <input
                value={element.properties.stroke ?? 'transparent'}
                onChange={(e) => updateProperty('stroke', e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                placeholder="transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Stroke Width</label>
                <input
                  type="number"
                  step={0.5}
                  value={element.properties.strokeWidth ?? 0}
                  onChange={(e) =>
                    updateProperty(
                      'strokeWidth',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                />
              </div>
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Border Radius</label>
                <input
                  type="number"
                  step={1}
                  value={element.properties.borderRadius ?? 0}
                  onChange={(e) =>
                    updateProperty(
                      'borderRadius',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#cbd5e1] block mb-1">Opacity (0-1)</label>
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={element.properties.opacity ?? 1}
                onChange={(e) =>
                  updateProperty(
                    'opacity',
                    parseFloat(e.target.value) || 1
                  )
                }
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
              />
            </div>
          </div>
        )}

        {/* QR CODE properties */}
        {element.type === 'qr-code' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.properties.showCaption ?? false}
                onChange={(e) =>
                  updateProperty('showCaption', e.target.checked)
                }
                className="accent-[#10b981]"
              />
              <label className="text-xs text-[#f8fafc]">Show caption</label>
            </div>
            {element.properties.showCaption && (
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">Caption text</label>
                <input
                  value={element.properties.captionText ?? ''}
                  onChange={(e) =>
                    updateProperty('captionText', e.target.value)
                  }
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  placeholder="Scan for source"
                />
              </div>
            )}
          </div>
        )}

        {/* GRADIENT properties */}
        {element.type === 'gradient' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-[#cbd5e1] block mb-1">Direction</label>
              <select
                className="bg-[#1e293b] border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                value={element.properties.direction ?? 'vertical'}
                onChange={(e) =>
                  updateProperty(
                    'direction',
                    e.target.value as 'vertical' | 'horizontal'
                  )
                }
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.properties.adaptToBackground ?? false}
                onChange={(e) =>
                  updateProperty('adaptToBackground', e.target.checked)
                }
                className="accent-[#10b981]"
              />
              <label className="text-xs text-[#f8fafc]">Adapt to background</label>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10" />

      {/* Visibility section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider">
          Visibility
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={element.visible}
            onChange={(e) =>
              updateField('visible', e.target.checked)
            }
            className="accent-[#10b981]"
          />
          <label className="text-xs text-[#f8fafc]">Visible</label>
        </div>
      </div>

      <div className="border-t border-white/10" />

      {/* Delete */}
      <div>
        <button
          className="w-full flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded px-2 py-1.5 text-xs"
          onClick={() => onDelete(element.id)}
        >
          <Trash2 className="size-3.5" />
          Delete element
        </button>
      </div>
    </div>
  )
}
