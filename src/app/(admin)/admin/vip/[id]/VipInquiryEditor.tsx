'use client'

import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
]

const statusStyles: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  contacted: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/30',
  declined: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export function VipInquiryEditor({
  inquiryId,
  initialStatus,
  initialNotes,
}: {
  inquiryId: string
  initialStatus: string
  initialNotes: string
}) {
  const [status, setStatus] = useState(initialStatus)
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('vip_inquiries')
        .update({ status, notes, updated_at: new Date().toISOString() })
        .eq('id', inquiryId)

      if (error) throw error

      toast.success('Inquiry updated successfully')
      router.refresh()
    } catch (err) {
      console.error('Error updating inquiry:', err)
      toast.error('Failed to update inquiry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-night-900 border border-night-700 rounded-xl p-6 space-y-5">
      <h2 className="text-lg font-semibold">Manage Inquiry</h2>

      {/* Status */}
      <div>
        <label className="text-xs text-night-400 uppercase tracking-wider block mb-2">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 ${
            statusStyles[status] || 'bg-night-800 border-night-600 text-white'
          }`}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-night-400 uppercase tracking-wider block mb-2">
          Admin Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this inquiry..."
          rows={4}
          className="w-full px-4 py-3 bg-night-800 border border-night-600 rounded-lg text-sm text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 resize-y"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
