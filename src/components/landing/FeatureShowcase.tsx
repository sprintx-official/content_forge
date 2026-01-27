import { useEffect, useRef, useState } from 'react'
import { Brain, Network, BookOpen, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: 'AI-Powered Writing',
    description:
      'Generate professional content tailored to your needs with intelligent content analysis',
  },
  {
    icon: Network,
    title: 'Agent Visualization',
    description:
      'Watch AI agents collaborate in real-time with stunning neural network animations',
  },
  {
    icon: BookOpen,
    title: 'Learning Tools',
    description:
      'Improve your writing with readability metrics and contextual writing tips',
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    description:
      'Copy, download as text or PDF, and share your content instantly',
  },
]

function FeatureCard({
  feature,
  index,
}: {
  feature: Feature
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Icon = feature.icon

  return (
    <div
      ref={ref}
      className={cn(
        'bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8',
        'transition-all duration-700 ease-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <Icon className="h-10 w-10 text-[#00f0ff] mb-5" />
      <h3 className="text-xl font-semibold text-white mb-3">
        {feature.title}
      </h3>
      <p className="text-[#9ca3af] leading-relaxed">{feature.description}</p>
    </div>
  )
}

export default function FeatureShowcase() {
  return (
    <section id="features" className="px-4 max-w-6xl mx-auto">
      {/* Section heading */}
      <h2
        className={cn(
          'text-3xl md:text-5xl font-bold text-center mb-12',
          'bg-gradient-to-r from-[#00f0ff] to-[#a855f7] bg-clip-text text-transparent',
        )}
      >
        Why ContentForge?
      </h2>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  )
}
