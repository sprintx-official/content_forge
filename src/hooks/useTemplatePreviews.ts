import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import type { ImageTemplate, TemplateElement } from '@/components/template-editor/templateTypes'

// Module-level cache so previews persist across component re-mounts
const previewCache = new Map<string, string>()

// Max concurrent preview requests
const MAX_CONCURRENT = 3

interface TemplatePreviewInput {
  id: string
  name: string
  elements: TemplateElement[]
}

export function useTemplatePreviews(templates: TemplatePreviewInput[]) {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (templates.length === 0) return

    // Immediately populate from cache
    const cached: Record<string, string> = {}
    const uncached: TemplatePreviewInput[] = []
    for (const t of templates) {
      const key = t.id
      if (previewCache.has(key)) {
        cached[key] = previewCache.get(key)!
      } else {
        uncached.push(t)
      }
    }

    if (Object.keys(cached).length > 0) {
      setPreviews((prev) => ({ ...prev, ...cached }))
    }

    if (uncached.length === 0) return

    // Abort previous batch if still running
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)

    const generatePreviews = async () => {
      // Process in batches of MAX_CONCURRENT
      for (let i = 0; i < uncached.length; i += MAX_CONCURRENT) {
        if (controller.signal.aborted) return

        const batch = uncached.slice(i, i + MAX_CONCURRENT)
        const results = await Promise.allSettled(
          batch.map(async (t) => {
            const fullTemplate: ImageTemplate = {
              name: t.name,
              squareWidth: 1080,
              squareHeight: 1080,
              landscapeWidth: 1200,
              landscapeHeight: 627,
              verticalWidth: 1080,
              verticalHeight: 1350,
              elements: t.elements,
            }

            const res = await api.post<{ preview: string }>('/api/image-templates/preview', {
              template: fullTemplate,
              headline: 'Preview Headline Text',
              format: 'square',
            })

            return { id: t.id, preview: res.preview }
          })
        )

        if (controller.signal.aborted) return

        const newPreviews: Record<string, string> = {}
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { id, preview } = result.value
            previewCache.set(id, preview)
            newPreviews[id] = preview
          }
        }

        if (Object.keys(newPreviews).length > 0) {
          setPreviews((prev) => ({ ...prev, ...newPreviews }))
        }
      }

      setLoading(false)
    }

    generatePreviews().catch(() => setLoading(false))

    return () => {
      controller.abort()
    }
  }, [templates])

  // Invalidate a specific template's cache (e.g., after edit)
  const invalidate = (id: string) => {
    previewCache.delete(id)
    setPreviews((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  return { previews, loading, invalidate }
}
