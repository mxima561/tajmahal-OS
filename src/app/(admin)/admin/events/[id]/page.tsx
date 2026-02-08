import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime, formatEventDate, formatEventTime } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'
import { EventWithTicketTypes } from '@/types/database'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Edit, ShoppingCart, Ticket, Users, ScanLine, UserCheck } from 'lucide-react'

async function getEvent(eventId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*), venues(name)')
    .eq('id', eventId)
    .single()

  if (error || !data) return null
  return data as EventWithTicketTypes & { venues?: { name: string } }
}

async function getEventOrders(eventId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return orders || []
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, orders] = await Promise.all([
    getEvent(id),
    getEventOrders(id),
  ])

  if (!event) {
    notFound()
  }

  const ticketsSold = event.ticket_types?.reduce(
    (sum, tt) => sum + (tt.quantity_sold || 0),
    0
  ) || 0

  const revenue = event.ticket_types?.reduce(
    (sum, tt) => sum + (tt.quantity_sold || 0) * tt.price,
    0
  ) || 0

  const isCancelled = !!event.cancelled_at

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/events"
            className="p-2 rounded-lg bg-night-800 hover:bg-night-700 border border-night-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{event.name}</h1>
              {event.dj_name && (
                <span className="text-gold-400 text-lg font-medium">ft. {event.dj_name}</span>
              )}
              {event.is_auto_generated && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-night-700 text-night-400 font-medium uppercase tracking-wide">
                  Auto
                </span>
              )}
              <EventStatusBadge status={isCancelled ? 'cancelled' : event.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-night-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatEventDate(event.start_time)}
              </span>
              {event.doors_open && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Doors {formatEventTime(event.doors_open)}
                </span>
              )}
              {event.venues?.name && (
                <span>{event.venues.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/events/${id}/check-ins`}
            className="inline-flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <ScanLine className="w-4 h-4" />
            Live Check-ins
          </Link>
          <Link
            href={`/admin/events/${id}/guest-list`}
            className="inline-flex items-center gap-2 bg-night-800 hover:bg-night-700 border border-night-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <UserCheck className="w-4 h-4" />
            Guest List
          </Link>
          <Link
            href={`/admin/events/${id}/edit`}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-night-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Edit className="w-4 h-4" />
            Edit Event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Ticket className="w-5 h-5 text-gold-500" />}
          label="Tickets Sold"
          value={`${ticketsSold} / ${event.total_capacity}`}
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-gold-500" />}
          label="Total Revenue"
          value={formatCurrency(revenue)}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-gold-500" />}
          label="Orders"
          value={String(orders.length)}
        />
        <StatCard
          icon={<Ticket className="w-5 h-5 text-gold-500" />}
          label="Ticket Types"
          value={String(event.ticket_types?.length || 0)}
        />
      </div>

      {/* Ticket Types Breakdown */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-night-700">
          <h2 className="font-semibold">Ticket Types</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-night-700 text-night-400">
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-left py-3 px-4 font-medium">Price</th>
                <th className="text-left py-3 px-4 font-medium">Sold</th>
                <th className="text-left py-3 px-4 font-medium">Available</th>
                <th className="text-left py-3 px-4 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(event.ticket_types || [])
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((tt) => (
                <tr key={tt.id} className="border-b border-night-800 last:border-0">
                  <td className="py-3 px-4 font-medium text-white">{tt.name}</td>
                  <td className="py-3 px-4 text-night-300">{formatCurrency(tt.price)}</td>
                  <td className="py-3 px-4 text-night-300">
                    <span className="text-white font-medium">{tt.quantity_sold || 0}</span>
                    <span className="text-night-500"> / {tt.quantity_total}</span>
                  </td>
                  <td className="py-3 px-4 text-night-300">
                    {tt.quantity_total - (tt.quantity_sold || 0)}
                  </td>
                  <td className="py-3 px-4 text-night-300">
                    {formatCurrency((tt.quantity_sold || 0) * tt.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-night-700 flex items-center justify-between">
          <h2 className="font-semibold">Orders ({orders.length})</h2>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <ShoppingCart className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Order Number</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                  <th className="text-left py-3 px-4 font-medium">Payment</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
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
                    <td className="py-3 px-4 text-night-300">
                      <div>{order.customer_name}</div>
                      <div className="text-xs text-night-500">{order.customer_email}</div>
                    </td>
                    <td className="py-3 px-4 text-night-300">{formatCurrency(order.total)}</td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {order.created_at ? formatDateTime(order.created_at) : '—'}
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

function EventStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-yellow-500/10 text-yellow-400',
    published: 'bg-green-500/10 text-green-400',
    cancelled: 'bg-red-500/10 text-red-400',
  }

  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${styles[status] || 'bg-night-700 text-night-300'}`}>
      {status}
    </span>
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
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${styles[status] || 'bg-night-700 text-night-300'}`}>
      {status}
    </span>
  )
}
