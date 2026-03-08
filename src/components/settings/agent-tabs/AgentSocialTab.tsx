import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Zap } from 'lucide-react'
import { api } from '@/lib/api'

interface SocialAccount {
  id: string
  platform: string
  platform_username: string
  is_active: number
}

const PLATFORMS = [
  { id: 'x', label: 'X (Twitter)', help: 'Get from developer.x.com → Keys and Tokens' },
  { id: 'facebook', label: 'Facebook', help: 'Page Access Token from developers.facebook.com' },
  { id: 'instagram', label: 'Instagram', help: 'Instagram Graph API token from Meta Business Suite' },
  { id: 'linkedin', label: 'LinkedIn', help: 'OAuth access token from linkedin.com/developers' },
  { id: 'threads', label: 'Threads', help: 'Threads API token from developers.facebook.com' },
]

export default function AgentSocialTab({ agentId }: { agentId: string }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [platform, setPlatform] = useState('x')
  const [username, setUsername] = useState('')
  const [xForm, setXForm] = useState({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })
  const [genericForm, setGenericForm] = useState({ accessToken: '', platformUserId: '' })
  const [testing, setTesting] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ accounts: SocialAccount[] }>(`/api/social-accounts?agentId=${agentId}`)
      setAccounts(d.accounts)
    } catch {
      setMessage('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  const create = async () => {
    let accessToken: string
    let platformUserId: string

    if (platform === 'x') {
      if (!xForm.apiKey || !xForm.apiSecret || !xForm.accessToken || !xForm.accessTokenSecret) {
        setMessage('All 4 X API credentials required'); return
      }
      accessToken = JSON.stringify(xForm)
      platformUserId = username || 'x-user'
    } else {
      if (!genericForm.accessToken || !genericForm.platformUserId) {
        setMessage('Access Token and Platform ID required'); return
      }
      accessToken = genericForm.accessToken
      platformUserId = genericForm.platformUserId
    }

    try {
      await api.post('/api/social-accounts', { agentId, platform, accessToken, platformUserId, platformUsername: username })
      setShowForm(false)
      setPlatform('x'); setUsername('')
      setXForm({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })
      setGenericForm({ accessToken: '', platformUserId: '' })
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this account?')) return
    await api.delete(`/api/social-accounts/${id}`)
    await load()
  }

  const test = async (id: string) => {
    setTesting(id)
    try {
      await api.post(`/api/social-accounts/${id}/test`)
      setMessage('Credentials valid')
    } catch {
      setMessage('Test failed')
    } finally {
      setTesting(null)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const platformLabel = Object.fromEntries(PLATFORMS.map(p => [p.id, p.label]))
  const currentPlatform = PLATFORMS.find(p => p.id === platform)

  if (loading) return <div className="text-[#cbd5e1] py-4">Loading...</div>

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 text-sm text-[#10b981]">{message}</div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#cbd5e1]">{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</p>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs">
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs" />
          </div>
          {currentPlatform && <p className="text-[10px] text-[#cbd5e1]">{currentPlatform.help}</p>}

          {platform === 'x' ? (
            <div className="space-y-1.5">
              <input type="password" placeholder="API Key" value={xForm.apiKey} onChange={e => setXForm({ ...xForm, apiKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs" />
              <input type="password" placeholder="API Secret" value={xForm.apiSecret} onChange={e => setXForm({ ...xForm, apiSecret: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs" />
              <input type="password" placeholder="Access Token" value={xForm.accessToken} onChange={e => setXForm({ ...xForm, accessToken: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs" />
              <input type="password" placeholder="Access Token Secret" value={xForm.accessTokenSecret} onChange={e => setXForm({ ...xForm, accessTokenSecret: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <input type="password" placeholder="Access Token" value={genericForm.accessToken} onChange={e => setGenericForm({ ...genericForm, accessToken: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs" />
              <input type="text" placeholder={platform === 'facebook' ? 'Page ID' : platform === 'linkedin' ? 'Organization ID' : 'Account ID'}
                value={genericForm.platformUserId} onChange={e => setGenericForm({ ...genericForm, platformUserId: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[#f8fafc] text-xs" />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={create} className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-3 py-1.5 text-xs font-medium">Connect</button>
            <button onClick={() => setShowForm(false)} className="text-[#cbd5e1] px-3 py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {accounts.map(a => (
        <div key={a.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <div className="text-sm text-[#f8fafc]">
            {platformLabel[a.platform] || a.platform}
            {a.platform_username && <span className="text-[#cbd5e1] ml-1">@{a.platform_username}</span>}
          </div>
          <div className="flex gap-1">
            <button onClick={() => test(a.id)} disabled={testing === a.id} className="text-[#cbd5e1] hover:text-[#10b981] p-1 disabled:opacity-50">
              <Zap className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => remove(a.id)} className="text-[#cbd5e1] hover:text-red-400 p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {accounts.length === 0 && !showForm && (
        <p className="text-xs text-[#cbd5e1] text-center py-4">No social accounts. Click Add to connect one.</p>
      )}
    </div>
  )
}
