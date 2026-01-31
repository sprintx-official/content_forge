/**
 * Static model catalog providing descriptions and "best for" tags for AI models.
 * Uses longest-prefix matching (same approach as costCalculator.ts) so that
 * "gpt-4o-mini" matches before "gpt-4o" for model ID "gpt-4o-mini".
 *
 * To add a new model: append an entry with the model ID prefix, a short
 * description, and an array of relevant tags.
 */

export type ModelTag =
  | 'Best for Writing'
  | 'Best for Code'
  | 'Best for Chat'
  | 'Best for Analysis'
  | 'Best for Image Generation'
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
    pattern: 'gpt-4o-mini-transcribe',
    description:
      'Compact audio transcription model. Fast and affordable speech-to-text.',
    tags: ['Fast & Cheap', 'Multimodal'],
  },
  {
    pattern: 'gpt-4o-mini',
    description:
      'Compact and cost-efficient GPT-4o. Great for everyday tasks where speed and low cost matter more than peak capability.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-4o-transcribe',
    description:
      'Audio transcription model based on GPT-4o. Converts speech to text.',
    tags: ['Multimodal'],
  },
  {
    pattern: 'gpt-4o',
    description:
      'OpenAI\'s flagship multimodal model with strong performance across writing, code, and analysis.',
    tags: ['Most Capable', 'Best for Writing', 'Multimodal'],
  },

  // GPT-4.1 family
  {
    pattern: 'gpt-4.1-nano',
    description:
      'The smallest and fastest GPT model. Best for high-volume, low-complexity tasks where speed is paramount.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gpt-4.1-mini',
    description:
      'Fast, affordable model for quick tasks. Ideal for chat, summarization, and lightweight coding.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-4.1',
    description:
      'Latest generation GPT with improved instruction following and coding ability. Strong general-purpose performer.',
    tags: ['Most Capable', 'Best for Code', 'Best for Writing'],
  },

  // GPT-4 Turbo / preview
  {
    pattern: 'gpt-4-turbo',
    description:
      'Previous generation GPT-4 with faster response times. Solid all-around model.',
    tags: ['Balanced'],
  },
  {
    pattern: 'gpt-4-1106-preview',
    description:
      'GPT-4 preview snapshot. Previous generation model, reliable for general tasks.',
    tags: ['Balanced'],
  },
  {
    pattern: 'gpt-4-0125-preview',
    description:
      'GPT-4 preview snapshot with improvements. Previous generation model.',
    tags: ['Balanced'],
  },
  {
    pattern: 'gpt-4',
    description:
      'Original GPT-4 model. Reliable for writing, analysis, and general tasks.',
    tags: ['Balanced'],
  },

  // GPT-3.5 family
  {
    pattern: 'gpt-3.5-turbo-instruct',
    description:
      'GPT-3.5 instruction-tuned variant. Good for completion-style tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gpt-3.5-turbo',
    description:
      'Legacy fast and affordable model. Good for simple chat and text generation tasks.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-3.5',
    description:
      'Legacy GPT model. Suitable for basic text generation and simple tasks.',
    tags: ['Fast & Cheap'],
  },

  // GPT-5 family
  {
    pattern: 'gpt-5-nano',
    description:
      'Ultralight GPT-5 variant for the fastest, cheapest inference on simple tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gpt-5-mini',
    description:
      'Compact GPT-5 model balancing capability and cost. Great for everyday use.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'gpt-5-pro',
    description:
      'Enhanced GPT-5 with deeper reasoning and stronger writing. Premium tier.',
    tags: ['Most Capable', 'Reasoning', 'Best for Writing'],
  },
  {
    pattern: 'gpt-5-chat-latest',
    description:
      'Latest GPT-5 variant optimized for conversational interactions.',
    tags: ['Best for Chat'],
  },
  {
    pattern: 'gpt-5-codex',
    description:
      'GPT-5 variant specialized for code generation and programming tasks.',
    tags: ['Best for Code'],
  },
  {
    pattern: 'gpt-5',
    description:
      'OpenAI\'s next-generation model with significant improvements in reasoning and generation quality.',
    tags: ['Most Capable', 'Best for Writing', 'Reasoning'],
  },

  // GPT-5.1 family
  {
    pattern: 'gpt-5.1-codex-mini',
    description:
      'Compact code-focused variant of GPT-5.1. Fast and affordable for coding tasks.',
    tags: ['Fast & Cheap', 'Best for Code'],
  },
  {
    pattern: 'gpt-5.1-codex-max',
    description:
      'Maximum capability code model. Best for complex programming and architecture tasks.',
    tags: ['Most Capable', 'Best for Code'],
  },
  {
    pattern: 'gpt-5.1-codex',
    description:
      'GPT-5.1 specialized for code generation with enhanced programming capabilities.',
    tags: ['Best for Code'],
  },
  {
    pattern: 'gpt-5.1-chat-latest',
    description:
      'Latest GPT-5.1 optimized for conversational interactions.',
    tags: ['Best for Chat'],
  },
  {
    pattern: 'gpt-5.1',
    description:
      'Incremental improvement over GPT-5 with better instruction following and accuracy.',
    tags: ['Most Capable', 'Best for Writing'],
  },

  // GPT-5.2 family
  {
    pattern: 'gpt-5.2-codex',
    description:
      'GPT-5.2 code-specialized model with latest programming capabilities.',
    tags: ['Best for Code'],
  },
  {
    pattern: 'gpt-5.2-chat-latest',
    description:
      'Latest GPT-5.2 optimized for conversational use.',
    tags: ['Best for Chat'],
  },
  {
    pattern: 'gpt-5.2-pro',
    description:
      'Premium GPT-5.2 variant with enhanced reasoning and generation quality.',
    tags: ['Most Capable', 'Reasoning'],
  },
  {
    pattern: 'gpt-5.2',
    description:
      'Latest in the GPT-5 series with continued improvements in capability.',
    tags: ['Most Capable', 'Best for Writing'],
  },

  // Image generation models
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

  // Reasoning models (o-series)
  {
    pattern: 'o4-mini',
    description:
      'Compact reasoning model that thinks before answering. Good for math, logic, and structured problem-solving.',
    tags: ['Reasoning', 'Fast & Cheap'],
  },
  {
    pattern: 'o3-mini',
    description:
      'Efficient reasoning model for STEM tasks. Balances chain-of-thought depth with speed.',
    tags: ['Reasoning', 'Fast & Cheap'],
  },
  {
    pattern: 'o3',
    description:
      'Advanced reasoning model with deep chain-of-thought capabilities for complex analytical tasks.',
    tags: ['Reasoning', 'Most Capable', 'Best for Analysis'],
  },
  {
    pattern: 'o1-pro',
    description:
      'Enhanced reasoning model with more compute for the most challenging problems.',
    tags: ['Reasoning', 'Most Capable'],
  },
  {
    pattern: 'o1',
    description:
      'OpenAI\'s first-generation reasoning model. Excels at multi-step math, science, and coding.',
    tags: ['Reasoning', 'Best for Analysis'],
  },

  // ── Anthropic ───────────────────────────────────────────────
  // New naming convention: claude-{tier}-{version}

  // Opus family (most capable)
  {
    pattern: 'claude-opus-4.5',
    description:
      'Anthropic\'s latest and most capable model. Superior at creative writing, nuanced analysis, and complex reasoning.',
    tags: ['Most Capable', 'Best for Writing', 'Best for Analysis'],
  },
  {
    pattern: 'claude-opus-4.1',
    description:
      'Improved Opus with enhanced reasoning and instruction following. Exceptional for complex tasks.',
    tags: ['Most Capable', 'Best for Writing', 'Best for Analysis'],
  },
  {
    pattern: 'claude-opus-4',
    description:
      'Anthropic\'s most powerful model. Exceptional at nuanced writing, complex analysis, and long-form content.',
    tags: ['Most Capable', 'Best for Writing', 'Best for Analysis'],
  },

  // Sonnet family (balanced)
  {
    pattern: 'claude-sonnet-4.5',
    description:
      'Latest Sonnet with top-tier coding and writing. Best all-around choice for most tasks.',
    tags: ['Best for Writing', 'Best for Code', 'Balanced'],
  },
  {
    pattern: 'claude-sonnet-4',
    description:
      'Excellent balance of capability and speed. Recommended for most tasks including writing and code.',
    tags: ['Best for Writing', 'Best for Code', 'Balanced'],
  },
  {
    pattern: 'claude-sonnet-3.7',
    description:
      'Previous-generation Sonnet with strong coding and writing skills. Reliable all-around performer.',
    tags: ['Best for Code', 'Best for Writing', 'Balanced'],
  },

  // Haiku family (fast & cheap)
  {
    pattern: 'claude-haiku-4.5',
    description:
      'Latest fast Haiku model. Great for chat, summarization, and quick tasks at very low cost.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'claude-haiku-3.5',
    description:
      'Fast and affordable Claude for everyday tasks. Great for chat, summarization, and quick drafts.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'claude-haiku-3-5',
    description:
      'Fast and affordable Claude for everyday tasks. Great for chat, summarization, and quick drafts.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },

  // Legacy naming (claude-3-x-y)
  {
    pattern: 'claude-3-5-sonnet',
    description:
      'Previous-generation Sonnet with strong coding and writing skills. Reliable all-around performer.',
    tags: ['Best for Code', 'Best for Writing', 'Balanced'],
  },
  {
    pattern: 'claude-3-5-haiku',
    description:
      'Fast and affordable Claude for everyday tasks. Great for chat, summarization, and quick drafts.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'claude-3-opus',
    description:
      'Previous-generation flagship with deep analytical and creative writing capabilities.',
    tags: ['Most Capable', 'Best for Writing'],
  },
  {
    pattern: 'claude-3-sonnet',
    description:
      'Previous-generation balanced model. Solid performance for writing and general tasks.',
    tags: ['Balanced'],
  },
  {
    pattern: 'claude-3-haiku',
    description:
      'Ultra-fast and cost-effective. Ideal for high-volume tasks where speed matters most.',
    tags: ['Fast & Cheap'],
  },

  // ── xAI (Grok) ─────────────────────────────────────────────
  {
    pattern: 'grok-3-mini',
    description:
      'Compact and fast Grok model. Good for chat, quick analysis, and cost-sensitive workloads.',
    tags: ['Fast & Cheap', 'Best for Chat'],
  },
  {
    pattern: 'grok-3',
    description:
      'xAI\'s most capable model with strong reasoning and real-time knowledge.',
    tags: ['Most Capable', 'Best for Analysis', 'Reasoning'],
  },
  {
    pattern: 'grok-2',
    description:
      'Previous-generation Grok with solid general performance across writing and chat.',
    tags: ['Balanced'],
  },

  // ── Google (Gemini) ─────────────────────────────────────────
  {
    pattern: 'gemini-2.5-pro-preview',
    description:
      'Preview of Gemini 2.5 Pro with latest improvements. Powerful reasoning and large context.',
    tags: ['Most Capable', 'Reasoning', 'Long Context'],
  },
  {
    pattern: 'gemini-2.5-pro',
    description:
      'Google\'s most capable model with built-in reasoning and a massive context window.',
    tags: ['Most Capable', 'Reasoning', 'Long Context', 'Best for Analysis'],
  },
  {
    pattern: 'gemini-2.5-flash-lite',
    description:
      'Ultra-lightweight Gemini model. Fastest and cheapest option for simple tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-2.5-flash-preview',
    description:
      'Preview of Gemini 2.5 Flash with upcoming improvements. Fast with thinking capabilities.',
    tags: ['Fast & Cheap', 'Reasoning'],
  },
  {
    pattern: 'gemini-2.5-flash',
    description:
      'Fast Gemini model with thinking capabilities. Great balance of speed, cost, and intelligence.',
    tags: ['Fast & Cheap', 'Reasoning', 'Balanced'],
  },
  {
    pattern: 'gemini-2.5-computer-use',
    description:
      'Gemini model designed for computer use and agentic tasks. Can interact with UIs.',
    tags: ['Multimodal', 'Most Capable'],
  },
  {
    pattern: 'gemini-2.0-flash-lite',
    description:
      'Ultra-lightweight Gemini 2.0 model for the fastest, cheapest inference.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-2.0-flash',
    description:
      'Speedy multimodal model for high-throughput tasks. Handles text, images, and code.',
    tags: ['Fast & Cheap', 'Multimodal', 'Best for Chat'],
  },
  {
    pattern: 'gemini-3-pro',
    description:
      'Next-generation Gemini Pro with significant improvements across all capabilities.',
    tags: ['Most Capable', 'Reasoning', 'Best for Analysis'],
  },
  {
    pattern: 'gemini-3-flash',
    description:
      'Next-generation Gemini Flash model. Fast, capable, and cost-effective.',
    tags: ['Fast & Cheap', 'Balanced'],
  },
  {
    pattern: 'gemini-flash-latest',
    description:
      'Latest Gemini Flash model. Fast and affordable for everyday tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-flash-lite-latest',
    description:
      'Latest ultra-lightweight Gemini model for the fastest inference.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-pro-latest',
    description:
      'Latest Gemini Pro model with best-in-class capabilities.',
    tags: ['Most Capable'],
  },
  {
    pattern: 'gemini-1.5-pro',
    description:
      'Previous-generation Gemini with a very large context window. Good for long document analysis.',
    tags: ['Long Context', 'Balanced'],
  },
  {
    pattern: 'gemini-1.5-flash',
    description:
      'Lightweight Gemini for fast, cost-effective processing of simple tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'nano-banana',
    description:
      'Experimental Google nano model for ultra-fast lightweight tasks.',
    tags: ['Fast & Cheap'],
  },
  {
    pattern: 'gemini-robotics',
    description:
      'Specialized Gemini model for robotics and embodied AI applications.',
    tags: ['Multimodal'],
  },
  {
    pattern: 'gemini-experimental',
    description:
      'Experimental Gemini model with cutting-edge features in preview.',
    tags: ['Most Capable'],
  },
  {
    pattern: 'gemini',
    description:
      'Google\'s Gemini AI model family. Multimodal with strong general capabilities.',
    tags: ['Multimodal', 'Balanced'],
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
