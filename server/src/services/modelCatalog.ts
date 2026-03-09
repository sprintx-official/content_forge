/**
 * Static model catalog providing descriptions and "best for" tags for AI models.
 * Uses longest-prefix matching (same approach as costCalculator.ts) so that
 * "gpt-4o-mini" matches before "gpt-4o" for model ID "gpt-4o-mini".
 *
 * Last updated: March 2026
 */

export type ModelTag =
  | 'Best for Writing'
  | 'Best for Code'
  | 'Best for Chat'
  | 'Best for Analysis'
  | 'Best for Image Generation'
  | 'Best for Video Generation'
  | 'Most Capable'
  | 'Fast & Cheap'
  | 'Balanced'
  | 'Long Context'
  | 'Reasoning'
  | 'Multimodal'

export interface ModelCatalogEntry {
  pattern: string
  description: string
  tags: ModelTag[]
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  // ── OpenAI ──────────────────────────────────────────────────

  // GPT-5.4 family (latest — March 2026)
  {
    pattern: 'gpt-5.4-pro',
    description:
      'OpenAI\'s most capable model. Highest-tier for demanding professional and enterprise work.',
    tags: ['Most Capable', 'Best for Writing', 'Reasoning'],
  },
  {
    pattern: 'gpt-5.4-thinking',
    description:
      'Extended reasoning model for difficult, real-world professional tasks and longer workflows.',
    tags: ['Most Capable', 'Reasoning', 'Best for Analysis'],
  },
  {
    pattern: 'gpt-5.4',
    description:
      'Latest GPT-5 generation with native computer-use and 1M token context. State-of-the-art.',
    tags: ['Most Capable', 'Best for Writing', 'Long Context'],
  },

  // GPT-5.3 family
  {
    pattern: 'gpt-5.3-instant',
    description:
      'Fast, everyday model optimized for speed. Great for quick tasks and high-volume workloads.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-5.3-codex-spark',
    description:
      'High-speed coding model on Cerebras hardware. Blazing fast code generation.',
    tags: ['Fast & Cheap', 'Best for Code'],
  },
  {
    pattern: 'gpt-5.3-codex',
    description:
      'Purpose-built for software engineering. Strong agentic coding capabilities.',
    tags: ['Best for Code', 'Balanced'],
  },
  {
    pattern: 'gpt-5.3',
    description:
      'Solid all-around GPT-5 model. Good balance of capability and performance.',
    tags: ['Balanced', 'Best for Writing'],
  },

  // GPT-5.2 family
  {
    pattern: 'gpt-5.2-codex',
    description:
      'GPT-5.2 agentic coding model. Specialized for software engineering tasks.',
    tags: ['Best for Code'],
  },
  {
    pattern: 'gpt-5.2-thinking',
    description:
      'GPT-5.2 with extended reasoning. Being retired June 2026.',
    tags: ['Reasoning', 'Best for Analysis'],
  },
  {
    pattern: 'gpt-5.2',
    description:
      'Previous GPT-5 generation. Strong writing and reasoning capabilities.',
    tags: ['Balanced', 'Best for Writing'],
  },

  // GPT-5.1 family
  {
    pattern: 'gpt-5.1-codex-mini',
    description:
      'Compact code-focused variant. Fast and affordable for coding tasks.',
    tags: ['Fast & Cheap', 'Best for Code'],
  },
  {
    pattern: 'gpt-5.1-codex-max',
    description:
      'Maximum capability code model for complex programming and architecture.',
    tags: ['Most Capable', 'Best for Code'],
  },
  {
    pattern: 'gpt-5.1-codex',
    description:
      'GPT-5.1 specialized for code generation with enhanced programming capabilities.',
    tags: ['Best for Code'],
  },
  {
    pattern: 'gpt-5.1',
    description:
      'Earlier GPT-5 generation. Good general-purpose model.',
    tags: ['Balanced'],
  },

