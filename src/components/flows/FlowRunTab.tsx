import type { AnyFlow } from '../../types'
import InputPanel from '../forge/InputPanel'
import { ChatView } from '../chat/ChatView'
import { ImageView } from '../image/ImageView'
import { VideoView } from '../video/VideoView'

interface FlowRunTabProps {
  flow: AnyFlow
  workflowId: string
}

export function FlowRunTab({ flow, workflowId }: FlowRunTabProps) {
  // For system flows, we use the legacy components but skip the workflow selector
  // For database flows, we show the appropriate component based on type

  if (flow.type === 'text') {
    return <InputPanel hideWorkflowSelector workflowId={workflowId} />
  }

  if (flow.type === 'chat') {
    return <ChatView />
  }

  if (flow.type === 'image') {
    return <ImageView />
  }

  if (flow.type === 'video') {
    return <VideoView />
  }

  return <div className="p-4 text-red-600">Unknown flow type: {flow.type}</div>
}
