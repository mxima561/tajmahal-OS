'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  DollarSign,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils/format'

type PromoCode = {
  id: string
  code: string
  event_id: string | null
  promoter_id: string | null
  discount_type: string
  discount_amount: number
  max_uses: number | null
  current_uses: number | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean | null
  created_at: string | null
  promoters?: { id: string; name: string } | null
}

type SimpleEvent = { id: string; name: string }
type SimplePromoter = { id: string; name: string }

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [events, setEvents] = useState<SimpleEvent[]>([])
  const [promoters, setPromoters] = useState<SimplePromoter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formCode, setFormCode] = useState('')
  const [formEventId, setFormEventId] = useState<string>('')
  const [formPromoterId, setFormPromoterId] = useState<string>('')
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [formAmount, setFormAmount] = useState(10)
  const [formMaxUses, setFormMaxUses] = useState<string>('')
  const [formValidFrom, setFormValidFrom] = useState('')
  const [formValidUntil, setFormValidUntil] = useState('')

  async function fetchCodes() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo-codes')
      if (res.ok) {
        const data = await res.json()
        setCodes(data.promoCodes || [])
      } else {
        toast.error('Failed to load promo codes')
      }
    } catch {
      toast.error('Failed to load promo codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCodes()

    // Fetch events from Supabase client
    const supabase = createClient()
    supabase
      .from('events')
      .select('id, name')
      .order('start_time', { ascending: false })
      .then(({ data }) => {
        setEvents(data || [])
      })

    // Fetch promoters from API
    fetch('/api/admin/promoters')
      .then(r => r.json())
      .then(d => {
        setPromoters(
          (d.promoters || []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }))
        )
      })
      .catch(() => {})
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formCode.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode.trim(),
          eventId: formEventId || null,
          promoterId: formPromoterId || null,
          discountType: formDiscountType,
          discountAmount: formAmount,
          maxUses: formMaxUses ? parseInt(formMaxUses) : null,
          validFrom: formValidFrom || null,
          validUntil: formValidUntil || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to create promo code')
        return
      }
      toast.success('Promo code created')
      setFormCode('')
      setFormEventId('')
      setFormPromoterId('')
      setFormDiscountType('percentage')
      setFormAmount(10)
      setFormMaxUses('')
      setFormValidFrom('')
      setFormValidUntil('')
      setShowForm(false)
      fetchCodes()
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !current }),
      })
      if (!res.ok) {
        toast.error('Failed to update status')
        return
      }
      toast.success(`Promo code ${current ? 'deactivated' : 'activated'}`)
      fetchCodes()
    } catch {
      toast.error('Network error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this promo code?')) return
    try {
      const res = await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete promo code')
        return
      }
      toast.success('Promo code deleted')
      fetchCodes()
    } catch {
      toast.error('Network error')
    }
  }

  function getEventName(eventId: string | null) {
    if (!eventId) return 'All Events'
    return events.find(e => e.id === eventId)?.name || 'Unknown'
  }

  function getPromoterName(promoterId: string | null) {
    if (!promoterId) return 'None'
    return promoters.find(p => p.id === promoterId)?.name || 'Unknown'
  }

  function formatDiscount(code: PromoCode) {
    if (code.discount_type === 'percentage') {
      return `${code.discount_amount}%`
    }
    return formatCurrency(code.discount_amount)
  }

  function formatUses(code: PromoCode) {
    const current = code.current_uses ?? 0
    const max = code.max_uses
    return max ? `${current} / ${max}` : `${current} / \u221E`
  }

  function formatValidPeriod(code: PromoCode) {
    if (!code.valid_from && !code.valid_until) return 'Always'
    const fmt = (d: string) => {
      const date = new Date(d)
      return date.toLocaleDateString('en-EG', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    if (code.valid_from && code.valid_until) {
      return `${fmt(code.valid_from)} - ${fmt(code.valid_until)}`
    }
    if (code.valid_from) return `From ${fmt(code.valid_from)}`
    return `Until ${fmt(code.valid_until!)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Promo Codes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-night-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Code
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-night-900 border border-night-700 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">New Promo Code</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Code *</label>
              <input
                type="text"
                value={formCode}
                onChange={e => setFormCode(e.target.value)}
                required
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="TAJVIP20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Event</label>
              <select
                value={formEventId}
                onChange={e => setFormEventId(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="">All Events</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Promoter</label>
              <select
                value={formPromoterId}
                onChange={e => setFormPromoterId(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="">None</option>
                {promoters.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Discount Type</label>
              <div className="flex items-center gap-4 mt-1.5">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    checked={formDiscountType === 'percentage'}
                    onChange={() => setFormDiscountType('percentage')}
                    className="accent-gold-500"
                  />
                  <Percent className="w-3.5 h-3.5 text-night-300" />
                  <span className="text-sm text-night-300">Percentage</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    checked={formDiscountType === 'fixed'}
                    onChange={() => setFormDiscountType('fixed')}
                    className="accent-gold-500"
                  />
                  <DollarSign className="w-3.5 h-3.5 text-night-300" />
                  <span className="text-sm text-night-300">Fixed (EGP)</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">
                Discount Amount {formDiscountType === 'percentage' ? '(%)' : '(EGP)'}
              </label>
              <input
                type="number"
                value={formAmount}
                onChange={e => setFormAmount(Number(e.target.value))}
                min={0}
                max={formDiscountType === 'percentage' ? 100 : 99999}
                step={formDiscountType === 'percentage' ? 1 : 0.01}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">
                Max Uses (blank = unlimited)
              </label>
              <input
                type="number"
                value={formMaxUses}
                onChange={e => setFormMaxUses(e.target.value)}
                min={1}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Valid From</label>
              <input
                type="datetime-local"
                value={formValidFrom}
                onChange={e => setFormValidFrom(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Valid Until</label>
              <input
                type="datetime-local"
                value={formValidUntil}
                onChange={e => setFormValidUntil(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting || !formCode.trim()}
                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-night-950 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Code'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-night-400 hover:text-night-200 px-4 py-2.5 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promo Codes Table */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          </div>
        ) : codes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Tag className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No promo codes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Code</th>
                  <th className="text-left py-3 px-4 font-medium">Event</th>
                  <th className="text-left py-3 px-4 font-medium">Promoter</th>
                  <th className="text-left py-3 px-4 font-medium">Discount</th>
                  <th className="text-left py-3 px-4 font-medium">Uses</th>
                  <th className="text-left py-3 px-4 font-medium">Valid Period</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-night-800 last:border-0 hover:bg-night-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-gold-400 tracking-wider">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 text-night-300 text-xs">
                      {getEventName(c.event_id)}
                    </td>
                    <td className="py-3 px-4 text-night-400 text-xs">
                      {c.promoters?.name || getPromoterName(c.promoter_id)}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {formatDiscount(c)}
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {formatUses(c)}
                    </td>
                    <td className="py-3 px-4 text-night-400 text-xs">
                      {formatValidPeriod(c)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${
                          c.is_active
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-night-700 text-night-400'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(c.id, c.is_active ?? false)}
                          className="p-1 rounded hover:bg-night-700 transition-colors"
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {c.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-night-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-night-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
