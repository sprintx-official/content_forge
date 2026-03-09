import type { AnyFlow } from '../../types'
import { useForgeStore } from '@/stores/useForgeStore'
import InputPanel from '../forge/InputPanel'
import { ProcessingView } from '../processing/ProcessingView'
import OutputPanel from '../output/OutputPanel'
import { ChatView } from '../chat/ChatView'
import { ImageView } from '../image/ImageView'
import { VideoView } from '../video/VideoView'

interface FlowRunTabProps {
  flow: AnyFlow
  workflowId: string
}

export function FlowRunTab({ flow, workflowId }: FlowRunTabProps) {
  const isProcessing = useForgeStore((s) => s.isProcessing)
  const output = useForgeStore((s) => s.output)

  if (flow.type === 'text') {
    // Show processing view during generation
    if (isProcessing) {
      return <ProcessingView />
    }

    // Show output when generation is complete
    if (output) {
      return <OutputPanel />
    }

    // Show input form when idle
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
