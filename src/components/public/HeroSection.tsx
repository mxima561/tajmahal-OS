'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function HeroSection() {
  const scrollToEvents = () => {
    document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Venue photo background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/Friday-Night-atTaj-Mahal-Club-Sharm-El-Sheikh.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Cinematic overlay layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-night-950/70 via-night-950/40 to-night-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-night-950/50 via-transparent to-night-950/50" />
      <div className="absolute inset-0 bg-night-950/30" />

      {/* Grain texture */}
      <div className="grain-overlay" />

      {/* Floating ambient particles */}
      <div className="particle" style={{ top: '20%', left: '15%', animationDelay: '0s' }} />
      <div className="particle" style={{ top: '60%', left: '80%', animationDelay: '2s' }} />
      <div className="particle" style={{ top: '35%', right: '20%', animationDelay: '4s' }} />
      <div className="particle" style={{ bottom: '30%', left: '25%', animationDelay: '6s' }} />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Art deco frame around content */}
        <div className="art-deco-frame p-8 sm:p-12 md:p-16">
          <div className="art-deco-frame-inner absolute inset-0" />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease }}
          >
            {/* Decorative top element */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '6rem' }}
              transition={{ duration: 1, delay: 0.3, ease }}
              className="gold-shimmer h-[1px] mx-auto mb-10 rounded-full"
            />

            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/TajMahallogo.png"
              alt="Taj Mahal"
              className="w-[80vw] sm:w-[70vw] md:w-[55vw] lg:w-[45vw] max-w-3xl h-auto mx-auto mb-4"
            />

            {/* Decorative line below heading */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '16rem' }}
              transition={{ duration: 1, delay: 0.5, ease }}
              className="gold-shimmer h-[2px] mx-auto mb-8 rounded-full"
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease }}
            className="text-night-100/80 text-base sm:text-lg md:text-xl font-light tracking-[0.35em] uppercase mb-14"
          >
            Sharm El Sheikh&apos;s Premier Nightlife
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
          >
            <button
              onClick={scrollToEvents}
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-night-950 font-bold text-sm px-10 py-4 rounded-full transition-all duration-500 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 hover:scale-[1.03] tracking-[0.2em] uppercase"
            >
              Explore Events
            </button>
            <Link
              href="/vip"
              className="group inline-flex items-center gap-3 border border-gold-500/40 hover:border-gold-500 text-gold-400 hover:text-gold-300 font-semibold text-sm px-10 py-4 rounded-full transition-all duration-500 tracking-[0.2em] uppercase hover:shadow-lg hover:shadow-gold-500/10"
            >
              Reserve VIP
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <button
          onClick={scrollToEvents}
          className="pulse-ring w-10 h-10 rounded-full border border-gold-500/30 flex items-center justify-center"
        >
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-5 h-5 text-gold-500/60" />
          </motion.div>
        </button>
      </motion.div>
    </section>
  )
}
