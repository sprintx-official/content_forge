import { useState } from 'react'
import { Copy, Check, FileDown, FileCode, Printer, RefreshCw, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportActionsProps {
  getPlainText: () => string
  getHTML: () => string
  onRegenerate: () => void
  onBack: () => void
}

export default function ExportActions({
  getPlainText,
  getHTML,
  onRegenerate,
  onBack,
}: ExportActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = getPlainText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadTxt = () => {
    const blob = new Blob([getPlainText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'content-forge-output.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Content Forge Output</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1f2937; }
  h1 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
  h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  p { margin-bottom: 1rem; }
  ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; margin: 0 0 1rem; font-style: italic; color: #6b7280; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  code { background: #f3f4f6; border-radius: 0.25rem; padding: 0.125rem 0.375rem; font-size: 0.875em; }
  pre { background: #f3f4f6; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; }
  pre code { background: none; padding: 0; }
</style>
</head>
<body>
${getHTML()}
</body>
</html>`
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'content-forge-output.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      window.print()
      return
    }
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Content Forge Output</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1f2937; }
  h1 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
  h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  p { margin-bottom: 1rem; }
  ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; margin: 0 0 1rem; font-style: italic; color: #6b7280; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  code { background: #f3f4f6; border-radius: 0.25rem; padding: 0.125rem 0.375rem; font-size: 0.875em; }
  pre { background: #f3f4f6; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; }
  pre code { background: none; padding: 0; }
</style>
</head>
<body>
${getHTML()}
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const outlineClass = cn(
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
    'border border-white/10 bg-white/5 text-[#d1d5db]',
    'hover:bg-white/10 hover:text-white transition-all cursor-pointer',
  )

  const cyanClass = cn(
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
    'border border-[#00f0ff] text-[#00f0ff] bg-transparent',
    'hover:bg-[#00f0ff]/10 transition-all cursor-pointer',
  )

  const ghostClass = cn(
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
    'border border-transparent text-[#9ca3af] bg-transparent',
    'hover:text-white hover:bg-white/5 transition-all cursor-pointer',
  )

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={handleCopy} className={outlineClass}>
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy
          </>
        )}
      </button>

      <button type="button" onClick={handleDownloadTxt} className={outlineClass}>
        <FileDown className="w-4 h-4" />
        Download TXT
      </button>

      <button type="button" onClick={handleDownloadHTML} className={outlineClass}>
        <FileCode className="w-4 h-4" />
        Download HTML
      </button>

      <button type="button" onClick={handlePrint} className={outlineClass}>
        <Printer className="w-4 h-4" />
        Print/PDF
      </button>

      <button type="button" onClick={onRegenerate} className={cyanClass}>
        <RefreshCw className="w-4 h-4" />
        Regenerate
      </button>

      <button type="button" onClick={onBack} className={ghostClass}>
        <ArrowLeft className="w-4 h-4" />
        Edit &amp; Retry
      </button>
    </div>
  )
}
