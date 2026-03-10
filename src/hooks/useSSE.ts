import { useEffect, useRef, useState, useCallback } from 'react'

interface SSEEvent {
  type: string
  data: Record<string, unknown>
  timestamp: string
}

interface UseSSEOptions {
  enabled?: boolean
  reconnectInterval?: number
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const { enabled = true, reconnectInterval = 5000 } = options
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (!enabled) return

    // Add auth token as query param since EventSource doesn't support headers
    const token = localStorage.getItem('cf_jwt')
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = token ? `${url}${separator}token=${token}` : url

    const es = new EventSource(fullUrl)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data)
        setLastEvent(parsed)
      } catch {
        // Ignore unparseable events (keepalive pings, etc.)
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      eventSourceRef.current = null
      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
    }
  }, [url, enabled, reconnectInterval])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
  }, [connect])

  return { lastEvent, connected }
}
