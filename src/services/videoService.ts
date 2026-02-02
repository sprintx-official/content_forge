import { api } from '@/lib/api'
import type { GeneratedVideo } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVideo(raw: any): GeneratedVideo {
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId,
    prompt: raw.prompt,
    r2Key: raw.r2_key ?? raw.r2Key ?? '',
    url: raw.url,
    aspectRatio: raw.aspect_ratio ?? raw.aspectRatio ?? '16:9',
    durationSeconds: raw.duration_seconds ?? raw.durationSeconds ?? 8,
    provider: raw.provider,
    model: raw.model,
    costUsd: raw.cost_usd ?? raw.costUsd ?? 0,
    createdAt: raw.created_at ?? raw.createdAt,
    sourceVideoId: raw.source_video_id ?? raw.sourceVideoId ?? null,
    clipIndex: raw.clip_index ?? raw.clipIndex ?? 0,
  }
}

export async function generateVideo(request: {
  prompt: string
  aspectRatio: string
  durationSeconds: number
  modelId?: string
  provider?: string
}): Promise<GeneratedVideo> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await api.post<any>('/api/videos/generate', {
    prompt: request.prompt,
    aspectRatio: request.aspectRatio,
    durationSeconds: request.durationSeconds,
    ...(request.modelId && { modelId: request.modelId }),
    ...(request.provider && { provider: request.provider }),
  })
  return mapVideo(raw)
}

export async function getVideos(): Promise<GeneratedVideo[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<{ data: any[] }>('/api/videos')
  return res.data.map(mapVideo)
}

export async function extendVideo(request: {
  sourceVideoId: string
  prompt: string
}): Promise<GeneratedVideo> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await api.post<any>('/api/videos/extend', {
    sourceVideoId: request.sourceVideoId,
    prompt: request.prompt,
  })
  return mapVideo(raw)
}

export async function deleteVideo(id: string): Promise<void> {
  await api.delete(`/api/videos/${id}`)
}
