'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'

interface OrderRow {
  id: string
  order_number: string
  customer_name: string
  event_name: string
  total: number
  payment_status: string
  created_at: string | null
}

export function OrdersTable({
  orders,
  currentPage,
  totalPages,
  totalCount,
  prevPageUrl,
  nextPageUrl,
}: {
  orders: OrderRow[]
  currentPage: number
  totalPages: number
  totalCount: number
  prevPageUrl: string
  nextPageUrl: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const allSelected = orders.length > 0 && selected.size === orders.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(orders.map((o) => o.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleDelete() {
    if (selected.size === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.size} order${selected.size > 1 ? 's' : ''}? This will also delete associated tickets and cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selected) }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to delete orders')
        return
      }

      setSelected(new Set())
      router.refresh()
    } catch {
      setError('Failed to delete orders')
    } finally {
      setDeleting(false)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-night-400">
        <ShoppingCart className="w-10 h-10 mb-3 text-night-600" />
        <p className="text-sm">No orders found</p>
      </div>
    )
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20">
          <span className="text-sm text-red-400">
            {selected.size} order{selected.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-night-700 text-night-400">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-night-600 bg-night-800 text-gold-500 focus:ring-gold-500/50"
                />
              </th>
              <th className="text-left py-3 px-4 font-medium">Order Number</th>
              <th className="text-left py-3 px-4 font-medium">Customer Name</th>
              <th className="text-left py-3 px-4 font-medium">Event</th>
              <th className="text-left py-3 px-4 font-medium">Total</th>
              <th className="text-left py-3 px-4 font-medium">Payment Status</th>
              <th className="text-left py-3 px-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className={`border-b border-night-800 last:border-0 hover:bg-night-800 transition-colors ${
                  selected.has(order.id) ? 'bg-night-800/50' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleOne(order.id)}
                    className="rounded border-night-600 bg-night-800 text-gold-500 focus:ring-gold-500/50"
                  />
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-white hover:text-gold-400 transition-colors"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="py-3 px-4 text-night-300">{order.customer_name}</td>
                <td className="py-3 px-4 text-night-300">{order.event_name}</td>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-night-700">
          <span className="text-sm text-night-400">
            Showing {(currentPage - 1) * 50 + 1}–{Math.min(currentPage * 50, totalCount)} of {totalCount.toLocaleString()} orders
          </span>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={prevPageUrl}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-night-800 text-night-300 hover:text-white transition-colors"
              >
                Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-night-800 text-night-600 cursor-not-allowed">
                Previous
              </span>
            )}
            <span className="text-sm text-night-300">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link
                href={nextPageUrl}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-night-800 text-night-300 hover:text-white transition-colors"
              >
                Next
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-night-800 text-night-600 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>
      )}
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
