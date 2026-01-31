import { useEffect, useRef } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { useCodeStore } from '@/stores/useCodeStore'
import { CodeHeader } from './CodeHeader'

function extractCode(raw: string): string {
  // Strip markdown code fences if present
  const fenceMatch = raw.match(/^```[\w-]*\n?([\s\S]*?)```\s*$/m)
  if (fenceMatch) return fenceMatch[1].trim()
  return raw.trim()
}

function mapLanguage(lang: string): string {
  const map: Record<string, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    html: 'markup',
    css: 'css',
    json: 'json',
    sql: 'sql',
    bash: 'bash',
    rust: 'rust',
    go: 'go',
    java: 'java',
    other: 'javascript',
  }
  return map[lang] || 'javascript'
}

export function CodeOutput() {
  const { generatedCode, streamingCode, isGenerating, language, tokenUsage } = useCodeStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const displayCode = isGenerating ? streamingCode : generatedCode
  const cleanCode = extractCode(displayCode)

  useEffect(() => {
    if (scrollRef.current && isGenerating) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamingCode, isGenerating])

  if (!displayCode && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
            <span className="text-2xl font-mono text-white/15">{'</>'}</span>
          </div>
          <p className="text-sm text-white/25">Generated code will appear here</p>
          <p className="text-xs text-white/15 mt-1">Describe what you need and select a language</p>
        </div>
      </div>
    )
  }

  const prismLang = mapLanguage(language)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <CodeHeader code={cleanCode} language={language} tokenUsage={tokenUsage} />

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto rounded-b-xl bg-[#0d1117] border border-t-0 border-white/[0.08]"
      >
        <Highlight theme={themes.nightOwl} code={cleanCode || ' '} language={prismLang}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto">
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell pr-4 text-right text-white/15 select-none w-10">
                    {i + 1}
                  </span>
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
              {isGenerating && (
                <span className="inline-block w-2 h-4 bg-[#00f0ff] animate-pulse ml-0.5" />
              )}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}
