import { useState, useEffect } from 'react'
import { Save, Settings, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useTemplatePreviews } from '@/hooks/useTemplatePreviews'
import type { TemplateElement } from '@/components/template-editor/templateTypes'

interface LibraryTemplate {
  id: string
  name: string
  elements: TemplateElement[]
  createdAt: string
  updatedAt: string
}

export default function AgentImageTemplateTab({ agentId }: { agentId: string }) {
  const [templates, setTemplates] = useState<LibraryTemplate[]>([])
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const { previews } = useTemplatePreviews(templates)

  // Load library and assignments
  useEffect(() => {
    const loadData = async () => {
      try {
        const [libRes, assignRes] = await Promise.all([
          api.get('/api/image-templates/library'),
          api.get(`/api/image-templates/${agentId}/assignments`),
        ]) as unknown as [{ templates: LibraryTemplate[] }, { templateIds: string[] }]
        setTemplates(libRes.templates || [])
        setAssignedIds(assignRes.templateIds || [])
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

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      await api.put(`/api/image-templates/${agentId}/assignments`, {
        templateIds: assignedIds,
      })
      setMessage('Templates saved successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setMessage(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-[#cbd5e1]">Loading templates...</div>
  }

  if (templates.length === 0) {
    return (
      <div className="p-6">
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
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Badge */}
      <div className="inline-block px-3 py-1 bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] rounded text-xs font-medium">
        {assignedIds.length} template{assignedIds.length !== 1 ? 's' : ''} assigned
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {templates.map((template) => {
          const isAssigned = assignedIds.includes(template.id)
          return (
            <div
              key={template.id}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                isAssigned
                  ? 'border-[#10b981]/50 bg-[#10b981]/10'
                  : 'border-white/10 bg-[#1e293b] hover:border-white/20'
              }`}
              onClick={() => toggle(template.id)}
            >
              {/* Preview Thumbnail */}
              <div className="aspect-square bg-[#0f172a] flex items-center justify-center overflow-hidden">
                {previews[template.id] ? (
                  <img src={previews[template.id]} alt={template.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#cbd5e1]/50">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-xs">Loading...</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-[#f8fafc] truncate">{template.name}</h4>
                    <p className="text-xs text-[#cbd5e1]">{template.elements.length} elements</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={() => toggle(template.id)}
                    className="mt-0.5 accent-[#10b981]"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

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
    </div>
  )
}
