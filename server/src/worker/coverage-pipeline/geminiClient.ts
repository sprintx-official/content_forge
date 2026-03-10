import { getApiKey } from '../../services/apiKeyStore.js'

let GoogleGenAI: any = null
let client: any = null

export async function getGemini() {
  if (!GoogleGenAI) {
    const mod = await import('@google/genai')
    GoogleGenAI = mod.GoogleGenAI
  }
  if (!client) {
    const keyRow = await getApiKey('google')
    const apiKey = keyRow?.api_key || process.env.GEMINI_KEY
    if (!apiKey) {
      throw new Error('Google/Gemini API key not configured. Add a Google key in Settings > API Keys.')
    }
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

const DEFAULT_GENERATE_TIMEOUT_MS = 90_000  // 90 seconds
const DEFAULT_IMAGE_TIMEOUT_MS = 120_000    // 2 minutes

export async function geminiGenerate(
  model: string,
  prompt: string,
  opts?: { useSearch?: boolean; timeoutMs?: number },
): Promise<string> {
  const ai = await getGemini()
  const config: Record<string, unknown> = {}
  if (opts?.useSearch) {
    config.tools = [{ googleSearch: {} }]
  }
  const timeout = opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS
  const response = await Promise.race([
    ai.models.generateContent({ model, contents: prompt, config }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini generate timed out after ${timeout / 1000}s (model: ${model})`)), timeout),
    ),
  ])
  return response.text ?? ''
}

export async function geminiGenerateImage(
  model: string,
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '3:4',
  systemInstruction?: string,
): Promise<Buffer | null> {
  const ai = await getGemini()
  const maxRetries = 2

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const config: Record<string, unknown> = {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio },
      }
      if (systemInstruction) {
        config.systemInstruction = systemInstruction
      }
      const response = await Promise.race([
        ai.models.generateContent({ model, contents: prompt, config }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Image gen timed out after ${DEFAULT_IMAGE_TIMEOUT_MS / 1000}s`)), DEFAULT_IMAGE_TIMEOUT_MS),
        ),
      ])

      const parts = response.candidates?.[0]?.content?.parts
      if (!parts) {
        console.warn(`  [ImageGen] No parts in response for ${aspectRatio} (attempt ${attempt}/${maxRetries})`)
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 2000)); continue }
        return null
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, 'base64')
        }
      }
      console.warn(`  [ImageGen] Response had parts but no image data for ${aspectRatio}`)
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 2000)); continue }
      return null
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`  [ImageGen] Failed ${aspectRatio} (attempt ${attempt}/${maxRetries}): ${msg}`)
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 3000)); continue }
      return null
    }
  }
  return null
}

export function extractJson(raw: string): unknown {
  try { return JSON.parse(raw) } catch { /* */ }

  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* */ }
  }

  const arrayMatch = raw.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]) } catch { /* */ }
  }

  const objMatch = raw.match(/\{[\s\S]*?\}(?=[^}]*$)/) || raw.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch {
      const start = raw.indexOf('{')
      if (start !== -1) {
        let depth = 0
        for (let i = start; i < raw.length; i++) {
          if (raw[i] === '{') depth++
          else if (raw[i] === '}') depth--
          if (depth === 0) {
            try { return JSON.parse(raw.slice(start, i + 1)) } catch { break }
          }
        }
      }
    }
  }

  return null
}
