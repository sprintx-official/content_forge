/**
 * Centralized helper for retrieving API keys from the database.
 * All keys are decrypted transparently — callers always receive plain-text keys.
 */
import { query, queryOne } from '../database/connection.js'
import { decrypt, encrypt, isEncrypted } from './encryption.js'
import type { ApiKeyRow } from '../types.js'

/**
 * Get a decrypted API key row for a specific provider.
 * Returns undefined if no active key exists.
 */
export async function getApiKey(provider: string): Promise<ApiKeyRow | undefined> {
  const row = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE provider = $1 AND is_active = 1',
    [provider],
  )
  if (!row) return undefined
  return { ...row, api_key: decrypt(row.api_key) }
}

/**
 * Get all active API key rows with decrypted keys.
 */
export async function getAllActiveApiKeys(): Promise<ApiKeyRow[]> {
  const rows = await query<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE is_active = 1'
  )
  return rows.map((row) => ({ ...row, api_key: decrypt(row.api_key) }))
}

/**
 * Get only provider + decrypted api_key pairs for all active keys.
 */
export async function getActiveKeyPairs(): Promise<{ provider: string; api_key: string }[]> {
  const rows = await query<{ provider: string; api_key: string }>(
    'SELECT provider, api_key FROM api_keys WHERE is_active = 1'
  )
  return rows.map((row) => ({ ...row, api_key: decrypt(row.api_key) }))
}

/**
 * Encrypt and store an API key. Handles both insert and update.
 */
export function encryptApiKey(plainKey: string): string {
  return encrypt(plainKey)
}

/**
 * Migration helper: encrypt any plain-text keys still in the database.
 */
export async function migrateUnencryptedKeys(): Promise<number> {
  const rows = await query<ApiKeyRow>('SELECT * FROM api_keys')
  let migrated = 0

  for (const row of rows) {
    if (!isEncrypted(row.api_key)) {
      const encrypted = encrypt(row.api_key)
      await queryOne(
        'UPDATE api_keys SET api_key = $1 WHERE id = $2',
        [encrypted, row.id],
      )
      migrated++
    }
  }

  return migrated
}
