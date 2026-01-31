import { useState, useRef, useCallback } from 'react'
import { Send, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  onCancel?: () => void
  isStreaming: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onCancel, isStreaming, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t border-white/[0.06] bg-white/[0.02]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder || 'Type a message... (Shift+Enter for new line)'}
        rows={1}
        className={cn(
          'flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5',
          'text-sm text-white/80 placeholder:text-white/25',
          'focus:outline-none focus:border-[#00f0ff]/30 focus:ring-1 focus:ring-[#00f0ff]/20',
          'scrollbar-thin scrollbar-thumb-white/10',
        )}
        disabled={isStreaming}
      />
      {isStreaming ? (
        <button
          onClick={onCancel}
          className="shrink-0 p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
          title="Stop generating"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className={cn(
            'shrink-0 p-2.5 rounded-xl transition-all',
            value.trim()
              ? 'bg-[#00f0ff]/20 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/30'
              : 'bg-white/[0.04] border border-white/[0.06] text-white/20 cursor-not-allowed',
          )}
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
