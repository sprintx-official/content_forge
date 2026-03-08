import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  FileText,
  PenTool,
  Share2,
  Newspaper,
  Film,
  Megaphone,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForgeOptionsStore } from '@/stores/useForgeOptionsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Loader from '@/components/ui/Loader'

// ── Icon map for content types ──────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  PenTool,
  Share2,
  Newspaper,
  Film,
  Megaphone,
}
const ICON_OPTIONS = Object.keys(ICON_MAP)

// ── Types ───────────────────────────────────────────────────

type Category = 'content_type' | 'tone' | 'audience'

interface RawOption {
  id: string // backend UUID
  category: string
  value: string
  label: string
  description: string
  guidance: string
  icon: string
  placeholder: string
  sortOrder: number
}

interface FormState {
  label: string
  value: string
  description: string
  guidance: string
  icon: string
  placeholder: string
}

const EMPTY_FORM: FormState = {
  label: '',
  value: '',
  description: '',
  guidance: '',
  icon: 'FileText',
  placeholder: '',
}

// ── Sub-tab config ──────────────────────────────────────────

const SUB_TABS: { key: Category; label: string }[] = [
  { key: 'content_type', label: 'Content Types' },
  { key: 'tone', label: 'Tones' },
  { key: 'audience', label: 'Audiences' },
]

// ── Helpers ─────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const TOKEN_KEY = 'cf_jwt'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// ── Component ───────────────────────────────────────────────

