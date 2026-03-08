import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw, Save, Copy, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

interface TemplateElementProps {
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  color?: string
  textAlign?: string
  lineHeight?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  borderRadius?: number
  opacity?: number
  gradientStops?: Array<{ offset: number; color: string }>
  direction?: string
  [key: string]: unknown
}

interface TemplateElement {
  id: string
  type: 'text' | 'image' | 'shape' | 'qr-code' | 'gradient'
  source: string
  binding?: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  visible: boolean
  properties: TemplateElementProps
}

interface ImageTemplate {
  name: string
  squareWidth: number
  squareHeight: number
  landscapeWidth: number
  landscapeHeight: number
  verticalWidth: number
  verticalHeight: number
  elements: TemplateElement[]
}

interface TemplatePreset {
  id: string
  name: string
  description: string
}

interface Format {
  id: 'square' | 'landscape' | 'vertical'
  label: string
  sub: string
  platforms: string[]
  width: number
  height: number
  ratio: number
}

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

const FORMATS: Format[] = [
  { id: 'square', label: 'Square', sub: '1080×1080', platforms: ['Instagram', 'Facebook'], width: 1080, height: 1080, ratio: 1 },
  { id: 'landscape', label: 'Landscape', sub: '1200×627', platforms: ['Twitter/X', 'LinkedIn'], width: 1200, height: 627, ratio: 1200 / 627 },
  { id: 'vertical', label: 'Vertical', sub: '1080×1350', platforms: ['Stories', 'Pinterest'], width: 1080, height: 1350, ratio: 1080 / 1350 },
]

const TYPE_COLORS: Record<string, string> = {
  image: '#10b981',
  gradient: '#6366f1',
  text: '#f59e0b',
  shape: '#ec4899',
  'qr-code': '#94a3b8',
}

const DUMMY_PRESETS: TemplatePreset[] = [
  { id: 'default', name: 'Default', description: 'Classic minimal layout' },
  { id: 'news-overlay', name: 'Breaking News', description: 'Bold news styling' },
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple' },
  { id: 'bold', name: 'Bold Header', description: 'Large headline focus' },
]

// ────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────

