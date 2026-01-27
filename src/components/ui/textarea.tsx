import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, autoResize = false, maxLength, onChange, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)
    const [charCount, setCharCount] = React.useState(0)

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
        }
      },
      [ref]
    )

    const adjustHeight = React.useCallback(() => {
      const textarea = innerRef.current
      if (!textarea || !autoResize) return
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }, [autoResize])

    React.useEffect(() => {
      adjustHeight()
    }, [adjustHeight])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      if (autoResize) adjustHeight()
      onChange?.(e)
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-[#9ca3af]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f9fafb] placeholder:text-[#9ca3af]/60 transition-all duration-200 resize-y',
            'focus:outline-none focus:border-[#00f0ff]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#00f0ff]/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            autoResize && 'resize-none overflow-hidden',
            className
          )}
          ref={setRefs}
          maxLength={maxLength}
          onChange={handleChange}
          {...props}
        />
        {maxLength && (
          <div className="mt-1 flex justify-end">
            <span
              className={cn(
                'text-xs transition-colors',
                charCount >= maxLength
                  ? 'text-red-400'
                  : charCount >= maxLength * 0.9
                    ? 'text-yellow-400'
                    : 'text-[#9ca3af]/60'
              )}
            >
              {charCount}/{maxLength}
            </span>
          </div>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
