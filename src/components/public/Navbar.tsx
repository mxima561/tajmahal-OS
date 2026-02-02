'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Ticket } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-night-950/90 backdrop-blur-xl border-b border-gold-500/10'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/TajMahallogo.png"
                alt="Taj Mahal"
                className="h-14 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-10">
              <Link
                href="#events"
                className="hover-underline text-xs font-medium text-night-200 hover:text-gold-400 transition-colors tracking-[0.25em] uppercase"
              >
                Events
              </Link>
              <Link
                href="#vip"
                className="hover-underline text-xs font-medium text-night-200 hover:text-gold-400 transition-colors tracking-[0.25em] uppercase"
              >
                VIP
              </Link>
              <Link
                href="#location"
                className="hover-underline text-xs font-medium text-night-200 hover:text-gold-400 transition-colors tracking-[0.25em] uppercase"
              >
                Location
              </Link>
              <Link
                href="#events"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-night-950 font-bold text-xs px-6 py-2.5 rounded-full transition-all duration-300 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 tracking-[0.2em] uppercase"
              >
                <Ticket className="w-3.5 h-3.5" />
                Get Tickets
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-gold-400 p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-night-950/98 backdrop-blur-2xl md:hidden"
          >
            {/* Art deco accents */}
            <div className="absolute top-20 left-8 w-16 h-16 border-t border-l border-gold-500/20" />
            <div className="absolute bottom-20 right-8 w-16 h-16 border-b border-r border-gold-500/20" />

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col items-center justify-center h-full gap-10"
            >
              {/* Decorative line */}
              <div className="gold-shimmer h-[1px] w-16 rounded-full mb-4" />

              <Link
                href="#events"
                onClick={() => setMobileOpen(false)}
                className="font-display text-2xl font-medium text-night-100 hover:text-gold-400 transition-colors tracking-[0.3em] uppercase"
              >
                Events
              </Link>
              <Link
                href="#vip"
                onClick={() => setMobileOpen(false)}
                className="font-display text-2xl font-medium text-night-100 hover:text-gold-400 transition-colors tracking-[0.3em] uppercase"
              >
                VIP
              </Link>
              <Link
                href="#location"
                onClick={() => setMobileOpen(false)}
                className="font-display text-2xl font-medium text-night-100 hover:text-gold-400 transition-colors tracking-[0.3em] uppercase"
              >
                Location
              </Link>

              {/* Decorative line */}
              <div className="gold-shimmer h-[1px] w-16 rounded-full mt-4" />

              <Link
                href="#events"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-600 to-gold-500 text-night-950 font-bold text-base px-10 py-4 rounded-full shadow-lg shadow-gold-500/25 tracking-[0.2em] uppercase"
              >
                <Ticket className="w-5 h-5" />
                Get Tickets
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
