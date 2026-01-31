import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'
import FileAttachment from '@/components/ui/FileAttachment'

const MAX_LENGTH = 5000

export default function TopicInput() {
  const topic = useForgeStore((s) => s.input.topic)
  const contentType = useForgeStore((s) => s.input.contentType)
  const setTopic = useForgeStore((s) => s.setTopic)
  const attachments = useForgeStore((s) => s.attachments)
  const setAttachments = useForgeStore((s) => s.setAttachments)

  const contentTypes = useForgeOptionsStore((s) => s.contentTypes)
  const matchedType = contentTypes.find((ct) => ct.id === contentType)
  const placeholder = matchedType?.placeholder ?? 'Describe your topic...'

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#9ca3af] uppercase tracking-wider mb-3">
          Topic
        </label>
        <div className="relative">
          <textarea
            value={topic}
            onChange={(e) => {
              const value = e.target.value
              if (value.length <= MAX_LENGTH) {
                setTopic(value)
              }
            }}
            maxLength={MAX_LENGTH}
            placeholder={placeholder}
            className={cn(
              'w-full min-h-[120px] bg-white/5 border border-white/10 rounded-xl p-4',
              'text-white placeholder-[#4b5563] text-sm leading-relaxed resize-y',
              'outline-none transition-all',
              'focus:border-[#00f0ff] focus:shadow-[0_0_15px_rgba(0,240,255,0.1)]'
            )}
          />
          <span className="absolute bottom-3 right-3 text-xs text-[#6b7280]">
            {topic.length}/{MAX_LENGTH}
          </span>
        </div>
      </div>

      <FileAttachment
        files={attachments}
        onFilesChange={setAttachments}
        compact
      />
    </div>
  )
}
