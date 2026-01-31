import { PenTool, MessageSquare, Image, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ForgeMode } from '@/types'

interface ForgeTabBarProps {
  activeTab: ForgeMode
  onTabChange: (mode: ForgeMode) => void
}

const TABS: { id: ForgeMode; label: string; icon: typeof PenTool }[] = [
  { id: 'content', label: 'Content', icon: PenTool },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'code', label: 'Code', icon: Code2 },
]

export function ForgeTabBar({ activeTab, onTabChange }: ForgeTabBarProps) {
  return (
    <div className="flex items-center justify-center mb-6">
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-[#00f0ff]/15 to-[#a855f7]/15 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]',
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-colors duration-200',
                  isActive ? 'text-[#00f0ff]' : 'text-white/30',
                )}
              />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-gradient-to-r from-[#00f0ff] to-[#a855f7]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
