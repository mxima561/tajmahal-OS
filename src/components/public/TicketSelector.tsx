'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, Minus, Plus, AlertTriangle, ShoppingCart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import type { TicketType } from '@/types/database'

interface TicketSelectorProps {
  ticketTypes: TicketType[]
  eventId: string
}

export default function TicketSelector({ ticketTypes, eventId }: TicketSelectorProps) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    ticketTypes.forEach((tt) => {
      initial[tt.id] = 0
    })
    return initial
  })

  const sorted = useMemo(
    () => [...ticketTypes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [ticketTypes]
  )

  const totalAmount = useMemo(() => {
    return sorted.reduce((sum, tt) => sum + (quantities[tt.id] ?? 0) * tt.price, 0)
  }, [sorted, quantities])

  const totalQty = useMemo(() => {
    return Object.values(quantities).reduce((sum, q) => sum + q, 0)
  }, [quantities])

  function isSoldOut(tt: TicketType) {
    return (tt.quantity_sold ?? 0) >= tt.quantity_total
  }

  function remaining(tt: TicketType) {
    return tt.quantity_total - (tt.quantity_sold ?? 0)
  }

  function isLowStock(tt: TicketType) {
    const left = remaining(tt)
    return left > 0 && left < tt.quantity_total * 0.2
  }

  function maxSelectable(tt: TicketType) {
    const left = remaining(tt)
    const maxPerOrder = tt.max_per_order ?? 10
    return Math.min(left, maxPerOrder)
  }

  function updateQuantity(id: string, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: value }))
  }

  function handleBuyTickets() {
    const items = sorted
      .filter((tt) => (quantities[tt.id] ?? 0) > 0)
      .map((tt) => ({
        ticketTypeId: tt.id,
        quantity: quantities[tt.id],
        name: tt.name,
        price: tt.price,
      }))

    const encoded = encodeURIComponent(JSON.stringify(items))
    router.push(`/checkout?eventId=${eventId}&items=${encoded}`)
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-night-900 border border-night-700/50 rounded-xl p-8 text-center">
        <Ticket className="w-10 h-10 text-night-500 mx-auto mb-3" />
        <p className="text-night-400">No tickets available for this event yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map((tt) => {
        const soldOut = isSoldOut(tt)
        const lowStock = isLowStock(tt)
        const max = maxSelectable(tt)
        const qty = quantities[tt.id] ?? 0

        return (
          <div
            key={tt.id}
            className={`bg-night-900 border rounded-xl p-5 sm:p-6 transition-colors duration-300 ${
              soldOut
                ? 'border-night-800 opacity-60'
                : qty > 0
                  ? 'border-gold-500/40'
                  : 'border-night-700/50 hover:border-night-600/50'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              {/* Ticket info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-white truncate">{tt.name}</h3>
                  {soldOut && (
                    <span className="shrink-0 text-[10px] font-bold tracking-widest uppercase bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full">
                      Sold out
                    </span>
                  )}
                  {lowStock && !soldOut && (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase bg-amber-500/15 text-amber-400 px-2.5 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Only {remaining(tt)} left
                    </span>
                  )}
                </div>
                {tt.description && (
                  <p className="text-night-400 text-sm mt-1 leading-relaxed">{tt.description}</p>
                )}
                <p className="text-gold-400 font-semibold mt-2">
                  {tt.price === 0 ? 'Free' : formatCurrency(tt.price)}
                </p>
              </div>

              {/* Quantity selector */}
              {!soldOut && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(tt.id, Math.max(0, qty - 1))}
                    disabled={qty === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-night-700 text-night-300 hover:border-gold-500/50 hover:text-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Decrease ${tt.name} quantity`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-white font-semibold tabular-nums text-lg">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(tt.id, Math.min(max, qty + 1))}
                    disabled={qty >= max}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-night-700 text-night-300 hover:border-gold-500/50 hover:text-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Increase ${tt.name} quantity`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Order summary and CTA */}
      <div className="bg-night-900 border border-night-700/50 rounded-xl p-5 sm:p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-night-300 text-sm">
            {totalQty === 0
              ? 'Select tickets above'
              : `${totalQty} ticket${totalQty !== 1 ? 's' : ''} selected`}
          </span>
          <span className="text-white text-xl font-bold">
            {formatCurrency(totalAmount)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleBuyTickets}
          disabled={totalQty === 0}
          className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-night-950 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gold-500"
        >
          <ShoppingCart className="w-5 h-5" />
          Buy Tickets
        </button>
      </div>
    </div>
  )
}
