import { useState, useEffect, useMemo } from 'react'
import { Save, Settings, Loader2, Square, RectangleHorizontal, RectangleVertical, Eye, X, LayoutTemplate } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { useTemplatePreviews } from '@/hooks/useTemplatePreviews'
import type { TemplateElement } from '@/components/template-editor/templateTypes'
import type { ImageTemplate } from '@/components/template-editor/templateTypes'
import { createDefaultTemplate, createNewsOverlayTemplate } from '@/components/template-editor/templateTypes'

type ImageFormat = 'square' | 'landscape' | 'vertical'

const FORMAT_OPTIONS: { id: ImageFormat; label: string; icon: typeof Square; desc: string }[] = [
  { id: 'square', label: 'Square', icon: Square, desc: '1080×1080' },
  { id: 'landscape', label: 'Landscape', icon: RectangleHorizontal, desc: '1200×627' },
  { id: 'vertical', label: 'Vertical', icon: RectangleVertical, desc: '1080×1350' },
]

// Built-in presets that are always available
const PRESET_TEMPLATES: { id: string; name: string; description: string; factory: () => ImageTemplate }[] = [
  { id: 'preset-default', name: 'Default', description: 'Full-bleed image with adaptive gradient', factory: createDefaultTemplate },
  { id: 'preset-news-overlay', name: 'News Overlay', description: 'Bold news style with keyword highlights', factory: createNewsOverlayTemplate },
]

interface LibraryTemplate {
  id: string
  name: string
  elements: TemplateElement[]
  createdAt: string
  updatedAt: string
}

interface DisplayTemplate {
  id: string
  name: string
  description?: string
  elements: TemplateElement[]
  isPreset: boolean
}

