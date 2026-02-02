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
      <section id="events" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center py-20"
          >
            <Sparkles className="w-12 h-12 text-gold-500/40 mx-auto mb-4" />
            <p className="text-night-300 text-lg">Stay tuned for upcoming events</p>
            <p className="text-night-500 text-sm mt-2">Something extraordinary is coming soon</p>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section id="events" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
        Upcoming Events
      </h2>
      <div className="flex justify-center">
        <div className="gold-shimmer h-[2px] w-20 rounded-full" />
      </div>
    </motion.div>
  )
}

function EventCard({ event, index }: { event: EventWithTicketTypes; index: number }) {
  const minPrice = event.ticket_types.length > 0
    ? Math.min(...event.ticket_types.map((t) => t.price))
    : null

  // Generate a unique gradient for each event card placeholder
  const gradients = [
    'from-purple-900/60 via-night-800 to-night-900',
    'from-blue-900/50 via-night-800 to-night-900',
    'from-rose-900/40 via-night-800 to-night-900',
    'from-amber-900/40 via-night-800 to-night-900',
    'from-indigo-900/50 via-night-800 to-night-900',
    'from-teal-900/40 via-night-800 to-night-900',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link href={`/events/${event.slug}`} className="group block">
        <div className="bg-night-900 border border-night-700/50 rounded-xl overflow-hidden transition-all duration-500 hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-500/5 hover:-translate-y-1">
          {/* Image placeholder */}
          <div className={`aspect-[16/9] bg-gradient-to-br ${gradients[index % gradients.length]} relative overflow-hidden`}>
            {/* Subtle light effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 bg-gold-500/0 group-hover:bg-gold-500/5 transition-colors duration-500" />

            {event.is_featured && (
              <div className="absolute top-3 right-3 bg-gold-500/90 text-night-950 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                Featured
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6">
            <h3 className="text-lg font-bold text-white group-hover:text-gold-300 transition-colors duration-300 mb-3 truncate">
              {event.name}
            </h3>

            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-night-300 text-sm">
                <Calendar className="w-4 h-4 text-gold-500/70 shrink-0" />
                <span>{formatEventDate(event.start_time)}</span>
              </div>
              {event.doors_open && (
                <div className="flex items-center gap-2 text-night-300 text-sm">
                  <Clock className="w-4 h-4 text-gold-500/70 shrink-0" />
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
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold border border-gold-500/40 text-gold-400 px-4 py-2 rounded-full group-hover:bg-gold-500 group-hover:text-night-950 transition-all duration-300 ml-auto">
                <Ticket className="w-3.5 h-3.5" />
                Get Tickets
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
