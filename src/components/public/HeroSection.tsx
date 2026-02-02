'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function HeroSection() {
  const scrollToEvents = () => {
    document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient simulating dark nightclub atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0015] via-[#0a0a1a] to-night-950" />

      {/* Subtle radial glow effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-900/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-gold-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-800/10 rounded-full blur-[80px]" />
      </div>

      {/* Subtle grain overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Thin gold line above */}
          <div className="flex justify-center mb-8">
            <div className="gold-shimmer h-[1px] w-24 rounded-full" />
          </div>

          {/* Main heading */}
          <h1 className="text-gold-gradient text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-[0.15em] leading-none mb-6">
            TAJ MAHAL
          </h1>

          {/* Animated shimmer line below heading */}
          <div className="flex justify-center mb-8">
            <div className="gold-shimmer h-[2px] w-48 sm:w-64 rounded-full" />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-night-200 text-lg sm:text-xl md:text-2xl font-light tracking-widest uppercase mb-12"
        >
          Sharm El Sheikh&apos;s Premier Nightlife Destination
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            onClick={scrollToEvents}
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-night-950 font-bold text-sm sm:text-base px-10 py-4 rounded-full transition-all duration-500 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 hover:scale-105 tracking-[0.2em] uppercase"
          >
            Explore Events
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-6 h-6 text-gold-500/50" />
        </motion.div>
      </motion.div>
    </section>
  )
}
