import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Brain, Search, PenTool, Sparkles, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ProcessingStage } from '@/types'

interface AgentNodesProps {
  stages: ProcessingStage[]
  currentStageIndex: number
}

const KNOWN_ICONS: Record<string, LucideIcon> = {
  Analyzer: Brain,
  Researcher: Search,
  Writer: PenTool,
  Editor: Sparkles,
  Optimizer: Gauge,
}

const DEFAULT_AGENT_CONFIG = [
  {
    agent: 'Analyzer',
    icon: Brain,
    position: 'left-1/2 top-[8%] -translate-x-1/2',
  },
  {
    agent: 'Researcher',
    icon: Search,
    position: 'left-[12%] top-[38%] -translate-y-1/2',
  },
  {
    agent: 'Writer',
    icon: PenTool,
    position: 'left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2',
    isMain: true,
  },
  {
    agent: 'Editor',
    icon: Sparkles,
    position: 'right-[12%] top-[38%] -translate-y-1/2',
  },
  {
    agent: 'Optimizer',
    icon: Gauge,
    position: 'left-1/2 top-[72%] -translate-x-1/2',
  },
] as const

function computeCirclePositions(count: number): { left: string; top: string }[] {
  const cx = 50
  const cy = 40
  const rx = 32
  const ry = 28

  return Array.from({ length: count }, (_, i) => {
    // Start from top (-PI/2) and go clockwise
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count
    const left = cx + rx * Math.cos(angle)
    const top = cy + ry * Math.sin(angle)
    return { left: `${left}%`, top: `${top}%` }
  })
}

function isDefaultLayout(stages: ProcessingStage[]): boolean {
  const defaultAgents = ['Analyzer', 'Researcher', 'Writer', 'Editor', 'Optimizer']
  if (stages.length > 5) return false
  return stages.every((s) => defaultAgents.includes(s.agent))
}

export function AgentNodes({ stages }: AgentNodesProps) {
  const useDefault = useMemo(() => isDefaultLayout(stages), [stages])
  const dynamicPositions = useMemo(
    () => (useDefault ? null : computeCirclePositions(stages.length)),
    [useDefault, stages.length],
  )

  if (useDefault) {
    return (
      <div className="absolute inset-0 z-20">
        {DEFAULT_AGENT_CONFIG.map((config) => {
          const stage = stages.find((s) => s.agent === config.agent)
          const status = stage?.status ?? 'pending'
          const isActive = status === 'active'
          const isCompleted = status === 'completed'
          const Icon = config.icon
          const isMain = 'isMain' in config && config.isMain

          return (
            <div
              key={config.agent}
              className={cn(
                'absolute flex flex-col items-center gap-1.5 transition-all duration-500',
                config.position,
              )}
            >
              {isActive && (
                <div
                  className={cn(
                    'absolute rounded-full',
                    isMain ? 'w-28 h-28 md:w-32 md:h-32' : 'w-24 h-24 md:w-28 md:h-28',
                    'bg-[#00f0ff]/5 animate-ping',
                  )}
                  style={{ animationDuration: '2s' }}
                />
              )}
              <div
                className={cn(
                  'relative rounded-full flex flex-col items-center justify-center gap-1',
                  'border backdrop-blur-sm transition-all duration-500',
                  isMain ? 'w-22 h-22 md:w-26 md:h-26' : 'w-20 h-20 md:w-24 md:h-24',
                  'bg-white/5 border-white/20',
                  isActive && ['border-[#00f0ff] bg-[#00f0ff]/10', 'shadow-[0_0_30px_rgba(0,240,255,0.3)]', 'scale-110'],
                  isCompleted && ['border-[#34d399] bg-[#34d399]/10', 'shadow-[0_0_20px_rgba(52,211,153,0.2)]'],
                )}
              >
                <Icon
                  className={cn(
                    'transition-colors duration-500',
                    isMain ? 'w-7 h-7 md:w-8 md:h-8' : 'w-5 h-5 md:w-6 md:h-6',
                    isActive && 'text-[#00f0ff]',
                    isCompleted && 'text-[#34d399]',
                    !isActive && !isCompleted && 'text-white/40',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] md:text-xs font-medium tracking-wide transition-colors duration-500',
                    isActive && 'text-[#00f0ff]',
                    isCompleted && 'text-[#34d399]',
                    !isActive && !isCompleted && 'text-white/40',
                  )}
                >
                  {config.agent}
                </span>
                {isActive && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00f0ff] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00f0ff]" />
                  </span>
                )}
                {isCompleted && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#34d399]" />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Dynamic layout for custom workflows
  return (
    <div className="absolute inset-0 z-20">
      {stages.map((stage, index) => {
        const pos = dynamicPositions![index]
        const status = stage.status
        const isActive = status === 'active'
        const isCompleted = status === 'completed'
        const Icon = KNOWN_ICONS[stage.agent] || Brain

        return (
          <div
            key={`${stage.agent}-${index}`}
            className="absolute flex flex-col items-center gap-1.5 transition-all duration-500 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pos.left, top: pos.top }}
          >
            {isActive && (
              <div
                className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-[#00f0ff]/5 animate-ping"
                style={{ animationDuration: '2s' }}
              />
            )}
            <div
              className={cn(
                'relative rounded-full flex flex-col items-center justify-center gap-1',
                'border backdrop-blur-sm transition-all duration-500',
                'w-20 h-20 md:w-24 md:h-24',
                'bg-white/5 border-white/20',
                isActive && ['border-[#00f0ff] bg-[#00f0ff]/10', 'shadow-[0_0_30px_rgba(0,240,255,0.3)]', 'scale-110'],
                isCompleted && ['border-[#34d399] bg-[#34d399]/10', 'shadow-[0_0_20px_rgba(52,211,153,0.2)]'],
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 md:w-6 md:h-6 transition-colors duration-500',
                  isActive && 'text-[#00f0ff]',
                  isCompleted && 'text-[#34d399]',
                  !isActive && !isCompleted && 'text-white/40',
                )}
              />
              <span
                className={cn(
                  'text-[10px] md:text-xs font-medium tracking-wide transition-colors duration-500',
                  isActive && 'text-[#00f0ff]',
                  isCompleted && 'text-[#34d399]',
                  !isActive && !isCompleted && 'text-white/40',
                )}
              >
                {stage.agent}
              </span>
              {isActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00f0ff] opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00f0ff]" />
                </span>
              )}
              {isCompleted && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#34d399]" />
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
