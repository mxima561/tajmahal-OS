'use client'

import { useEffect, useState } from 'react'

export default function HeroSection() {
  const [scrollOffset, setScrollOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollOffset(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Parallax background */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${scrollOffset * 0.5}px)` }}
      >
        <div className="absolute inset-0 bg-black/30 z-10" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landingpagecover.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-display font-bold text-[18vw] md:text-[14vw] leading-[0.8] text-white uppercase tracking-tighter mix-blend-overlay">
          Taj Mahal
        </h1>
        <h2 className="font-display font-bold text-[8vw] md:text-[4vw] leading-none text-white/90 uppercase tracking-widest mt-2 md:mt-4">
          Sharm El Sheikh
        </h2>

        <div className="mt-12 animate-fade-in">
          <a
            href="#events"
            className="inline-block bg-taj-gold text-taj-black font-bold uppercase tracking-wide py-4 px-10 rounded-full hover:bg-white transition-colors duration-300"
          >
            Book Tickets
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-0 w-full text-center z-20">
        <p className="text-white/60 text-sm uppercase tracking-widest animate-bounce">
          Scroll to Explore
        </p>
      </div>
    </section>
  )
}
