import crypto from 'crypto'
import { config } from '../config.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Derives a 32-byte key from the ENCRYPTION_KEY env var using SHA-256.
 * This allows using any-length passphrase as the encryption key.
 */
function getKey(): Buffer {
  return crypto.createHash('sha256').update(config.encryptionKey).digest()
}

/**
 * Encrypts a plain-text string using AES-256-GCM.
 * Returns a combined string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(plainText: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects format: iv:authTag:ciphertext (all hex-encoded).
 * Returns the original plain text.
 */
export function decrypt(encryptedText: string): string {
  const key = getKey()
  const parts = encryptedText.split(':')

  // If the text doesn't look encrypted (no colons / wrong format), return as-is.
  // This handles legacy plain-text keys during migration.
  if (parts.length !== 3) return encryptedText

  const [ivHex, authTagHex, ciphertext] = parts

  // Validate hex lengths to avoid decryption errors on plain-text values
  if (ivHex.length !== IV_LENGTH * 2 || authTagHex.length !== AUTH_TAG_LENGTH * 2) {
    return encryptedText
  }

  try {
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    // If decryption fails, the value may be a legacy plain-text key
    return encryptedText
  }
}

/**
 * Checks whether a string looks like an encrypted value (iv:tag:cipher format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 3) return false
  const [ivHex, authTagHex] = parts
  return ivHex.length === IV_LENGTH * 2 && authTagHex.length === AUTH_TAG_LENGTH * 2
}
