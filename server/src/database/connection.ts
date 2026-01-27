import pg from 'pg'
import { config } from '../config.js'

// Parse TIMESTAMP columns as ISO strings (not Date objects)
pg.types.setTypeParser(1114, (val: string) => val) // timestamp without tz
pg.types.setTypeParser(1184, (val: string) => val) // timestamptz

// Parse INT8 (bigint) as number — used by COUNT(*)
pg.types.setTypeParser(20, (val: string) => parseInt(val, 10))

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
})

export async function query<T extends pg.QueryResultRow = any>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(sql, params)
  return result.rows
}

export async function queryOne<T extends pg.QueryResultRow = any>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const result = await pool.query<T>(sql, params)
  return result.rows[0]
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<void> {
  await pool.query(sql, params)
}

export async function exec(sql: string): Promise<void> {
  await pool.query(sql)
}

export async function closeDb(): Promise<void> {
  await pool.end()
}
