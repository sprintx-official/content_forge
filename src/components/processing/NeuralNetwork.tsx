import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ProcessingStage } from '@/types'

interface NeuralNetworkProps {
  stages: ProcessingStage[]
  currentStageIndex: number
}

/**
 * Default node positions as percentages matching AgentNodes layout:
 *   0: Analyzer   - top center      (50%, 8%)
 *   1: Researcher  - left            (12%, 38%)
 *   2: Writer      - center          (50%, 44%)
 *   3: Editor      - right           (88%, 38%)
 *   4: Optimizer   - bottom center   (50%, 72%)
 */
const DEFAULT_NODE_POSITIONS: [number, number][] = [
  [50, 10],  // Analyzer
  [14, 38],  // Researcher
  [50, 44],  // Writer
  [86, 38],  // Editor
  [50, 72],  // Optimizer
]

const DEFAULT_CONNECTIONS: [number, number, number][] = [
  [0, 1, 0], // Analyzer -> Researcher
  [0, 2, 0], // Analyzer -> Writer
  [1, 2, 1], // Researcher -> Writer
  [2, 3, 2], // Writer -> Editor
  [3, 4, 3], // Editor -> Optimizer
]

function computeCirclePositions(count: number): [number, number][] {
  const cx = 50
  const cy = 40
  const rx = 32
  const ry = 28

  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)] as [number, number]
  })
}

function buildLinearConnections(count: number): [number, number, number][] {
  const connections: [number, number, number][] = []
  for (let i = 0; i < count - 1; i++) {
    connections.push([i, i + 1, i])
  }
  return connections
}

function isDefaultLayout(stages: ProcessingStage[]): boolean {
  const defaultAgents = ['Analyzer', 'Researcher', 'Writer', 'Editor', 'Optimizer']
  if (stages.length > 5) return false
  return stages.every((s) => defaultAgents.includes(s.agent))
}

function getConnectionStatus(
  activatingStageIdx: number,
  stages: ProcessingStage[],
): 'pending' | 'active' | 'completed' {
  const stage = stages[activatingStageIdx]
  if (!stage) return 'pending'
  return stage.status
}

export function NeuralNetwork({ stages }: NeuralNetworkProps) {
  const useDefault = useMemo(() => isDefaultLayout(stages), [stages])

  const nodePositions = useMemo(
    () => (useDefault ? DEFAULT_NODE_POSITIONS : computeCirclePositions(stages.length)),
    [useDefault, stages.length],
  )

  const connections = useMemo(
    () => (useDefault ? DEFAULT_CONNECTIONS : buildLinearConnections(stages.length)),
    [useDefault, stages.length],
  )

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="completedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {connections.map(([fromIdx, toIdx, stageIdx], connectionIndex) => {
          const pos1 = nodePositions[fromIdx]
          const pos2 = nodePositions[toIdx]
          if (!pos1 || !pos2) return null

          const [x1, y1] = pos1
          const [x2, y2] = pos2
          const status = getConnectionStatus(stageIdx, stages)
          const isActive = status === 'active'
          const isCompleted = status === 'completed'

          const pathId = `connection-${connectionIndex}`
          const pathD = `M ${x1} ${y1} L ${x2} ${y2}`

          return (
            <g key={pathId}>
              <path
                d={pathD}
                fill="none"
                strokeWidth={isActive ? 0.4 : 0.25}
                className={cn(
                  'transition-all duration-700',
                  isActive && 'stroke-[#00f0ff]',
                  isCompleted && 'stroke-[#34d399]',
                  !isActive && !isCompleted && 'stroke-white/10',
                )}
                strokeOpacity={isActive ? 0.6 : isCompleted ? 0.5 : 0.15}
                filter={isActive ? 'url(#glow)' : undefined}
              />

              {isActive && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#activeGradient)"
                  strokeWidth={0.35}
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                  className="animate-[dashFlow_1.5s_linear_infinite]"
                />
              )}

              {isActive && (
                <>
                  <circle r="0.6" fill="#00f0ff" filter="url(#glow)">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={pathD}
                    />
                  </circle>
                  <circle r="0.4" fill="#a855f7" filter="url(#glow)">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={pathD}
                      begin="1s"
                    />
                  </circle>
                </>
              )}

              {isCompleted && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#completedGradient)"
                  strokeWidth={0.3}
                  strokeLinecap="round"
                />
              )}
            </g>
          )
        })}
      </svg>

      <style>{`
        @keyframes dashFlow {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>
    </div>
  )
}
