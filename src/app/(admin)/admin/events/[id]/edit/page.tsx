'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils/format'
import { EventWithTicketTypes } from '@/types/database'
import { useRouter, useParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Loader2, AlertTriangle, X, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const numericField = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), schema)

const ticketTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  price: numericField(z.number().min(0, 'Price must be 0 or more')),
  quantity_total: numericField(z.number().int().min(1, 'Quantity must be at least 1')),
  max_per_order: numericField(z.number().int().min(1)).optional(),
  description: z.string().optional(),
})

const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Max 200 characters'),
  description: z.string().optional(),
  dj_name: z.string().optional(),
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
  dj_name?: string
  start_time: string
  end_time?: string
  doors_open?: string
  status: 'draft' | 'published'
  is_featured: boolean
  sale_start?: string
  sale_end?: string
  ticket_types: {
    id?: string
    name: string
    price: number
    quantity_total: number
    max_per_order?: number
    description?: string
  }[]
}

function toLocalDateTimeValue(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [event, setEvent] = useState<EventWithTicketTypes | null>(null)
  const [deletedTicketTypeIds, setDeletedTicketTypeIds] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      dj_name: '',
      start_time: '',
      end_time: '',
      doors_open: '',
      status: 'draft',
      is_featured: false,
      sale_start: '',
      sale_end: '',
      ticket_types: [],
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

  const fetchEvent = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*, ticket_types(*)')
      .eq('id', eventId)
      .single()

    if (error || !data) {
      toast.error('Event not found')
      router.push('/admin/events')
      return
    }

    const eventData = data as EventWithTicketTypes
    setEvent(eventData)
    setImageUrl(eventData.featured_image_url || null)

    reset({
      name: eventData.name,
      description: eventData.description || '',
      dj_name: eventData.dj_name || '',
      start_time: toLocalDateTimeValue(eventData.start_time),
      end_time: toLocalDateTimeValue(eventData.end_time),
      doors_open: toLocalDateTimeValue(eventData.doors_open),
      status: eventData.status as 'draft' | 'published',
      is_featured: eventData.is_featured ?? false,
      sale_start: toLocalDateTimeValue(eventData.sale_start),
      sale_end: toLocalDateTimeValue(eventData.sale_end),
      ticket_types: (eventData.ticket_types || [])
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((tt) => ({
          id: tt.id,
          name: tt.name,
          price: tt.price,
          quantity_total: tt.quantity_total,
          max_per_order: tt.max_per_order ?? undefined,
          description: tt.description || '',
        })),
    })
    setLoading(false)
  }, [eventId, supabase, router, reset])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  function handleRemoveTicketType(index: number) {
    const tt = watchTicketTypes[index]
    if (tt.id) {
      setDeletedTicketTypeIds((prev) => [...prev, tt.id!])
    }
    remove(index)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('eventId', eventId)

      const res = await fetch('/api/admin/upload-event-image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to upload image')
        return
      }

      setImageUrl(data.url)
      toast.success('Image uploaded')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleRemoveImage() {
    setUploading(true)
    try {
      const res = await fetch('/api/admin/upload-event-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })

      if (!res.ok) {
        toast.error('Failed to remove image')
        return
      }

      setImageUrl(null)
      toast.success('Image removed')
    } catch {
      toast.error('Failed to remove image')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: EventFormData) {
    setSubmitting(true)
    try {
      const eventSlug = generateSlug(data.name)

      // Auto-feature when DJ name is set
      const hasDj = !!data.dj_name?.trim()

      // Update event
      const { error: eventError } = await supabase
        .from('events')
        .update({
          name: data.name,
          slug: eventSlug,
          description: data.description || null,
          dj_name: data.dj_name?.trim() || null,
          start_time: new Date(data.start_time).toISOString(),
          end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
          doors_open: data.doors_open ? new Date(data.doors_open).toISOString() : null,
          status: data.status,
          is_featured: hasDj || data.is_featured,
          sale_start: data.sale_start ? new Date(data.sale_start).toISOString() : null,
          sale_end: data.sale_end ? new Date(data.sale_end).toISOString() : null,
          total_capacity: totalCapacity,
        })
        .eq('id', eventId)

      if (eventError) throw eventError

      // Delete removed ticket types
      if (deletedTicketTypeIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('ticket_types')
          .delete()
          .in('id', deletedTicketTypeIds)

        if (deleteError) throw deleteError
      }

      // Upsert ticket types
      for (let i = 0; i < data.ticket_types.length; i++) {
        const tt = data.ticket_types[i]

        if (tt.id) {
          // Update existing
          const { error } = await supabase
            .from('ticket_types')
            .update({
              name: tt.name,
              price: tt.price,
              quantity_total: tt.quantity_total,
              max_per_order: tt.max_per_order || null,
              description: tt.description || null,
              sort_order: i,
            })
            .eq('id', tt.id)

          if (error) throw error
        } else {
          // Insert new
          const { error } = await supabase
            .from('ticket_types')
            .insert({
              event_id: eventId,
              name: tt.name,
              price: tt.price,
              currency: 'EGP',
              quantity_total: tt.quantity_total,
              max_per_order: tt.max_per_order || null,
              description: tt.description || null,
              sort_order: i,
            })

          if (error) throw error
        }
      }

      toast.success('Event updated successfully!')
      router.push('/admin/events')
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelEvent() {
    setCancelling(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('id', eventId)

      if (error) throw error

      toast.success('Event cancelled')
      router.push('/admin/events')
    } catch (error) {
      console.error('Error cancelling event:', error)
      toast.error('Failed to cancel event')
    } finally {
      setCancelling(false)
      setShowCancelConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    )
  }

  const isCancelled = !!event?.cancelled_at

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/events"
            className="p-2 rounded-lg bg-night-800 hover:bg-night-700 border border-night-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Event</h1>
            {slug && (
              <p className="text-sm text-night-400 mt-0.5">
                Slug: <span className="text-night-300">{slug}</span>
              </p>
            )}
          </div>
        </div>

        {isCancelled && (
          <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 text-sm font-medium px-3 py-1.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        )}
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
                disabled={isCancelled}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
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
                disabled={isCancelled}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm resize-none disabled:opacity-50"
              />
            </div>

            {/* DJ Name */}
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                DJ / Artist Name
              </label>
              <input
                {...register('dj_name')}
                type="text"
                placeholder="e.g. DJ Ahmed — leave empty for regular nights"
                disabled={isCancelled}
                className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
              />
              <p className="text-xs text-night-500 mt-1">When set, the event is automatically featured on the public site</p>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-night-200 mb-1.5">
                Cover Image
              </label>
              {imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-night-600 bg-night-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Event cover"
                    className="w-full aspect-[16/9] object-cover"
                  />
                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="absolute top-2 right-2 p-1.5 bg-night-900/80 hover:bg-red-500/80 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-full aspect-[16/9] border-2 border-dashed border-night-600 rounded-lg bg-night-800 transition-colors ${!isCancelled ? 'hover:border-gold-500/50 cursor-pointer' : 'opacity-50'}`}>
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-night-500 mb-2" />
                      <span className="text-sm text-night-400">Click to upload cover image</span>
                      <span className="text-xs text-night-500 mt-1">JPEG, PNG, or WebP — max 5MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={isCancelled || uploading}
                    className="hidden"
                  />
                </label>
              )}
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
                  disabled={isCancelled}
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark disabled:opacity-50"
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
                  disabled={isCancelled}
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  Doors Open
                </label>
                <input
                  {...register('doors_open')}
                  type="datetime-local"
                  disabled={isCancelled}
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark disabled:opacity-50"
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
                  disabled={isCancelled}
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
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
                  disabled={isCancelled}
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
                  disabled={isCancelled}
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-night-200 mb-1.5">
                  Sale End
                </label>
                <input
                  {...register('sale_end')}
                  type="datetime-local"
                  disabled={isCancelled}
                  className="w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm scheme-dark disabled:opacity-50"
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
            {!isCancelled && (
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
            )}
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
                    {watchTicketTypes[index]?.id && (
                      <span className="ml-2 text-xs text-night-500">(existing)</span>
                    )}
                  </span>
                  {fields.length > 1 && !isCancelled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTicketType(index)}
                      className="p-1.5 text-night-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Hidden id field */}
                <input type="hidden" {...register(`ticket_types.${index}.id`)} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-night-400 mb-1">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      {...register(`ticket_types.${index}.name`)}
                      type="text"
                      placeholder="e.g. VIP"
                      disabled={isCancelled}
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
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
                      disabled={isCancelled}
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
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
                      disabled={isCancelled}
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
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
                      disabled={isCancelled}
                      className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
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
                    disabled={isCancelled}
                    className="w-full px-3 py-2 bg-night-900 border border-night-600 rounded-lg text-white placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {!isCancelled && (
              <>
                {showCancelConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-night-300">Are you sure?</span>
                    <button
                      type="button"
                      onClick={handleCancelEvent}
                      disabled={cancelling}
                      className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Yes, Cancel Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="text-sm text-night-400 hover:text-night-200 px-3 py-2 transition-colors"
                    >
                      No, go back
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-red-400 hover:bg-red-500/10 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Cancel Event
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/events"
              className="px-4 py-2.5 bg-night-800 hover:bg-night-700 border border-night-600 rounded-lg text-sm font-medium transition-colors"
            >
              Back
            </Link>
            {!isCancelled && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
