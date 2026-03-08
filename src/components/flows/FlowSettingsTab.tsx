import type { AnyFlow, Workflow } from '../../types'
import WorkflowForm from '../settings/WorkflowForm'

interface FlowSettingsTabProps {
  flow: AnyFlow
  isAdmin: boolean
}

export function FlowSettingsTab({ flow, isAdmin }: FlowSettingsTabProps) {
  // System flows can't be edited
  if ('isSystem' in flow && flow.isSystem) {
    return (
      <div className="p-4 text-center text-gray-500">
        System flows cannot be edited
      </div>
    )
  }

  // Non-admin users shouldn't see settings
  if (!isAdmin) {
    return (
      <div className="p-4 text-center text-gray-500">
        Only administrators can edit flow settings
      </div>
    )
  }

  // For database flows, show the form
  if ('id' in flow && !('isSystem' in flow)) {
    return (
      <div className="p-4">
        <WorkflowForm workflow={flow as Workflow} />
      </div>
    )
  }

  return null
}
