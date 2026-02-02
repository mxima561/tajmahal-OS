'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Trash2 } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'

interface EventRow {
  id: string
  name: string
  dj_name: string | null
  is_auto_generated: boolean
  start_time: string
  total_capacity: number
  status: 'draft' | 'published' | 'cancelled'
  ticketsSold: number
  revenue: number
}

export function EventsTable({ events }: { events: EventRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const allSelected = events.length > 0 && selected.size === events.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(events.map((e) => e.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleDelete() {
    if (selected.size === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.size} event${selected.size > 1 ? 's' : ''}? This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/events/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds: Array.from(selected) }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to delete events')
        return
      }

      setSelected(new Set())
      router.refresh()
    } catch {
      setError('Failed to delete events')
    } finally {
      setDeleting(false)
    }
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-night-400">
        <Calendar className="w-10 h-10 mb-3 text-night-600" />
        <p className="text-sm">No events found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Delete bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20">
          <span className="text-sm text-red-400">
            {selected.size} event{selected.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-night-700 text-night-400">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-night-600 bg-night-800 text-gold-500 focus:ring-gold-500/50"
                />
              </th>
              <th className="text-left py-3 px-4 font-medium">Event Name</th>
              <th className="text-left py-3 px-4 font-medium">Date</th>
              <th className="text-left py-3 px-4 font-medium">Tickets</th>
              <th className="text-left py-3 px-4 font-medium">Revenue</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr
                key={event.id}
                className={`border-b border-night-800 last:border-0 ${
                  selected.has(event.id) ? 'bg-night-800/50' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selected.has(event.id)}
                    onChange={() => toggleOne(event.id)}
                    className="rounded border-night-600 bg-night-800 text-gold-500 focus:ring-gold-500/50"
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-medium text-white hover:text-gold-400 transition-colors"
                    >
                      {event.name}
                      {event.dj_name && (
                        <span className="text-gold-400 font-normal"> — ft. {event.dj_name}</span>
                      )}
                    </Link>
                    {event.is_auto_generated && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-night-700 text-night-400 font-medium uppercase tracking-wide">
                        Auto
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-night-300">
                  {formatDateTime(event.start_time)}
                </td>
                <td className="py-3 px-4 text-night-300">
                  <span className="text-white font-medium">{event.ticketsSold}</span>
                  <span className="text-night-500"> / {event.total_capacity}</span>
                </td>
                <td className="py-3 px-4 text-night-300">
                  {formatCurrency(event.revenue)}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={event.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'draft' | 'published' | 'cancelled' }) {
  const styles = {
    draft: 'bg-yellow-500/10 text-yellow-400',
    published: 'bg-green-500/10 text-green-400',
    cancelled: 'bg-red-500/10 text-red-400',
  }

  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}
