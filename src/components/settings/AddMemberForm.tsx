import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useAdminStore } from '@/stores/useAdminStore'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types'

export default function AddMemberForm() {
  const addMember = useAdminStore((s) => s.addMember)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.')
      return
    }

    setSaving(true)
    const result = await addMember(name.trim(), email.trim(), password, role)
    setSaving(false)

    if (!result) {
      setError('A user with this email already exists.')
      return
    }

    setName('')
    setEmail('')
    setPassword('')
    setRole('user')
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="default" size="md" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add Team Member
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4"
    >
      <h3 className="text-lg font-semibold text-[#f9fafb]">Add Team Member</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Set a password"
        />
        <Select
          label="Role"
          value={role}
          onChange={(val) => setRole(val as UserRole)}
          options={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="default" size="md" disabled={saving}>
          <UserPlus className="h-4 w-4" />
          {saving ? 'Creating...' : 'Create Member'}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
