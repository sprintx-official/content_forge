import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = {
  default:
    'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/30',
  purple:
    'bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30',
  pink:
    'bg-[#f472b6]/15 text-[#f472b6] border-[#f472b6]/30',
  green:
    'bg-[#34d399]/15 text-[#34d399] border-[#34d399]/30',
  outline:
    'bg-transparent text-[#9ca3af] border-white/20',
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
