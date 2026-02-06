'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils/format'

type Promoter = {
  id: string
  name: string
  email: string | null
  phone: string | null
  commission_rate: number | null
  status: string
  notes: string | null
  created_at: string | null
  live_sales: number
  live_revenue: number
  live_commission: number
}

export default function PromotersPage() {
  const [promoters, setPromoters] = useState<Promoter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRate, setFormRate] = useState(10)
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function fetchPromoters() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promoters')
      if (res.ok) {
        const data = await res.json()
        setPromoters(data.promoters || [])
      } else {
        toast.error('Failed to load promoters')
      }
    } catch {
      toast.error('Failed to load promoters')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromoters()
  }, [])

  function resetForm() {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormRate(10)
    setFormNotes('')
  }

  function startEdit(p: Promoter) {
    setEditingId(p.id)
    setFormName(p.name)
    setFormEmail(p.email || '')
    setFormPhone(p.phone || '')
    setFormRate(p.commission_rate ?? 10)
    setFormNotes(p.notes || '')
    setShowForm(false)
  }

  function cancelEdit() {
    setEditingId(null)
    resetForm()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/promoters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          commissionRate: formRate,
          notes: formNotes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to create promoter')
        return
      }
      toast.success('Promoter added successfully')
      resetForm()
      setShowForm(false)
      fetchPromoters()
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !formName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/promoters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: formName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          commissionRate: formRate,
          notes: formNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to update promoter')
        return
      }
      toast.success('Promoter updated successfully')
      cancelEdit()
      fetchPromoters()
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleStatus(p: Promoter) {
    const newStatus = p.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch('/api/admin/promoters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: newStatus }),
      })
      if (!res.ok) {
        toast.error('Failed to update status')
        return
      }
      toast.success(`Promoter ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      fetchPromoters()
    } catch {
      toast.error('Network error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this promoter? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/admin/promoters?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete promoter')
        return
      }
      toast.success('Promoter deleted')
      fetchPromoters()
    } catch {
      toast.error('Network error')
    }
  }

  const totalPromoters = promoters.length
  const activePromoters = promoters.filter(p => p.status === 'active').length
  const totalSales = promoters.reduce((s, p) => s + p.live_sales, 0)
  const totalRevenue = promoters.reduce((s, p) => s + p.live_revenue, 0)

  const statusStyles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400',
    inactive: 'bg-yellow-500/10 text-yellow-400',
    suspended: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Promoters</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            if (!showForm) resetForm()
          }}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-night-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Promoter
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-night-900 border border-night-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <p className="text-xs text-night-400">Total Promoters</p>
            <p className="text-lg font-semibold text-white">{totalPromoters}</p>
          </div>
        </div>
        <div className="bg-night-900 border border-night-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-night-400">Active Promoters</p>
            <p className="text-lg font-semibold text-white">{activePromoters}</p>
          </div>
        </div>
        <div className="bg-night-900 border border-night-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <p className="text-xs text-night-400">Total Attributed Sales</p>
            <p className="text-lg font-semibold text-white">{totalSales}</p>
          </div>
        </div>
        <div className="bg-night-900 border border-night-700 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <p className="text-xs text-night-400">Total Attributed Revenue</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Add Promoter Form */}
      {showForm && (
        <div className="bg-night-900 border border-night-700 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">New Promoter</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-night-400 mb-1">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="Promoter name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Phone</label>
              <input
                type="text"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="+20 xxx xxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Commission Rate (%)</label>
              <input
                type="number"
                value={formRate}
                onChange={e => setFormRate(Number(e.target.value))}
                min={0}
                max={100}
                step={0.5}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-night-400 mb-1">Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                placeholder="Area, specialty, etc."
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting || !formName.trim()}
                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-night-950 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Promoter'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="bg-night-800 text-night-300 hover:text-night-200 px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promoters Table */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          </div>
        ) : promoters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Users className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No promoters found</p>
            <p className="text-xs text-night-500 mt-1">Add your first promoter to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 font-medium">Commission %</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Sales</th>
                  <th className="text-left py-3 px-4 font-medium">Revenue</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoters.map(p => (
                  editingId === p.id ? (
                    <tr key={p.id} className="border-b border-night-800 last:border-0 bg-night-800/30">
                      <td colSpan={8} className="py-4 px-4">
                        <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-night-400 mb-1">Name *</label>
                            <input
                              type="text"
                              value={formName}
                              onChange={e => setFormName(e.target.value)}
                              required
                              className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-night-400 mb-1">Email</label>
                            <input
                              type="email"
                              value={formEmail}
                              onChange={e => setFormEmail(e.target.value)}
                              className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-night-400 mb-1">Phone</label>
                            <input
                              type="text"
                              value={formPhone}
                              onChange={e => setFormPhone(e.target.value)}
                              className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-night-400 mb-1">Commission Rate (%)</label>
                            <input
                              type="number"
                              value={formRate}
                              onChange={e => setFormRate(Number(e.target.value))}
                              min={0}
                              max={100}
                              step={0.5}
                              className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-night-400 mb-1">Notes</label>
                            <input
                              type="text"
                              value={formNotes}
                              onChange={e => setFormNotes(e.target.value)}
                              className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                            />
                          </div>
                          <div className="sm:col-span-3 flex gap-3">
                            <button
                              type="submit"
                              disabled={submitting || !formName.trim()}
                              className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-night-950 font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
                            >
                              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="bg-night-800 text-night-300 hover:text-night-200 px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} className="border-b border-night-800 last:border-0 hover:bg-night-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{p.name}</div>
                        {p.notes && <div className="text-xs text-night-500 mt-0.5">{p.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-night-300">
                        {p.email || <span className="text-night-600">&mdash;</span>}
                      </td>
                      <td className="py-3 px-4 text-night-300">
                        {p.phone || <span className="text-night-600">&mdash;</span>}
                      </td>
                      <td className="py-3 px-4 text-gold-400 font-medium">
                        {p.commission_rate ?? 0}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                            statusStyles[p.status] || 'bg-night-700 text-night-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{p.live_sales}</td>
                      <td className="py-3 px-4 text-night-300">{formatCurrency(p.live_revenue)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="text-night-500 hover:text-gold-400 p-1.5 rounded hover:bg-gold-500/10 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className="text-night-500 hover:text-white p-1.5 rounded hover:bg-night-700 transition-colors"
                            title={p.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {p.status === 'active' ? (
                              <ToggleRight className="w-5 h-5 text-green-400" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-night-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-night-500 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
