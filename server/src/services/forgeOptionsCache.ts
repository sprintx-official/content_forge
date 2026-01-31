import { query } from '../database/connection.js'
import type { ForgeOptionRow } from '../types.js'

type ForgeCategory = 'content_type' | 'tone' | 'audience'

interface CachedOptions {
  content_type: ForgeOptionRow[]
  tone: ForgeOptionRow[]
  audience: ForgeOptionRow[]
}

let cache: CachedOptions | null = null

async function loadCache(): Promise<CachedOptions> {
  if (cache) return cache

  const rows = await query<ForgeOptionRow>(
    'SELECT * FROM forge_options WHERE is_active = 1 ORDER BY category ASC, sort_order ASC, label ASC'
  )

  const grouped: CachedOptions = { content_type: [], tone: [], audience: [] }
  for (const row of rows) {
    grouped[row.category].push(row)
  }

  cache = grouped
  return cache
}

export function invalidateForgeOptionsCache(): void {
  cache = null
}

export async function getAllForgeOptions(): Promise<CachedOptions> {
  return loadCache()
}

export async function getForgeOptionsByCategory(category: ForgeCategory): Promise<ForgeOptionRow[]> {
  const all = await loadCache()
  return all[category]
}

export async function getGuidance(category: ForgeCategory, value: string): Promise<string | undefined> {
  const options = await getForgeOptionsByCategory(category)
  return options.find((o) => o.value === value)?.guidance
}
