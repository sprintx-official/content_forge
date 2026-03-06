import { useState, useEffect, useCallback } from 'react'
import { Share2, Plus, Trash2, Zap } from 'lucide-react'
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

const PLATFORMS = [
  { id: 'x', label: 'X (Twitter)', help: 'Get these from developer.x.com → Your App → Keys and Tokens' },
  { id: 'facebook', label: 'Facebook', help: 'Use a Page Access Token from developers.facebook.com' },
  { id: 'instagram', label: 'Instagram', help: 'Use Instagram Graph API token from Meta Business Suite' },
  { id: 'linkedin', label: 'LinkedIn', help: 'Use an OAuth access token from linkedin.com/developers' },
  { id: 'threads', label: 'Threads', help: 'Use a Threads API token from developers.facebook.com' },
]

interface XForm {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

interface GenericForm {
  accessToken: string
  platformUserId: string
}

export default function SocialAccountsTab() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [agentId, setAgentId] = useState('')
  const [platform, setPlatform] = useState('x')
  const [username, setUsername] = useState('')
  const [xForm, setXForm] = useState<XForm>({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })
  const [genericForm, setGenericForm] = useState<GenericForm>({ accessToken: '', platformUserId: '' })
  const [testing, setTesting] = useState<string | null>(null)
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
    if (!agentId) {
      setMessage('Please select an agent')
      return
    }

    let accessToken: string
    let platformUserId: string

    if (platform === 'x') {
      if (!xForm.apiKey || !xForm.apiSecret || !xForm.accessToken || !xForm.accessTokenSecret) {
        setMessage('Please fill in all 4 X API credentials')
        return
      }
      // Store as JSON for OAuth 1.0a
      accessToken = JSON.stringify({
        apiKey: xForm.apiKey,
        apiSecret: xForm.apiSecret,
        accessToken: xForm.accessToken,
        accessTokenSecret: xForm.accessTokenSecret,
      })
      platformUserId = username || 'x-user'
    } else {
      if (!genericForm.accessToken || !genericForm.platformUserId) {
        setMessage('Please fill in Access Token and Platform User/Page ID')
        return
      }
      accessToken = genericForm.accessToken
      platformUserId = genericForm.platformUserId
    }

    try {
      await api.post('/api/social-accounts', {
        agentId,
        platform,
        accessToken,
        platformUserId,
        platformUsername: username,
      })
      setShowForm(false)
      resetForm()
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    }
  }

  const resetForm = () => {
    setAgentId('')
    setPlatform('x')
    setUsername('')
    setXForm({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })
    setGenericForm({ accessToken: '', platformUserId: '' })
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this social account?')) return
    await api.delete(`/api/social-accounts/${id}`)
    await load()
  }

  const test = async (id: string) => {
    setTesting(id)
    try {
      const d = await api.post<{ success: boolean; message?: string }>(`/api/social-accounts/${id}/test`)
      setMessage(d.success ? 'Credentials valid' : 'Test failed')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setTesting(null)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const platformLabel: Record<string, string> = Object.fromEntries(PLATFORMS.map(p => [p.id, p.label]))
  const currentPlatform = PLATFORMS.find(p => p.id === platform)

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
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
          >
            <option value="">Select Agent</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <div className="flex gap-3 items-center">
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
            >
              {PLATFORMS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Username (optional)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
            />
          </div>

          {currentPlatform && (
            <p className="text-xs text-[#9ca3af]">{currentPlatform.help}</p>
          )}

          {/* Platform-specific fields */}
          {platform === 'x' ? (
            <div className="space-y-2">
              <input
                type="password"
                placeholder="API Key (Consumer Key)"
                value={xForm.apiKey}
                onChange={e => setXForm({ ...xForm, apiKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
              />
              <input
                type="password"
                placeholder="API Key Secret (Consumer Secret)"
                value={xForm.apiSecret}
                onChange={e => setXForm({ ...xForm, apiSecret: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
              />
              <input
                type="password"
                placeholder="Access Token"
                value={xForm.accessToken}
                onChange={e => setXForm({ ...xForm, accessToken: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
              />
              <input
                type="password"
                placeholder="Access Token Secret"
                value={xForm.accessTokenSecret}
                onChange={e => setXForm({ ...xForm, accessTokenSecret: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="password"
                placeholder={platform === 'facebook' ? 'Page Access Token' : 'Access Token'}
                value={genericForm.accessToken}
                onChange={e => setGenericForm({ ...genericForm, accessToken: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
              />
              <input
                type="text"
                placeholder={
                  platform === 'facebook' ? 'Facebook Page ID'
                    : platform === 'linkedin' ? 'Organization ID'
                    : platform === 'instagram' ? 'Instagram Business Account ID'
                    : 'Platform User/Account ID'
                }
                value={genericForm.platformUserId}
                onChange={e => setGenericForm({ ...genericForm, platformUserId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f9fafb] text-sm"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={create} className="bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] rounded-lg px-4 py-2 text-sm font-medium">
              Connect
            </button>
            <button onClick={() => { setShowForm(false); resetForm() }} className="text-[#9ca3af] hover:text-[#f9fafb] px-4 py-2 text-sm">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => test(a.id)}
                disabled={testing === a.id}
                className="text-[#9ca3af] hover:text-[#00f0ff] p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50"
                title="Test credentials"
              >
                <Zap className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(a.id)}
                className="text-[#9ca3af] hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5"
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
