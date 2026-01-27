import {
  Brain,
  Search,
  PenTool,
  Sparkles,
  Gauge,
  BookOpen,
  MessageSquare,
  Target,
  Lightbulb,
  Megaphone,
  Palette,
  Code,
  Globe,
  Shield,
  Zap,
  Eye,
  Heart,
  Star,
  Cpu,
  Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, LucideIcon> = {
  Brain,
  Search,
  PenTool,
  Sparkles,
  Gauge,
  BookOpen,
  MessageSquare,
  Target,
  Lightbulb,
  Megaphone,
  Palette,
  Code,
  Globe,
  Shield,
  Zap,
  Eye,
  Heart,
  Star,
  Cpu,
  Layers,
}

export const ICON_NAMES = Object.keys(ICON_MAP)

export function getIconComponent(name: string): LucideIcon {
  return ICON_MAP[name] || Brain
}

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#9ca3af]">
        Icon
      </label>
      <div className="grid grid-cols-10 gap-2">
        {ICON_NAMES.map((name) => {
          const Icon = ICON_MAP[name]
          const selected = value === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn(
                'flex items-center justify-center rounded-lg p-2 transition-all duration-200 border',
                selected
                  ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'border-white/10 bg-white/5 text-[#9ca3af] hover:bg-white/10 hover:text-[#f9fafb]',
              )}
              title={name}
            >
              <Icon className="h-5 w-5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
