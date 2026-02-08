'use client'

import { Clock, Navigation } from 'lucide-react'

const hours = [
  { day: 'Thursday', hours: '10:00 PM — 4:00 AM' },
  { day: 'Friday', hours: '10:00 PM — 5:00 AM' },
  { day: 'Saturday', hours: '10:00 PM — 5:00 AM' },
  { day: 'Special Events', hours: 'See event listings' },
]

export default function LocationSection() {
  return (
    <section id="location" className="py-24 sm:py-32 relative bg-taj-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 uppercase tracking-tight">
            Find Us
          </h2>
          <p className="text-gray-400 text-sm tracking-[0.2em] uppercase">
            Naama Bay, Sharm El Sheikh
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-0 items-start">
          {/* Map */}
          <div className="lg:col-span-3">
            <div className="aspect-[4/3] lg:aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-taj-dark">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3597.6!2d34.3275!3d27.9125!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDU0JzQ1LjAiTiAzNMKwMTknMzkuMCJF!5e0!3m2!1sen!2seg!4v1700000000000!5m2!1sen!2seg"
                className="w-full h-full border-0 grayscale-[0.8] contrast-[1.1] invert-[0.92] hue-rotate-[180deg] brightness-[0.8]"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Taj Mahal location"
              />
            </div>
          </div>

          {/* Info card */}
          <div className="lg:col-span-2 lg:-ml-8 lg:mt-8">
            <div className="bg-taj-dark border border-white/10 rounded-2xl p-6 sm:p-8">
              {/* Address */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Navigation className="w-5 h-5 text-taj-gold" />
                  <h3 className="font-display text-white font-semibold text-lg">Address</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed pl-8">
                  Naama Bay, Sharm El Sheikh,<br />
                  South Sinai, Egypt
                </p>
              </div>

              {/* Operating Hours */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <Clock className="w-5 h-5 text-taj-gold" />
                  <h3 className="font-display text-white font-semibold text-lg">Hours</h3>
                </div>
                <div className="pl-8 space-y-3">
                  {hours.map(({ day, hours: time }) => (
                    <div
                      key={day}
                      className="flex items-center justify-between pb-3 border-b border-white/5 last:border-0"
                    >
                      <span className="text-gray-300 text-sm font-medium">{day}</span>
                      <span className="text-taj-gold text-sm">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
