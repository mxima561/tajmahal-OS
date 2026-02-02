'use client'

import { motion } from 'framer-motion'
import { MapPin, Clock, Navigation } from 'lucide-react'

export default function LocationSection() {
  return (
    <section id="location" className="py-24 sm:py-32 bg-night-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Find Us
          </h2>
          <div className="flex justify-center">
            <div className="gold-shimmer h-[2px] w-20 rounded-full" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Map placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="aspect-[4/3] rounded-2xl bg-night-800 border border-night-700/50 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              {/* Subtle grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(212,168,67,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.3) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-gold-500/60" />
              </div>
              <p className="text-night-400 text-sm">Map embed coming soon</p>
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            {/* Address */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <Navigation className="w-5 h-5 text-gold-500" />
                <h3 className="text-white font-semibold text-lg">Address</h3>
              </div>
              <p className="text-night-300 text-base leading-relaxed pl-8">
                Naama Bay, Sharm El Sheikh,<br />
                South Sinai, Egypt
              </p>
            </div>

            {/* Operating Hours */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-gold-500" />
                <h3 className="text-white font-semibold text-lg">Operating Hours</h3>
              </div>
              <div className="pl-8 space-y-3">
                {[
                  { day: 'Thursday', hours: '10:00 PM - 4:00 AM' },
                  { day: 'Friday', hours: '10:00 PM - 5:00 AM' },
                  { day: 'Saturday', hours: '10:00 PM - 5:00 AM' },
                  { day: 'Special Events', hours: 'See event listings' },
                ].map(({ day, hours }) => (
                  <div key={day} className="flex items-center justify-between border-b border-night-700/50 pb-3">
                    <span className="text-night-200 text-sm font-medium">{day}</span>
                    <span className="text-gold-400 text-sm">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
