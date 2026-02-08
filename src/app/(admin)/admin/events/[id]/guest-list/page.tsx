'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Trash2,
  Loader2,
  XCircle,
} from 'lucide-react'

type GuestEntry = {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  plus_count: number | null
  added_by_name: string | null
  status: string
  checked_in_at: string | null
  notes: string | null
  created_at: string | null
}

type GuestStats = {
  total: number
  totalWithPlus: number
  pending: number
  confirmed: number
  checkedIn: number
  noShow: number
}

export default function GuestListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = use(params)

  const [entries, setEntries] = useState<GuestEntry[]>([])
  const [stats, setStats] = useState<GuestStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Add guest form
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPlusCount, setFormPlusCount] = useState(0)
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchGuests() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ eventId })
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/admin/guest-list?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setStats(data.stats || null)
      }
    } catch {
      setError('Failed to fetch guest list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/guest-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          plusCount: formPlusCount,
          notes: formNotes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add guest')
        return
      }

      setFormName('')
      setFormEmail('')
      setFormPhone('')
      setFormPlusCount(0)
      setFormNotes('')
      setShowForm(false)
      fetchGuests()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateStatus(guestId: string, status: string) {
    try {
      await fetch('/api/admin/guest-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guestId, status }),
      })
      fetchGuests()
    } catch {
      // ignore
    }
  }

  async function handleDelete(guestId: string) {
    if (!confirm('Remove this guest?')) return
    try {
      await fetch(`/api/admin/guest-list?id=${guestId}`, { method: 'DELETE' })
      fetchGuests()
    } catch {
      // ignore
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchGuests()
  }

  const filteredEntries = statusFilter === 'all'
    ? entries
    : entries.filter(e => e.status === statusFilter)

  function formatTime(iso: string | null): string {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return iso
    }
  }

  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    confirmed: 'bg-blue-500/10 text-blue-400',
    checked_in: 'bg-green-500/10 text-green-400',
    no_show: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/events/${eventId}`}
            className="p-2 rounded-lg bg-night-800 hover:bg-night-700 border border-night-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Guest List</h1>
            <p className="text-sm text-night-400 mt-0.5">Manage guest list entries</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-night-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Guest
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Users className="w-5 h-5 text-gold-500" />} label="Total Guests" value={`${stats.total} (+${stats.totalWithPlus - stats.total})`} />
          <StatCard icon={<UserCheck className="w-5 h-5 text-green-400" />} label="Checked In" value={String(stats.checkedIn)} />
          <StatCard icon={<Users className="w-5 h-5 text-yellow-400" />} label="Pending" value={String(stats.pending + stats.confirmed)} />
          <StatCard icon={<UserX className="w-5 h-5 text-red-400" />} label="No Shows" value={String(stats.noShow)} />
        </div>
      )}

      {/* Add Guest Form */}
      {showForm && (
        <div className="bg-night-900 border border-night-700 rounded-xl p-5">
          <h3 className="font-semibold mb-4">Add Guest</h3>
          <form onSubmit={handleAddGuest} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-night-400 mb-1">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="Guest name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Phone</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="+20 xxx xxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Plus (+) Count</label>
              <input
                type="number"
                value={formPlusCount}
                onChange={(e) => setFormPlusCount(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                max={20}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="VIP, promoter name, etc."
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting || !formName.trim()}
                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-night-950 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Guest'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-night-400 hover:text-night-200 px-4 py-2.5 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-red-400">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="flex-1 bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
          />
          <button
            type="submit"
            className="bg-night-800 border border-night-600 hover:bg-night-700 text-white px-3 py-2.5 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Guest Table */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Users className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No guests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">+</th>
                  <th className="text-left py-3 px-4 font-medium">Contact</th>
                  <th className="text-left py-3 px-4 font-medium">Added By</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((guest) => (
                  <tr key={guest.id} className="border-b border-night-800 last:border-0 hover:bg-night-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{guest.name}</div>
                      {guest.notes && <div className="text-xs text-night-500 mt-0.5">{guest.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {(guest.plus_count ?? 0) > 0 ? `+${guest.plus_count}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {guest.email && <div className="text-night-300 text-xs">{guest.email}</div>}
                      {guest.phone && <div className="text-night-400 text-xs">{guest.phone}</div>}
                      {!guest.email && !guest.phone && <span className="text-night-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-night-400 text-xs">
                      {guest.added_by_name || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusStyles[guest.status] || 'bg-night-700 text-night-300'}`}>
                        {guest.status === 'checked_in' ? 'checked in' : guest.status.replace('_', ' ')}
                      </span>
                      {guest.checked_in_at && (
                        <span className="text-[10px] text-night-500 ml-1">
                          {formatTime(guest.checked_in_at)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {guest.status !== 'checked_in' && (
                          <button
                            onClick={() => handleUpdateStatus(guest.id, 'confirmed')}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                            title="Confirm"
                          >
                            Confirm
                          </button>
                        )}
                        {guest.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(guest.id, 'no_show')}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                            title="No show"
                          >
                            No Show
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(guest.id)}
                          className="text-night-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-night-900 border border-night-700 rounded-xl p-4 flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-500/10">
        {icon}
      </div>
      <div>
        <p className="text-xs text-night-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}
