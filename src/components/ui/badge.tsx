import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = {
  default:
    'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30',
  purple:
    'bg-[#6366f1]/15 text-[#6366f1] border-[#6366f1]/30',
  pink:
    'bg-[#ec4899]/15 text-[#ec4899] border-[#ec4899]/30',
  green:
    'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30',
  outline:
    'bg-transparent text-[#cbd5e1] border-white/20',
  amber:
    'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30',
  blue:
    'bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30',
  rose:
    'bg-[#fb7185]/15 text-[#fb7185] border-[#fb7185]/30',
  teal:
    'bg-[#2dd4bf]/15 text-[#2dd4bf] border-[#2dd4bf]/30',
} as const

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
)

Badge.displayName = 'Badge'

export { Badge }
