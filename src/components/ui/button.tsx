import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = {
  variant: {
    default:
      'bg-[#10b981] text-[#0f172a] font-semibold hover:bg-[#33f3ff] active:bg-[#00d4e0]',
    secondary:
      'bg-[#6366f1] text-white font-semibold hover:bg-[#b96ef8] active:bg-[#9333ea]',
    outline:
      'border border-white/[0.12] bg-transparent text-white/70 hover:border-white/25 hover:bg-white/[0.04] hover:text-white/90',
    ghost:
      'bg-transparent text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-white/5',
    danger:
      'bg-red-600 text-white font-semibold hover:bg-red-500 active:bg-red-700',
  },
  size: {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-5 text-sm rounded-xl gap-2',
    lg: 'h-12 px-7 text-base rounded-xl gap-2.5',
  },
} as const

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant
  size?: keyof typeof buttonVariants.size
  loading?: boolean
}

const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner className="shrink-0" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
