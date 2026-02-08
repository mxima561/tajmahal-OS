'use client'

import Link from 'next/link'

export default function VipSection() {
  return (
    <section id="vip" className="relative py-32 px-4 bg-taj-black z-20">
      <div className="container mx-auto max-w-4xl text-center">
        <h3 className="font-display text-6xl md:text-9xl font-bold text-taj-dark mb-8 uppercase select-none opacity-50">
          VIP
        </h3>
        <h2 className="font-display text-5xl md:text-7xl font-bold uppercase mb-6 text-white">
          VIP Experience
        </h2>
        <p className="text-xl md:text-2xl font-light leading-relaxed text-gray-300 max-w-2xl mx-auto mb-12">
          Elevate your night with premium seating, bottle service, and a personal host.
          Skip the line and enjoy panoramic views of the dance floor.
        </p>
        <Link
          href="/vip"
          className="inline-block bg-taj-gold text-black font-bold uppercase px-10 py-4 rounded-full hover:bg-white transition-colors duration-300"
        >
          Reserve VIP
        </Link>
      </div>
    </section>
  )
}
