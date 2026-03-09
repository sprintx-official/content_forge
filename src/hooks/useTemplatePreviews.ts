import { useEffect, useState, useRef, useMemo } from 'react'
import { api } from '@/lib/api'
import type { ImageTemplate, TemplateElement } from '@/components/template-editor/templateTypes'

// Module-level cache so previews persist across component re-mounts
const previewCache = new Map<string, string>()
// Track permanently failed previews so we don't retry endlessly
const failedIds = new Set<string>()

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

  // Stable key derived from template IDs — only re-run when the actual list of IDs changes
  const templateIds = useMemo(
    () => templates.map((t) => t.id).join(','),
    [templates],
  )

  useEffect(() => {
    if (templates.length === 0) return

    // Immediately populate from cache
    const cached: Record<string, string> = {}
    const uncached: TemplatePreviewInput[] = []
    for (const t of templates) {
      if (previewCache.has(t.id)) {
        cached[t.id] = previewCache.get(t.id)!
      } else if (!failedIds.has(t.id)) {
        uncached.push(t)
      }
    }

    if (Object.keys(cached).length > 0) {
      setPreviews((prev) => ({ ...prev, ...cached }))
    }

    if (uncached.length === 0) {
      setLoading(false)
      return
    }

    // Abort previous batch if still running
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)

    const generatePreviews = async () => {
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
              headline: 'Breaking: Global Summit Reaches Historic Climate Agreement',
              category: 'World News',
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
          } else {
            // Mark as failed so we don't retry endlessly
            const batchItem = batch[results.indexOf(result)]
            if (batchItem) failedIds.add(batchItem.id)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateIds])

  const invalidate = (id: string) => {
    previewCache.delete(id)
    failedIds.delete(id)
    setPreviews((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Check if a template's preview failed
  const hasFailed = (id: string) => failedIds.has(id)

  return { previews, loading, invalidate, hasFailed }
}
