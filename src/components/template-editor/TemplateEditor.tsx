import { useState, useRef, useCallback } from 'react'
import { Save, Play, Monitor, Smartphone, RectangleVertical, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { ImageTemplate, TemplateElement, ElementType } from './templateTypes'

import TemplateCanvas, { type TemplateCanvasHandle } from './TemplateCanvas'
import ElementPanel from './ElementPanel'
import PropertiesPanel from './PropertiesPanel'
import LayerPanel from './LayerPanel'

interface TemplateEditorProps {
  initialTemplate: ImageTemplate
  templateId?: string
  templateName: string
  onSave: (template: ImageTemplate, name: string) => Promise<void>
  onClose?: () => void
}

// Default properties for new elements
function createDefaultElement(
  type: ElementType,
  zIndex: number
): TemplateElement {
  const base = {
    id: crypto.randomUUID(),
    x: 25,
    y: 25,
    width: 50,
    height: 15,
    rotation: 0,
    zIndex,
    visible: true,
  }

  switch (type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        source: 'static',
        properties: {
          text: 'New text',
          fontFamily: 'Inter Display',
          fontSize: 4,
          fontWeight: 'normal',
          color: '#ffffff',
          textAlign: 'left',
          lineHeight: 1.3,
        },
      }
    case 'image':
      return {
        ...base,
        type: 'image',
        source: 'ai-generated',
        binding: 'background_image',
        height: 50,
        properties: {},
      }
    case 'shape':
      return {
        ...base,
        type: 'shape',
        source: 'static',
        height: 20,
        properties: {
          fill: '#cccccc',
          stroke: 'transparent',
          strokeWidth: 0,
          borderRadius: 0,
          opacity: 1,
        },
      }
    case 'qr-code':
      return {
        ...base,
        type: 'qr-code',
        source: 'post-derived',
        binding: 'qr_url',
        x: 80,
        y: 5,
        width: 12,
        height: 12,
        properties: {
          showCaption: true,
          captionText: 'Scan for source',
        },
      }
    case 'gradient':
      return {
        ...base,
        type: 'gradient',
        source: 'static',
        x: 0,
        y: 50,
        width: 100,
        height: 50,
        properties: {
          direction: 'vertical',
          adaptToBackground: true,
          gradientStops: [
            { offset: 0, color: 'rgba(0,0,0,0)' },
            { offset: 1, color: 'rgba(0,0,0,0.85)' },
          ],
        },
      }
    default:
      return {
        ...base,
        type,
        source: 'static',
        properties: {},
      }
  }
}

