import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { api } from '@/lib/api'

interface TemplatePreset { id: string; name: string; description: string }
interface TemplateElement { id: string; type: string; source: string; visible: boolean; x: number; y: number; width: number; height: number }
interface ImageTemplate { name: string; elements: TemplateElement[] }

export default function AgentImageTemplateTab({ agentId }: { agentId: string }) {
  const [presets, setPresets] = useState<TemplatePreset[]>([])
  const [template, setTemplate] = useState<ImageTemplate | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadTemplate = useCallback(async () => {
    try {
      const d = await api.get<{ template: ImageTemplate; isCustom: boolean }>(`/api/image-templates/${agentId}`)
      setTemplate(d.template)
      setIsCustom(d.isCustom)
    } catch {
      setMessage('Failed to load template')
    }
  }, [agentId])

  useEffect(() => {
    Promise.all([
      api.get<{ presets: TemplatePreset[] }>('/api/image-templates/presets'),
      loadTemplate(),
    ]).then(([p]) => setPresets(p.presets)).finally(() => setLoading(false))
  }, [loadTemplate])

  const applyPreset = async (presetId: string) => {
    try {
      const d = await api.get<{ template: ImageTemplate }>(`/api/image-templates/presets/${presetId}`)
      setTemplate(d.template)
      setIsCustom(true)
    } catch { setMessage('Failed to load preset') }
  }

  const save = async () => {
    if (!template) return
    setSaving(true)
    try {
      await api.put(`/api/image-templates/${agentId}`, { template })
      setIsCustom(true)
      setMessage('Template saved')
    } catch { setMessage('Failed to save') }
    finally { setSaving(false); setTimeout(() => setMessage(''), 3000) }
  }

  const reset = async () => {
    if (!confirm('Reset to default template?')) return
    await api.delete(`/api/image-templates/${agentId}`)
    await loadTemplate()
    setMessage('Reset to default')
    setTimeout(() => setMessage(''), 3000)
  }

  const toggleElement = (elementId: string) => {
    if (!template) return
    setTemplate({
      ...template,
      elements: template.elements.map(el => el.id === elementId ? { ...el, visible: !el.visible } : el),
    })
  }

  if (loading) return <div className="text-[#cbd5e1] py-4">Loading...</div>

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 text-sm text-[#10b981]">{message}</div>
      )}

      {/* Canvas Preview */}
      {template && (
        <div>
          <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-3">Preview</h4>
          <div className="bg-black border border-white/10 rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">
            <svg className="w-full h-full" viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid meet">
              {/* Background */}
              <rect width="1200" height="675" fill="#1e293b" />
              {/* Grid */}
              <defs>
                <pattern id="grid" width="120" height="67.5" patternUnits="userSpaceOnUse">
                  <path d="M 120 0 L 0 0 0 67.5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />
                </pattern>
              </defs>
              <rect width="1200" height="675" fill="url(#grid)" />
              {/* Elements */}
              {template.elements.map(el => {
                const x = (el.x / 100) * 1200
                const y = (el.y / 100) * 675
                const w = (el.width / 100) * 1200 || 200
                const h = (el.height / 100) * 675 || 150
                const colors: Record<string, string> = { image: '#10b981', gradient: '#6366f1', text: '#f59e0b' }
                const color = colors[el.type] || '#94a3b8'
                return el.visible ? (
                  <g key={el.id} opacity="0.8">
                    <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
                    <text x={x + 5} y={y + 20} fontSize="14" fill={color} fontWeight="500">{el.id}</text>
                    <text x={x + 5} y={y + 38} fontSize="12" fill={color} opacity="0.7">{el.type}</text>
                  </g>
                ) : null
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Presets */}
      <div>
        <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-2">Presets</h4>
        <div className="flex gap-2">
          {presets.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#f8fafc]">
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Elements */}
      {template && (
        <div>
          <h4 className="text-xs text-[#cbd5e1] uppercase tracking-wider mb-2">Elements ({template.name})</h4>
          <div className="space-y-1.5">
            {template.elements.map(el => (
              <div key={el.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleElement(el.id)}
                    className={`w-3.5 h-3.5 rounded border ${el.visible ? 'bg-[#10b981] border-[#10b981]' : 'bg-transparent border-white/30'}`} />
                  <span className="text-xs text-[#f8fafc]">{el.id}</span>
                  <span className="text-[10px] text-[#cbd5e1]">{el.type}</span>
                </div>
                <span className="text-[10px] text-[#cbd5e1]">{Math.round(el.x)}%, {Math.round(el.y)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 disabled:opacity-50">
          <Save className="h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
        </button>
        {isCustom && (
          <button onClick={reset}
            className="bg-white/5 hover:bg-white/10 text-[#cbd5e1] rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
        <span className="text-[10px] text-[#cbd5e1] self-center">{isCustom ? 'Custom' : 'Default'}</span>
      </div>
    </div>
  )
}
