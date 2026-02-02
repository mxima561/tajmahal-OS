import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { ArrowLeft, User, Calendar, Package, Ticket } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CancelOrderButton } from './cancel-order-button'

async function getOrder(id: string) {
  const supabase = await createServerSupabaseClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      '*, events(name, start_time), order_items(*, ticket_types(name)), tickets(id, display_code, status, checked_in_at, qr_code), customers(name, email, phone, total_orders, total_spent)'
    )
    .eq('id', id)
    .single()

  if (error || !order) {
    return null
  }

  return order
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const order = await getOrder(params.id)

  if (!order) {
    notFound()
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const event = order.events as any
  const customer = order.customers as any
  const orderItems = (order.order_items || []) as any[]
  const tickets = (order.tickets || []) as any[]
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-sm text-night-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment_status} />
          </div>
          <p className="text-sm text-night-400 mt-1">
            Placed {formatDateTime(order.created_at!)}
          </p>
        </div>

        {order.status !== 'cancelled' && (
          <CancelOrderButton orderId={order.id} />
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold">Customer</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-night-400">Name</span>
              <p className="text-white font-medium">
                <Link
                  href={`/admin/customers/${order.customer_id}`}
                  className="hover:text-gold-400 transition-colors"
                >
                  {customer?.name || order.customer_name}
                </Link>
              </p>
            </div>
            <div>
              <span className="text-night-400">Email</span>
              <p className="text-night-300">{customer?.email || order.customer_email}</p>
            </div>
            {(customer?.phone || order.customer_phone) && (
              <div>
                <span className="text-night-400">Phone</span>
                <p className="text-night-300">{customer?.phone || order.customer_phone}</p>
              </div>
            )}
            {customer && (
              <>
                <div>
                  <span className="text-night-400">Total Orders</span>
                  <p className="text-night-300">{customer.total_orders || 0}</p>
                </div>
                <div>
                  <span className="text-night-400">Total Spent</span>
                  <p className="text-night-300">{formatCurrency(customer.total_spent || 0)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Event Info */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gold-500" />
            <h2 className="text-lg font-semibold">Event</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-night-400">Event Name</span>
              <p className="text-white font-medium">{event?.name || '—'}</p>
            </div>
            {event?.start_time && (
              <div>
                <span className="text-night-400">Date</span>
                <p className="text-night-300">{formatDateTime(event.start_time)}</p>
              </div>
            )}
            <div>
              <span className="text-night-400">Subtotal</span>
              <p className="text-night-300">{formatCurrency(order.subtotal)}</p>
            </div>
            <div>
              <span className="text-night-400">Total</span>
              <p className="text-white font-bold text-lg">{formatCurrency(order.total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-6 pb-4">
          <Package className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-semibold">Order Items</h2>
        </div>
        {orderItems.length === 0 ? (
          <div className="px-6 pb-6 text-night-400 text-sm">No order items</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Ticket Type</th>
                  <th className="text-left py-3 px-4 font-medium">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium">Unit Price</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {orderItems.map((item: any) => (
                  <tr key={item.id} className="border-b border-night-800 last:border-0">
                    <td className="py-3 px-4 text-white font-medium">
                      {item.ticket_types?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-night-300">{item.quantity}</td>
                    <td className="py-3 px-4 text-night-300">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tickets */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-6 pb-4">
          <Ticket className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-semibold">Tickets</h2>
          <span className="text-sm text-night-400 ml-1">({tickets.length})</span>
        </div>
        {tickets.length === 0 ? (
          <div className="px-6 pb-6 text-night-400 text-sm">No tickets generated</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Display Code</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="border-b border-night-800 last:border-0">
                    <td className="py-3 px-4 text-white font-mono font-medium">
                      {ticket.display_code}
                    </td>
                    <td className="py-3 px-4">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {ticket.checked_in_at
                        ? formatDateTime(ticket.checked_in_at)
                        : '—'}
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

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-500/10 text-green-400',
    pending: 'bg-yellow-500/10 text-yellow-400',
    cancelled: 'bg-red-500/10 text-red-400',
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

function TicketStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    valid: 'bg-green-500/10 text-green-400',
    used: 'bg-blue-500/10 text-blue-400',
    cancelled: 'bg-red-500/10 text-red-400',
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
