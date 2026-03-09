import { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Trash2, LayoutTemplate, Upload, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useTemplatePreviews } from '@/hooks/useTemplatePreviews'
import TemplateEditor from '@/components/template-editor/TemplateEditor'
import type { ImageTemplate, TemplateElement } from '@/components/template-editor/templateTypes'
import { createDefaultTemplate, createNewsOverlayTemplate } from '@/components/template-editor/templateTypes'

interface LibraryTemplate {
  id: string
  name: string
  elements: TemplateElement[]
  createdAt: string
  updatedAt: string
}

interface Preset {
  id: string
  name: string
  description: string
}

export default function TemplatesTab() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [templates, setTemplates] = useState<LibraryTemplate[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ImageTemplate | null>(null)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [editingName, setEditingName] = useState('')

  const { previews, invalidate: invalidatePreview } = useTemplatePreviews(templates)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [templatesRes, presetsRes] = await Promise.all([
          api.get('/api/image-templates/library'),
          api.get('/api/image-templates/presets'),
        ]) as unknown as [{ templates: LibraryTemplate[] }, { presets: Preset[] }]
        setTemplates(templatesRes.templates || [])
        setPresets(presetsRes.presets || [])
      } catch (e) {
        console.error('Failed to load templates:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleNewTemplate = () => {
    setEditingTemplate(createDefaultTemplate())
    setEditingId(undefined)
    setEditingName('Untitled Template')
    setIsEditorOpen(true)
  }

  const handleEditTemplate = (template: LibraryTemplate) => {
    const fullTemplate: ImageTemplate = {
      name: template.name,
      squareWidth: 1080,
      squareHeight: 1080,
      landscapeWidth: 1200,
      landscapeHeight: 627,
      verticalWidth: 1080,
      verticalHeight: 1350,
      elements: template.elements,
    }
    setEditingTemplate(fullTemplate)
    setEditingId(template.id)
    setEditingName(template.name)
    setIsEditorOpen(true)
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      await api.delete(`/api/image-templates/library/${id}`)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const handleSaveTemplate = async (template: ImageTemplate, name: string) => {
    try {
      if (editingId) {
        // Update existing
        await api.put(`/api/image-templates/library/${editingId}`, {
          name,
          template,
        })
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingId
              ? {
                  ...t,
                  name,
                  elements: template.elements,
                  updatedAt: new Date().toISOString(),
                }
              : t
          )
        )
      } else {
        // Create new
        const res = await api.post('/api/image-templates/library', {
          name,
          template,
        }) as unknown as { id: string; name: string }
        const newTemplate: LibraryTemplate = {
          id: res.id,
          name: res.name,
          elements: template.elements,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setTemplates((prev) => [newTemplate, ...prev])
      }
      if (editingId) invalidatePreview(editingId)
      setIsEditorOpen(false)
      setEditingTemplate(null)
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ''

    setAnalyzing(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await api.post<{ template: ImageTemplate }>('/api/image-templates/analyze-image', {
        image: dataUrl,
      })

      setEditingTemplate(res.template)
      setEditingId(undefined)
      setEditingName(res.template.name || 'AI Generated Template')
      setIsEditorOpen(true)
    } catch (err) {
      alert(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handlePresetSelect = (presetId: string) => {
    const template = presetId === 'news-overlay' ? createNewsOverlayTemplate() : createDefaultTemplate()
    setEditingTemplate(template)
    setEditingId(undefined)
    setEditingName(`${template.name} (Copy)`)
    setIsEditorOpen(true)
  }

  if (isEditorOpen && editingTemplate) {
    return (
      <TemplateEditor
        initialTemplate={editingTemplate}
        templateId={editingId}
        templateName={editingName}
        onSave={handleSaveTemplate}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingTemplate(null)
        }}
      />
    )
  }

  if (loading) {
    return <div className="p-6 text-[#cbd5e1]">Loading templates...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f8fafc] flex items-center gap-2">
            <LayoutTemplate className="size-5" />
            Image Templates
          </h2>
          <p className="text-sm text-[#cbd5e1] mt-1">Manage branded overlay templates</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 border border-[#6366f1]/50 text-[#6366f1] rounded-lg hover:bg-[#6366f1]/10 disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {analyzing ? 'Analyzing...' : 'Create from Image'}
          </button>
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] rounded-lg hover:bg-[#10b981]/30"
          >
            <Plus className="size-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Presets */}
      <div>
        <h3 className="text-sm font-semibold text-[#f8fafc] mb-3">Preset Starters</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-[#1e293b] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors cursor-pointer"
              onClick={() => handlePresetSelect(preset.id)}
            >
              <div className="aspect-square bg-[#0f172a] rounded border border-white/10 mb-3 flex items-center justify-center">
                <svg viewBox="0 0 108 108" className="w-full h-full p-2">
                  <rect width="108" height="108" fill="#1a1a2e" />
                  <rect x="5" y="5" width="98" height="50" fill="#6366f1" opacity="0.4" />
                  <rect x="5" y="65" width="98" height="38" fill="#000000" opacity="0.6" />
                </svg>
              </div>
              <h4 className="font-medium text-[#f8fafc]">{preset.name}</h4>
              <p className="text-xs text-[#cbd5e1]">{preset.description}</p>
              <button className="mt-3 w-full px-3 py-1.5 text-xs border border-[#10b981] text-[#10b981] rounded hover:bg-[#10b981]/10">
                Use as Base
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Library templates */}
      <div>
        <h3 className="text-sm font-semibold text-[#f8fafc] mb-3">Library ({templates.length})</h3>
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-[#1e293b]/50 rounded-lg border border-white/10">
            <LayoutTemplate className="size-8 mx-auto text-[#cbd5e1] opacity-50 mb-2" />
            <p className="text-[#cbd5e1] text-sm">No templates yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-[#1e293b] border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors"
              >
                {/* Preview Thumbnail */}
                <div className="aspect-square bg-[#0f172a] flex items-center justify-center overflow-hidden">
                  {previews[template.id] ? (
                    <img src={previews[template.id]} alt={template.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#cbd5e1]/50">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-xs">Generating preview...</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="font-medium text-[#f8fafc] truncate">{template.name}</h4>
                    <p className="text-xs text-[#cbd5e1]">{template.elements.length} elements</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs border border-white/10 text-[#cbd5e1] rounded hover:bg-white/5"
                    >
                      <Edit2 className="size-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs border border-red-500/20 text-red-400 rounded hover:bg-red-500/10"
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
