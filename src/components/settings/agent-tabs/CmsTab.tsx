import { useState, useEffect } from 'react'
import { Globe, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface CmsSettings {
  cms_enabled: string | null
  cms_api_url: string | null
  cms_api_key: string | null
  cms_category: string | null
  cms_publish_status: string | null
}

export default function CmsTab({ agentId }: { agentId: string }) {
  const [settings, setSettings] = useState<CmsSettings>({
    cms_enabled: null, cms_api_url: null, cms_api_key: null, cms_category: null, cms_publish_status: null,
  })
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get<CmsSettings>(`/api/cms/settings/${agentId}`)
      .then(s => {
        setSettings(s)
        // API key is masked from server, don't show masked value
      })
      .catch(() => setMessage('Failed to load CMS settings'))
      .finally(() => setLoading(false))
  }, [agentId])

  const save = async () => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        cms_enabled: settings.cms_enabled || 'false',
        cms_api_url: settings.cms_api_url || '',
        cms_category: settings.cms_category || 'general',
        cms_publish_status: settings.cms_publish_status || 'draft',
      }
      // Only send API key if user entered a new one
      if (apiKeyInput) {
        payload.cms_api_key = apiKeyInput
      }
      await api.put(`/api/cms/settings/${agentId}`, payload)
      setMessage('CMS settings saved')
      setApiKeyInput('')
    } catch {
      setMessage('Failed to save')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const testConnection = async () => {
    if (!settings.cms_api_url) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.post<{ success: boolean; error?: string }>('/api/cms/test', {
        url: settings.cms_api_url,
        apiKey: apiKeyInput || settings.cms_api_key || '',
      })
      setTestResult(result)
    } catch (e) {
      setTestResult({ success: false, error: e instanceof Error ? e.message : 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className="text-[#cbd5e1] py-4">Loading...</div>

  return (
    <div className="space-y-5">
      {message && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-2 text-sm text-[#10b981]">
          {message}
        </div>
      )}

      {/* Enable Toggle */}
      <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
        <div>
          <p className="text-sm text-[#f8fafc]">CMS Publishing</p>
          <p className="text-xs text-[#cbd5e1]">Auto-publish coverage posts to your CMS</p>
        </div>
        <button
          onClick={() => setSettings({ ...settings, cms_enabled: settings.cms_enabled === 'true' ? 'false' : 'true' })}
          className={`relative w-11 h-6 rounded-full transition-colors ${settings.cms_enabled === 'true' ? 'bg-[#10b981]' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.cms_enabled === 'true' ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* CMS URL */}
      <div>
        <label className="text-xs text-[#cbd5e1] mb-1 block">CMS API URL</label>
        <input
          type="url"
          placeholder="https://yourcms.com"
          value={settings.cms_api_url || ''}
          onChange={e => setSettings({ ...settings, cms_api_url: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
        />
      </div>

      {/* API Key */}
      <div>
        <label className="text-xs text-[#cbd5e1] mb-1 block">
          API Key {settings.cms_api_key && !apiKeyInput && <span className="text-emerald-400">(configured)</span>}
        </label>
        <input
          type="password"
          placeholder={settings.cms_api_key ? 'Enter new key to replace...' : 'CMS API key'}
          value={apiKeyInput}
          onChange={e => setApiKeyInput(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
        />
      </div>

      {/* Category & Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#cbd5e1] mb-1 block">Default Category</label>
          <input
            type="text"
            placeholder="general"
            value={settings.cms_category || ''}
            onChange={e => setSettings({ ...settings, cms_category: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-[#cbd5e1] mb-1 block">Publish Status</label>
          <select
            value={settings.cms_publish_status || 'draft'}
            onChange={e => setSettings({ ...settings, cms_publish_status: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#f8fafc] text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
          {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {testResult.success ? 'Connection successful' : testResult.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={testConnection}
          disabled={testing || !settings.cms_api_url}
          className="bg-white/5 hover:bg-white/10 text-[#cbd5e1] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
          Test Connection
        </button>
      </div>
    </div>
  )
}
