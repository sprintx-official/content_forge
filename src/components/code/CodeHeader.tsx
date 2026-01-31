import { useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeHeaderProps {
  code: string
  language: string
  tokenUsage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    provider: string
    model: string
  } | null
}

export function CodeHeader({ code, language, tokenUsage }: CodeHeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const ext: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      sql: 'sql',
      bash: 'sh',
      rust: 'rs',
      go: 'go',
      java: 'java',
      other: 'txt',
    }
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${ext[language] || 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border border-white/[0.08] rounded-t-xl">
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
          {language.toUpperCase()}
        </span>
        {tokenUsage && (
          <div className="flex items-center gap-2 text-[10px] text-white/20 font-mono">
            <span>{tokenUsage.model}</span>
            <span>&middot;</span>
            <span>{tokenUsage.totalTokens.toLocaleString()} tokens</span>
            <span>&middot;</span>
            <span>${tokenUsage.costUsd.toFixed(4)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleCopy}
          disabled={!code}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            code ? 'hover:bg-white/10 text-white/40 hover:text-white/70' : 'text-white/10',
          )}
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleDownload}
          disabled={!code}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            code ? 'hover:bg-white/10 text-white/40 hover:text-white/70' : 'text-white/10',
          )}
          title="Download file"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
