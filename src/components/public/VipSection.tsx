'use client'

import { motion } from 'framer-motion'
import { Crown, Wine, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Crown,
    title: 'Priority Access',
    description: 'Skip the line with exclusive VIP entry and reserved premium seating',
  },
  {
    icon: Wine,
    title: 'Bottle Service',
    description: 'Full bottle service with premium spirits and dedicated mixologist',
  },
  {
    icon: Star,
    title: 'Personal Host',
    description: 'A dedicated VIP host ensures every moment of your night is flawless',
  },
]

export default function VipSection() {
  return (
    <section id="vip" className="relative overflow-hidden">
      {/* Section divider */}
      <div className="section-divider" />

      <div className="relative py-24 sm:py-32">
        {/* Background image with heavy overlay */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-night-950/85" />
        <div className="absolute inset-0 geo-pattern" />
        <div className="grain-overlay" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <p className="text-gold-500/70 text-xs tracking-[0.4em] uppercase mb-4">
              Exclusive
            </p>
            <h2 className="font-display text-gold-gradient text-4xl sm:text-5xl md:text-6xl font-bold mb-4 tracking-tight">
              VIP Experience
            </h2>
            <p className="text-night-200/70 text-lg font-light max-w-2xl mx-auto leading-relaxed">
              Elevate your night with our exclusive VIP service. Premium tables,
              panoramic views, and a private host for an unforgettable evening.
            </p>
            <div className="flex justify-center mt-8">
              <div className="gold-shimmer h-[1px] w-20 rounded-full" />
            </div>
          </motion.div>

          {/* Features — horizontal on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-16">
            {features.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="text-center group"
              >
                <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-gold-500/15 group-hover:border-gold-500/30 transition-all duration-500">
                  <Icon className="w-7 h-7 text-gold-500" />
                </div>
                <h3 className="font-display text-white text-lg font-semibold mb-2 tracking-wide">
                  {title}
                </h3>
                <div className="gold-shimmer h-[1px] w-8 mx-auto rounded-full mb-3" />
                <p className="text-night-300 text-sm leading-relaxed">
                  {description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <Link
              href="/vip"
              className="group inline-flex items-center gap-3 border-2 border-gold-500/50 hover:border-gold-500 text-gold-400 hover:text-night-950 hover:bg-gold-500 font-bold text-sm px-10 py-4 rounded-full transition-all duration-500 tracking-[0.2em] uppercase"
            >
              Reserve VIP
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Section divider */}
      <div className="section-divider" />
    </section>
  )
}
