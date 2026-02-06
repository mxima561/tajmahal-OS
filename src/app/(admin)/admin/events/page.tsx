import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EventWithTicketTypes } from '@/types/database'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { generateUpcomingFridays } from '@/lib/events/generate-fridays'
import { EventsTable } from './events-table'

async function getEvents() {
  // Auto-generate upcoming Fridays (idempotent, non-blocking)
  try {
    await generateUpcomingFridays()
  } catch (e) {
    console.error('Friday generation error:', e)
  }

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
  searchParams: Promise<{ tab?: string; q?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const events = await getEvents()
  const now = new Date()
  const activeTab = resolvedSearchParams.tab || 'all'
  const searchQuery = resolvedSearchParams.q || ''

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

  // Map to serializable rows for the client component
  const eventRows = filteredEvents.map((event) => ({
    id: event.id,
    name: event.name,
    dj_name: event.dj_name ?? null,
    is_auto_generated: event.is_auto_generated ?? false,
    start_time: event.start_time,
    total_capacity: event.total_capacity,
    status: getEventStatus(event),
    ticketsSold: getTicketsSold(event),
    revenue: getRevenue(event),
  }))

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
                className="w-full pl-9 pr-4 py-2 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </form>
          </div>
        </div>

        {/* Table */}
        <EventsTable events={eventRows} />
      </div>
    </div>
  )
}