export default function TemplateEditor({
  initialTemplate,
  templateName: initialName,
  onSave,
  onClose,
}: TemplateEditorProps) {
  const [template, setTemplate] = useState<ImageTemplate>(initialTemplate)
  const [name, setName] = useState(initialName)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  )
  const [previewFormat, setPreviewFormat] = useState<'square' | 'landscape' | 'vertical'>(
    'square'
  )
  const [saving, setSaving] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const canvasRef = useRef<TemplateCanvasHandle>(null)

  const selectedElement = template.elements.find(
    (el) => el.id === selectedElementId
  ) ?? null

  // ---- Handlers ----

  const handleAddElement = useCallback(
    (type: ElementType) => {
      const maxZ = template.elements.reduce(
        (max, el) => Math.max(max, el.zIndex),
        0
      )
      const newElement = createDefaultElement(type, maxZ + 1)

      setTemplate((prev) => ({
        ...prev,
        elements: [...prev.elements, newElement],
      }))

      canvasRef.current?.addElement(newElement)
      setSelectedElementId(newElement.id)
    },
    [template.elements]
  )

  const handleElementUpdate = useCallback(
    (element: TemplateElement) => {
      setTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === element.id ? element : el
        ),
      }))

      canvasRef.current?.updateElement(element)
    },
    []
  )

  const handleDeleteElement = useCallback(
    (elementId: string) => {
      setTemplate((prev) => ({
        ...prev,
        elements: prev.elements.filter((el) => el.id !== elementId),
      }))

      canvasRef.current?.removeElement(elementId)

      if (selectedElementId === elementId) {
        setSelectedElementId(null)
      }
    },
    [selectedElementId]
  )

  const handleSelectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId)
    if (elementId) {
      canvasRef.current?.selectElement(elementId)
    }
  }, [])

  const handleToggleVisibility = useCallback((elementId: string) => {
    setTemplate((prev) => {
      const elements = prev.elements.map((el) =>
        el.id === elementId ? { ...el, visible: !el.visible } : el
      )
      const updated = elements.find((el) => el.id === elementId)
      if (updated) {
        canvasRef.current?.updateElement(updated)
      }
      return { ...prev, elements }
    })
  }, [])

  const handleReorder = useCallback(
    (elementId: string, direction: 'up' | 'down') => {
      setTemplate((prev) => {
        const sorted = [...prev.elements].sort(
          (a, b) => a.zIndex - b.zIndex
        )
        const idx = sorted.findIndex((el) => el.id === elementId)
        if (idx < 0) return prev

        const swapIdx = direction === 'up' ? idx + 1 : idx - 1
        if (swapIdx < 0 || swapIdx >= sorted.length) return prev

        // Swap zIndex values
        const tempZ = sorted[idx].zIndex
        sorted[idx] = { ...sorted[idx], zIndex: sorted[swapIdx].zIndex }
        sorted[swapIdx] = { ...sorted[swapIdx], zIndex: tempZ }

        return { ...prev, elements: sorted }
      })
    },
    []
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Serialize from canvas for latest positions
      const currentElements = canvasRef.current?.serialize()
      const toSave = currentElements
        ? { ...template, elements: currentElements }
        : template

      await onSave(toSave, name)
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }, [template, name, onSave])

  const handlePreview = useCallback(async () => {
    try {
      const currentElements = canvasRef.current?.serialize()
      const previewTemplate = currentElements
        ? { ...template, elements: currentElements }
        : template

      const data = await api.post('/api/image-templates/preview', {
        template: previewTemplate,
        headline: 'Preview Headline',
        format: previewFormat,
      }) as unknown as { preview: string }

      setPreviewImage(data.preview ?? null)
      setPreviewOpen(true)
    } catch (e) {
      alert(`Preview failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [template, previewFormat])

  return (
    <div className="flex h-full">
      {/* Left panel: 240px wide */}
      <div className="w-60 border-r border-white/10 flex flex-col bg-[#0f172a]">
        <ElementPanel onAddElement={handleAddElement} />
        <div className="border-t border-white/10" />
        <LayerPanel
          elements={template.elements}
          selectedId={selectedElementId}
          onSelect={(id) => handleSelectElement(id)}
          onToggleVisibility={handleToggleVisibility}
          onReorder={handleReorder}
        />
      </div>

      {/* Center: flex-1 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b border-white/10 p-2 flex items-center gap-2 bg-[#0f172a]">
          {/* Format tabs */}
          {(['square', 'landscape', 'vertical'] as const).map((format) => (
            <button
              key={format}
              onClick={() => setPreviewFormat(format)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                previewFormat === format
                  ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                  : 'border-white/10 text-[#cbd5e1] hover:bg-white/5'
              }`}
            >
              {format === 'square' && <Smartphone className="inline size-3 mr-1" />}
              {format === 'landscape' && <Monitor className="inline size-3 mr-1" />}
              {format === 'vertical' && <RectangleVertical className="inline size-3 mr-1" />}
              {format.charAt(0).toUpperCase() + format.slice(1)}
            </button>
          ))}

          <div className="flex-1" />

          {/* Template name input */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-[#f8fafc] w-40"
            placeholder="Template name"
          />

          {/* Preview button */}
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/10 text-[#cbd5e1] rounded-lg hover:bg-white/5"
          >
            <Play className="size-3" />
            Preview
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] rounded-lg hover:bg-[#10b981]/30 disabled:opacity-50"
          >
            <Save className="size-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>

          {/* Close button (if onClose provided) */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded text-[#cbd5e1]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center bg-[#0a0f1a] p-4 overflow-auto">
          <TemplateCanvas
            ref={canvasRef}
            template={template}
            format={previewFormat}
            onSelectElement={setSelectedElementId}
            onElementUpdate={handleElementUpdate}
          />
        </div>
      </div>

      {/* Right panel: 280px wide */}
      <div className="w-[280px] border-l border-white/10 overflow-y-auto bg-[#0f172a]">
        <PropertiesPanel
          element={selectedElement}
          onUpdate={handleElementUpdate}
          onDelete={handleDeleteElement}
        />
      </div>

      {/* Preview modal overlay */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-lg border border-white/10 max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f8fafc]">
                Template Preview ({previewFormat})
              </h2>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1 hover:bg-white/10 rounded text-[#cbd5e1]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Template preview"
                  className="w-full rounded-md border border-white/10"
                />
              ) : (
                <p className="text-[#cbd5e1] text-sm text-center py-8">
                  No preview available. Check your template and try again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