export default function AgentImageTemplateTab({ agentId }: { agentId: string }) {
  const [libraryTemplates, setLibraryTemplates] = useState<LibraryTemplate[]>([])
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [formats, setFormats] = useState<ImageFormat[]>(['square', 'landscape'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewFormat, setPreviewFormat] = useState<ImageFormat>('square')
  const [previewTemplateName, setPreviewTemplateName] = useState('')

  const { toast } = useToast()

  // Combine presets + library — memoize to avoid recreating on every render
  const allTemplates: DisplayTemplate[] = useMemo(() => [
    ...PRESET_TEMPLATES.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      elements: p.factory().elements,
      isPreset: true,
    })),
    ...libraryTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      elements: t.elements,
      isPreset: false,
    })),
  ], [libraryTemplates])

  const { previews, hasFailed } = useTemplatePreviews(allTemplates)

  // Load library and assignments
  useEffect(() => {
    const loadData = async () => {
      try {
        const [libRes, assignRes] = await Promise.all([
          api.get('/api/image-templates/library'),
          api.get(`/api/image-templates/${agentId}/assignments`),
        ]) as unknown as [{ templates: LibraryTemplate[] }, { templateIds: string[]; formats: ImageFormat[] }]
        setLibraryTemplates(libRes.templates || [])
        setAssignedIds(assignRes.templateIds || [])
        if (assignRes.formats?.length) setFormats(assignRes.formats)
      } catch (e) {
        console.error('Failed to load templates:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [agentId])

  const toggle = (id: string) => {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleFormat = (fmt: ImageFormat) => {
    setFormats((prev) => {
      if (prev.includes(fmt)) {
        if (prev.length <= 1) return prev
        return prev.filter((f) => f !== fmt)
      }
      return [...prev, fmt]
    })
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      await api.put(`/api/image-templates/${agentId}/assignments`, {
        templateIds: assignedIds,
        formats,
      })
      setMessage('Templates saved successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async (template: DisplayTemplate, fmt: ImageFormat) => {
    setPreviewTemplateName(template.name)
    setPreviewFormat(fmt)
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewImage(null)

    try {
      const fullTemplate: ImageTemplate = template.isPreset
        ? PRESET_TEMPLATES.find((p) => p.id === template.id)!.factory()
        : {
            name: template.name,
            squareWidth: 1080,
            squareHeight: 1080,
            landscapeWidth: 1200,
            landscapeHeight: 627,
            verticalWidth: 1080,
            verticalHeight: 1350,
            elements: template.elements,
          }

      const res = await api.post<{ preview: string }>('/api/image-templates/preview', {
        template: fullTemplate,
        headline: 'Breaking: Global Summit Reaches Historic Climate Agreement After Marathon Negotiations',
        category: 'World News',
        format: fmt,
      })
      setPreviewImage(res.preview)
    } catch (err) {
      setPreviewImage(null)
      toast('error', `Preview failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setPreviewLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-[#cbd5e1]">Loading templates...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Badge */}
      <div className="inline-block px-3 py-1 bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] rounded text-xs font-medium">
        {assignedIds.length} template{assignedIds.length !== 1 ? 's' : ''} assigned
      </div>

      {/* Output Format Selection */}
      <div>
        <h4 className="text-sm font-medium text-[#f8fafc] mb-2">Output Dimensions</h4>
        <p className="text-xs text-[#cbd5e1] mb-3">Choose which image sizes to generate for each post</p>
        <div className="flex gap-2">
          {FORMAT_OPTIONS.map(({ id, label, icon: Icon, desc }) => {
            const active = formats.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleFormat(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                  active
                    ? 'border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]'
                    : 'border-white/10 bg-[#1e293b] text-[#cbd5e1] hover:border-white/20'
                }`}
              >
                <Icon className="size-4" />
                <div className="text-left">
                  <div className="font-medium">{label}</div>
                  <div className="text-[10px] opacity-70">{desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div>
        <h4 className="text-sm font-medium text-[#f8fafc] mb-3">
          Templates ({allTemplates.length})
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {allTemplates.map((template) => {
            const isAssigned = assignedIds.includes(template.id)
            return (
              <div
                key={template.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  isAssigned
                    ? 'border-[#10b981]/50 bg-[#10b981]/10'
                    : 'border-white/10 bg-[#1e293b] hover:border-white/20'
                }`}
              >
                {/* Preview Thumbnail */}
                <div
                  className="aspect-square bg-[#0f172a] flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => toggle(template.id)}
                >
                  {previews[template.id] ? (
                    <img src={previews[template.id]} alt={template.name} className="w-full h-full object-cover" />
                  ) : hasFailed(template.id) ? (
                    <div className="flex flex-col items-center gap-2 text-[#cbd5e1]/30 p-4">
                      <LayoutTemplate className="size-8" />
                      <span className="text-xs">{template.name}</span>
                      <span className="text-[10px]">{template.elements.length} elements</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#cbd5e1]/50">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-xs">Generating preview...</span>
                    </div>
                  )}
                </div>

                {/* Info + Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-[#f8fafc] truncate">{template.name}</h4>
                        {template.isPreset && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-[#6366f1]/20 text-[#6366f1] font-medium">
                            Built-in
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-[10px] text-[#cbd5e1] mt-0.5 truncate">{template.description}</p>
                      )}
                      <p className="text-xs text-[#cbd5e1]">{template.elements.length} elements</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => toggle(template.id)}
                      className="mt-0.5 accent-[#10b981]"
                    />
                  </div>

                  {/* Preview buttons */}
                  <div className="flex gap-1.5">
                    {FORMAT_OPTIONS.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => handlePreview(template, id)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] border border-white/10 text-[#cbd5e1] rounded hover:bg-white/5 transition-colors"
                      >
                        <Eye className="size-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {allTemplates.length === 0 && (
        <div className="text-center py-12 bg-[#1e293b]/50 rounded-lg border border-white/10">
          <Settings className="size-8 mx-auto text-[#cbd5e1] opacity-50 mb-2" />
          <p className="text-[#cbd5e1] text-sm mb-4">No templates available yet.</p>
          <a
            href="/settings?tab=image-templates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] rounded-lg hover:bg-[#10b981]/30 text-sm"
          >
            Create Templates
          </a>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] rounded-lg hover:bg-[#10b981]/30 disabled:opacity-50 text-sm font-medium"
        >
          <Save className="size-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        {message && (
          <span className={`text-sm ${message.includes('success') ? 'text-[#10b981]' : 'text-red-400'}`}>
            {message}
          </span>
        )}
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#1e293b] rounded-xl border border-white/10 shadow-2xl max-w-3xl w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-[#f8fafc]">{previewTemplateName}</h3>
                <p className="text-xs text-[#cbd5e1]">{previewFormat} preview</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Format tabs within modal */}
                {FORMAT_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      const tmpl = allTemplates.find((t) => t.name === previewTemplateName)
                      if (tmpl) handlePreview(tmpl, id)
                    }}
                    className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                      previewFormat === id
                        ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                        : 'border-white/10 text-[#cbd5e1] hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded text-[#cbd5e1]"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Preview Image */}
            <div className="p-4 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto bg-[#0f172a]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 text-[#cbd5e1]">
                  <Loader2 className="size-8 animate-spin" />
                  <span className="text-sm">Generating preview...</span>
                </div>
              ) : previewImage ? (
                <img
                  src={previewImage}
                  alt="Template preview"
                  className="max-w-full max-h-[65vh] object-contain rounded"
                />
              ) : (
                <p className="text-[#cbd5e1] text-sm">Preview not available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
