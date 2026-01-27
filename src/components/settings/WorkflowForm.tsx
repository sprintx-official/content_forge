import { useState, useEffect } from 'react'
import { Save, X, Plus, Users } from 'lucide-react'
import { useAdminStore } from '@/stores/useAdminStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import WorkflowStepEditor from './WorkflowStepEditor'
import type { Workflow, WorkflowStep } from '@/types'

interface WorkflowFormProps {
  workflow?: Workflow | null
  onClose: () => void
}

export default function WorkflowForm({ workflow, onClose }: WorkflowFormProps) {
  const { addWorkflow, editWorkflow, setWorkflowAccess, agents, loadAgents, teamMembers, loadTeam } = useAdminStore()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [isActive, setIsActive] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

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

    if (steps.length === 0) {
      setError('Add at least one step.')
      return
    }

    const invalidStep = steps.find((s) => !s.agentId)
    if (invalidStep) {
      setError('All steps must have an agent selected.')
      return
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      steps,
      isActive,
    }

    try {
      if (workflow) {
        await editWorkflow(workflow.id, data)
        await setWorkflowAccess(workflow.id, Array.from(selectedUserIds))
      } else {
        await addWorkflow(data)
      }
      onClose()
    } catch {
      setError('Failed to save workflow.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#f9fafb]">
          {workflow ? 'Edit Workflow' : 'New Workflow'}
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#9ca3af]">
            Steps ({steps.length})
          </label>
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
          <p className="text-center text-[#6b7280] text-sm py-4 border border-dashed border-white/10 rounded-lg">
            No steps added yet. Click "Add Step" to build your workflow.
          </p>
        )}
      </div>

      {/* User Access — only shown when editing an existing workflow */}
      {workflow && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#9ca3af]" />
            <label className="text-sm font-medium text-[#9ca3af]">
              User Access ({selectedUserIds.size})
            </label>
          </div>

          {nonAdminMembers.length === 0 ? (
            <p className="text-xs text-[#6b7280]">
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
                    className="rounded border-white/20 bg-white/5 text-[#00f0ff] focus:ring-[#00f0ff]/30"
                  />
                  <div className="min-w-0">
                    <span className="text-sm text-[#f9fafb] block truncate">
                      {member.name}
                    </span>
                    <span className="text-xs text-[#6b7280] block truncate">
                      {member.email}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <p className="text-xs text-[#6b7280]">
            Admin users always have access to all workflows.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="default" size="md">
          <Save className="h-4 w-4" />
          {workflow ? 'Save Changes' : 'Create Workflow'}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
