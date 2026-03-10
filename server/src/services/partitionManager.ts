import { query, exec } from '../database/connection.js'

/**
 * Create a monthly partition for the articles table.
 * Uses range partitioning on created_at.
 */
export async function createMonthlyPartition(year: number, month: number): Promise<void> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  const partitionName = `articles_p_y${year}m${String(month).padStart(2, '0')}`

  try {
    // Check if partition already exists
    const exists = await query<{ relname: string }>(
      `SELECT relname FROM pg_class WHERE relname = $1`,
      [partitionName],
    )

    if (exists.length > 0) return

    await exec(`
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF articles_partitioned
      FOR VALUES FROM ('${startDate}') TO ('${endDate}')
    `)

    console.log(`[Partition] Created partition ${partitionName} (${startDate} to ${endDate})`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('already exists')) {
      // Concurrent creation — ignore
    } else if (msg.includes('articles_partitioned') && msg.includes('does not exist')) {
      // Partitioned table not set up yet — skip silently
    } else {
      console.error(`[Partition] Error creating ${partitionName}:`, msg)
    }
  }
}

/**
 * Ensure partitions exist for current month and N months ahead.
 */
export async function ensurePartitions(monthsAhead: number = 3): Promise<void> {
  const now = new Date()
  for (let i = 0; i <= monthsAhead; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    await createMonthlyPartition(date.getFullYear(), date.getMonth() + 1)
  }
}

/**
 * Drop partitions older than N months. Used for data pruning.
 */
export async function pruneOldPartitions(monthsToKeep: number = 12): Promise<void> {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - monthsToKeep)

  try {
    const partitions = await query<{ partition_name: string }>(
      `SELECT inhrelid::regclass::text AS partition_name
       FROM pg_inherits
       WHERE inhparent = 'articles_partitioned'::regclass
       ORDER BY inhrelid::regclass::text`,
    )

    for (const row of partitions) {
      const match = row.partition_name.match(/articles_p_y(\d{4})m(\d{2})/)
      if (!match) continue

      const partYear = parseInt(match[1])
      const partMonth = parseInt(match[2])
      const partDate = new Date(partYear, partMonth - 1, 1)

      if (partDate < cutoff) {
        await exec(`DROP TABLE IF EXISTS ${row.partition_name}`)
        console.log(`[Partition] Dropped old partition: ${row.partition_name}`)
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('does not exist')) {
      // No partitioned table yet — skip
    } else {
      console.error('[Partition] Error pruning:', msg)
    }
  }
}

/**
 * Set up the partitioned articles table. Call once during schema init.
 * Note: This is opt-in. The regular articles table continues to work.
 * To migrate, run this manually when article count exceeds ~1M rows.
 */
export async function setupPartitionedArticles(): Promise<void> {
  try {
    const exists = await query<{ relname: string }>(
      `SELECT relname FROM pg_class WHERE relname = 'articles_partitioned'`,
    )
    if (exists.length > 0) return

    await exec(`
      CREATE TABLE IF NOT EXISTS articles_partitioned (
        id TEXT NOT NULL,
        feed_id TEXT NOT NULL,
        guid TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        published_at TIMESTAMP,
        language TEXT NOT NULL DEFAULT 'en',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, created_at)
      ) PARTITION BY RANGE (created_at)
    `)

    console.log('[Partition] Created articles_partitioned table')
    await ensurePartitions(3)
  } catch (error) {
    console.error('[Partition] Setup error:', error instanceof Error ? error.message : error)
  }
}
