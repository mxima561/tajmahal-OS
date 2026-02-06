import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { EventFilter } from './event-filter'
import { OrdersTable } from './orders-table'

async function getOrders(filters: { event?: string; status?: string; q?: string }) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('orders')
    .select('*, events(name)')
    .order('created_at', { ascending: false })

  if (filters.event) {
    query = query.eq('event_id', filters.event)
  }

  if (filters.status) {
    query = query.eq('payment_status', filters.status)
  }

  if (filters.q) {
    // Sanitize search input to prevent PostgREST filter injection
    const sanitized = filters.q.replace(/[,.*()]/g, '')
    if (sanitized) {
      query = query.or(
        `order_number.ilike.%${sanitized}%,customer_name.ilike.%${sanitized}%,customer_email.ilike.%${sanitized}%`
      )
    }
  }

  const { data: orders, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return orders || []
}

async function getEvents() {
  const supabase = await createServerSupabaseClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .order('start_time', { ascending: false })

  return events || []
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; status?: string; q?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const [orders, events] = await Promise.all([getOrders(resolvedSearchParams), getEvents()])
  const activeStatus = resolvedSearchParams.status || ''
  const activeEvent = resolvedSearchParams.event || ''
  const searchQuery = resolvedSearchParams.q || ''

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const merged = { event: activeEvent, status: activeStatus, q: searchQuery, ...overrides }
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const qs = params.toString()
    return `/admin/orders${qs ? `?${qs}` : ''}`
  }

  const statusOptions = [
    { key: '', label: 'All Statuses' },
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
    { key: 'failed', label: 'Failed' },
    { key: 'refunded', label: 'Refunded' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderRows = orders.map((order: any) => ({
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    event_name: order.events?.name || '—',
    total: order.total,
    payment_status: order.payment_status,
    created_at: order.created_at,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
      </div>

      {/* Filters and Table */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-night-700 flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex gap-1 bg-night-800 rounded-lg p-1">
            {statusOptions.map((opt) => (
              <Link
                key={opt.key}
                href={buildUrl({ status: opt.key })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeStatus === opt.key
                    ? 'bg-night-700 text-white'
                    : 'text-night-400 hover:text-night-200'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {/* Event Filter */}
          <EventFilter events={events} activeEvent={activeEvent} activeStatus={activeStatus} searchQuery={searchQuery} />

          {/* Search */}
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-400" />
            <form>
              <input type="hidden" name="status" value={activeStatus} />
              <input type="hidden" name="event" value={activeEvent} />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search orders..."
                className="w-full pl-9 pr-4 py-2 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </form>
          </div>
        </div>

        {/* Table */}
        <OrdersTable orders={orderRows} />
      </div>
    </div>
  )
}
