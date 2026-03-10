import { useState, useEffect } from 'react'
import { Save, X, Plus, Users, Info } from 'lucide-react'
import { useAdminStore } from '@/stores/useAdminStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import WorkflowStepEditor from './WorkflowStepEditor'
import type { Workflow, WorkflowStep } from '@/types'

const MODE_DESCRIPTIONS: Record<string, string> = {
  manual: 'You trigger this flow manually and content is generated through the pipeline steps you define below.',
  automated: 'An agent monitors RSS feeds and automatically generates content on a schedule. Configure the agent\'s feeds and prompts in Settings > Agents.',
  both: 'Combines manual runs (using pipeline steps) with automated content generation from an agent on a schedule.',
}

interface WorkflowFormProps {
  workflow?: Workflow | null
  onClose?: () => void
}

export default function WorkflowForm({ workflow, onClose }: WorkflowFormProps) {
  const { addWorkflow, editWorkflow, setWorkflowAccess, agents, loadAgents, teamMembers, loadTeam } = useAdminStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [isActive, setIsActive] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [type, setType] = useState<'text' | 'chat' | 'image' | 'video'>('text')
  const [mode, setMode] = useState<'manual' | 'automated' | 'both'>('manual')
  const [pipelineAgentId, setPipelineAgentId] = useState('')
  const [frequency, setFrequency] = useState<number>(1440)
  const [customFrequency, setCustomFrequency] = useState<string>('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAgents()
    loadTeam()
  }, [loadAgents, loadTeam])

  useEffect(() => {
    if (workflow) {
      setName(workflow.name)
      setDescription(workflow.description)
      setSteps(workflow.steps.map((s) => ({ ...s })))
      setIsActive(workflow.isActive)
      setSelectedUserIds(new Set(workflow.assignedUserIds ?? []))
      setType(workflow.type)
      setMode(workflow.mode)
      setPipelineAgentId(workflow.pipelineAgentId || '')
      setFrequency(workflow.frequency || 1440)
      setCustomFrequency('')
    }
  }, [workflow])

  const nonAdminMembers = teamMembers.filter((m) => m.role !== 'admin')

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const addStep = () => {
    setSteps([...steps, { agentId: '', instructions: '' }])
  }

  const updateStep = (index: number, step: WorkflowStep) => {
    const updated = [...steps]
    updated[index] = step
    setSteps(updated)
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const moveStep = (from: number, to: number) => {
    const updated = [...steps]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    setSteps(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Workflow name is required.')
      return
    }

    // Only manual and both modes require steps
    if ((mode === 'manual' || mode === 'both') && steps.length === 0) {
      setError('Add at least one pipeline step for manual runs.')
      return
    }

    // Automated modes require a monitoring agent
    if ((mode === 'automated' || mode === 'both') && !pipelineAgentId) {
      setError('Select a monitoring agent for automated runs.')
      return
    }

    const invalidStep = steps.find((s) => !s.agentId)
    if (invalidStep) {
      setError('All steps must have an agent selected.')
      return
    }

    // Use custom frequency if provided, otherwise use preset
    let finalFrequency = frequency
    if (customFrequency.trim()) {
      const customValue = parseInt(customFrequency, 10)
      if (isNaN(customValue) || customValue < 5) {
        setError('Custom frequency must be at least 5 minutes.')
        return
      }
      finalFrequency = customValue
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      steps,
      isActive,
      type,
      mode,
      pipelineAgentId: pipelineAgentId || null,
      frequency: (mode === 'automated' || mode === 'both') ? finalFrequency : undefined,
    }

    setSaving(true)
    try {
      if (workflow) {
        await editWorkflow(workflow.id, data)
        await setWorkflowAccess(workflow.id, Array.from(selectedUserIds))
      } else {
        await addWorkflow(data)
      }
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow.')
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
        <h3 className="text-lg font-semibold text-[#f8fafc]">
          {workflow ? 'Edit Workflow' : 'New Workflow'}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[#cbd5e1] hover:text-[#f8fafc] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name"
        />
        <div className="flex items-end">
          <Toggle
            checked={isActive}
            onChange={setIsActive}
            label={isActive ? 'Active' : 'Inactive'}
          />
        </div>
      </div>

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What does this workflow do?"
        rows={2}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-[#cbd5e1]">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
          >
            <option value="text">Text</option>
            <option value="chat">Chat</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-[#cbd5e1]">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
          >
            <option value="manual">Manual</option>
            <option value="automated">Automated</option>
            <option value="both">Both (Manual + Automated)</option>
          </select>
        </div>
      </div>

      {/* Mode explanation */}
      <div className="flex items-start gap-2 rounded-lg bg-[#10b981]/5 border border-[#10b981]/20 px-3 py-2.5">
        <Info className="h-4 w-4 text-[#10b981] shrink-0 mt-0.5" />
        <p className="text-xs text-[#cbd5e1]">{MODE_DESCRIPTIONS[mode]}</p>
      </div>

      {/* === AUTOMATED SECTION === */}
      {(mode === 'automated' || mode === 'both') && (
        <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h4 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
            Automated Pipeline
            <span className="text-xs font-normal text-[#94a3b8]">runs on a schedule</span>
          </h4>

          <div>
            <label className="text-sm font-medium text-[#cbd5e1]">Monitoring Agent</label>
            <p className="text-xs text-[#94a3b8] mb-1.5">This agent monitors RSS feeds, clusters news, and generates posts automatically. Set up feeds and prompts in the agent's settings.</p>
            <select
              value={pipelineAgentId}
              onChange={(e) => setPipelineAgentId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
            >
              <option value="">Select an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#cbd5e1] block mb-2">Run Every</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[15, 30, 60, 1440].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setFrequency(preset)
                    setCustomFrequency('')
                  }}
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    frequency === preset && !customFrequency
                      ? 'bg-[#10b981] text-[#0f172a]'
                      : 'bg-white/10 text-[#f8fafc] hover:bg-white/15'
                  }`}
                >
                  {preset === 1440 ? '1 day' : `${preset}m`}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="5"
              placeholder="Custom minutes..."
              value={customFrequency}
              onChange={(e) => {
                setCustomFrequency(e.target.value)
                if (e.target.value.trim()) {
                  setFrequency(parseInt(e.target.value, 10) || 1440)
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
            />
            <p className="text-xs text-[#94a3b8] mt-1.5">Choose a preset or enter custom minutes (minimum 5)</p>
          </div>
        </div>
      )}

      {/* === MANUAL STEPS SECTION === */}
      {(mode === 'manual' || mode === 'both') && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
                Pipeline Steps
                <span className="text-xs font-normal text-[#94a3b8]">({steps.length})</span>
              </h4>
              <p className="text-xs text-[#94a3b8] mt-0.5">Agents run in sequence when you click Generate</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-3.5 w-3.5" />
              Add Step
            </Button>
          </div>

          {steps.map((step, index) => (
            <WorkflowStepEditor
              key={index}
              step={step}
              index={index}
              total={steps.length}
              agents={agents}
              onChange={updateStep}
              onRemove={removeStep}
              onMoveUp={(i) => moveStep(i, i - 1)}
              onMoveDown={(i) => moveStep(i, i + 1)}
            />
          ))}

          {steps.length === 0 && (
            <p className="text-center text-[#94a3b8] text-sm py-4 border border-dashed border-white/10 rounded-lg">
              No steps added yet. Click "Add Step" to build your pipeline.
            </p>
          )}
        </div>
      )}

      {/* User Access — only shown when editing an existing workflow */}
      {workflow && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#cbd5e1]" />
            <label className="text-sm font-medium text-[#cbd5e1]">
              User Access ({selectedUserIds.size})
            </label>
          </div>

          {nonAdminMembers.length === 0 ? (
            <p className="text-xs text-[#94a3b8]">
              No non-admin team members to assign.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {nonAdminMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(member.id)}
                    onChange={() => toggleUser(member.id)}
                    className="rounded border-white/20 bg-white/5 text-[#10b981] focus:ring-[#10b981]/30"
                  />
                  <div className="min-w-0">
                    <span className="text-sm text-[#f8fafc] block truncate">
                      {member.name}
                    </span>
                    <span className="text-xs text-[#94a3b8] block truncate">
                      {member.email}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <p className="text-xs text-[#94a3b8]">
            Admin users always have access to all workflows.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="default" size="md" loading={saving} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : workflow ? 'Save Changes' : 'Create Workflow'}
        </Button>
        {onClose && (
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
