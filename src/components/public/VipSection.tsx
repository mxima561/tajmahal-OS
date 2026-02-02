'use client'

import { motion } from 'framer-motion'
import { Crown, Wine, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function VipSection() {
  return (
    <section id="vip" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-gold-500/[0.03] rounded-full blur-[120px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Image placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-gold-500/20">
              {/* Placeholder gradient mimicking a dark VIP lounge */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold-900/30 via-night-900 to-purple-950/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-night-950/80 via-transparent to-transparent" />

              {/* Decorative elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gold-500/10 rounded-full blur-[60px]" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="gold-shimmer h-[1px] rounded-full" />
              </div>

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Crown className="w-20 h-20 text-gold-500/20" />
              </div>
            </div>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h2 className="text-gold-gradient text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              VIP Experience
            </h2>

            <p className="text-night-200 text-lg leading-relaxed mb-8">
              Elevate your night with our exclusive VIP service. Premium tables with
              panoramic views, dedicated bottle service, and a private host ensuring
              every moment is flawless.
            </p>

            <div className="space-y-5 mb-10">
              {[
                { icon: Crown, text: 'Priority entry & reserved premium seating' },
                { icon: Wine, text: 'Full bottle service with premium spirits' },
                { icon: Star, text: 'Dedicated VIP host for your party' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-gold-500" />
                  </div>
                  <span className="text-night-200 text-sm sm:text-base">{text}</span>
                </div>
              ))}
            </div>

            <Link
              href="/vip"
              className="group inline-flex items-center gap-3 bg-transparent border-2 border-gold-500 text-gold-400 hover:bg-gold-500 hover:text-night-950 font-bold text-sm px-8 py-3.5 rounded-full transition-all duration-500 tracking-[0.15em] uppercase"
            >
              Reserve VIP
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
