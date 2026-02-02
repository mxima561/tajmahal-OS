'use client'

import { motion } from 'framer-motion'
import { Clock, Navigation } from 'lucide-react'

const hours = [
  { day: 'Thursday', hours: '10:00 PM — 4:00 AM' },
  { day: 'Friday', hours: '10:00 PM — 5:00 AM' },
  { day: 'Saturday', hours: '10:00 PM — 5:00 AM' },
  { day: 'Special Events', hours: 'See event listings' },
]

export default function LocationSection() {
  return (
    <section id="location" className="py-24 sm:py-32 relative">
      <div className="grain-overlay" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Find Us
          </h2>
          <p className="text-night-400 text-sm tracking-[0.2em] uppercase mb-6">
            Naama Bay, Sharm El Sheikh
          </p>
          <div className="flex justify-center">
            <div className="gold-shimmer h-[1px] w-20 rounded-full" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-0 items-start">
          {/* Map — takes 3/5 on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <div className="aspect-[4/3] lg:aspect-[16/10] rounded-2xl overflow-hidden border border-night-700/50 bg-night-800">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3597.6!2d34.3275!3d27.9125!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDU0JzQ1LjAiTiAzNMKwMTknMzkuMCJF!5e0!3m2!1sen!2seg!4v1700000000000!5m2!1sen!2seg"
                className="w-full h-full border-0 grayscale-[0.8] contrast-[1.1] invert-[0.92] hue-rotate-[180deg] brightness-[0.8]"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Taj Mahal location"
              />
            </div>
          </motion.div>

          {/* Info card — overlaps map on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 lg:-ml-8 lg:mt-8"
          >
            <div className="bg-night-900/95 backdrop-blur-sm border border-night-700/50 rounded-2xl p-6 sm:p-8 relative">
              {/* Art deco corners */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-gold-500/20" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-gold-500/20" />

              {/* Address */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Navigation className="w-5 h-5 text-gold-500" />
                  <h3 className="font-display text-white font-semibold text-lg">Address</h3>
                </div>
                <p className="text-night-300 text-sm leading-relaxed pl-8">
                  Naama Bay, Sharm El Sheikh,<br />
                  South Sinai, Egypt
                </p>
              </div>

              {/* Operating Hours */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <Clock className="w-5 h-5 text-gold-500" />
                  <h3 className="font-display text-white font-semibold text-lg">Hours</h3>
                </div>
                <div className="pl-8 space-y-3">
                  {hours.map(({ day, hours: time }) => (
                    <div key={day} className="flex items-center justify-between pb-3 border-b border-night-700/30 last:border-0">
                      <span className="text-night-200 text-sm font-medium">{day}</span>
                      <span className="text-gold-400 text-sm">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
