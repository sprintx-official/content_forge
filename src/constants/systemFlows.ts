import type { SystemFlow } from '../types'

/**
 * Hardcoded system flows that are always available.
 * These are never fetched from the database and represent
 * the classic Forge modes converted to the Flows framework.
 */
export const SYSTEM_FLOWS: SystemFlow[] = [
  {
    id: 'system-write',
    name: 'Classic Write',
    description: 'Traditional content generation with agents and refinement',
    type: 'text',
    mode: 'manual',
    isSystem: true,
  },
  {
    id: 'system-chat',
    name: 'Chat',
    description: 'Conversational interface with AI assistants',
    type: 'chat',
    mode: 'manual',
    isSystem: true,
  },
  {
    id: 'system-image',
    name: 'Image Generation',
    description: 'Generate images from text prompts',
    type: 'image',
    mode: 'manual',
    isSystem: true,
  },
  {
    id: 'system-video',
    name: 'Video Generation',
    description: 'Create videos from detailed descriptions',
    type: 'video',
    mode: 'manual',
    isSystem: true,
  },
  {
    id: 'system-news',
    name: 'News Pipeline',
    description: 'Automated news coverage — monitors RSS feeds, clusters stories, and generates articles',
    type: 'news',
    mode: 'automated',
    isSystem: true,
  },
]

export const FLOW_TYPE_COLORS: Record<string, string> = {
  text: '#10b981',
  chat: '#6366f1',
  image: '#f59e0b',
  video: '#10b981',
  news: '#ef4444',
}
