import dotenv from 'dotenv'
import { Client } from 'pg'
import bcryptjs from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '../../.env.local') })

let DATABASE_URL = process.env.DATABASE_URL
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMe123!@#'

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment variables')
  process.exit(1)
}

const createAdminUser = async () => {
  let connectionString = DATABASE_URL
  let client = new Client({ connectionString })

  try {
    // Try initial connection
    await client.connect()
    console.log('Connected to database')
  } catch (error) {
    // Try alternate port if connection fails
    if (connectionString.includes(':5433')) {
      console.log('Port 5433 failed, trying 5434...')
      connectionString = connectionString.replace(':5433', ':5434')
      client = new Client({ connectionString })
      try {
        await client.connect()
        console.log('Connected to database on port 5434')
      } catch (retryError) {
        console.error('Failed to connect on both ports')
        throw retryError
      }
    } else {
      throw error
    }
  }

  try {
    // Generate hashed password
    const hashedPassword = await bcryptjs.hash(ADMIN_PASSWORD, 10)
    console.log('Generated hashed password')

    // Check if admin user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@contentforge.com']
    )

    if (existingUser.rows.length > 0) {
      console.log('✓ Admin user already exists')
      return
    }

    // Insert admin user
    const result = await client.query(
      `INSERT INTO users (id, email, password_hash, role, name, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
       RETURNING id, email, role`,
      ['admin@contentforge.com', hashedPassword, 'admin', 'Administrator']
    )

    console.log('✓ Admin user created successfully')
    console.log('  Email:', result.rows[0].email)
    console.log('  Role:', result.rows[0].role)
    console.log('\nYou can now login with:')
    console.log('  Email: admin@contentforge.com')
    console.log('  Password:', ADMIN_PASSWORD)
  } catch (error) {
    console.error('Error creating admin user:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

createAdminUser()
