import type { ParsedFile, FileDownloadOption } from '@/types'

/**
 * Regex to match bold filename markers: **filename.ext**
 * Captures the filename (group 1).
 */
const BOLD_FILENAME_RE = /^\*\*([a-zA-Z0-9_\-. ]+\.[a-zA-Z0-9]+)\*\*\s*$/

/**
 * Parse multi-file output content into individual ParsedFile objects.
 *
 * Detects sections separated by **filename.ext** markers (the pattern LLMs
 * commonly use when asked to produce multiple files). Falls back to a single
 * entry when no markers are detected — this keeps the UI backward-compatible
 * with plain single-content output.
 */
export function parseMultiFileContent(rawContent: string): ParsedFile[] {
  const lines = rawContent.split('\n')
  const files: ParsedFile[] = []
  let currentFilename: string | null = null
  let currentLines: string[] = []
  let detectedMultiFile = false

  for (const line of lines) {
    const boldMatch = line.match(BOLD_FILENAME_RE)

    if (boldMatch) {
      detectedMultiFile = true
      // Save previous section if any
      if (currentFilename && currentLines.length > 0) {
        files.push(buildParsedFile(currentFilename, currentLines))
      }
      currentFilename = boldMatch[1]
      currentLines = []
      continue
    }

    currentLines.push(line)
  }

  // Flush remaining content
  if (currentFilename && currentLines.length > 0) {
    files.push(buildParsedFile(currentFilename, currentLines))
  }

  // If no multi-file markers detected, return single file
  if (!detectedMultiFile || files.length === 0) {
    return [
      {
        filename: 'content',
        extension: '',
        content: rawContent,
      },
    ]
  }

  return files
}

function buildParsedFile(filename: string, lines: string[]): ParsedFile {
  const content = lines.join('\n').trim()
  const dotIndex = filename.lastIndexOf('.')
  const extension = dotIndex >= 0 ? filename.slice(dotIndex + 1).toLowerCase() : ''
  return { filename, extension, content }
}

/**
 * Get appropriate download options based on file extension.
 */
export function getDownloadOptions(extension: string): FileDownloadOption[] {
  switch (extension) {
    case 'md':
      return [
        { format: 'md', label: 'Download MD', icon: 'FileText' },
        { format: 'html', label: 'Download HTML', icon: 'FileCode' },
        { format: 'pdf', label: 'Print/PDF', icon: 'Printer' },
      ]
    case 'txt':
      return [
        { format: 'txt', label: 'Download TXT', icon: 'FileDown' },
        { format: 'pdf', label: 'Print/PDF', icon: 'Printer' },
      ]
    case 'html':
      return [
        { format: 'html', label: 'Download HTML', icon: 'FileCode' },
        { format: 'pdf', label: 'Print/PDF', icon: 'Printer' },
      ]
    case 'json':
      return [{ format: 'json', label: 'Download JSON', icon: 'Braces' }]
    default:
      // General / unknown: show all common options
      return [
        { format: 'txt', label: 'Download TXT', icon: 'FileDown' },
        { format: 'html', label: 'Download HTML', icon: 'FileCode' },
        { format: 'md', label: 'Download MD', icon: 'FileText' },
        { format: 'pdf', label: 'Print/PDF', icon: 'Printer' },
      ]
  }
}
