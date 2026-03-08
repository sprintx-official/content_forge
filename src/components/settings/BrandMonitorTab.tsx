import { useState, useEffect, useCallback } from 'react'
import { Eye, Plus, Trash2, Play, ToggleLeft, ToggleRight } from 'lucide-react'
import { api } from '@/lib/api'

interface BrandQuery {
  id: string
  agent_id: string | null
  query: string
  frequency: string
  is_active: number
  created_at: string
}

interface BrandResult {
  id: string
  query_id: string
  query_text: string
  provider: string
  response: string
  sentiment: string | null
  entities: string
  created_at: string
}

export default function BrandMonitorTab() {
  const [queries, setQueries] = useState<BrandQuery[]>([])
  const [results, setResults] = useState<BrandResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ queryText: '', frequency: 'daily' })
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [viewResults, setViewResults] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [q, r] = await Promise.all([
        api.get<{ queries: BrandQuery[] }>('/api/brand-monitor/queries'),
        api.get<{ results: BrandResult[] }>('/api/brand-monitor/results?limit=50'),
      ])
      setQueries(q.queries)
      setResults(r.results)
    } catch {
      setMessage('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.queryText) return
    try {
      await api.post('/api/brand-monitor/queries', form)
      setShowForm(false)
      setForm({ queryText: '', frequency: 'daily' })
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this brand query?')) return
    await api.delete(`/api/brand-monitor/queries/${id}`)
    await load()
  }

  const toggle = async (id: string, isActive: boolean) => {
    await api.patch(`/api/brand-monitor/queries/${id}`, { isActive: !isActive })
    await load()
  }

  const runNow = async () => {
    setRunning(true)
    try {
      await api.post('/api/brand-monitor/run')
      setMessage('Brand monitoring run completed')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const sentimentColor: Record<string, string> = {
    positive: 'text-green-400',
    neutral: 'text-[#cbd5e1]',
    negative: 'text-red-400',
    mixed: 'text-yellow-400',
  }

  if (loading) return <div className="text-[#cbd5e1]">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f8fafc] flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#10b981]" />
            Brand Monitor
          </h2>
          <p className="text-sm text-[#cbd5e1]">Monitor how LLMs discuss your brand across providers.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runNow}
            disabled={running}
            className="bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#6366f1] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {running ? 'Running...' : 'Run Now'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Query
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 text-sm text-[#10b981]">
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <textarea
            placeholder='e.g. "What do you know about Acme Corp? What is their reputation?"'
            value={form.queryText}
            onChange={e => setForm({ ...form, queryText: e.target.value })}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm resize-none"
          />
          <select
            value={form.frequency}
            onChange={e => setForm({ ...form, frequency: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
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

      {/* Queries List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[#cbd5e1] uppercase tracking-wider">Queries</h3>
        {queries.length === 0 && (
          <p className="text-[#cbd5e1] text-sm text-center py-4">No brand queries configured.</p>
        )}
        {queries.map(q => (
          <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#f8fafc] truncate">{q.query}</div>
                <div className="text-xs text-[#cbd5e1] mt-0.5">
                  {q.frequency} · {q.is_active ? 'Active' : 'Paused'}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewResults(viewResults === q.id ? null : q.id)}
                  className="text-[#cbd5e1] hover:text-[#10b981] p-1.5 rounded-lg hover:bg-white/5 text-xs"
                >
                  Results
                </button>
                <button
                  onClick={() => toggle(q.id, q.is_active === 1)}
                  className="text-[#cbd5e1] hover:text-[#10b981] p-1.5 rounded-lg hover:bg-white/5"
                >
                  {q.is_active ? <ToggleRight className="h-4 w-4 text-[#10b981]" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => remove(q.id)}
                  className="text-[#cbd5e1] hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {viewResults === q.id && (
              <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                {results.filter(r => r.query_id === q.id).length === 0 && (
                  <p className="text-xs text-[#cbd5e1]">No results yet. Run the monitor to collect data.</p>
                )}
                {results.filter(r => r.query_id === q.id).map(r => (
                  <div key={r.id} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#f8fafc] bg-white/10 rounded px-1.5 py-0.5">{r.provider}</span>
                      {r.sentiment && (
                        <span className={`text-xs font-medium ${sentimentColor[r.sentiment] || 'text-[#cbd5e1]'}`}>
                          {r.sentiment}
                        </span>
                      )}
                      <span className="text-xs text-[#cbd5e1]">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[#cbd5e1] line-clamp-3">{r.response.slice(0, 300)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
