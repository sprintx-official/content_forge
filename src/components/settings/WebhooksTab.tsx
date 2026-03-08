import { useState, useEffect, useCallback } from 'react'
import { Webhook, Plus, Trash2, Zap } from 'lucide-react'
import { api } from '@/lib/api'

interface WebhookItem {
  id: string
  name: string
  url: string
  type: 'slack' | 'teams' | 'custom'
  events: string
  is_active: number
  created_at: string
}

export default function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', type: 'custom' as 'slack' | 'teams' | 'custom' })
  const [testing, setTesting] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ webhooks: WebhookItem[] }>('/api/webhooks')
      setWebhooks(d.webhooks)
    } catch {
      setMessage('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.name || !form.url) return
    try {
      await api.post('/api/webhooks', form)
      setShowForm(false)
      setForm({ name: '', url: '', type: 'custom' })
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    await api.delete(`/api/webhooks/${id}`)
    await load()
  }

  const test = async (id: string) => {
    setTesting(id)
    try {
      const d = await api.post<{ success: boolean; status?: number }>(`/api/webhooks/${id}/test`)
      setMessage(d.success ? `Test successful (${d.status})` : 'Test failed')
    } catch {
      setMessage('Test failed')
    } finally {
      setTesting(null)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) return <div className="text-[#cbd5e1]">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f8fafc] flex items-center gap-2">
            <Webhook className="h-5 w-5 text-[#10b981]" />
            Webhooks
          </h2>
          <p className="text-sm text-[#cbd5e1]">Send notifications to Slack, Teams, or custom endpoints.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {message && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 text-sm text-[#10b981]">
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Webhook name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
          />
          <input
            type="url"
            placeholder="Webhook URL"
            value={form.url}
            onChange={e => setForm({ ...form, url: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
          />
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value as typeof form.type })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
          >
            <option value="custom">Custom</option>
            <option value="slack">Slack</option>
            <option value="teams">Microsoft Teams</option>
          </select>
          <div className="flex gap-2">
            <button onClick={create} className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-4 py-2 text-sm font-medium">
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="text-[#cbd5e1] hover:text-[#f8fafc] px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.length === 0 && (
          <p className="text-[#cbd5e1] text-sm text-center py-8">No webhooks configured yet.</p>
        )}
        {webhooks.map(w => (
          <div key={w.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[#f8fafc] flex items-center gap-2">
                {w.name}
                <span className="text-xs bg-white/10 rounded px-1.5 py-0.5 text-[#cbd5e1]">{w.type}</span>
              </div>
              <div className="text-xs text-[#cbd5e1] mt-0.5 truncate max-w-md">{w.url}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => test(w.id)}
                disabled={testing === w.id}
                className="text-[#cbd5e1] hover:text-[#10b981] p-1.5 rounded-lg hover:bg-white/5"
                title="Test webhook"
              >
                <Zap className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(w.id)}
                className="text-[#cbd5e1] hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5"
                title="Delete webhook"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
