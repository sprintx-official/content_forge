import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  options: SelectOption[]
  placeholder?: string
  onChange?: (value: string) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, options, placeholder, onChange, value, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-[#cbd5e1]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              'flex h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm text-[#f8fafc] transition-all duration-200',
              'focus:outline-none focus:border-[#10b981]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#10b981]/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            ref={ref}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-[#0f172a] text-[#cbd5e1]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-[#f8fafc]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cbd5e1]" />
        </div>
      </div>
    )
  },
)

Select.displayName = 'Select'

export { Select }
