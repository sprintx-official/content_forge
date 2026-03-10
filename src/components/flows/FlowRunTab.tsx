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

  if (flow.type === 'news') {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">News Pipeline</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          This flow runs automatically — monitoring RSS feeds, clustering stories, and generating coverage posts. Use the <strong className="text-white">Monitor</strong> tab to track pipeline runs and trigger manual executions.
        </p>
      </div>
    )
  }

  return <div className="p-4 text-red-600">Unknown flow type: {flow.type}</div>
}
