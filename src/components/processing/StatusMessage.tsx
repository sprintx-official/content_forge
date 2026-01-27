import { cn } from '@/lib/utils'

interface StatusMessageProps {
  message: string
  agentName: string
}

export function StatusMessage({ message, agentName }: StatusMessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center px-4">
      {/* Active agent indicator */}
      {agentName && (
        <div className="flex items-center gap-2">
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00f0ff] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00f0ff]" />
          </span>

          <span
            className={cn(
              'text-sm md:text-base font-semibold tracking-wide text-[#00f0ff]',
              'drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]',
            )}
          >
            {agentName} Agent
          </span>
        </div>
      )}

      {/* Typed message */}
      <div className="min-h-[1.75rem]">
        <p
          className={cn(
            'text-sm md:text-base text-white/70',
            'font-mono',
            'drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]',
          )}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {message}
          {message && (
            <span className="inline-block w-[2px] h-4 ml-0.5 bg-[#00f0ff] animate-[blink_1s_step-end_infinite] align-middle" />
          )}
        </p>
      </div>

      {/* Blinking cursor animation */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
