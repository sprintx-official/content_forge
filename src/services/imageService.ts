import { api } from '@/lib/api'
import type { GeneratedImage, ImageSize } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapImage(raw: any): GeneratedImage {
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId,
    prompt: raw.prompt,
    revisedPrompt: raw.revised_prompt ?? raw.revisedPrompt,
    r2Key: raw.r2_key ?? raw.r2Key ?? '',
    url: raw.url,
    width: raw.width,
    height: raw.height,
    style: raw.style,
    provider: raw.provider,
    model: raw.model,
    costUsd: raw.cost_usd ?? raw.costUsd ?? 0,
    createdAt: raw.created_at ?? raw.createdAt,
  }
}

export async function generateImage(request: {
  prompt: string
  size: ImageSize
  style: string
  modelId?: string
  provider?: string
}): Promise<GeneratedImage> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await api.post<any>('/api/images/generate', {
    prompt: request.prompt,
    width: request.size.width,
    height: request.size.height,
    style: request.style,
    ...(request.modelId && { modelId: request.modelId }),
    ...(request.provider && { provider: request.provider }),
  })
  return mapImage(raw)
}

export async function getImages(): Promise<GeneratedImage[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<{ data: any[] }>('/api/images')
  return res.data.map(mapImage)
}

export async function deleteImage(id: string): Promise<void> {
  await api.delete(`/api/images/${id}`)
}
