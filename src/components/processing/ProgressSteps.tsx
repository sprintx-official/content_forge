import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { ProcessingStage } from '@/types'

interface ProgressStepsProps {
  stages: ProcessingStage[]
  currentStageIndex: number
}

export function ProgressSteps({ stages }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-xl mx-auto px-4">
      {stages.map((stage, index) => {
        const isActive = stage.status === 'active'
        const isCompleted = stage.status === 'completed'
        const isPending = stage.status === 'pending'

        // Determine if the connecting line to the next step should be filled
        const lineCompleted = isCompleted

        return (
          <div
            key={stage.id}
            className="flex items-center flex-1 last:flex-none"
          >
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-2 relative">
              <div
                className={cn(
                  'relative flex items-center justify-center rounded-full transition-all duration-500',
                  'border-2',
                  // Sizing
                  isActive
                    ? 'w-10 h-10 md:w-12 md:h-12'
                    : 'w-8 h-8 md:w-10 md:h-10',
                  // Pending
                  isPending && 'border-white/20 bg-white/5',
                  // Active
                  isActive && [
                    'border-[#00f0ff] bg-[#00f0ff]/10',
                    'shadow-[0_0_20px_rgba(0,240,255,0.4)]',
                  ],
                  // Completed
                  isCompleted && 'border-[#34d399] bg-[#34d399]/20',
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-[#34d399]" />
                ) : (
                  <span
                    className={cn(
                      'text-xs md:text-sm font-bold transition-colors duration-500',
                      isActive && 'text-[#00f0ff]',
                      isPending && 'text-white/30',
                    )}
                  >
                    {index + 1}
                  </span>
                )}

                {/* Active pulse ring */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full border-2 border-[#00f0ff] animate-ping opacity-30"
                    style={{ animationDuration: '2s' }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-[10px] md:text-xs font-medium whitespace-nowrap transition-colors duration-500',
                  isActive && 'text-[#00f0ff]',
                  isCompleted && 'text-[#34d399]',
                  isPending && 'text-white/30',
                )}
              >
                {stage.label}
              </span>
            </div>

            {/* Connecting line to next step */}
            {index < stages.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 md:mx-3 relative overflow-hidden rounded-full mt-[-1.25rem]">
                {/* Background track */}
                <div className="absolute inset-0 bg-white/10 rounded-full" />

                {/* Filled progress */}
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
                    lineCompleted
                      ? 'w-full bg-[#34d399]'
                      : isActive
                        ? 'w-1/2 bg-gradient-to-r from-[#00f0ff] to-[#00f0ff]/0'
                        : 'w-0',
                  )}
                />

                {/* Animated shimmer for active line */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00f0ff]/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
