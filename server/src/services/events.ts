import pg from 'pg'
import { config } from '../config.js'

/**
 * Cross-process event system using PostgreSQL NOTIFY/LISTEN.
 * Workers NOTIFY on events, SSE endpoint LISTENs and forwards to clients.
 */

const CHANNEL = 'app_events'

export interface AppEvent {
  type: string
  data: Record<string, unknown>
  timestamp: string
}

type EventCallback = (event: AppEvent) => void

let listenClient: pg.Client | null = null
let listeners: EventCallback[] = []
let isListening = false

// Shared pool for NOTIFY (reuses existing connection pool pattern)
const notifyPool = new pg.Pool({ connectionString: config.databaseUrl })

/**
 * Emit an event via PostgreSQL NOTIFY. Can be called from any process.
 */
export async function emitEvent(type: string, data: Record<string, unknown> = {}): Promise<void> {
  const event: AppEvent = {
    type,
    data,
    timestamp: new Date().toISOString(),
  }
  const payload = JSON.stringify(event)

  // NOTIFY payload is limited to 8000 bytes; truncate if needed
  if (payload.length > 7500) {
    const truncated: AppEvent = {
      type,
      data: { message: 'Event data truncated' },
      timestamp: event.timestamp,
    }
    await notifyPool.query(`SELECT pg_notify($1, $2)`, [CHANNEL, JSON.stringify(truncated)])
  } else {
    await notifyPool.query(`SELECT pg_notify($1, $2)`, [CHANNEL, payload])
  }
}

/**
 * Subscribe to events. Uses a dedicated connection for LISTEN.
 */
export async function subscribe(callback: EventCallback): Promise<void> {
  listeners.push(callback)

  if (isListening) return
  isListening = true

  listenClient = new pg.Client({ connectionString: config.databaseUrl })
  await listenClient.connect()

  listenClient.on('notification', (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return
    try {
      const event: AppEvent = JSON.parse(msg.payload)
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (err) {
          console.error('[Events] Listener error:', err)
        }
      }
    } catch (err) {
      console.error('[Events] Failed to parse event:', err)
    }
  })

  await listenClient.query(`LISTEN ${CHANNEL}`)
  console.log(`[Events] Listening on channel: ${CHANNEL}`)
}

/**
 * Unsubscribe a specific callback.
 */
export function unsubscribe(callback: EventCallback): void {
  listeners = listeners.filter((l) => l !== callback)
}

/**
 * Stop listening and clean up.
 */
export async function stopListening(): Promise<void> {
  if (listenClient) {
    try {
      await listenClient.query(`UNLISTEN ${CHANNEL}`)
      await listenClient.end()
    } catch {
      // ignore cleanup errors
    }
  }
  listeners = []
  listenClient = null
  isListening = false
}

// Event type constants
export const EVENTS = {
  PIPELINE_STARTED: 'pipeline:started',
  PIPELINE_STEP: 'pipeline:step',
  PIPELINE_COMPLETED: 'pipeline:completed',
  POST_GENERATED: 'post:generated',
  ARTICLES_NEW: 'articles:new',
  FEED_ERROR: 'feed:error',
  POST_PUBLISHED: 'post:published',
  BREAKING_NEWS: 'breaking:news',
} as const
