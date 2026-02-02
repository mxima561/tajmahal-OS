import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { EventWithTicketTypes } from '@/types/database'
import { formatEventDate, formatEventTime, formatCurrency } from '@/lib/utils/format'
import { Calendar, Clock, MapPin, Ticket } from 'lucide-react'
import TicketSelector from '@/components/public/TicketSelector'

interface EventPageProps {
  params: { slug: string }
}

async function getEvent(slug: string): Promise<EventWithTicketTypes | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*), venues(*)')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as EventWithTicketTypes
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await getEvent(params.slug)
  if (!event) return { title: 'Event Not Found' }

  return {
    title: `${event.name} — Taj Mahal`,
    description:
      event.description?.slice(0, 160) ||
      `Get tickets for ${event.name} at Taj Mahal, Sharm El Sheikh.`,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await getEvent(params.slug)

  if (!event || event.status !== 'published' || event.cancelled_at) {
    notFound()
  }

  const minPrice =
    event.ticket_types.length > 0
      ? Math.min(...event.ticket_types.map((t) => t.price))
      : null

  // Pick a gradient based on slug hash for consistent color per event
  const gradients = [
    'from-purple-900/60 via-night-800 to-night-900',
    'from-blue-900/50 via-night-800 to-night-900',
    'from-rose-900/40 via-night-800 to-night-900',
    'from-amber-900/40 via-night-800 to-night-900',
    'from-indigo-900/50 via-night-800 to-night-900',
    'from-teal-900/40 via-night-800 to-night-900',
  ]
  const gradientIndex =
    event.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length

  const venue = event.venues

  const descriptionParagraphs = event.description
    ? event.description.split(/\n\n|\n/).filter(Boolean)
    : []

  return (
    <div className="bg-night-950">
      {/* Banner */}
      <div
        className={`relative w-full aspect-[21/9] bg-gradient-to-br ${gradients[gradientIndex]} overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08),transparent_70%)]" />

        {/* Event title overlay on banner */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {event.is_featured && (
              <span className="inline-block bg-gold-500/90 text-night-950 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
                Featured Event
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
              {event.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 -mt-2">
          {/* Left column: event info */}
          <div className="lg:col-span-3 space-y-8">
            {/* Quick info bar */}
            <div className="bg-night-900 border border-night-700/50 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-500/10">
                  <Calendar className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="text-sm text-night-400">Date</p>
                  <p className="font-semibold">{formatEventDate(event.start_time)}</p>
                </div>
              </div>

              <div className="h-px bg-night-800" />

              <div className="flex items-center gap-3 text-white">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-500/10">
                  <Clock className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="text-sm text-night-400">Time</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {event.doors_open && (
                      <p className="font-semibold">
                        Doors open {formatEventTime(event.doors_open)}
                      </p>
                    )}
                    <p className="font-semibold">
                      {event.doors_open ? 'Show' : 'Starts'} {formatEventTime(event.start_time)}
                    </p>
                  </div>
                </div>
              </div>

              {venue && (
                <>
                  <div className="h-px bg-night-800" />
                  <div className="flex items-center gap-3 text-white">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-500/10">
                      <MapPin className="w-5 h-5 text-gold-500" />
                    </div>
                    <div>
                      <p className="text-sm text-night-400">Venue</p>
                      <p className="font-semibold">{venue.name}</p>
                      {venue.address && (
                        <p className="text-night-400 text-sm">{venue.address}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {minPrice !== null && (
                <>
                  <div className="h-px bg-night-800" />
                  <div className="flex items-center gap-3 text-white">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-500/10">
                      <Ticket className="w-5 h-5 text-gold-500" />
                    </div>
                    <div>
                      <p className="text-sm text-night-400">Starting from</p>
                      <p className="font-semibold text-gold-400">{formatCurrency(minPrice)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            {descriptionParagraphs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">About This Event</h2>
                <div className="space-y-4">
                  {descriptionParagraphs.map((paragraph, i) => (
                    <p key={i} className="text-night-300 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: ticket selector */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-28">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="w-5 h-5 text-gold-500" />
                <h2 className="text-xl font-bold text-white">Select Tickets</h2>
              </div>
              <TicketSelector
                ticketTypes={event.ticket_types}
                eventId={event.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
