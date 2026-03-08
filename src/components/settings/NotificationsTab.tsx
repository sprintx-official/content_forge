import { useState, useEffect } from 'react'
import { Bell, Mail, Send } from 'lucide-react'
import { api } from '@/lib/api'

interface EmailPreferences {
  digest_frequency: 'daily' | 'weekly' | 'none'
  breaking_news: number
  timezone: string
}

export default function NotificationsTab() {
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSend, setTestingSend] = useState<'digest' | 'push' | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get<{ preferences: EmailPreferences }>('/api/notifications/preferences')
      .then(d => setPrefs(d.preferences))
      .catch(() => setMessage('Failed to load preferences'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      await api.put('/api/notifications/preferences', {
        digestFrequency: prefs.digest_frequency,
        breakingNews: prefs.breaking_news === 1,
        timezone: prefs.timezone,
      })
      setMessage('Preferences saved')
    } catch {
      setMessage('Failed to save')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const testDigest = async () => {
    setTestingSend('digest')
    try {
      await api.post('/api/notifications/test-digest')
      setMessage('Test digest sent!')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed')
    } finally {
      setTestingSend(null)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const testPush = async () => {
    setTestingSend('push')
    try {
      await api.post('/api/notifications/push/test')
      setMessage('Test push sent!')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Push not configured')
    } finally {
      setTestingSend(null)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) return <div className="text-[#cbd5e1]">Loading...</div>
  if (!prefs) return <div className="text-red-400">Failed to load preferences</div>

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-[#f8fafc] mb-1 flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#10b981]" />
          Notification Preferences
        </h2>
        <p className="text-sm text-[#cbd5e1]">Configure email digests and push notifications.</p>
      </div>

      {message && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 text-sm text-[#10b981]">
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#f8fafc] mb-2">
            <Mail className="h-4 w-4 inline mr-1.5" />
            Email Digest Frequency
          </label>
          <select
            value={prefs.digest_frequency}
            onChange={e => setPrefs({ ...prefs, digest_frequency: e.target.value as EmailPreferences['digest_frequency'] })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm w-full max-w-xs"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="none">None</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.breaking_news === 1}
              onChange={e => setPrefs({ ...prefs, breaking_news: e.target.checked ? 1 : 0 })}
              className="rounded border-white/20 bg-white/5 text-[#10b981]"
            />
            <span className="text-sm text-[#f8fafc]">Breaking news alerts</span>
          </label>
          <p className="text-xs text-[#cbd5e1] mt-1 ml-6">Get notified when critical/high urgency posts are generated.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#f8fafc] mb-2">Timezone</label>
          <input
            type="text"
            value={prefs.timezone}
            onChange={e => setPrefs({ ...prefs, timezone: e.target.value })}
            placeholder="e.g. America/New_York"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm w-full max-w-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button
            onClick={testDigest}
            disabled={testingSend !== null}
            className="bg-white/5 hover:bg-white/10 text-[#cbd5e1] rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {testingSend === 'digest' ? 'Sending...' : 'Test Digest'}
          </button>
          <button
            onClick={testPush}
            disabled={testingSend !== null}
            className="bg-white/5 hover:bg-white/10 text-[#cbd5e1] rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Bell className="h-3.5 w-3.5" />
            {testingSend === 'push' ? 'Sending...' : 'Test Push'}
          </button>
        </div>
      </div>
    </div>
  )
}
