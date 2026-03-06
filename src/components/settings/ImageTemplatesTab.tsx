import { useState, useEffect, useCallback } from 'react'
import { Image, Eye, RotateCcw, Save } from 'lucide-react'
import { api } from '@/lib/api'

interface TemplatePreset {
  id: string
  name: string
  description: string
}

interface TemplateElement {
  id: string
  type: string
  source: string
  binding?: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  visible: boolean
  properties: Record<string, unknown>
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

export default function ImageTemplatesTab() {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [presets, setPresets] = useState<TemplatePreset[]>([])
  const [template, setTemplate] = useState<ImageTemplate | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewHeadline, setPreviewHeadline] = useState('Major Climate Summit Reaches Historic Agreement on Carbon Emissions')
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<{ agents: { id: string; name: string }[] }>('/api/agents'),
      api.get<{ presets: TemplatePreset[] }>('/api/image-templates/presets'),
    ]).then(([a, p]) => {
      setAgents(a.agents)
      setPresets(p.presets)
      if (a.agents.length > 0) setSelectedAgent(a.agents[0].id)
    }).finally(() => setLoading(false))
  }, [])

  const loadTemplate = useCallback(async () => {
    if (!selectedAgent) return
    try {
      const d = await api.get<{ template: ImageTemplate; isCustom: boolean }>(`/api/image-templates/${selectedAgent}`)
      setTemplate(d.template)
      setIsCustom(d.isCustom)
      setPreview(null)
    } catch {
      setMessage('Failed to load template')
    }
  }, [selectedAgent])

  useEffect(() => { loadTemplate() }, [loadTemplate])

  const applyPreset = async (presetId: string) => {
    try {
      const d = await api.get<{ template: ImageTemplate }>(`/api/image-templates/presets/${presetId}`)
      setTemplate(d.template)
      setIsCustom(true)
      setPreview(null)
    } catch {
      setMessage('Failed to load preset')
    }
  }

  const save = async () => {
    if (!selectedAgent || !template) return
    setSaving(true)
    try {
      await api.put(`/api/image-templates/${selectedAgent}`, { template })
      setIsCustom(true)
      setMessage('Template saved')
    } catch {
      setMessage('Failed to save')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const reset = async () => {
    if (!selectedAgent) return
    if (!confirm('Reset to default template?')) return
    try {
      await api.delete(`/api/image-templates/${selectedAgent}`)
      await loadTemplate()
      setMessage('Template reset to default')
    } catch {
      setMessage('Failed to reset')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const generatePreview = async () => {
    if (!template) return
    setPreviewing(true)
    try {
      const d = await api.post<{ preview: string }>('/api/image-templates/preview', {
        template,
        headline: previewHeadline,
        format: 'square',
      })
      setPreview(d.preview)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  const toggleElement = (elementId: string) => {
    if (!template) return
    setTemplate({
      ...template,
      elements: template.elements.map(el =>
        el.id === elementId ? { ...el, visible: !el.visible } : el
      ),
    })
  }

  if (loading) return <div className="text-[#9ca3af]">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#f9fafb] flex items-center gap-2">
          <Image className="h-5 w-5 text-[#00f0ff]" />
          Image Templates
        </h2>
        <p className="text-sm text-[#9ca3af]">Configure branded overlays for coverage post images per agent.</p>
      </div>

      {message && (
        <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/20 rounded-lg px-4 py-2 text-sm text-[#00f0ff]">
          {message}
        </div>
      )}

      {/* Agent selector */}
      <div className="flex items-center gap-3">
        <select
          value={selectedAgent}
          onChange={e => setSelectedAgent(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
        >
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span className="text-xs text-[#9ca3af]">
          {isCustom ? 'Custom template' : 'Default template'}
        </span>
      </div>

      {/* Presets */}
      <div>
        <h3 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-2">Presets</h3>
        <div className="flex gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#f9fafb] transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Template elements */}
      {template && (
        <div>
          <h3 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-2">
            Elements ({template.name})
          </h3>
          <div className="space-y-2">
            {template.elements.map(el => (
              <div key={el.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleElement(el.id)}
                    className={`w-4 h-4 rounded border ${el.visible ? 'bg-[#00f0ff] border-[#00f0ff]' : 'bg-transparent border-white/30'}`}
                  />
                  <div>
                    <span className="text-sm text-[#f9fafb]">{el.id}</span>
                    <span className="text-xs text-[#9ca3af] ml-2">{el.type} · {el.source}</span>
                  </div>
                </div>
                <div className="text-xs text-[#9ca3af]">
                  {Math.round(el.x)}%, {Math.round(el.y)}% · {Math.round(el.width)}x{Math.round(el.height)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wider">Preview</h3>
        <input
          type="text"
          value={previewHeadline}
          onChange={e => setPreviewHeadline(e.target.value)}
          placeholder="Test headline..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={generatePreview}
            disabled={previewing}
            className="bg-[#a855f7]/10 hover:bg-[#a855f7]/20 text-[#a855f7] rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            {previewing ? 'Generating...' : 'Preview'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          {isCustom && (
            <button
              onClick={reset}
              className="bg-white/5 hover:bg-white/10 text-[#9ca3af] rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
        {preview && (
          <div className="mt-3">
            <img
              src={preview}
              alt="Template preview"
              className="max-w-sm rounded-lg border border-white/10"
            />
          </div>
        )}
      </div>
    </div>
  )
}
