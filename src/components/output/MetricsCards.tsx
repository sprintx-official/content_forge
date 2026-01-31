import { BookOpen, Clock, GraduationCap, DollarSign, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ContentMetrics, TokenUsage } from '@/types'

interface MetricsCardsProps {
  metrics: ContentMetrics
  tokenUsage?: TokenUsage
  targetWordCount?: number
  tolerancePercent?: number
}

function ReadabilityCircle({ score }: { score: number }) {
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color =
    score >= 70
      ? '#00f0ff'
      : score >= 50
        ? '#facc15'
        : '#ef4444'

  return (
    <div className="relative mx-auto w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  )
}

interface MetricCardProps {
  children: React.ReactNode
  label: string
  index: number
}

function MetricCard({ children, label, index }: MetricCardProps) {
  return (
    <div
      className={cn(
        'bg-white/5 border border-white/10 rounded-xl p-4 text-center',
        'animate-[fadeInUp_0.5s_ease-out_both]',
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {children}
      <div className="text-xs text-[#9ca3af] uppercase tracking-wider mt-2">
        {label}
      </div>
    </div>
  )
}

export default function MetricsCards({ metrics, tokenUsage, targetWordCount, tolerancePercent = 15 }: MetricsCardsProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const showAdminCards = isAdmin && tokenUsage

  // Word count goal calculation
  const hasTarget = !!targetWordCount && targetWordCount > 0
  const wordPct = hasTarget ? (metrics.wordCount / targetWordCount!) * 100 : 0
  const tolerance = tolerancePercent / 100
  const isWithinTolerance = hasTarget
    ? metrics.wordCount >= targetWordCount! * (1 - tolerance) &&
      metrics.wordCount <= targetWordCount! * (1 + tolerance)
    : false

  return (
    <div className={cn(
      'grid gap-4',
      showAdminCards ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4',
    )}>
      <MetricCard label="Readability" index={0}>
        <ReadabilityCircle score={metrics.readabilityScore} />
      </MetricCard>

      <MetricCard label="Words" index={1}>
        <BookOpen className="w-5 h-5 text-[#9ca3af] mx-auto mb-1" />
        <div className="text-2xl font-bold text-[#f9fafb]">
          {metrics.wordCount.toLocaleString()}
        </div>
        {hasTarget && (
          <div className="mt-2">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, wordPct)}%`,
                  backgroundColor: isWithinTolerance ? '#34d399' : wordPct > 100 * (1 + tolerance) || wordPct < 100 * (1 - tolerance) ? '#ef4444' : '#facc15',
                }}
              />
            </div>
            <div className="text-[10px] text-[#6b7280] mt-1">
              Target: {targetWordCount!.toLocaleString()}
            </div>
          </div>
        )}
      </MetricCard>

      <MetricCard label="min read" index={2}>
        <Clock className="w-5 h-5 text-[#9ca3af] mx-auto mb-1" />
        <div className="text-2xl font-bold text-[#f9fafb]">
          {metrics.readTimeMinutes}
        </div>
      </MetricCard>

      <MetricCard label="Grade Level" index={3}>
        <GraduationCap className="w-5 h-5 text-[#9ca3af] mx-auto mb-1" />
        <div className="text-2xl font-bold text-[#f9fafb]">
          {metrics.gradeLevel}
        </div>
      </MetricCard>

      {showAdminCards && (
        <>
          <MetricCard label="Cost" index={4}>
            <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-400">
              ${tokenUsage.costUsd.toFixed(4)}
            </div>
          </MetricCard>

          <MetricCard label="Tokens" index={5}>
            <Cpu className="w-5 h-5 text-[#9ca3af] mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#f9fafb]">
              {tokenUsage.totalTokens.toLocaleString()}
            </div>
          </MetricCard>
        </>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
