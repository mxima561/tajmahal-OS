'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FridayEventTemplate, FridayTemplateTicketType } from '@/types/database'
import { Loader2, Plus, Trash2, RefreshCw, Save } from 'lucide-react'
import toast from 'react-hot-toast'

type TicketTypeForm = {
  id?: string
  name: string
  price: number
  quantity_total: number
  max_per_order: number | null
  description: string
}

export default function RecurringPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [template, setTemplate] = useState<FridayEventTemplate | null>(null)
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([])

  // Form state
  const [venueId, setVenueId] = useState('')
  const [eventName, setEventName] = useState('Friday Night')
  const [description, setDescription] = useState('')
  const [doorsOpenTime, setDoorsOpenTime] = useState('22:00')
  const [startTime, setStartTime] = useState('23:00')
  const [endTime, setEndTime] = useState('04:00')
  const [defaultStatus, setDefaultStatus] = useState('published')
  const [weeksAhead, setWeeksAhead] = useState(4)
  const [isActive, setIsActive] = useState(true)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([
    { name: 'General Admission', price: 250, quantity_total: 200, max_per_order: 5, description: '' },
  ])

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Fetch venues
    const { data: venueData } = await supabase
      .from('venues')
      .select('id, name')
      .order('name')

    if (venueData && venueData.length > 0) {
      setVenues(venueData)
    }

    // Fetch existing template
    const { data: tmpl } = await supabase
      .from('friday_event_template')
      .select('*')
      .limit(1)
      .single()

    if (tmpl) {
      setTemplate(tmpl)
      setVenueId(tmpl.venue_id)
      setEventName(tmpl.event_name)
      setDescription(tmpl.description || '')
      setDoorsOpenTime(tmpl.doors_open_time.slice(0, 5))
      setStartTime(tmpl.start_time.slice(0, 5))
      setEndTime(tmpl.end_time.slice(0, 5))
      setDefaultStatus(tmpl.default_status)
      setWeeksAhead(tmpl.weeks_ahead)
      setIsActive(tmpl.is_active)

      // Fetch ticket types
      const { data: ttData } = await supabase
        .from('friday_template_ticket_types')
        .select('*')
        .eq('template_id', tmpl.id)
        .order('sort_order', { ascending: true })

      if (ttData && ttData.length > 0) {
        setTicketTypes(
          ttData.map((tt: FridayTemplateTicketType) => ({
            id: tt.id,
            name: tt.name,
            price: tt.price,
            quantity_total: tt.quantity_total,
            max_per_order: tt.max_per_order,
            description: tt.description || '',
          }))
        )
      }
    } else if (venueData && venueData.length > 0) {
      setVenueId(venueData[0].id)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function addTicketType() {
    setTicketTypes((prev) => [
      ...prev,
      { name: '', price: 0, quantity_total: 100, max_per_order: 5, description: '' },
    ])
  }

  function removeTicketType(index: number) {
    setTicketTypes((prev) => prev.filter((_, i) => i !== index))
  }

  function updateTicketType(index: number, field: keyof TicketTypeForm, value: string | number | null) {
    setTicketTypes((prev) =>
      prev.map((tt, i) => (i === index ? { ...tt, [field]: value } : tt))
    )
  }

  async function handleSave() {
    if (!venueId) {
      toast.error('Please select a venue')
      return
    }
    if (!eventName.trim()) {
      toast.error('Event name is required')
      return
    }
    if (ticketTypes.length === 0) {
      toast.error('At least one ticket type is required')
      return
    }
    for (const tt of ticketTypes) {
      if (!tt.name.trim()) {
        toast.error('All ticket types must have a name')
        return
      }
    }

    setSaving(true)
    try {
      let templateId = template?.id

      const templateData = {
        venue_id: venueId,
        event_name: eventName.trim(),
        description: description.trim() || null,
        doors_open_time: `${doorsOpenTime}:00`,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        default_status: defaultStatus,
        weeks_ahead: weeksAhead,
        is_active: isActive,
      }

      if (template) {
        // Update existing
        const { error } = await supabase
          .from('friday_event_template')
          .update(templateData)
          .eq('id', template.id)

        if (error) throw error
      } else {
        // Insert new
        const { data: newTemplate, error } = await supabase
          .from('friday_event_template')
          .insert(templateData)
          .select('id')
          .single()

        if (error || !newTemplate) throw error || new Error('Failed to create template')
        templateId = newTemplate.id
      }

      // Delete old ticket types and re-insert
      if (templateId) {
        await supabase
          .from('friday_template_ticket_types')
          .delete()
          .eq('template_id', templateId)

        const ttRows = ticketTypes.map((tt, i) => ({
          template_id: templateId!,
          name: tt.name.trim(),
          price: tt.price,
          currency: 'EGP',
          quantity_total: tt.quantity_total,
          max_per_order: tt.max_per_order,
          description: tt.description?.trim() || null,
          sort_order: i,
        }))

        const { error: ttError } = await supabase
          .from('friday_template_ticket_types')
          .insert(ttRows)

        if (ttError) throw ttError
      }

      toast.success('Template saved!')
      await fetchData()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/generate-fridays', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to generate events')
        return
      }

      if (data.errors?.length > 0) {
        toast.error(data.errors[0])
      } else if (data.created === 0) {
        toast('All upcoming Fridays already have events', { icon: 'ℹ️' })
      } else {
        toast.success(`Created ${data.created} Friday event${data.created > 1 ? 's' : ''}`)
      }
    } catch {
      toast.error('Failed to generate events')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recurring Friday Events</h1>
          <p className="text-sm text-night-400 mt-1">
            Configure the template for auto-generated Friday events
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !template}
          className="inline-flex items-center gap-2 bg-night-800 hover:bg-night-700 border border-night-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Generate Now
        </button>
      </div>

      {/* Template Config */}
      <div className="bg-night-900 border border-night-700 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Template Settings</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-night-600 bg-night-800 text-gold-500 focus:ring-gold-500/50 focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-night-200">Active</span>
          </label>
        </div>

        <div className="space-y-4">
          {/* Venue + Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Venue <span className="text-red-400">*</span>
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Event Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Friday Night"
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-night-200 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Default description for generated events..."
              className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm resize-none"
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Doors Open
              </label>
              <input
                type="time"
                value={doorsOpenTime}
                onChange={(e) => setDoorsOpenTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Status + Weeks Ahead */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Default Status
              </label>
              <select
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Weeks Ahead
              </label>
              <input
                type="number"
                value={weeksAhead}
                onChange={(e) => setWeeksAhead(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                min={1}
                max={12}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
              />
              <p className="text-xs text-night-500 mt-1">How many upcoming Fridays to pre-generate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Types */}
      <div className="bg-night-900 border border-night-700 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Default Ticket Types</h2>
          <button
            type="button"
            onClick={addTicketType}
            className="inline-flex items-center gap-1.5 bg-night-800 hover:bg-night-700 border border-night-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Ticket Type
          </button>
        </div>
        <p className="text-sm text-night-400">
          These ticket types will be copied to each auto-generated event.
        </p>

        <div className="space-y-4">
          {ticketTypes.map((tt, index) => (
            <div
              key={index}
              className="bg-night-800 border border-night-700 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-night-300">
                  Ticket Type {index + 1}
                </span>
                {ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTicketType(index)}
                    className="p-1.5 text-night-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-night-400 mb-1">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={tt.name}
                    onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                    placeholder="e.g. General Admission"
                    className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-night-400 mb-1">
                    Price (EGP) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={tt.price}
                    onChange={(e) => updateTicketType(index, 'price', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-night-400 mb-1">
                    Quantity <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={tt.quantity_total}
                    onChange={(e) => updateTicketType(index, 'quantity_total', Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-night-400 mb-1">
                    Max Per Order
                  </label>
                  <input
                    type="number"
                    value={tt.max_per_order ?? ''}
                    onChange={(e) => updateTicketType(index, 'max_per_order', e.target.value ? Number(e.target.value) : null)}
                    min="1"
                    placeholder="5"
                    className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-night-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={tt.description}
                  onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Template
        </button>
      </div>
    </div>
  )
}