  // GPT-5 base
  {
    pattern: 'gpt-5-nano',
    description:
      'Ultralight GPT-5 variant for the fastest, cheapest inference on simple tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gpt-5-mini',
    description:
      'Compact GPT-5 balancing capability and cost. Great for everyday use.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-5-pro',
    description:
      'Enhanced GPT-5 with deeper reasoning and stronger writing.',
    tags: ['Most Capable', 'Reasoning', 'Best for Writing'],
  },
  {
    pattern: 'gpt-5-codex',
    description:
      'GPT-5 variant specialized for code generation.',
    tags: ['Best for Code'],
  },
  {
    pattern: 'gpt-5',
    description:
      'OpenAI\'s GPT-5 base model. Significant improvements in reasoning and generation quality.',
    tags: ['Most Capable', 'Best for Writing', 'Reasoning'],
  },

  // ChatGPT models
  {
    pattern: 'chatgpt-4o-latest',
    description:
      'The model currently powering ChatGPT. Optimized for conversational interactions.',
    tags: ['Best for Chat', 'Multimodal'],
  },
  {
    pattern: 'chatgpt-image-latest',
    description:
      'ChatGPT\'s built-in image generation model. Creates images from text descriptions.',
    tags: ['Best for Image Generation'],
  },

  // GPT-4o family
  {
    pattern: 'gpt-4o-mini',
    description:
      'Compact and cost-efficient GPT-4o. Great for everyday tasks where speed and low cost matter.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-4o',
    description:
      'GPT-4o multimodal model. Strong performance across writing, code, and analysis.',
    tags: ['Balanced', 'Best for Writing', 'Multimodal'],
  },

  // GPT-4.1 family
  {
    pattern: 'gpt-4.1-nano',
    description:
      'Smallest and fastest GPT model for high-volume, low-complexity tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gpt-4.1-mini',
    description:
      'Fast, affordable model for chat, summarization, and lightweight coding.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-4.1',
    description:
      'GPT-4.1 with improved instruction following and coding ability.',
    tags: ['Balanced', 'Best for Code'],
  },

  // GPT-4 legacy
  {
    pattern: 'gpt-4-turbo',
    description:
      'Previous generation GPT-4 with faster response times.',
    tags: ['Balanced'],
  },
  {
    pattern: 'gpt-4',
    description:
      'Original GPT-4 model. Reliable for writing, analysis, and general tasks.',
    tags: ['Balanced'],
  },

  // GPT-3.5 legacy
  {
    pattern: 'gpt-3.5-turbo',
    description:
      'Legacy fast model. Good for simple chat and text generation.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-3.5',
    description:
      'Legacy GPT model. Suitable for basic text generation.',
    tags: ['Fast & Cheap'],
  },

  // OpenAI Image generation
  {
    pattern: 'gpt-image-1',
    description:
      'OpenAI\'s dedicated image generation model. High-quality images from text prompts.',
    tags: ['Best for Image Generation'],
  },
  {
    pattern: 'gpt-image',
    description:
      'OpenAI image generation model. Creates images from text descriptions.',
    tags: ['Best for Image Generation'],
  },
  {
    pattern: 'dall-e-3',
    description:
      'DALL-E 3 image generation. Creates detailed, accurate images from text descriptions.',
    tags: ['Best for Image Generation', 'Balanced'],
  },
  {
    pattern: 'dall-e',
    description:
      'OpenAI DALL-E image generation model.',
    tags: ['Best for Image Generation'],
  },

  // Reasoning models (o-series)
  {
    pattern: 'o4-mini',
    description:
      'Latest small reasoning model. Efficient for coding and visual tasks with high throughput.',
    tags: ['Reasoning', 'Fast & Cheap', 'Best for Code'],
  },
  {
    pattern: 'o3-pro',
    description:
      'Enhanced o3 with more compute for the most challenging analytical problems.',
    tags: ['Reasoning', 'Most Capable', 'Best for Analysis'],
  },
  {
    pattern: 'o3-mini',
    description:
      'Efficient reasoning model for STEM tasks. Balances depth with speed.',
    tags: ['Reasoning', 'Fast & Cheap'],
  },
  {
    pattern: 'o3',
    description:
      'Most powerful reasoning model. 20% fewer major errors than o1 on real-world tasks.',
    tags: ['Reasoning', 'Most Capable', 'Best for Analysis'],
  },
  {
    pattern: 'o1',
    description:
      'First-generation reasoning model. Excels at multi-step math, science, and coding.',
    tags: ['Reasoning', 'Best for Analysis'],
  },

