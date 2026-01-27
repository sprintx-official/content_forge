import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, label, disabled = false, className }, ref) => {
    return (
      <label
        className={cn(
          'inline-flex items-center gap-2.5 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
      >
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a]',
            checked ? 'bg-[#00f0ff]' : 'bg-white/20',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
        {label && (
          <span className="text-sm text-[#9ca3af]">{label}</span>
        )}
      </label>
    )
  },
)

Toggle.displayName = 'Toggle'

export { Toggle }
