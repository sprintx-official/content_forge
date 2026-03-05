import type { ModelTag } from '@/types'

type BadgeVariant = 'default' | 'purple' | 'pink' | 'green' | 'outline' | 'amber' | 'blue' | 'rose' | 'teal'

const TAG_VARIANT_MAP: Record<ModelTag, BadgeVariant> = {
  'Best for Writing': 'purple',
'Best for Chat': 'blue',
  'Best for Analysis': 'teal',
  'Best for Image Generation': 'pink',
  'Best for Video Generation': 'rose',
  'Most Capable': 'amber',
  'Fast & Cheap': 'green',
  'Balanced': 'outline',
  'Long Context': 'rose',
  'Reasoning': 'teal',
  'Multimodal': 'blue',
}

export function getTagVariant(tag: string): BadgeVariant {
  return TAG_VARIANT_MAP[tag as ModelTag] || 'outline'
}