  // ── Anthropic ───────────────────────────────────────────────

  // 4.6 generation (latest — Feb 2026)
  {
    pattern: 'claude-opus-4-6',
    description:
      'Anthropic\'s latest and most capable model (Feb 2026). Superior writing, analysis, and agent capabilities.',
    tags: ['Most Capable', 'Best for Writing', 'Best for Analysis'],
  },
  {
    pattern: 'claude-sonnet-4-6',
    description:
      'Latest Sonnet (Feb 2026). Full upgrade across coding, computer use, and reasoning. 1M context.',
    tags: ['Best for Writing', 'Best for Code', 'Balanced', 'Long Context'],
  },

  // 4.5 generation
  {
    pattern: 'claude-opus-4-5',
    description:
      'Previous Opus generation (Nov 2025). Exceptional at creative writing and complex analysis.',
    tags: ['Most Capable', 'Best for Writing', 'Best for Analysis'],
  },
  {
    pattern: 'claude-sonnet-4-5',
    description:
      'Sonnet 4.5 with top-tier coding and writing. Best all-around for most tasks.',
    tags: ['Best for Writing', 'Best for Code', 'Balanced'],
  },
  {
    pattern: 'claude-haiku-4-5',
    description:
      'Fast Haiku model (Oct 2025). Great for chat, summarization, and quick tasks at very low cost.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },

  // Sonnet 4 family
  {
    pattern: 'claude-sonnet-4',
    description:
      'Excellent balance of capability and speed. Recommended for writing and code.',
    tags: ['Best for Writing', 'Best for Code', 'Balanced'],
  },

  // Legacy Claude 3.x naming
  {
    pattern: 'claude-3-5-sonnet',
    description:
      'Previous-generation Sonnet. Strong coding and writing skills.',
    tags: ['Best for Code', 'Best for Writing', 'Balanced'],
  },
  {
    pattern: 'claude-3-5-haiku',
    description:
      'Fast and affordable Claude for everyday tasks.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'claude-3-opus',
    description:
      'Previous-generation flagship. Deep analytical and creative writing capabilities.',
    tags: ['Most Capable', 'Best for Writing'],
  },
  {
    pattern: 'claude-3-sonnet',
    description:
      'Previous-generation balanced model.',
    tags: ['Balanced'],
  },
  {
    pattern: 'claude-3-haiku',
    description:
      'Ultra-fast and cost-effective for high-volume tasks.',
    tags: ['Fast & Cheap'],
  },

  // ── xAI (Grok) ─────────────────────────────────────────────

  // Grok 4.x family (latest)
  {
    pattern: 'grok-4-1-fast-reasoning',
    description:
      'Grok 4.1 with fast reasoning mode. Efficient deep thinking for complex tasks.',
    tags: ['Reasoning', 'Fast & Cheap'],
  },
  {
    pattern: 'grok-4.1-fast',
    description:
      'Latest Grok 4.1 optimized for speed. Fast responses with strong capabilities.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'grok-4.1',
    description:
      'xAI\'s latest fully available API model. Strong reasoning and real-time knowledge.',
    tags: ['Most Capable', 'Reasoning', 'Best for Analysis'],
  },
  {
    pattern: 'grok-4-heavy',
    description:
      'Maximum capability Grok for the most demanding tasks.',
    tags: ['Most Capable', 'Reasoning', 'Best for Analysis'],
  },
  {
    pattern: 'grok-4-fast',
    description:
      'Speed-optimized Grok 4. Good balance of speed and capability.',
    tags: ['Fast & Cheap', 'Balanced'],
  },
  {
    pattern: 'grok-4',
    description:
      'xAI Grok 4 base model. Strong general-purpose performance.',
    tags: ['Most Capable', 'Best for Writing', 'Reasoning'],
  },
  {
    pattern: 'grok-code-fast',
    description:
      'Grok model specialized for fast code generation.',
    tags: ['Fast & Cheap', 'Best for Code'],
  },

  // Grok 3.x family
  {
    pattern: 'grok-3-mini',
    description:
      'Compact Grok model for chat, quick analysis, and cost-sensitive workloads.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'grok-3',
    description:
      'Grok 3 with strong reasoning. Generally available via API.',
    tags: ['Balanced', 'Reasoning'],
  },
  {
    pattern: 'grok-2',
    description:
      'Previous-generation Grok with solid general performance.',
    tags: ['Balanced'],
  },

  // ── Google (Gemini — text) ─────────────────────────────────

  // Gemini 3.1 family (latest — March 2026)
  {
    pattern: 'gemini-3.1-pro-preview-custom-tools',
    description:
      'Gemini 3.1 Pro with custom tool support. Advanced agentic capabilities.',
    tags: ['Most Capable', 'Reasoning'],
  },
  {
    pattern: 'gemini-3.1-pro-preview',
    description:
      'Gemini 3.1 Pro preview. Google\'s most advanced model. 77% on ARC-AGI-2, 1M context.',
    tags: ['Most Capable', 'Reasoning', 'Long Context', 'Best for Analysis'],
  },
  {
    pattern: 'gemini-3.1-pro',
    description:
      'Google\'s most capable model (March 2026). Double the reasoning of 3 Pro. $2/M input tokens.',
    tags: ['Most Capable', 'Reasoning', 'Long Context', 'Best for Analysis'],
  },
  {
    pattern: 'gemini-3.1-flash-lite-preview',
    description:
      'Preview of Gemini 3.1 Flash-Lite. 2.5x faster, 45% more output speed than 2.5 Flash.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-3.1-flash-lite',
    description:
      'Google\'s fastest and cheapest Gemini 3 model. $0.25/M input tokens. Great for high-volume.',
    tags: ['Fast & Cheap'],
  },

  // Gemini 3 family
  {
    pattern: 'gemini-3-pro',
    description:
      'Gemini 3 Pro. Powerful reasoning and analysis across text, images, audio, and code.',
    tags: ['Most Capable', 'Reasoning', 'Best for Analysis'],
  },
  {
    pattern: 'gemini-3-flash',
    description:
      'Gemini 3 Flash. Fast, capable, and cost-effective multimodal model.',
    tags: ['Fast & Cheap', 'Balanced'],
  },

  // Gemini 2.5 family
  {
    pattern: 'gemini-2.5-pro-preview',
    description:
      'Preview of Gemini 2.5 Pro. Strong reasoning and 1M token context.',
    tags: ['Most Capable', 'Reasoning', 'Long Context'],
  },
  {
    pattern: 'gemini-2.5-pro',
    description:
      'Gemini 2.5 Pro with built-in reasoning and massive context window.',
    tags: ['Most Capable', 'Reasoning', 'Long Context', 'Best for Analysis'],
  },
  {
    pattern: 'gemini-2.5-flash-lite',
    description:
      'Ultra-lightweight Gemini 2.5 model. Fastest and cheapest.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-2.5-flash',
    description:
      'Fast Gemini 2.5 with thinking capabilities. Great speed, cost, and intelligence balance.',
    tags: ['Fast & Cheap', 'Reasoning', 'Balanced'],
  },

  // Gemini 2.0 family
  {
    pattern: 'gemini-2.0-flash-lite',
    description:
      'Ultra-lightweight Gemini 2.0 for the fastest, cheapest inference.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-2.0-flash',
    description:
      'Speedy multimodal Gemini 2.0. Handles text, images, and code.',
    tags: ['Fast & Cheap', 'Multimodal', 'Best for Chat'],
  },

  // Gemini 1.5 legacy
  {
    pattern: 'gemini-1.5-pro',
    description:
      'Previous-generation Gemini with very large context window for long documents.',
    tags: ['Long Context', 'Balanced'],
  },
  {
    pattern: 'gemini-1.5-flash',
    description:
      'Lightweight Gemini 1.5 for fast, cost-effective processing.',
    tags: ['Fast & Cheap'],
  },

  // Gemini latest aliases
  {
    pattern: 'gemini-flash-latest',
    description:
      'Latest Gemini Flash model. Fast and affordable.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-flash-lite-latest',
    description:
      'Latest ultra-lightweight Gemini. Fastest inference.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-pro-latest',
    description:
      'Latest Gemini Pro. Best-in-class capabilities.',
    tags: ['Most Capable'],
  },

  // Gemini catch-all (fallback for unmatched gemini-* IDs)
  {
    pattern: 'gemini',
    description:
      'Google Gemini AI model. Multimodal with general capabilities.',
    tags: ['Multimodal', 'Balanced'],
  },

  // ── Google (Nano Banana — image generation) ─────────────────
  {
    pattern: 'nano-banana-pro',
    description:
      'Nano Banana Pro (Gemini 3 Pro Image). Advanced image generation with text rendering and world knowledge.',
    tags: ['Best for Image Generation', 'Most Capable'],
  },
  {
    pattern: 'nano-banana-2',
    description:
      'Nano Banana 2 (Feb 2026). Fast, high-quality image generation built on Gemini 3.1 Flash Image.',
    tags: ['Best for Image Generation', 'Balanced'],
  },
  {
    pattern: 'nano-banana',
    description:
      'Google Nano Banana image generation model. Creates images from text prompts.',
    tags: ['Best for Image Generation'],
  },

  // ── Google (Imagen — image generation) ─────────────────────────
  {
    pattern: 'imagen-4-ultra',
    description:
      'Imagen 4 Ultra. Highest detail and prompt alignment. $0.06/image.',
    tags: ['Best for Image Generation', 'Most Capable'],
  },
  {
    pattern: 'imagen-4-fast',
    description:
      'Imagen 4 Fast. Rapid image generation for high-volume tasks. $0.02/image.',
    tags: ['Best for Image Generation', 'Fast & Cheap'],
  },
  {
    pattern: 'imagen-4',
    description:
      'Google Imagen 4. Advanced text-to-image with up to 2K resolution and precision text rendering.',
    tags: ['Best for Image Generation', 'Balanced'],
  },
  {
    pattern: 'imagen-3.0-generate',
    description:
      'Imagen 3.0 image generation. High-quality images from text prompts.',
    tags: ['Best for Image Generation', 'Balanced'],
  },
  {
    pattern: 'imagen-3.0-fast',
    description:
      'Fast Imagen 3.0. Quick turnaround for image creation.',
    tags: ['Best for Image Generation', 'Fast & Cheap'],
  },
  {
    pattern: 'imagen',
    description:
      'Google Imagen image generation model.',
    tags: ['Best for Image Generation'],
  },

  // ── Google (Veo — video generation) ──────────────────────────
  {
    pattern: 'veo-3.1-fast-generate',
    description:
      'Veo 3.1 Fast. 2x faster at 1/5th the cost, 4K upscaling, vertical video support.',
    tags: ['Best for Video Generation', 'Fast & Cheap'],
  },
  {
    pattern: 'veo-3.1-generate',
    description:
      'Veo 3.1 (Jan 2026). Professional-grade 4K video, scene extension 60s+, native audio.',
    tags: ['Best for Video Generation', 'Most Capable'],
  },
  {
    pattern: 'veo-3.0-generate',
    description:
      'Veo 3.0 video generation. High-quality video from text descriptions.',
    tags: ['Best for Video Generation', 'Balanced'],
  },
  {
    pattern: 'veo',
    description:
      'Google Veo video generation model.',
    tags: ['Best for Video Generation'],
  },
]

/**
 * Find the best-matching catalog entry for a model ID using
 * longest-prefix matching. Returns undefined if no entry matches.
 */
export function findCatalogEntry(modelId: string): ModelCatalogEntry | undefined {
  const lowerModelId = modelId.toLowerCase()
  let bestMatch: ModelCatalogEntry | undefined
  let bestLen = 0

  for (const entry of MODEL_CATALOG) {
    if (lowerModelId.startsWith(entry.pattern.toLowerCase()) && entry.pattern.length > bestLen) {
      bestMatch = entry
      bestLen = entry.pattern.length
    }
  }

  return bestMatch
}

/**
 * Enriches an array of dynamically-fetched models with catalog metadata.
 * Models without a catalog match retain their original shape.
 */
export function enrichModelsWithCatalog(
  models: { id: string; name: string; provider: string }[]
): { id: string; name: string; provider: string; description?: string; tags?: string[] }[] {
  return models.map((model) => {
    const entry = findCatalogEntry(model.id)
    if (entry) {
      return {
        ...model,
        description: entry.description,
        tags: [...entry.tags],
      }
    }
    return model
  })
}
