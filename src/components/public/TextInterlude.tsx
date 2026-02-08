'use client'

import Link from 'next/link'

export default function TextInterlude() {
  return (
    <section className="relative py-32 px-4 bg-taj-black z-20">
      <div className="container mx-auto max-w-4xl text-center">
        <h3 className="font-display text-6xl md:text-9xl font-bold text-taj-dark mb-8 uppercase select-none opacity-50">
          The Experience
        </h3>
        <p className="text-xl md:text-3xl font-light leading-relaxed text-gray-300">
          Officially the crown jewel of Sharm El Sheikh nightlife.{' '}
          <br className="hidden md:block" />
          <span className="text-taj-gold font-normal">Taj Mahal</span> is a sensory
          masterpiece featuring world-class sound, immersive production, and an atmosphere
          that transcends borders.
        </p>
        <div className="mt-12">
          <Link
            href="#location"
            className="text-sm font-bold uppercase tracking-[0.2em] border-b border-taj-gold pb-1 hover:text-taj-gold transition-colors"
          >
            Discover The Club
          </Link>
        </div>
      </div>
    </section>
  )
}
