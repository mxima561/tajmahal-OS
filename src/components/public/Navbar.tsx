'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const MENU_ITEMS = [
  { label: 'Events', href: '#events' },
  { label: 'VIP', href: '/vip' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Location', href: '#location' },
  { label: 'Contact', href: 'mailto:info@tajmahal-sharm.com' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-40 transition-all duration-300 px-4 py-4 md:px-8 md:py-6 flex justify-between items-center pointer-events-none">
        {/* Logo pill */}
        <div className={`pointer-events-auto transition-opacity duration-300 ${scrolled ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
          <Link href="/" className="block">
            <div className="font-display font-bold text-2xl md:text-3xl tracking-tighter text-white bg-taj-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              TAJ MAHAL
            </div>
          </Link>
        </div>

        {/* Menu button */}
        <button
          onClick={() => setMenuOpen(true)}
          className="pointer-events-auto group flex items-center gap-3 bg-white text-taj-black px-5 py-2.5 rounded-full font-medium text-sm uppercase tracking-wide hover:bg-taj-gold transition-colors duration-300 shadow-lg"
        >
          <span className="hidden md:block">Menu</span>
          <Menu size={18} />
        </button>
      </header>

      {/* Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-taj-black transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] ${
          menuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* Close button */}
        <div className="absolute top-0 right-0 p-6 z-20">
          <button
            onClick={() => setMenuOpen(false)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Menu links */}
        <div className="h-full w-full flex items-center justify-center">
          <nav className="flex flex-col items-center gap-4 md:gap-6">
            {MENU_ITEMS.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`text-4xl md:text-6xl font-display font-bold uppercase text-white hover:text-taj-gold transition-all duration-300 transform ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? `${index * 50}ms` : '0ms' }}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-12 flex gap-6 text-gray-400">
              <span className="hover:text-white transition-colors cursor-pointer">EN</span>
              <span>/</span>
              <span className="hover:text-white transition-colors cursor-pointer">AR</span>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
