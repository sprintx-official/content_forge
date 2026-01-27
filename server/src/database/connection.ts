import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { config } from '../config.js'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  // Ensure the data directory exists
  const dir = path.dirname(config.databasePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(config.databasePath)

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
