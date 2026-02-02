import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { ShoppingCart, Search } from 'lucide-react'
import Link from 'next/link'
import { EventFilter } from './event-filter'

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
    query = query.or(
      `order_number.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%,customer_email.ilike.%${filters.q}%`
    )
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
  searchParams: { event?: string; status?: string; q?: string }
}) {
  const [orders, events] = await Promise.all([getOrders(searchParams), getEvents()])
  const activeStatus = searchParams.status || ''
  const activeEvent = searchParams.event || ''
  const searchQuery = searchParams.q || ''

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
                className="w-full pl-9 pr-4 py-2 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </form>
          </div>
        </div>

        {/* Table */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <ShoppingCart className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Order Number</th>
                  <th className="text-left py-3 px-4 font-medium">Customer Name</th>
                  <th className="text-left py-3 px-4 font-medium">Event</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                  <th className="text-left py-3 px-4 font-medium">Payment Status</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {orders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-b border-night-800 last:border-0 hover:bg-night-800 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-white hover:text-gold-400 transition-colors"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-night-300">{order.customer_name}</td>
                    <td className="py-3 px-4 text-night-300">{order.events?.name || '—'}</td>
                    <td className="py-3 px-4 text-night-300">{formatCurrency(order.total)}</td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {formatDateTime(order.created_at)}
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

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/10 text-green-400',
    pending: 'bg-yellow-500/10 text-yellow-400',
    failed: 'bg-red-500/10 text-red-400',
    refunded: 'bg-blue-500/10 text-blue-400',
  }

  return (
    <span
      className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
        styles[status] || 'bg-night-700 text-night-300'
      }`}
    >
      {status}
    </span>
  )
}
