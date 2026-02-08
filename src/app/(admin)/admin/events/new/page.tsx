'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const numericField = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), schema)

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: numericField(z.number().min(0, 'Price must be 0 or more')),
  quantity_total: numericField(z.number().int().min(1, 'Quantity must be at least 1')),
  max_per_order: numericField(z.number().int().min(1)).optional(),
  description: z.string().optional(),
})

const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Max 200 characters'),
  description: z.string().optional(),
  start_time: z.string().min(1, 'Start date/time is required'),
  end_time: z.string().optional(),
  doors_open: z.string().optional(),
  status: z.enum(['draft', 'published']),
  is_featured: z.boolean(),
  sale_start: z.string().optional(),
  sale_end: z.string().optional(),
  ticket_types: z.array(ticketTypeSchema).min(1, 'At least one ticket type is required'),
})

type EventFormData = {
  name: string
  description?: string
  start_time: string
  end_time?: string
  doors_open?: string
  status: 'draft' | 'published'
  is_featured: boolean
  sale_start?: string
  sale_end?: string
  ticket_types: {
    name: string
    price: number
    quantity_total: number
    max_per_order?: number
    description?: string
  }[]
}

export default function CreateEventPage() {
  const router = useRouter()
  const supabase = createClient()
  const [venueId, setVenueId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      start_time: '',
      end_time: '',
      doors_open: '',
      status: 'draft',
      is_featured: false,
      sale_start: '',
      sale_end: '',
      ticket_types: [
        { name: 'General Admission', price: 0, quantity_total: 100, max_per_order: 5, description: '' },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ticket_types',
  })

  const watchTicketTypes = watch('ticket_types')
  const totalCapacity = watchTicketTypes?.reduce(
    (sum, tt) => sum + (Number(tt.quantity_total) || 0),
    0
  )

  const watchName = watch('name')
  const slug = generateSlug(watchName || '')

  useEffect(() => {
    async function fetchVenue() {
      const { data } = await supabase
        .from('venues')
        .select('id')
        .eq('slug', 'taj-mahal')
        .single()
      if (data) setVenueId(data.id)
    }
    fetchVenue()
  }, [supabase])

  async function onSubmit(data: EventFormData) {
    if (!venueId) {
      toast.error('Venue not found. Please try again.')
      return
    }

    setSubmitting(true)
    try {
      const eventSlug = generateSlug(data.name)

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          venue_id: venueId,
          name: data.name,
          slug: eventSlug,
          description: data.description || null,
          start_time: new Date(data.start_time).toISOString(),
          end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
          doors_open: data.doors_open ? new Date(data.doors_open).toISOString() : null,
          status: data.status,
          is_featured: data.is_featured,
          sale_start: data.sale_start ? new Date(data.sale_start).toISOString() : null,
          sale_end: data.sale_end ? new Date(data.sale_end).toISOString() : null,
          total_capacity: totalCapacity,
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Create ticket types
      const ticketTypesData = data.ticket_types.map((tt, index) => ({
        event_id: event.id,
        name: tt.name,
        price: tt.price,
        currency: 'EGP',
        quantity_total: tt.quantity_total,
        max_per_order: tt.max_per_order || null,
        description: tt.description || null,
        sort_order: index,
      }))

      const { error: ttError } = await supabase
        .from('ticket_types')
        .insert(ticketTypesData)

      if (ttError) throw ttError

      toast.success('Event created successfully!')
      router.push('/admin/events')
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/events"
          className="p-2 rounded-lg bg-night-800 hover:bg-night-700 border border-night-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Event</h1>
          {slug && (
            <p className="text-sm text-night-400 mt-0.5">
              Slug: <span className="text-night-300">{slug}</span>
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Event Details */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold">Event Details</h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Event Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="e.g. Friday Night Live"
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Describe the event..."
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm resize-none"
              />
            </div>

            {/* Date/Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  Start Date/Time <span className="text-red-400">*</span>
                </label>
                <input
                  {...register('start_time')}
                  type="datetime-local"
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark"
                />
                {errors.start_time && (
                  <p className="text-red-400 text-xs mt-1">{errors.start_time.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  End Date/Time
                </label>
                <input
                  {...register('end_time')}
                  type="datetime-local"
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  Doors Open
                </label>
                <input
                  {...register('doors_open')}
                  type="datetime-local"
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark"
                />
              </div>
            </div>

            {/* Status and Featured */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-7">
                <input
                  {...register('is_featured')}
                  type="checkbox"
                  id="is_featured"
                  className="w-4 h-4 rounded-sm border-night-600 bg-night-800 text-gold-500 focus:ring-gold-500/50 focus:ring-offset-0"
                />
                <label htmlFor="is_featured" className="text-sm font-medium text-night-200">
                  Featured Event
                </label>
              </div>
            </div>

            {/* Sale Start/End */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  Sale Start
                </label>
                <input
                  {...register('sale_start')}
                  type="datetime-local"
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  Sale End
                </label>
                <input
                  {...register('sale_end')}
                  type="datetime-local"
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Types */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ticket Types</h2>
              <p className="text-sm text-night-400 mt-0.5">
                Total capacity: <span className="text-white font-medium">{totalCapacity}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                append({ name: '', price: 0, quantity_total: 50, max_per_order: 5, description: '' })
              }
              className="inline-flex items-center gap-1.5 bg-night-800 hover:bg-night-700 border border-night-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Ticket Type
            </button>
          </div>

          {errors.ticket_types?.root && (
            <p className="text-red-400 text-sm">{errors.ticket_types.root.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-night-800 border border-night-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-night-300">
                    Ticket Type {index + 1}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
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
                      {...register(`ticket_types.${index}.name`)}
                      type="text"
                      placeholder="e.g. VIP"
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                    />
                    {errors.ticket_types?.[index]?.name && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.ticket_types[index].name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-night-400 mb-1">
                      Price (EGP) <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register(`ticket_types.${index}.price`)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                    />
                    {errors.ticket_types?.[index]?.price && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.ticket_types[index].price.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-night-400 mb-1">
                      Quantity <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register(`ticket_types.${index}.quantity_total`)}
                      type="number"
                      min="1"
                      placeholder="100"
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                    />
                    {errors.ticket_types?.[index]?.quantity_total && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.ticket_types[index].quantity_total.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-night-400 mb-1">
                      Max Per Order
                    </label>
                    <input
                      {...register(`ticket_types.${index}.max_per_order`)}
                      type="number"
                      min="1"
                      placeholder="5"
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-night-400 mb-1">
                    Description
                  </label>
                  <input
                    {...register(`ticket_types.${index}.description`)}
                    type="text"
                    placeholder="Optional description for this ticket type"
                    className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/events"
            className="px-4 py-2.5 bg-night-800 hover:bg-night-700 border border-night-600 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !venueId}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Event
          </button>
        </div>
      </form>
    </div>
  )
}
