import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

export const config = {
  port: parseInt(process.env.SERVER_PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  databasePath: process.env.DATABASE_PATH || path.resolve(__dirname, '../data/contentforge.db'),
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'contentforge-files',
  },
}
