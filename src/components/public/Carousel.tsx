'use client'

import { useRef, ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface CarouselProps {
  children: ReactNode
}

export default function Carousel({ children }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth * 0.75
      const newScrollLeft =
        direction === 'left'
          ? scrollRef.current.scrollLeft - scrollAmount
          : scrollRef.current.scrollLeft + scrollAmount

      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="relative group">
      {/* Arrow buttons — hidden on mobile, visible on desktop hover */}
      <div className="hidden md:block absolute top-1/2 -translate-y-1/2 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => scroll('left')}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
        >
          <ArrowLeft size={24} />
        </button>
      </div>
      <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => scroll('right')}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
        >
          <ArrowRight size={24} />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-4 px-4 md:px-8 pb-8 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {children}
      </div>
    </div>
  )
}
