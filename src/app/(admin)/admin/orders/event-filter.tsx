'use client'

import { useRouter } from 'next/navigation'

export function EventFilter({
  events,
  activeEvent,
  activeStatus,
  searchQuery,
}: {
  events: { id: string; name: string }[]
  activeEvent: string
  activeStatus: string
  searchQuery: string
}) {
  const router = useRouter()

  function handleChange(eventId: string) {
    const params = new URLSearchParams()
    if (eventId) params.set('event', eventId)
    if (activeStatus) params.set('status', activeStatus)
    if (searchQuery) params.set('q', searchQuery)
    const qs = params.toString()
    router.push(`/admin/orders${qs ? `?${qs}` : ''}`)
  }

  return (
    <select
      value={activeEvent}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-2 bg-night-800 border border-night-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
    >
      <option value="">All Events</option>
      {events.map((event) => (
        <option key={event.id} value={event.id}>
          {event.name}
        </option>
      ))}
    </select>
  )
}
