import { useState, useEffect, useCallback } from 'react'
import { Share2, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'

interface SocialAccount {
  id: string
  agent_id: string
  agent_name: string
  platform: string
  platform_username: string
  is_active: number
  created_at: string
}

export default function SocialAccountsTab() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    agentId: '',
    platform: 'x',
    accessToken: '',
    platformUserId: '',
    platformUsername: '',
  })
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const [accts, agentData] = await Promise.all([
        api.get<{ accounts: SocialAccount[] }>('/api/social-accounts'),
        api.get<{ id: string; name: string }[]>('/api/agents'),
      ])
      setAccounts(accts.accounts)
      setAgents(agentData)
    } catch {
      setMessage('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.agentId || !form.accessToken || !form.platformUserId) {
      setMessage('Please fill in all required fields')
      return
    }
    try {
      await api.post('/api/social-accounts', form)
      setShowForm(false)
      setForm({ agentId: '', platform: 'x', accessToken: '', platformUserId: '', platformUsername: '' })
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this social account?')) return
    await api.delete(`/api/social-accounts/${id}`)
    await load()
  }

  const platformLabel: Record<string, string> = {
    x: 'X (Twitter)',
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    threads: 'Threads',
  }

  if (loading) return <div className="text-[#9ca3af]">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f9fafb] flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#00f0ff]" />
            Social Accounts
          </h2>
          <p className="text-sm text-[#9ca3af]">Connect social media accounts for publishing.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {message && (
        <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/20 rounded-lg px-4 py-2 text-sm text-[#00f0ff]">
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <select
            value={form.agentId}
            onChange={e => setForm({ ...form, agentId: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          >
            <option value="">Select Agent</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            value={form.platform}
            onChange={e => setForm({ ...form, platform: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          >
            {Object.entries(platformLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Access Token"
            value={form.accessToken}
            onChange={e => setForm({ ...form, accessToken: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          />
          <input
            type="text"
            placeholder="Platform User ID"
            value={form.platformUserId}
            onChange={e => setForm({ ...form, platformUserId: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          />
          <input
            type="text"
            placeholder="Username (optional)"
            value={form.platformUsername}
            onChange={e => setForm({ ...form, platformUsername: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          />
          <div className="flex gap-2">
            <button onClick={create} className="bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] rounded-lg px-4 py-2 text-sm font-medium">
              Connect
            </button>
            <button onClick={() => setShowForm(false)} className="text-[#9ca3af] hover:text-[#f9fafb] px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {accounts.length === 0 && (
          <p className="text-[#9ca3af] text-sm text-center py-8">No social accounts connected yet.</p>
        )}
        {accounts.map(a => (
          <div key={a.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[#f9fafb] flex items-center gap-2">
                {platformLabel[a.platform] || a.platform}
                {a.platform_username && <span className="text-[#9ca3af]">@{a.platform_username}</span>}
              </div>
              <div className="text-xs text-[#9ca3af] mt-0.5">Agent: {a.agent_name}</div>
            </div>
            <button
              onClick={() => remove(a.id)}
              className="text-[#9ca3af] hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
