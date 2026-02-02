import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatRelative } from '@/lib/utils/format'
import { Users, Search } from 'lucide-react'
import Link from 'next/link'

async function getCustomers(searchQuery?: string) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('customers')
    .select('*')
    .order('total_spent', { ascending: false, nullsFirst: false })

  if (searchQuery) {
    query = query.or(
      `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
    )
  }

  const { data: customers, error } = await query

  if (error) {
    console.error('Error fetching customers:', error)
    return []
  }

  return customers || []
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const searchQuery = searchParams.q || ''
  const customers = await getCustomers(searchQuery || undefined)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>

      {/* Search and Table */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-night-700 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-400" />
            <form>
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search customers..."
                className="w-full pl-9 pr-4 py-2 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </form>
          </div>
        </div>

        {/* Table */}
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Users className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 font-medium">Total Orders</th>
                  <th className="text-left py-3 px-4 font-medium">Total Spent</th>
                  <th className="text-left py-3 px-4 font-medium">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-night-800 last:border-0 hover:bg-night-800 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-medium text-white hover:text-gold-400 transition-colors"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-night-300">{customer.email}</td>
                    <td className="py-3 px-4 text-night-300">{customer.phone || '—'}</td>
                    <td className="py-3 px-4 text-night-300">{customer.total_orders || 0}</td>
                    <td className="py-3 px-4 text-night-300">
                      {formatCurrency(customer.total_spent || 0)}
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {customer.last_order_at ? formatRelative(customer.last_order_at) : '—'}
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
