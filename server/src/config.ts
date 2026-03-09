import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local from project root — try multiple paths since __dirname
// resolves differently when running compiled JS vs tsx watch
const envPaths = [
  path.resolve(__dirname, '../../.env.local'),   // compiled: server/dist/ → project root
  path.resolve(__dirname, '.env.local'),          // tsx watch from project root
  path.resolve(process.cwd(), '.env.local'),      // fallback: cwd
]
for (const p of envPaths) {
  const result = dotenv.config({ path: p })
  if (!result.error) break
}

const isProduction = process.env.NODE_ENV === 'production'

// Validate required environment variables
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (isProduction) {
      console.error('FATAL: JWT_SECRET environment variable is required in production')
      process.exit(1)
    }
    console.warn('JWT_SECRET not set. Using insecure default for development only.')
    return 'dev-secret-DO-NOT-USE-IN-PRODUCTION'
  }
  if (secret.length < 32) {
    console.warn('JWT_SECRET should be at least 32 characters for security.')
  }
  return secret
}

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    if (isProduction) {
      console.error('FATAL: ENCRYPTION_KEY environment variable is required in production to encrypt API keys at rest')
      process.exit(1)
    }
    console.warn('ENCRYPTION_KEY not set. Using insecure default for development only.')
    return 'dev-encryption-key-DO-NOT-USE-IN-PRODUCTION'
  }
  if (key.length < 32) {
    console.warn('ENCRYPTION_KEY should be at least 32 characters for security.')
  }
  return key
}

export const config = {
  isProduction,
  port: parseInt(process.env.PORT || process.env.SERVER_PORT || '3000', 10),
  jwtSecret: getJwtSecret(),
  encryptionKey: getEncryptionKey(),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/contentforge',
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'contentforge-files',
  },
}
