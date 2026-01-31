import { FileText, FileCode, Braces, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParsedFile } from '@/types'

interface FileTabBarProps {
  files: ParsedFile[]
  activeIndex: number
  onTabChange: (index: number) => void
}

const EXTENSION_ICONS: Record<string, React.ElementType> = {
  md: FileText,
  txt: FileText,
  html: FileCode,
  json: Braces,
}

export default function FileTabBar({ files, activeIndex, onTabChange }: FileTabBarProps) {
  // Don't render if single file with no extension (backward compat — plain content)
  if (files.length <= 1 && !files[0]?.extension) return null

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-white/[0.03] overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
      {files.map((file, index) => {
        const Icon = EXTENSION_ICONS[file.extension] || File
        const isActive = index === activeIndex

        return (
          <button
            key={`${file.filename}-${index}`}
            type="button"
            onClick={() => onTabChange(index)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer',
              isActive
                ? 'bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-white/5',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {file.filename}
          </button>
        )
      })}
    </div>
  )
}
