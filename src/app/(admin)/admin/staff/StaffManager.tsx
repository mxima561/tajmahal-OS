'use client'

import { formatRelative } from '@/lib/utils/format'
import { AdminUser } from '@/types/database'
import { Plus, Trash2, Users, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  staff: 'Staff',
}

function formatRole(role: string): string {
  return roleLabels[role] || role.charAt(0).toUpperCase() + role.slice(1)
}

export function StaffManager({
  staff,
  currentAuthUserId,
}: {
  staff: AdminUser[]
  currentAuthUserId: string | null
}) {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(adminUser: AdminUser) {
    if (!confirm(`Are you sure you want to remove ${adminUser.name} from the team?`)) {
      return
    }

    setDeleting(adminUser.id)
    try {
      const res = await fetch(`/api/admin/staff/${adminUser.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete staff member')
      }

      toast.success(`${adminUser.name} has been removed`)
      router.refresh()
    } catch (err) {
      console.error('Error deleting staff:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete staff member')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      {/* Invite Form */}
      {showInviteForm && (
        <InviteForm
          onClose={() => setShowInviteForm(false)}
          onSuccess={() => {
            setShowInviteForm(false)
            router.refresh()
          }}
        />
      )}

      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-night-700 flex items-center justify-between">
          <p className="text-sm text-night-400">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-night-950 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Invite Staff
          </button>
        </div>

        {/* Table */}
        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Users className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No staff members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Last Login</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const isCurrentUser = member.auth_user_id === currentAuthUserId

                  return (
                    <tr key={member.id} className="border-b border-night-800 last:border-0">
                      <td className="py-3 px-4">
                        <span className="font-medium text-white">{member.name}</span>
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-gold-400">(you)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-night-300">{member.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block text-xs px-2.5 py-1 rounded-full font-medium bg-night-700 text-night-200">
                          {formatRole(member.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-night-300">
                        {member.last_login ? formatRelative(member.last_login) : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleDelete(member)}
                            disabled={deleting === member.id}
                            className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deleting === member.id ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function InviteForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite staff member')
      }

      toast.success(`Invitation sent to ${email}`)
      onSuccess()
    } catch (err) {
      console.error('Error inviting staff:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to invite staff member')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-night-900 border border-night-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Invite Staff Member</h2>
        <button
          onClick={onClose}
          className="text-night-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-night-400 uppercase tracking-wider block mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Full name"
              className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
            />
          </div>
          <div>
            <label className="text-xs text-night-400 uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-night-400 uppercase tracking-wider block mb-1.5">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Sending Invite...' : 'Send Invite'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-night-800 hover:bg-night-700 border border-night-600 text-white rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
