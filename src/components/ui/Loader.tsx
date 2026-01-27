import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  label?: string
  className?: string
}

export default function Loader({ label = 'Loading...', className }: LoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20', className)}>
      <Loader2 className="h-8 w-8 text-[#00f0ff] animate-spin mb-3" />
      <p className="text-sm text-[#9ca3af]">{label}</p>
    </div>
  )
}
