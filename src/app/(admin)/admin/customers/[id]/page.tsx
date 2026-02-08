import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'
import { ArrowLeft, User, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getCustomer(id: string) {
  const supabase = await createServerSupabaseClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !customer) {
    return null
  }

  return customer
}

async function getCustomerOrders(customerId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, events(name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customer orders:', error)
    return []
  }

  return orders || []
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)

  if (!customer) {
    notFound()
  }

  const orders = await getCustomerOrders(customer.id)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-sm text-night-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Customer Header */}
      <h1 className="text-2xl font-bold">{customer.name}</h1>

      {/* Customer Info Card */}
      <div className="bg-night-900 border border-night-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-semibold">Customer Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="text-night-400">Name</span>
            <p className="text-white font-medium mt-0.5">{customer.name}</p>
          </div>
          <div>
            <span className="text-night-400">Email</span>
            <p className="text-night-300 mt-0.5">{customer.email}</p>
          </div>
          <div>
            <span className="text-night-400">Phone</span>
            <p className="text-night-300 mt-0.5">{customer.phone || '—'}</p>
          </div>
          <div>
            <span className="text-night-400">Member Since</span>
            <p className="text-night-300 mt-0.5">
              {customer.created_at ? formatDateTime(customer.created_at) : '—'}
            </p>
          </div>
          <div>
            <span className="text-night-400">Total Orders</span>
            <p className="text-white font-medium mt-0.5">{customer.total_orders || 0}</p>
          </div>
          <div>
            <span className="text-night-400">Total Spent</span>
            <p className="text-white font-medium mt-0.5">
              {formatCurrency(customer.total_spent || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-6 pb-4">
          <ShoppingCart className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-semibold">Order History</h2>
          <span className="text-sm text-night-400 ml-1">({orders.length})</span>
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
                  <th className="text-left py-3 px-4 font-medium">Event</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
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
                    <td className="py-3 px-4 text-night-300">
                      {order.events?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {formatCurrency(order.total)}
                    </td>
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
