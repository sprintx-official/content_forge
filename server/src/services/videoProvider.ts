import { ProviderError } from './aiProvider.js'

export interface VideoGenerationRequest {
  prompt: string
  model: string
  apiKey: string
  aspectRatio?: string
  durationSeconds?: number
  onProgress?: (message: string, elapsedMs: number) => void
}

export interface VideoExtensionRequest {
  prompt: string
  model: string
  apiKey: string
  sourceVideoData: Buffer
  onProgress?: (message: string, elapsedMs: number) => void
}

export interface VideoGenerationResponse {
  videoData: Buffer
  contentType: string
}

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const POLL_INTERVAL_MS = 5_000
const MAX_POLLS = 120 // 10 minutes max

export async function generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  // Step 1: Initiate long-running video generation
  const initRes = await fetch(`${BASE_URL}/models/${req.model}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': req.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt: req.prompt }],
      parameters: {
        aspectRatio: req.aspectRatio || '16:9',
        durationSeconds: req.durationSeconds || 8,
      },
    }),
  })

  if (!initRes.ok) {
    const body = await initRes.json().catch(() => ({ error: { message: 'Request failed' } }))
    const msg = body.error?.message || `Veo API returned ${initRes.status}`
    throw new ProviderError('google', initRes.status, msg)
  }

  const initData = await initRes.json() as { name: string }
  const operationName = initData.name

  if (!operationName) {
    throw new ProviderError('google', 500, 'Veo API did not return an operation name')
  }

  return pollAndDownload(operationName, req.apiKey, req.onProgress)
}

export async function extendVideo(req: VideoExtensionRequest): Promise<VideoGenerationResponse> {
  const videoBase64 = req.sourceVideoData.toString('base64')

  // Step 1: Initiate long-running video extension
  const initRes = await fetch(`${BASE_URL}/models/${req.model}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': req.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{
        prompt: req.prompt,
        video: {
          inlineData: {
            mimeType: 'video/mp4',
            data: videoBase64,
          },
        },
      }],
      parameters: {
        numberOfVideos: 1,
        resolution: '720p',
      },
    }),
  })

  if (!initRes.ok) {
    const body = await initRes.json().catch(() => ({ error: { message: 'Request failed' } }))
    const msg = body.error?.message || `Veo API returned ${initRes.status}`
    throw new ProviderError('google', initRes.status, msg)
  }

  const initData = await initRes.json() as { name: string }
  const operationName = initData.name

  if (!operationName) {
    throw new ProviderError('google', 500, 'Veo API did not return an operation name')
  }

  return pollAndDownload(operationName, req.apiKey, req.onProgress)
}

// ---------------------------------------------------------------------------
// Shared polling + download helper
// ---------------------------------------------------------------------------

async function pollAndDownload(
  operationName: string,
  apiKey: string,
  onProgress?: (message: string, elapsedMs: number) => void,
): Promise<VideoGenerationResponse> {
  const startTime = Date.now()

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await sleep(POLL_INTERVAL_MS)

    const elapsed = Date.now() - startTime
    onProgress?.(`Video generating... ${Math.round(elapsed / 1000)}s elapsed`, elapsed)

    const pollRes = await fetch(`${BASE_URL}/${operationName}`, {
      headers: { 'x-goog-api-key': apiKey },
    })

    if (!pollRes.ok) {
      const body = await pollRes.json().catch(() => ({ error: { message: 'Poll failed' } }))
      throw new ProviderError('google', pollRes.status, body.error?.message || `Poll returned ${pollRes.status}`)
    }

    const pollData = await pollRes.json() as {
      done?: boolean
      error?: { message: string }
      response?: {
        generateVideoResponse?: {
          generatedSamples?: { video?: { uri?: string; mimeType?: string } }[]
        }
      }
    }

    if (pollData.error) {
      throw new ProviderError('google', 500, pollData.error.message || 'Video generation failed')
    }

    if (!pollData.done) continue

    // Download the video from the temporary URI
    const videoUri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    if (!videoUri) {
      throw new ProviderError('google', 500, 'Video generation completed but no video URI returned')
    }

    // The Veo file URI requires the API key as a query param for downloads
    const downloadUrl = videoUri.includes('?')
      ? `${videoUri}&key=${apiKey}`
      : `${videoUri}?key=${apiKey}`

    console.log(`[Veo] Downloading video from: ${videoUri.split('?')[0]}...`)

    const downloadRes = await fetch(downloadUrl, {
      redirect: 'follow',
    })
    if (!downloadRes.ok) {
      const errBody = await downloadRes.text().catch(() => '')
      console.error(`[Veo] Download failed [${downloadRes.status}]: ${errBody.slice(0, 200)}`)
      throw new ProviderError('google', downloadRes.status, `Failed to download generated video: ${downloadRes.status}`)
    }

    const arrayBuffer = await downloadRes.arrayBuffer()
    const videoData = Buffer.from(arrayBuffer)
    console.log(`[Veo] Downloaded video: ${videoData.length} bytes, content-type: ${downloadRes.headers.get('content-type')}`)

    if (videoData.length < 1000) {
      // Likely an error response, not actual video data
      console.error(`[Veo] Downloaded data too small (${videoData.length} bytes), content: ${videoData.toString('utf-8').slice(0, 200)}`)
      throw new ProviderError('google', 500, 'Video download returned invalid data (too small)')
    }

    return {
      videoData,
      contentType: downloadRes.headers.get('content-type') || pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.mimeType || 'video/mp4',
    }
  }

  throw new ProviderError('google', 504, 'Video generation timed out after 10 minutes')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
