import { useNavigate } from 'react-router-dom'
import { Zap, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  size: Math.random() * 4 + 2, // 2–6px
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  delay: `${(i * 0.7).toFixed(1)}s`,
  duration: `${(Math.random() * 4 + 4).toFixed(1)}s`, // 4–8s
}))

export default function HeroSection() {
  const navigate = useNavigate()

  const scrollToFeatures = () => {
    const el = document.getElementById('features')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* ---------- Floating particles ---------- */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-[#00f0ff]/30 animate-[float_6s_ease-in-out_infinite]"
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* ---------- Content ---------- */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto gap-6">
        {/* Heading */}
        <h1
          className={cn(
            'text-5xl md:text-7xl font-bold',
            'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent',
            'animate-[fadeInUp_0.8s_ease-out_both]',
          )}
        >
          Forge Your Content
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-[#9ca3af] max-w-2xl animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
          AI-powered writing assistant for mass communication students
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 animate-[fadeInUp_0.8s_ease-out_0.4s_both]">
          <button
            onClick={() => navigate('/forge')}
            className={cn(
              'inline-flex items-center gap-2',
              'bg-[#00f0ff] text-[#0a0e1a] font-semibold px-8 py-4 rounded-xl text-lg',
              'hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all',
              'cursor-pointer',
            )}
          >
            <Zap className="h-5 w-5" />
            Start Creating
          </button>

          <button
            onClick={scrollToFeatures}
            className={cn(
              'inline-flex items-center gap-2',
              'border border-white/20 text-white/80 font-semibold px-8 py-4 rounded-xl text-lg',
              'hover:border-[#00f0ff]/50 hover:text-white transition-all',
              'cursor-pointer',
            )}
          >
            View Features
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Glassmorphism preview card */}
        <div
          className={cn(
            'mt-10 w-full max-w-2xl',
            'bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6',
            'text-left space-y-3',
            'animate-[fadeInUp_0.8s_ease-out_0.6s_both]',
          )}
        >
          <div className="h-4 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-full rounded bg-white/[0.06]" />
          <div className="h-3 w-5/6 rounded bg-white/[0.06]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
          <div className="h-3 w-4/5 rounded bg-white/[0.06]" />
        </div>
      </div>

      {/* ---------- Keyframe styles ---------- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50%      { transform: translateY(-30px) scale(1.3); opacity: 0.8; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
