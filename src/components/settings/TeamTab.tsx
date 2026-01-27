import { useEffect, useState } from 'react'
import { Trash2, Shield, User as UserIcon } from 'lucide-react'
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
                  'flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4',
                  isSelf && 'border-[#00f0ff]/20',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                    {member.role === 'admin' ? (
                      <Shield className="h-5 w-5 text-[#00f0ff]" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-[#9ca3af]" />
                    )}
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
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
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
