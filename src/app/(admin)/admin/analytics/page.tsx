import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'
import {
  TrendingUp,
  DollarSign,
  Ticket,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react'

async function getAnalyticsData() {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Total revenue from paid orders (with safety limit)
  const { data: paidOrders } = await supabase
    .from('orders')
    .select('id, total, event_id, payment_provider, promoter_id, created_at')
    .eq('payment_status', 'paid')
    .limit(10000)

  const orders = paidOrders || []
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)

  // 2. Total orders count (all statuses)
  const { count: totalOrdersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  // 3. Total tickets sold
  const { data: ticketTypesData } = await supabase
    .from('ticket_types')
    .select('quantity_sold')

  const totalTicketsSold = ticketTypesData?.reduce(
    (sum, tt) => sum + (tt.quantity_sold || 0),
    0
  ) ?? 0

  // 4. Total events count
  const { count: totalEventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })

  // 5. Top 5 events by revenue
  const eventRevenueMap: Record<string, { revenue: number; orderCount: number }> = {}
  for (const o of orders) {
    if (!eventRevenueMap[o.event_id]) {
      eventRevenueMap[o.event_id] = { revenue: 0, orderCount: 0 }
    }
    eventRevenueMap[o.event_id].revenue += o.total || 0
    eventRevenueMap[o.event_id].orderCount++
  }

  const eventIds = Object.keys(eventRevenueMap)
  let topEvents: { name: string; revenue: number; orderCount: number; ticketsSold: number }[] = []

  if (eventIds.length > 0) {
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name')
      .in('id', eventIds)

    const { data: ticketsByEvent } = await supabase
      .from('ticket_types')
      .select('event_id, quantity_sold')
      .in('event_id', eventIds)

    const eventNames: Record<string, string> = {}
    for (const e of eventsData || []) {
      eventNames[e.id] = e.name
    }

    const eventTicketsSold: Record<string, number> = {}
    for (const tt of ticketsByEvent || []) {
      eventTicketsSold[tt.event_id] = (eventTicketsSold[tt.event_id] || 0) + (tt.quantity_sold || 0)
    }

    topEvents = Object.entries(eventRevenueMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id, data]) => ({
        name: eventNames[id] || 'Unknown Event',
        revenue: data.revenue,
        orderCount: data.orderCount,
        ticketsSold: eventTicketsSold[id] || 0,
      }))
  }

  // 6. Revenue by payment method
  const paymentMethodMap: Record<string, { count: number; revenue: number }> = {}
  for (const o of orders) {
    const method = o.payment_provider || 'unknown'
    if (!paymentMethodMap[method]) {
      paymentMethodMap[method] = { count: 0, revenue: 0 }
    }
    paymentMethodMap[method].count++
    paymentMethodMap[method].revenue += o.total || 0
  }

  const paymentMethods = Object.entries(paymentMethodMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([method, data]) => ({
      method,
      count: data.count,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))

  // 7. Orders by day for last 30 days
  const dailyRevenue: { date: string; label: string; revenue: number }[] = []
  const recentOrders = orders.filter(o => o.created_at && o.created_at >= thirtyDaysAgo)

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    const dayRevenue = recentOrders
      .filter(o => o.created_at?.startsWith(dateStr))
      .reduce((sum, o) => sum + (o.total || 0), 0)
    dailyRevenue.push({ date: dateStr, label, revenue: dayRevenue })
  }

  const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1)

  // 8. Top promoters by attributed revenue
  const promoterRevenueMap: Record<string, { revenue: number; orderCount: number }> = {}
  for (const o of orders) {
    if (o.promoter_id) {
      if (!promoterRevenueMap[o.promoter_id]) {
        promoterRevenueMap[o.promoter_id] = { revenue: 0, orderCount: 0 }
      }
      promoterRevenueMap[o.promoter_id].revenue += o.total || 0
      promoterRevenueMap[o.promoter_id].orderCount++
    }
  }

  const promoterIds = Object.keys(promoterRevenueMap)
  let topPromoters: { name: string; revenue: number; orderCount: number; commissionRate: number }[] = []

  if (promoterIds.length > 0) {
    const { data: promotersData } = await supabase
      .from('promoters')
      .select('id, name, commission_rate')
      .in('id', promoterIds)

    const promoterInfo: Record<string, { name: string; commissionRate: number }> = {}
    for (const p of promotersData || []) {
      promoterInfo[p.id] = { name: p.name, commissionRate: p.commission_rate || 0 }
    }

    topPromoters = Object.entries(promoterRevenueMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id, data]) => ({
        name: promoterInfo[id]?.name || 'Unknown',
        revenue: data.revenue,
        orderCount: data.orderCount,
        commissionRate: promoterInfo[id]?.commissionRate || 0,
      }))
  }

  return {
    totalRevenue,
    totalOrders: totalOrdersCount ?? 0,
    totalTicketsSold,
    totalEvents: totalEventsCount ?? 0,
    topEvents,
    paymentMethods,
    dailyRevenue,
    maxDailyRevenue,
    topPromoters,
  }
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-night-400 text-sm mt-1">Performance overview</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Total Orders"
          value={data.totalOrders.toLocaleString()}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Tickets Sold"
          value={data.totalTicketsSold.toLocaleString()}
          icon={<Ticket className="w-5 h-5" />}
        />
        <StatCard
          title="Events"
          value={data.totalEvents.toLocaleString()}
          icon={<Calendar className="w-5 h-5" />}
        />
      </div>

      {/* Revenue by Day */}
      <div className="bg-night-900 border border-night-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-semibold text-white">Revenue by Day</h2>
          <span className="text-night-400 text-sm ml-auto">Last 30 days</span>
        </div>
        {data.dailyRevenue.every(d => d.revenue === 0) ? (
          <p className="text-night-500 text-sm text-center py-12">No revenue data for the last 30 days</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-48 min-w-[600px] pb-8 relative">
              {data.dailyRevenue.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-night-800 border border-night-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {formatCurrency(d.revenue)}
                  </div>
                  {/* Bar */}
                  <div
                    className="w-full bg-gold-500 rounded-t-sm hover:bg-gold-400 transition-colors cursor-default"
                    style={{
                      height: `${Math.max((d.revenue / data.maxDailyRevenue) * 100, d.revenue > 0 ? 3 : 0)}%`,
                      minHeight: d.revenue > 0 ? '4px' : '0px',
                    }}
                  />
                  {/* Date label */}
                  <span className="absolute -bottom-7 text-[9px] text-night-500 -rotate-45 origin-top-left whitespace-nowrap">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Events Table */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-gold-500" />
            <h2 className="font-semibold text-white">Top Events</h2>
          </div>
          {data.topEvents.length === 0 ? (
            <p className="text-night-500 text-sm">No event revenue data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-night-700">
                    <th className="text-left text-night-400 font-medium pb-3 pr-4">Event</th>
                    <th className="text-right text-night-400 font-medium pb-3 px-3">Orders</th>
                    <th className="text-right text-night-400 font-medium pb-3 px-3">Revenue</th>
                    <th className="text-right text-night-400 font-medium pb-3 pl-3">Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topEvents.map((event, i) => (
                    <tr key={i} className="border-b border-night-800 last:border-0">
                      <td className="py-3 pr-4 text-white truncate max-w-[180px]">{event.name}</td>
                      <td className="py-3 px-3 text-right text-night-300">{event.orderCount}</td>
                      <td className="py-3 px-3 text-right text-gold-400 font-medium">{formatCurrency(event.revenue)}</td>
                      <td className="py-3 pl-3 text-right text-night-300">{event.ticketsSold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="w-4 h-4 text-gold-500" />
            <h2 className="font-semibold text-white">Payment Methods</h2>
          </div>
          {data.paymentMethods.length === 0 ? (
            <p className="text-night-500 text-sm">No payment data yet</p>
          ) : (
            <div className="space-y-4">
              {data.paymentMethods.map((pm) => (
                <div key={pm.method}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white text-sm capitalize font-medium">
                        {pm.method === 'mock' ? 'Mock Provider' : pm.method === 'cybersource' ? 'CyberSource' : pm.method}
                      </span>
                      <span className="text-night-500 text-xs ml-2">{pm.count} orders</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white text-sm font-medium">{formatCurrency(pm.revenue)}</span>
                      <span className="text-night-400 text-xs ml-2">({pm.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-night-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold-500 rounded-full"
                      style={{ width: `${pm.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Promoters - only shown if there are any */}
      {data.topPromoters.length > 0 && (
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-gold-500" />
            <h2 className="font-semibold text-white">Top Promoters</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700">
                  <th className="text-left text-night-400 font-medium pb-3 pr-4">Promoter</th>
                  <th className="text-right text-night-400 font-medium pb-3 px-3">Orders</th>
                  <th className="text-right text-night-400 font-medium pb-3 px-3">Revenue</th>
                  <th className="text-right text-night-400 font-medium pb-3 pl-3">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.topPromoters.map((promoter, i) => (
                  <tr key={i} className="border-b border-night-800 last:border-0">
                    <td className="py-3 pr-4 text-white">{promoter.name}</td>
                    <td className="py-3 px-3 text-right text-night-300">{promoter.orderCount}</td>
                    <td className="py-3 px-3 text-right text-gold-400 font-medium">{formatCurrency(promoter.revenue)}</td>
                    <td className="py-3 pl-3 text-right text-night-300">{promoter.commissionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-night-900 border border-night-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-night-400">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold-500/10 text-gold-500">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
