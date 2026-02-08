import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatEventDate, formatRelative } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'
import {
  DollarSign,
  ShoppingCart,
  Ticket,
  Calendar,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const supabase = await createServerSupabaseClient()
  const now = new Date().toISOString()

  // Total Revenue: sum of paid orders (with safety limit)
  const { data: paidOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('payment_status', 'paid')
    .limit(10000)

  const totalRevenue = paidOrders?.reduce((sum, o) => sum + (o.total || 0), 0) ?? 0

  // Total Orders: count of all orders
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  // Tickets Sold: sum of quantity_sold across all ticket types
  const { data: ticketTypes } = await supabase
    .from('ticket_types')
    .select('quantity_sold')

  const ticketsSold = ticketTypes?.reduce((sum, tt) => sum + (tt.quantity_sold || 0), 0) ?? 0

  // Active Events: published, future, not cancelled
  const { count: activeEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .gt('start_time', now)
    .is('cancelled_at', null)

  // Upcoming Events: next 5 published events with ticket types
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('*, ticket_types(*), orders(total)')
    .eq('status', 'published')
    .gt('start_time', now)
    .is('cancelled_at', null)
    .order('start_time', { ascending: true })
    .limit(5)

  // Recent Orders: last 5 orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    totalRevenue,
    totalOrders: totalOrders ?? 0,
    ticketsSold,
    activeEvents: activeEvents ?? 0,
    upcomingEvents: upcomingEvents ?? [],
    recentOrders: recentOrders ?? [],
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="min-h-screen bg-night-950 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-2 text-night-400 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>Overview</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="gold"
        />
        <StatCard
          title="Total Orders"
          value={data.totalOrders.toLocaleString()}
          icon={<ShoppingCart className="w-5 h-5" />}
          variant="default"
        />
        <StatCard
          title="Tickets Sold"
          value={data.ticketsSold.toLocaleString()}
          icon={<Ticket className="w-5 h-5" />}
          variant="default"
        />
        <StatCard
          title="Active Events"
          value={data.activeEvents.toLocaleString()}
          icon={<Calendar className="w-5 h-5" />}
          variant="default"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Upcoming Events</h2>
            <Link
              href="/admin/events"
              className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-night-400 text-sm">No upcoming events</p>
          ) : (
            <div className="space-y-4">
              {data.upcomingEvents.map((event) => {
                const totalCapacity = event.total_capacity ?? 0
                const totalSold =
                  event.ticket_types?.reduce(
                    (sum: number, tt: { quantity_sold: number | null }) =>
                      sum + (tt.quantity_sold || 0),
                    0
                  ) ?? 0
                const eventRevenue =
                  event.orders?.reduce(
                    (sum: number, o: { total: number | null }) => sum + (o.total || 0),
                    0
                  ) ?? 0
                const percentage =
                  totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0

                return (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}/edit`}
                    className="block group -mx-2 px-2 py-2 rounded-lg hover:bg-night-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-white truncate group-hover:text-gold-400 transition-colors">
                        {event.name}
                      </p>
                      <span className="text-xs text-night-300 ml-2 shrink-0">
                        {formatCurrency(eventRevenue)}
                      </span>
                    </div>
                    <p className="text-xs text-night-400 mb-2">
                      {formatEventDate(event.start_time)}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-1.5 bg-night-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold-500 rounded-full transition-all"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-night-300 shrink-0">
                        {totalSold}/{totalCapacity} sold
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-night-400 text-sm">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between py-2 hover:bg-night-800 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {order.customer_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-night-400">
                        {order.order_number}
                      </span>
                      <span className="text-xs text-night-500">
                        {formatRelative(order.created_at || '')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(order.total)}
                    </p>
                    <PaymentStatusBadge status={order.payment_status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: string
  icon: React.ReactNode
  variant?: 'gold' | 'default'
}) {
  const isGold = variant === 'gold'

  return (
    <div
      className={`rounded-xl p-5 border ${
        isGold
          ? 'bg-gold-500/5 border-gold-500/20'
          : 'bg-night-900 border-night-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-night-300">{title}</span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isGold
              ? 'bg-gold-500/20 text-gold-400'
              : 'bg-night-700 text-night-300'
          }`}
        >
          {icon}
        </div>
      </div>
      <p
        className={`text-2xl font-bold ${
          isGold ? 'text-gold-400' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/10 text-green-400',
    failed: 'bg-red-500/10 text-red-400',
    refunded: 'bg-night-500/10 text-night-300',
    pending: 'bg-yellow-500/10 text-yellow-400',
  }

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        styles[status] ?? 'bg-night-500/10 text-night-400'
      }`}
    >
      {status}
    </span>
  )
}
