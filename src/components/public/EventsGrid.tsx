'use client'

import Link from 'next/link'
import { formatEventDate, formatCurrency } from '@/lib/utils/format'
import type { EventWithTicketTypes } from '@/types/database'
import SectionTitle from './SectionTitle'
import Carousel from './Carousel'

interface EventsGridProps {
  events: EventWithTicketTypes[]
}

export default function EventsGrid({ events }: EventsGridProps) {
  if (events.length === 0) {
    return (
      <section id="events" className="relative pb-20">
        <SectionTitle title="Events" />
        <div className="relative z-10 -mt-[30vh] text-center px-4">
          <p className="text-gray-400 text-lg font-light">Stay tuned for upcoming events</p>
          <p className="text-gray-600 text-sm mt-2">Something extraordinary is coming soon</p>
        </div>
      </section>
    )
  }

  return (
    <section id="events" className="relative pb-20">
      <SectionTitle title="Events" />

      <div className="relative z-10 -mt-[30vh]">
        <Carousel>
          {events.map((event) => {
            const minPrice =
              event.ticket_types.length > 0
                ? Math.min(...event.ticket_types.map((t) => t.price))
                : null

            const formattedDate = formatEventDate(event.start_time)

            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="snap-center shrink-0 w-[85vw] md:w-[25vw] relative group cursor-pointer"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-gray-900 relative">
                  {/* Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20">
                      {formattedDate}
                    </span>
                  </div>

                  {/* Featured badge */}
                  {event.is_featured && (
                    <div className="absolute top-4 right-4 z-20">
                      <span className="bg-taj-gold text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Featured
                      </span>
                    </div>
                  )}

                  {/* Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.featured_image_url || '/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp'}
                    alt={event.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 w-full p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="font-display text-4xl md:text-5xl font-bold uppercase leading-none">
                      {event.name}
                    </h3>
                    {event.dj_name && (
                      <p className="text-taj-gold/80 text-sm font-medium mt-2">
                        ft. {event.dj_name}
                      </p>
                    )}
                    {minPrice !== null && (
                      <p className="text-white/60 text-sm mt-2">
                        From {formatCurrency(minPrice)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </Carousel>
      </div>
    </section>
  )
}