export default function AgentImageTemplateTab({ agentId }: { agentId: string }) {
  const [template, setTemplate] = useState<ImageTemplate | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [currentFormat, setCurrentFormat] = useState<'square' | 'landscape' | 'vertical'>('square')
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const currentFormatConfig = FORMATS.find(f => f.id === currentFormat)!

  // Load template and presets
  useEffect(() => {
    const loadData = async () => {
      try {
        const d = await api.get<{ template: ImageTemplate; isCustom: boolean }>(`/api/image-templates/${agentId}`)
        setTemplate(d.template)
        setIsCustom(d.isCustom)
      } catch {
        setMessage('Failed to load template')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [agentId])

  // Apply preset
  const applyPreset = useCallback(async (presetId: string) => {
    try {
      const d = await api.get<{ template: ImageTemplate }>(`/api/image-templates/presets/${presetId}`)
      setTemplate(d.template)
      setIsCustom(true)
    } catch {
      setMessage('Failed to load preset')
    }
  }, [])

  // Save template
  const save = async () => {
    if (!template) return
    setSaving(true)
    try {
      await api.put(`/api/image-templates/${agentId}`, { template })
      setIsCustom(true)
      setMessage('Template saved successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Reset to default
  const reset = async () => {
    if (!confirm('Reset to default template?')) return
    try {
      await api.delete(`/api/image-templates/${agentId}`)
      const d = await api.get<{ template: ImageTemplate; isCustom: boolean }>(`/api/image-templates/${agentId}`)
      setTemplate(d.template)
      setIsCustom(d.isCustom)
      setMessage('Template reset to default')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Failed to reset template')
    }
  }

  // Duplicate template as new custom preset
  const duplicate = () => {
    if (!template) return
    const newTemplate = JSON.parse(JSON.stringify(template))
    newTemplate.name = `${template.name} (Copy)`
    setTemplate(newTemplate)
    setIsCustom(true)
    setMessage('Template duplicated (unsaved)')
  }

  // Handle canvas mouse down
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!template || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const percentX = (mouseX / rect.width) * 100
    const percentY = (mouseY / rect.height) * 100

    // Find clicked element
    const clicked = template.elements
      .filter(el => el.visible)
      .reverse()
      .find(el => {
        const left = el.x
        const top = el.y
        const right = el.x + el.width
        const bottom = el.y + el.height
        return percentX >= left && percentX <= right && percentY >= top && percentY <= bottom
      })

    if (clicked) {
      setSelectedElementId(clicked.id)
      setIsDragging(true)
      setDragStart({
        mouseX: percentX,
        mouseY: percentY,
        elemX: clicked.x,
        elemY: clicked.y,
      })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !template || !canvasRef.current || !selectedElementId) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const percentX = (mouseX / rect.width) * 100
    const percentY = (mouseY / rect.height) * 100

    const deltaX = percentX - dragStart.mouseX
    const deltaY = percentY - dragStart.mouseY

    const newX = Math.max(0, Math.min(100 - template.elements.find(el => el.id === selectedElementId)!.width, dragStart.elemX + deltaX))
    const newY = Math.max(0, Math.min(100 - template.elements.find(el => el.id === selectedElementId)!.height, dragStart.elemY + deltaY))

    setTemplate({
      ...template,
      elements: template.elements.map(el =>
        el.id === selectedElementId ? { ...el, x: newX, y: newY } : el
      ),
    })
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  // Update element properties
  const updateElementProp = (elementId: string, key: string, value: unknown) => {
    if (!template) return
    setTemplate({
      ...template,
      elements: template.elements.map(el =>
        el.id === elementId
          ? key.startsWith('prop:')
            ? { ...el, properties: { ...el.properties, [key.slice(5)]: value } }
            : { ...el, [key]: value }
          : el
      ),
    })
  }

  // Toggle element visibility
  const toggleElement = (elementId: string) => {
    if (!template) return
    setTemplate({
      ...template,
      elements: template.elements.map(el =>
        el.id === elementId ? { ...el, visible: !el.visible } : el
      ),
    })
  }

  if (loading) {
    return <div className="text-[#cbd5e1] py-4">Loading template...</div>
  }

  if (!template) {
    return <div className="text-[#cbd5e1] py-4">No template found</div>
  }

  const selectedElement = template.elements.find(el => el.id === selectedElementId)

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 text-sm text-[#10b981]">
          {message}
        </div>
      )}

      {/* Header: Template name + status */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="flex-1">
          <label className="text-xs text-[#cbd5e1] uppercase tracking-wider block mb-1.5">
            Template Name
          </label>
          <input
            type="text"
            value={template.name}
            onChange={e => setTemplate({ ...template, name: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm w-full"
            placeholder="Template name"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <span className="text-xs font-medium px-2 py-1 rounded bg-white/5 border border-white/10 text-[#cbd5e1]">
            {isCustom ? 'Custom' : 'Default'}
          </span>
        </div>
      </div>

      {/* Format Tabs */}
      <div>
        <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-3">Format</h4>
        <div className="flex gap-2">
          {FORMATS.map(format => (
            <button
              key={format.id}
              onClick={() => setCurrentFormat(format.id)}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                currentFormat === format.id
                  ? 'bg-[#10b981]/20 border-[#10b981]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-medium text-[#f8fafc]">{format.label}</div>
              <div className="text-xs text-[#cbd5e1]">{format.sub}</div>
              <div className="text-[10px] text-[#cbd5e1] mt-1">{format.platforms.join(', ')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Gallery */}
      <div>
        <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-3">Presets</h4>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {DUMMY_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="flex-shrink-0 w-32 p-3 rounded-lg border border-white/10 hover:border-[#10b981]/50 hover:bg-white/5 transition-all bg-white/[0.03]"
            >
              {/* Visual preview */}
              <div className="w-full aspect-square bg-gradient-to-br from-[#6366f1] to-[#10b981] rounded mb-2 flex items-center justify-center text-[8px] text-white font-semibold">
                PREVIEW
              </div>
              <div className="text-xs font-medium text-[#f8fafc] truncate">{preset.name}</div>
              <div className="text-[10px] text-[#cbd5e1] truncate">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas + Properties split */}
      <div className="grid grid-cols-3 gap-4">
        {/* Canvas */}
        <div className="col-span-2">
          <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-3">Canvas</h4>
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="relative bg-[#0f172a] border border-white/10 rounded-lg overflow-hidden cursor-crosshair"
            style={{ aspectRatio: currentFormatConfig.ratio }}
          >
            {/* Grid background */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'none' }}
            >
              <defs>
                <pattern id="grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
                  <path d="M 10% 0 L 0 0 0 10%" fill="none" stroke="white" strokeWidth="0.5" opacity="0.05" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Elements */}
            <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              {template.elements.map(el => {
                if (!el.visible) return null
                const isSelected = el.id === selectedElementId
                const color = TYPE_COLORS[el.type] || '#94a3b8'
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className="absolute transition-all"
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                      border: isSelected ? `2px solid #60a5fa` : `1px solid ${color}`,
                      backgroundColor: `${color}15`,
                      pointerEvents: 'auto',
                      cursor: 'grab',
                      zIndex: el.zIndex,
                    }}
                  >
                    {/* Label */}
                    <div
                      className="text-[10px] font-medium px-1.5 py-1 absolute -top-5 left-0 bg-[#10b981]/20 border border-[#10b981]/50 rounded whitespace-nowrap"
                      style={{ color, pointerEvents: 'none' }}
                    >
                      {el.id}
                    </div>
                    {/* Selection handles */}
                    {isSelected && (
                      <>
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full border border-blue-300" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full border border-blue-300" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 rounded-full border border-blue-300" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 rounded-full border border-blue-300" />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="col-span-1">
          <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-3">Properties</h4>
          {selectedElement ? (
            <div className="space-y-4 bg-white/5 border border-white/10 rounded-lg p-3">
              {/* Basic properties */}
              <div>
                <label className="text-xs text-[#cbd5e1] block mb-1">ID</label>
                <input
                  type="text"
                  value={selectedElement.id}
                  disabled
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#cbd5e1] block mb-1">X %</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.x * 100) / 100}
                    onChange={e => updateElementProp(selectedElement.id, 'x', parseFloat(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#cbd5e1] block mb-1">Y %</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.y * 100) / 100}
                    onChange={e => updateElementProp(selectedElement.id, 'y', parseFloat(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#cbd5e1] block mb-1">Width %</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.width * 100) / 100}
                    onChange={e => updateElementProp(selectedElement.id, 'width', parseFloat(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#cbd5e1] block mb-1">Height %</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.height * 100) / 100}
                    onChange={e => updateElementProp(selectedElement.id, 'height', parseFloat(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                  />
                </div>
              </div>

              {/* Text element properties */}
              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <label className="text-xs text-[#cbd5e1] block mb-1">Color</label>
                    <input
                      type="text"
                      value={selectedElement.properties.color || '#ffffff'}
                      onChange={e => updateElementProp(selectedElement.id, 'prop:color', e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                      placeholder="#ffffff"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#cbd5e1] block mb-1">Font Size</label>
                    <input
                      type="number"
                      value={selectedElement.properties.fontSize || 16}
                      onChange={e => updateElementProp(selectedElement.id, 'prop:fontSize', parseFloat(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#cbd5e1] block mb-1">Text Align</label>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as const).map(align => (
                        <button
                          key={align}
                          onClick={() => updateElementProp(selectedElement.id, 'prop:textAlign', align)}
                          className={`flex-1 text-xs px-2 py-1 rounded ${
                            selectedElement.properties.textAlign === align
                              ? 'bg-[#10b981] text-[#0f172a]'
                              : 'bg-white/5 border border-white/10 text-[#f8fafc]'
                          }`}
                        >
                          {align.charAt(0).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Visibility toggle */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={() => toggleElement(selectedElement.id)}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1.5 text-xs text-[#f8fafc]"
                >
                  {selectedElement.visible ? (
                    <>
                      <Eye className="w-3 h-3" /> Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" /> Hidden
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[#cbd5e1] text-sm text-center py-8 bg-white/5 border border-white/10 rounded-lg">
              Click an element on canvas to edit
            </div>
          )}
        </div>
      </div>

      {/* Elements List */}
      <div>
        <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-3">Elements</h4>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {template.elements.sort((a, b) => b.zIndex - a.zIndex).map(el => (
            <div
              key={el.id}
              onClick={() => setSelectedElementId(el.id)}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                selectedElementId === el.id
                  ? 'bg-[#10b981]/20 border border-[#10b981]'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[el.type] || '#94a3b8' }}
                />
                <span className="text-xs text-[#f8fafc] truncate">{el.id}</span>
                <span className="text-[10px] text-[#cbd5e1] whitespace-nowrap">{el.type}</span>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  toggleElement(el.id)
                }}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded"
              >
                {el.visible ? (
                  <Eye className="w-3.5 h-3.5 text-[#10b981]" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-[#cbd5e1]" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={duplicate}
          className="bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#6366f1] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </button>
        {isCustom && (
          <button
            onClick={reset}
            className="bg-white/5 hover:bg-white/10 text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
