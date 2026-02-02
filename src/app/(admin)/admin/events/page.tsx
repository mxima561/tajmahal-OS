import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { EventWithTicketTypes } from '@/types/database'
import { Calendar, Plus, Search } from 'lucide-react'
import Link from 'next/link'

async function getEvents() {
  const supabase = await createServerSupabaseClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .order('start_time', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return (events || []) as EventWithTicketTypes[]
}

function getEventStatus(event: EventWithTicketTypes): 'draft' | 'published' | 'cancelled' {
  if (event.cancelled_at) return 'cancelled'
  return event.status as 'draft' | 'published'
}

function getEventTab(event: EventWithTicketTypes, now: Date): 'upcoming' | 'past' | 'draft' {
  if (event.status === 'draft') return 'draft'
  if (new Date(event.start_time) > now) return 'upcoming'
  return 'past'
}

function getTicketsSold(event: EventWithTicketTypes): number {
  return event.ticket_types?.reduce((sum, tt) => sum + (tt.quantity_sold || 0), 0) || 0
}

function getRevenue(event: EventWithTicketTypes): number {
  return event.ticket_types?.reduce(
    (sum, tt) => sum + (tt.quantity_sold || 0) * tt.price,
    0
  ) || 0
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string }
}) {
  const events = await getEvents()
  const now = new Date()
  const activeTab = searchParams.tab || 'all'
  const searchQuery = searchParams.q || ''

  // Filter events
  let filteredEvents = events

  if (searchQuery) {
    filteredEvents = filteredEvents.filter((e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  if (activeTab !== 'all') {
    filteredEvents = filteredEvents.filter((e) => getEventTab(e, now) === activeTab)
  }

  const tabs = [
    { key: 'all', label: 'All', count: events.length },
    { key: 'upcoming', label: 'Upcoming', count: events.filter((e) => getEventTab(e, now) === 'upcoming').length },
    { key: 'past', label: 'Past', count: events.filter((e) => getEventTab(e, now) === 'past').length },
    { key: 'draft', label: 'Draft', count: events.filter((e) => getEventTab(e, now) === 'draft').length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-night-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
      </div>

      {/* Search and Tabs */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-night-700 flex flex-col sm:flex-row gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-night-800 rounded-lg p-1">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={`/admin/events?tab=${tab.key}${searchQuery ? `&q=${searchQuery}` : ''}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-night-700 text-white'
                    : 'text-night-400 hover:text-night-200'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-night-500">({tab.count})</span>
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-400" />
            <form>
              <input type="hidden" name="tab" value={activeTab} />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search events..."
                className="w-full pl-9 pr-4 py-2 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </form>
          </div>
        </div>

        {/* Table */}
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Calendar className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No events found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Event Name</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Tickets</th>
                  <th className="text-left py-3 px-4 font-medium">Revenue</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const status = getEventStatus(event)
                  const sold = getTicketsSold(event)
                  const revenue = getRevenue(event)

                  return (
                    <tr key={event.id} className="border-b border-night-800 last:border-0">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="font-medium text-white hover:text-gold-400 transition-colors"
                        >
                          {event.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-night-300">
                        {formatDateTime(event.start_time)}
                      </td>
                      <td className="py-3 px-4 text-night-300">
                        <span className="text-white font-medium">{sold}</span>
                        <span className="text-night-500"> / {event.total_capacity}</span>
                      </td>
                      <td className="py-3 px-4 text-night-300">
                        {formatCurrency(revenue)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
