import { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { useAdminStore } from '@/stores/useAdminStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import IconPicker from './IconPicker'
import FileUploadPanel from './FileUploadPanel'
import { getAvailableModels } from '@/services/apiKeyService'
import type { AgentConfig, KnowledgeBaseFile, AiModel } from '@/types'

interface AgentFormProps {
  agent?: AgentConfig | null
  onClose: () => void
}

export default function AgentForm({ agent, onClose }: AgentFormProps) {
  const { addAgent, editAgent } = useAdminStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [knowledgeBase, setKnowledgeBase] = useState('')
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFile[]>([])
  const [icon, setIcon] = useState('Brain')
  const [model, setModel] = useState('')
  const [availableModels, setAvailableModels] = useState<AiModel[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAvailableModels().then(setAvailableModels).catch(() => {})
  }, [])

  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDescription(agent.description)
      setSystemPrompt(agent.systemPrompt)
      setKnowledgeBase(agent.knowledgeBase)
      setKnowledgeBaseFiles(agent.knowledgeBaseFiles ?? [])
      setIcon(agent.icon)
      setModel(agent.model)
    }
  }, [agent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !description.trim()) {
      setError('Name and description are required.')
      return
    }

    if (knowledgeBase.length > 50000) {
      setError('Knowledge base cannot exceed 50,000 characters.')
      return
    }

    setSaving(true)

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        knowledgeBase: knowledgeBase.trim(),
        icon,
        model,
      }

      if (agent) {
        const result = await editAgent(agent.id, data)
        if (!result) {
          setError('Failed to save agent.')
          return
        }
      } else {
        await addAgent(data)
      }

      onClose()
    } catch {
      setError('Failed to save agent.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#f9fafb]">
          {agent ? 'Edit Agent' : 'New Agent'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description"
        />
      </div>

      <Select
        label="AI Model"
        value={model}
        onChange={setModel}
        placeholder={availableModels.length === 0 ? 'No models available — configure API keys first' : 'Select an AI model'}
        options={availableModels.map((m) => ({
          value: m.id,
          label: `${m.name} (${m.provider})`,
        }))}
      />

      <Textarea
        label="System Prompt"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="Instructions for the agent..."
        rows={4}
      />

      <Textarea
        label="Knowledge Base"
        value={knowledgeBase}
        onChange={(e) => setKnowledgeBase(e.target.value)}
        placeholder="Additional context or reference material..."
        rows={3}
        maxLength={50000}
      />

      {agent && (
        <FileUploadPanel agentId={agent.id} files={knowledgeBaseFiles} onChange={setKnowledgeBaseFiles} />
      )}

      <IconPicker value={icon} onChange={setIcon} />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="default" size="md" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : agent ? 'Save Changes' : 'Create Agent'}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
