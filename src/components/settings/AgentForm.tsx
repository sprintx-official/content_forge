import { useState, useEffect } from 'react'
import { Save, X, RefreshCw, Bot, Rss, Globe, Share2, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/stores/useAdminStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import IconPicker from './IconPicker'
import FileUploadPanel from './FileUploadPanel'
import PipelineFeedsTab from './agent-tabs/PipelineFeedsTab'
import CmsTab from './agent-tabs/CmsTab'
import AgentSocialTab from './agent-tabs/AgentSocialTab'
import AgentImageTemplateTab from './agent-tabs/AgentImageTemplateTab'
import { getAvailableModels } from '@/services/apiKeyService'
import type { AgentConfig, KnowledgeBaseFile, AiModel } from '@/types'

interface AgentFormProps {
  agent?: AgentConfig | null
  onClose: (created?: AgentConfig) => void
}

const TABS = [
  { id: 'general', label: 'General', icon: Bot },
  { id: 'pipeline', label: 'Pipeline & Feeds', icon: Rss },
  { id: 'cms', label: 'CMS', icon: Globe },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'templates', label: 'Templates', icon: Image },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AgentForm({ agent, onClose }: AgentFormProps) {
  const { addAgent, editAgent } = useAdminStore()
  const [activeTab, setActiveTab] = useState<TabId>('general')

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
  const [refreshingModels, setRefreshingModels] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(agent ?? null)

  useEffect(() => {
    getAvailableModels().then(setAvailableModels).catch(() => {})
  }, [])

  const handleRefreshModels = async () => {
    setRefreshingModels(true)
    try {
      const models = await getAvailableModels(true)
      setAvailableModels(models)
    } catch {
      // silent
    } finally {
      setRefreshingModels(false)
    }
  }

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

      if (editingAgent) {
        const result = await editAgent(editingAgent.id, data)
        if (!result) {
          setError('Failed to save agent.')
          return
        }
      } else {
        const created = await addAgent(data)
        // Transition to edit mode so other tabs become available
        setEditingAgent(created)
        setActiveTab('pipeline')
        setSaving(false)
        return // Don't close — let user configure other tabs
      }

      onClose()
    } catch {
      setError('Failed to save agent.')
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!editingAgent
  const agentId = editingAgent?.id

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#f9fafb]">
          {isEditing ? `Configure: ${editingAgent.name}` : 'New Agent'}
        </h3>
        <button
          type="button"
          onClick={() => onClose()}
          className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const disabled = id !== 'general' && !isEditing
          return (
            <button
              key={id}
              type="button"
              onClick={() => !disabled && setActiveTab(id)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                activeTab === id
                  ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                  : disabled
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-white/5',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
        {!isEditing && (
          <span className="text-[10px] text-[#9ca3af] self-center ml-2">Save agent to unlock other tabs</span>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[#d1d5db]">AI Model</label>
              <button type="button" onClick={handleRefreshModels} disabled={refreshingModels}
                className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-[#22d3ee] transition-colors disabled:opacity-50">
                <RefreshCw className={`h-3 w-3 ${refreshingModels ? 'animate-spin' : ''}`} />
                {refreshingModels ? 'Refreshing...' : 'Refresh models'}
              </button>
            </div>
            <Select value={model} onChange={setModel}
              placeholder={availableModels.length === 0 ? 'No models available — configure API keys first' : 'Select an AI model'}
              options={availableModels.map((m) => ({
                value: m.id,
                label: m.tags?.length ? `${m.name} (${m.provider}) — ${m.tags[0]}` : `${m.name} (${m.provider})`,
              }))} />
          </div>

          <Textarea label="System Prompt" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Instructions for the agent..." rows={4} />

          <Textarea label="Knowledge Base" value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)}
            placeholder="Additional context or reference material..." rows={3} maxLength={50000} />

          {isEditing && agentId && (
            <FileUploadPanel agentId={agentId} files={knowledgeBaseFiles} onChange={setKnowledgeBaseFiles} />
          )}

          <IconPicker value={icon} onChange={setIcon} />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" variant="default" size="md" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Agent'}
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={() => onClose()}>
              {isEditing ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'pipeline' && agentId && <PipelineFeedsTab agentId={agentId} />}
      {activeTab === 'cms' && agentId && <CmsTab agentId={agentId} />}
      {activeTab === 'social' && agentId && <AgentSocialTab agentId={agentId} />}
      {activeTab === 'templates' && agentId && <AgentImageTemplateTab agentId={agentId} />}
    </div>
  )
}
