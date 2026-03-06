import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStore } from '@/stores/useAdminStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { getAdminCount } from '@/services/teamService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Loader from '@/components/ui/Loader'
import AddMemberForm from './AddMemberForm'

export default function TeamTab() {
  const { teamMembers, loading, loadTeam, changeRole, removeMember } = useAdminStore()
  const currentUser = useAuthStore((s) => s.user)
  const [adminCount, setAdminCount] = useState(0)
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    loadTeam().then(() => setInitialLoad(false))
    getAdminCount().then(setAdminCount)
  }, [loadTeam])

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'

    if (currentRole === 'admin' && adminCount <= 1) {
      alert('Cannot remove the last admin. Promote another user first.')
      return
    }

    const success = await changeRole(userId, newRole)
    if (success) {
      const count = await getAdminCount()
      setAdminCount(count)
    }
  }

  const handleRemove = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot remove yourself.')
      return
    }

    const member = teamMembers.find((m) => m.id === userId)
    if (member?.role === 'admin' && adminCount <= 1) {
      alert('Cannot remove the last admin.')
      return
    }

    if (confirm(`Remove ${member?.name}? This cannot be undone.`)) {
      const success = await removeMember(userId)
      if (success) {
        const count = await getAdminCount()
        setAdminCount(count)
      }
    }
  }

  if (initialLoad && loading) {
    return <Loader label="Loading team..." />
  }

  return (
    <div className="space-y-6">
      <AddMemberForm />

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-[#f9fafb]">
          Team Members ({teamMembers.length})
        </h3>

        <div className="space-y-2">
          {teamMembers.map((member) => {
            const isSelf = member.id === currentUser?.id
            const isSuperAdmin = member.email === 'admin@contentforge.com'
            return (
              <div
                key={member.id}
                className={cn(
                  'flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors',
                  isSelf && 'border-white/[0.15]',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    member.role === 'admin'
                      ? 'bg-[#a855f7]/20 text-[#a855f7]'
                      : 'bg-white/[0.08] text-white/50',
                  )}>
                    {member.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#f9fafb] truncate">
                        {member.name}
                        {isSelf && <span className="text-[#9ca3af]"> (you)</span>}
                      </p>
                      <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#9ca3af] truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSuperAdmin && (
                    <Badge variant="outline" className="text-[#00f0ff] border-[#00f0ff]/30">
                      Super Admin
                    </Badge>
                  )}
                  {!isSelf && !isSuperAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRoleChange(member.id, member.role)}
                      >
                        {member.role === 'admin' ? 'Demote' : 'Promote'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                        className="text-white/30 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