export default function ContentOptionsTab() {
  const [activeTab, setActiveTab] = useState<Category>('content_type')
  const [rawOptions, setRawOptions] = useState<RawOption[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')

  // CRUD in-flight states
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form states
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [autoSlug, setAutoSlug] = useState(true) // auto-generate value from label

  // ── Data loading ────────────────────────────────────────

  const fetchRawOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/forge-options', { headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to load options')
      const data = await res.json()
      const all: RawOption[] = [
        ...(data.content_type || []),
        ...(data.tone || []),
        ...(data.audience || []),
      ]
      setRawOptions(all)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options')
    }
  }, [])

  useEffect(() => {
    fetchRawOptions().finally(() => setInitialLoading(false))
  }, [fetchRawOptions])

  const reloadAll = useCallback(async () => {
    await fetchRawOptions()
    useForgeOptionsStore.setState({ loaded: false })
    useForgeOptionsStore.getState().loadOptions()
  }, [fetchRawOptions])

  // ── Filtered options for active tab ─────────────────────

  const filteredOptions = rawOptions.filter((o) => o.category === activeTab)

  // ── Form helpers ────────────────────────────────────────

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setAutoSlug(true)
    setShowAddForm(false)
    setEditingId(null)
    setError('')
  }

  const updateFormField = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-slugify label -> value when user hasn't manually edited value
      if (field === 'label' && autoSlug) {
        next.value = slugify(value)
      }
      return next
    })
    // If user manually edits value, stop auto-slugging
    if (field === 'value') {
      setAutoSlug(false)
    }
  }

  const startEdit = (option: RawOption) => {
    setShowAddForm(false)
    setEditingId(option.id)
    setForm({
      label: option.label,
      value: option.value,
      description: option.description || '',
      guidance: option.guidance || '',
      icon: option.icon || 'FileText',
      placeholder: option.placeholder || '',
    })
    setAutoSlug(false)
    setError('')
  }

  const startAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setAutoSlug(true)
    setShowAddForm(true)
    setError('')
  }

  // ── CRUD handlers ───────────────────────────────────────

  const handleCreate = async () => {
    if (!form.label.trim() || !form.value.trim()) {
      setError('Label and Value are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        category: activeTab,
        value: form.value.trim(),
        label: form.label.trim(),
        description: form.description.trim(),
        guidance: form.guidance.trim(),
      }
      if (activeTab === 'content_type') {
        payload.icon = form.icon
        payload.placeholder = form.placeholder.trim()
      }
      await useForgeOptionsStore.getState().createOption(
        payload as never
      )
      await reloadAll()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create option')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    if (!form.label.trim() || !form.value.trim()) {
      setError('Label and Value are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        value: form.value.trim(),
        label: form.label.trim(),
        description: form.description.trim(),
        guidance: form.guidance.trim(),
      }
      if (activeTab === 'content_type') {
        payload.icon = form.icon
        payload.placeholder = form.placeholder.trim()
      }
      await useForgeOptionsStore.getState().updateOption(
        editingId,
        payload as never
      )
      await reloadAll()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update option')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (option: RawOption) => {
    if (!confirm(`Delete "${option.label}"? This action cannot be undone.`)) return
    setDeletingId(option.id)
    setError('')
    try {
      await useForgeOptionsStore.getState().deleteOption(option.id)
      await reloadAll()
      // If we were editing this item, close the form
      if (editingId === option.id) resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete option')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render: loading ─────────────────────────────────────

  if (initialLoading) {
    return <Loader label="Loading content options..." />
  }

  // ── Render: form (used for both add and edit) ───────────

  const renderForm = (mode: 'add' | 'edit') => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#f8fafc]">
          {mode === 'add' ? 'Add New Option' : 'Edit Option'}
        </h4>
        <button
          type="button"
          onClick={resetForm}
          className="text-[#cbd5e1] hover:text-[#f8fafc] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Label"
          placeholder="Display name"
          value={form.label}
          onChange={(e) => updateFormField('label', e.target.value)}
        />
        <Input
          label="Value / Key"
          placeholder="machine-key"
          value={form.value}
          onChange={(e) => updateFormField('value', e.target.value)}
        />
      </div>

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-[#cbd5e1]">
          Description
        </label>
        <textarea
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f8fafc] placeholder:text-[#cbd5e1]/60 transition-all duration-200 resize-y min-h-[60px] focus:outline-none focus:border-[#10b981]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#10b981]/30"
          placeholder="Short description shown on cards"
          rows={2}
          value={form.description}
          onChange={(e) => updateFormField('description', e.target.value)}
        />
      </div>

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-[#cbd5e1]">
          Guidance
        </label>
        <textarea
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f8fafc] placeholder:text-[#cbd5e1]/60 transition-all duration-200 resize-y min-h-[100px] focus:outline-none focus:border-[#10b981]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#10b981]/30"
          placeholder="Detailed instructions sent to the AI in the prompt..."
          rows={4}
          value={form.guidance}
          onChange={(e) => updateFormField('guidance', e.target.value)}
        />
      </div>

      {activeTab === 'content_type' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Icon picker */}
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-[#cbd5e1]">
              Icon
            </label>
            <div className="relative">
              <select
                className="flex h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm text-[#f8fafc] transition-all duration-200 focus:outline-none focus:border-[#10b981]/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] focus:ring-1 focus:ring-[#10b981]/30"
                value={form.icon}
                onChange={(e) => updateFormField('icon', e.target.value)}
              >
                {ICON_OPTIONS.map((name) => (
                  <option key={name} value={name} className="bg-[#0f172a] text-[#f8fafc]">
                    {name}
                  </option>
                ))}
              </select>
              {(() => {
                const IconComponent = ICON_MAP[form.icon]
                return IconComponent ? (
                  <IconComponent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6366f1]" />
                ) : null
              })()}
            </div>
          </div>

          <Input
            label="Placeholder"
            placeholder="Placeholder text for topic input"
            value={form.placeholder}
            onChange={(e) => updateFormField('placeholder', e.target.value)}
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={mode === 'add' ? handleCreate : handleUpdate}
          loading={saving}
          disabled={!form.label.trim() || !form.value.trim()}
        >
          <Check className="h-3.5 w-3.5" />
          {saving
            ? 'Saving...'
            : mode === 'add'
              ? 'Create'
              : 'Save Changes'}
        </Button>
        <Button variant="ghost" size="sm" onClick={resetForm}>
          Cancel
        </Button>
      </div>
    </div>
  )

  // ── Render: option card ─────────────────────────────────

  const renderCard = (option: RawOption) => {
    const isEditing = editingId === option.id
    const isDeleting = deletingId === option.id

    if (isEditing) {
      return (
        <div key={option.id}>
          {renderForm('edit')}
        </div>
      )
    }

    const IconComponent =
      activeTab === 'content_type' && option.icon ? ICON_MAP[option.icon] : null

    return (
      <div
        key={option.id}
        className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:border-white/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {IconComponent && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <IconComponent className="h-4 w-4 text-[#6366f1]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#f8fafc] truncate">
                {option.label}
              </p>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                {option.value}
              </p>
              {option.description && (
                <p className="text-xs text-[#cbd5e1] mt-1.5 line-clamp-2 leading-relaxed">
                  {option.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => startEdit(option)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#cbd5e1] hover:text-[#10b981] hover:bg-white/10 transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(option)}
              disabled={isDeleting}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#cbd5e1] hover:text-red-400 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Delete"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[#f8fafc] mb-1">
          Content Options
        </h3>
        <p className="text-sm text-[#cbd5e1]">
          Manage the content types, tones, and target audiences available in the forge.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1 border border-white/10">
        {SUB_TABS.map((tab) => {
          const count = rawOptions.filter((o) => o.category === tab.key).length
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                resetForm()
              }}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-[#10b981]/10 text-[#10b981] shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                  : 'text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-white/5'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'ml-2 text-xs',
                  activeTab === tab.key ? 'text-[#10b981]/70' : 'text-[#94a3b8]'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Global error (shown outside of forms) */}
      {error && !showAddForm && !editingId && (
        <div className="flex items-start gap-2 text-sm text-red-400 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Option cards */}
      <div className="space-y-3">
        {filteredOptions.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
            <p className="text-sm text-[#94a3b8]">
              No {SUB_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} configured yet.
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">
              Click "Add New" below to create one.
            </p>
          </div>
        )}

        {filteredOptions.map((option) => renderCard(option))}

        {/* Add form (inline at bottom) */}
        {showAddForm && renderForm('add')}
      </div>

      {/* Add button */}
      {!showAddForm && !editingId && (
        <Button variant="outline" size="sm" onClick={startAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add New
        </Button>
      )}
    </div>
  )
}
