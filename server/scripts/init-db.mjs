import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') })

// Import database functions
import { initializeSchema } from '../dist/database/schema.js'

try {
  console.log('Initializing database schema...')
  await initializeSchema()
  console.log('✓ Database schema initialized successfully')
  process.exit(0)
} catch (error) {
  console.error('Failed to initialize schema:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}
