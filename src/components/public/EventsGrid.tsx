'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Clock, Ticket, Sparkles } from 'lucide-react'
import { formatEventDate, formatEventTime, formatCurrency } from '@/lib/utils/format'
import type { EventWithTicketTypes } from '@/types/database'

interface EventsGridProps {
  events: EventWithTicketTypes[]
}

export default function EventsGrid({ events }: EventsGridProps) {
  if (events.length === 0) {
    return (
      <section id="events" className="py-24 sm:py-32 relative">
        <div className="grain-overlay" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionHeading />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center py-20 relative"
          >
            {/* Faded venue photo background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp"
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-[0.06]"
            />
            <Sparkles className="w-10 h-10 text-gold-500/30 mx-auto mb-4" />
            <p className="text-night-300 text-lg font-light">Stay tuned for upcoming events</p>
            <p className="text-night-500 text-sm mt-2">Something extraordinary is coming soon</p>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section id="events" className="py-24 sm:py-32 relative">
      <div className="grain-overlay" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeading />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {events.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionHeading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-16"
    >
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
        Upcoming Events
      </h2>
      <p className="text-night-400 text-sm tracking-[0.2em] uppercase mb-6">
        Don&apos;t miss what&apos;s coming
      </p>
      <div className="flex justify-center">
        <div className="gold-shimmer h-[1px] w-20 rounded-full" />
      </div>
    </motion.div>
  )
}

function EventCard({ event, index }: { event: EventWithTicketTypes; index: number }) {
  const minPrice = event.ticket_types.length > 0
    ? Math.min(...event.ticket_types.map((t) => t.price))
    : null

  // Extract day and month for the date overlay
  const eventDate = new Date(event.start_time)
  const day = eventDate.getDate()
  const month = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link href={`/events/${event.slug}`} className="group block">
        <div className="bg-night-900/80 border border-night-700/40 rounded-xl overflow-hidden transition-all duration-500 hover:border-gold-500/30 hover:shadow-xl hover:shadow-gold-500/5 hover:-translate-y-1.5 gold-glow-hover">
          {/* Cover image — taller aspect */}
          <div className="aspect-[3/4] relative overflow-hidden bg-night-800">
            {event.featured_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.featured_image_url}
                alt={event.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp"
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105"
              />
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/20 to-transparent" />
            <div className="absolute inset-0 bg-gold-500/0 group-hover:bg-gold-500/5 transition-colors duration-500" />

            {/* Date overlay — top left */}
            <div className="absolute top-4 left-4 bg-night-950/80 backdrop-blur-sm border border-night-700/50 rounded-lg px-3 py-2 text-center min-w-[3.5rem]">
              <div className="text-gold-400 text-xl font-bold leading-none">{day}</div>
              <div className="text-night-300 text-[10px] tracking-widest uppercase mt-0.5">{month}</div>
            </div>

            {/* Featured badge */}
            {event.is_featured && (
              <div className="absolute top-4 right-4">
                <div className="relative bg-gold-500/90 text-night-950 text-[9px] font-bold tracking-[0.2em] uppercase px-3 py-1.5">
                  {/* Diamond shape accents */}
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gold-500/90 rotate-45" />
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gold-500/90 rotate-45" />
                  Featured
                </div>
              </div>
            )}

            {/* Bottom content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="font-display text-xl font-bold text-white group-hover:text-gold-300 transition-colors duration-300 mb-1 truncate">
                {event.name}
              </h3>
              {event.dj_name && (
                <p className="text-gold-400/80 text-sm font-medium mb-3 truncate">
                  ft. {event.dj_name}
                </p>
              )}

              <div className="flex items-center gap-4 text-night-300 text-xs mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold-500/60" />
                  <span>{formatEventDate(event.start_time)}</span>
                </div>
                {event.doors_open && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold-500/60" />
                    <span>Doors {formatEventTime(event.doors_open)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                {minPrice !== null && (
                  <span className="text-gold-400 font-semibold text-sm">
                    From {formatCurrency(minPrice)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-bold border border-gold-500/40 text-gold-400 px-4 py-2 rounded-full group-hover:bg-gold-500 group-hover:text-night-950 transition-all duration-300 ml-auto tracking-wider uppercase">
                  <Ticket className="w-3 h-3" />
                  Tickets
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
