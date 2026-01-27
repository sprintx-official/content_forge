import { cn } from '@/lib/utils'
import { CONTENT_TYPES } from '@/constants'
import { useForgeStore } from '@/stores/useForgeStore'

const MAX_LENGTH = 500

export default function TopicInput() {
  const topic = useForgeStore((s) => s.input.topic)
  const contentType = useForgeStore((s) => s.input.contentType)
  const setTopic = useForgeStore((s) => s.setTopic)

  const matchedType = CONTENT_TYPES.find((ct) => ct.id === contentType)
  const placeholder = matchedType?.placeholder ?? 'Describe your topic...'

  return (
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
  )
}
