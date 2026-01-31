import { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useForgeStore } from '@/stores/useForgeStore'
import { useProcessingAnimation } from '@/hooks/useProcessingAnimation'
import { ParticleCanvas } from './ParticleCanvas'
import { NeuralNetwork } from './NeuralNetwork'
import { AgentNodes } from './AgentNodes'
import { ProgressSteps } from './ProgressSteps'
import { StatusMessage } from './StatusMessage'
import { FileText, Shield, Terminal, X } from 'lucide-react'

// --- Hex data stream hook ---
function useHexStream(active: boolean) {
  const [lines, setLines] = useState<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      setLines([])
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    const gen = () => {
      const hex = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('')
      setLines((prev) => [...prev.slice(-5), hex])
    }
    gen()
    intervalRef.current = setInterval(gen, 200)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [active])

  return lines
}

// --- Main ProcessingView ---
export function ProcessingView() {
  const isProcessing = useForgeStore((state) => state.isProcessing)
  const dynamicStages = useForgeStore((state) => state.dynamicStages)
  const terminalLogs = useForgeStore((state) => state.terminalLogs)
  const cancelGeneration = useForgeStore((state) => state.cancelGeneration)

  const { stages, currentStageIndex, displayMessage, progress } =
    useProcessingAnimation(isProcessing, dynamicStages)

  const activeStage = currentStageIndex >= 0 ? stages[currentStageIndex] : null
  const hexLines = useHexStream(isProcessing)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll terminal log (scroll WITHIN the terminal container only, not the page)
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLogs])

  const statusText = useMemo(() => {
    if (!activeStage) return 'Initializing pipeline...'
    return `${activeStage.agent} Agent - ${activeStage.message}`
  }, [activeStage])

  return (
    <div className="flex flex-col gap-0 animate-[fadeIn_0.6s_ease-out]">
      {/* ===== TOP: Status bar ===== */}
      <div className="w-full max-w-4xl mx-auto mb-3 px-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Terminal className="w-3.5 h-3.5 text-[#00f0ff]/60" />
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-mono text-[#00f0ff]/40 shrink-0">
              FORGE://
            </span>
            <span className="text-xs font-mono text-white/50 truncate">
              {statusText}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#34d399]/40" />
              <span className="text-[9px] font-mono text-white/20">SECURE</span>
            </div>
            {/* Cancel button */}
            <button
              onClick={cancelGeneration}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Cancel generation"
            >
              <X className="w-3 h-3" />
              CANCEL
            </button>
          </div>
        </div>
      </div>

      {/* ===== MIDDLE: Original neural-network visualization ===== */}
      <div
        className={cn(
          'relative min-h-[60vh] w-full overflow-hidden rounded-2xl',
          'bg-gradient-to-b from-[#0a0a1a] via-[#0d0d2b] to-[#0a0a1a]',
          'border border-white/5',
        )}
      >
        {/* Particle background */}
        <ParticleCanvas />

        {/* Scan lines overlay */}
        <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />

        {/* Hex data streams */}
        <div className="absolute top-0 left-3 bottom-0 z-[2] w-[180px] pointer-events-none overflow-hidden opacity-[0.1] hidden lg:block">
          <div className="flex flex-col gap-1 pt-14 font-mono text-[9px] text-[#00f0ff]">
            {hexLines.map((line, i) => (
              <div key={i} className="animate-[fadeIn_0.3s_ease-out]">
                0x{line}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-3 bottom-0 z-[2] w-[180px] pointer-events-none overflow-hidden opacity-[0.1] hidden lg:block">
          <div className="flex flex-col items-end gap-1 pt-14 font-mono text-[9px] text-[#a855f7]">
            {hexLines.map((line, i) => (
              <div key={i} className="animate-[fadeIn_0.3s_ease-out]">
                {line.split('').reverse().join('')}
              </div>
            ))}
          </div>
        </div>

        {/* Neural network SVG connections */}
        <NeuralNetwork stages={stages} currentStageIndex={currentStageIndex} />

        {/* Agent nodes (circle / pentagon layout) */}
        <AgentNodes stages={stages} currentStageIndex={currentStageIndex} />

        {/* Title - top area */}
        <div className="relative z-30 flex flex-col items-center pt-6 pointer-events-none">
          <h2
            className={cn(
              'text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight',
              'bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#00f0ff]',
              'bg-clip-text text-transparent',
              'bg-[length:200%_100%]',
              'animate-[gradientShift_4s_ease-in-out_infinite]',
              'drop-shadow-[0_0_20px_rgba(0,240,255,0.3)]',
            )}
          >
            Forging Your Content...
          </h2>

          {/* Progress percentage */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs md:text-sm text-white/40 font-mono tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Progress bar - thin line below title */}
        <div className="relative z-30 mx-auto mt-3 max-w-xs md:max-w-sm px-8">
          <div className="h-[2px] w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#a855f7] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status message - center-bottom area */}
        <div className="absolute bottom-24 md:bottom-28 left-0 right-0 z-30">
          <StatusMessage
            message={displayMessage}
            agentName={activeStage?.agent ?? ''}
          />
        </div>

        {/* Progress steps - bottom */}
        <div className="absolute bottom-6 md:bottom-8 left-0 right-0 z-30">
          <ProgressSteps stages={stages} currentStageIndex={currentStageIndex} />
        </div>

        {/* Ambient glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#00f0ff]/5 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-[#a855f7]/5 rounded-full blur-3xl pointer-events-none z-0" />
      </div>

      {/* ===== BOTTOM: Live Activity Terminal ===== */}
      <div className="w-full max-w-4xl mx-auto mt-4 px-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#030311]/80 backdrop-blur-sm overflow-hidden">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
            </div>
            <span className="text-[10px] font-mono text-white/25 ml-2">
              forge-pipeline.log
            </span>
            <FileText className="w-3 h-3 text-white/15 ml-auto" />
          </div>

          {/* Terminal body */}
          <div ref={terminalRef} className="h-[140px] overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/10">
            {terminalLogs.length === 0 && (
              <div className="text-[11px] font-mono text-white/20">
                Waiting for pipeline...
              </div>
            )}
            {terminalLogs.map((entry, i) => {
              if (!entry?.text) return null
              const isSystem = entry.text.startsWith('[SYS]')
              const isAI = entry.text.startsWith('[AI]')
              const isData = entry.text.startsWith('[DATA]')
              const isNet = entry.text.startsWith('[NET]')
              const isScan = entry.text.startsWith('[SCAN]')
              const isEdit = entry.text.startsWith('[EDIT]')
              const isProc = entry.text.startsWith('[PROC]')
              const isErr = entry.text.startsWith('[ERR]')

              let tagColor = 'text-white/40'
              if (isErr) tagColor = 'text-red-400/80'
              else if (isSystem) tagColor = 'text-[#facc15]/70'
              else if (isAI) tagColor = 'text-[#00f0ff]/80'
              else if (isData || isNet) tagColor = 'text-[#a855f7]/70'
              else if (isScan) tagColor = 'text-[#f97316]/60'
              else if (isEdit) tagColor = 'text-[#34d399]/70'
              else if (isProc) tagColor = 'text-[#60a5fa]/70'

              const isLast = i === terminalLogs.length - 1

              return (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2 text-[11px] font-mono leading-relaxed',
                    'animate-[slideInLog_0.3s_ease-out]',
                    isLast ? 'text-white/60' : 'text-white/30',
                  )}
                >
                  <span className="text-white/15 shrink-0">{entry.time}</span>
                  <span className={cn('break-all', tagColor)}>
                    {entry.text}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom meta */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[9px] font-mono text-white/15">
            STEP {Math.min(currentStageIndex + 1, stages.length)}/{stages.length}
          </span>
          <span className="text-[9px] font-mono text-white/15">
            {Math.round(progress)}% COMPLETE
          </span>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes slideInLog {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
