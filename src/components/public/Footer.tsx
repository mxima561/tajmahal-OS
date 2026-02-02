import Link from 'next/link'
import { Instagram, MapPin, Mail, Phone, Clock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative bg-night-900/80">
      {/* Gold shimmer top border */}
      <div className="gold-shimmer h-[1px] w-full" />

      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/TajMahallogo.png"
              alt="Taj Mahal"
              className="h-20 w-auto mb-4"
            />
            <p className="text-night-400 text-sm leading-relaxed mb-5">
              Sharm El Sheikh&apos;s premier nightlife destination. World-class DJs,
              stunning production, and unforgettable nights.
            </p>
            <div className="flex items-center gap-2 text-night-500 text-xs">
              <MapPin className="w-3.5 h-3.5 text-gold-500/50 shrink-0" />
              <span>Naama Bay, Sharm El Sheikh</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-[0.25em] uppercase mb-6">
              Navigate
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Events', href: '#events' },
                { label: 'VIP Experience', href: '#vip' },
                { label: 'Location', href: '#location' },
                { label: 'Contact', href: 'mailto:info@tajmahal-sharm.com' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover-underline text-night-400 hover:text-gold-400 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-[0.25em] uppercase mb-6">
              Hours
            </h4>
            <div className="space-y-2.5">
              {[
                { day: 'Thu', hours: '10 PM — 4 AM' },
                { day: 'Fri', hours: '10 PM — 5 AM' },
                { day: 'Sat', hours: '10 PM — 5 AM' },
              ].map(({ day, hours }) => (
                <div key={day} className="flex items-center gap-3 text-sm">
                  <span className="text-night-500 w-8">{day}</span>
                  <Clock className="w-3 h-3 text-gold-500/40" />
                  <span className="text-night-400">{hours}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-[0.25em] uppercase mb-6">
              Connect
            </h4>
            <div className="flex gap-3 mb-6">
              <a
                href="https://www.instagram.com/tajmahalssh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full border border-night-700 flex items-center justify-center text-night-400 hover:border-gold-500/50 hover:text-gold-400 transition-all duration-300"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
            <div className="space-y-2">
              <a href="mailto:info@tajmahal-sharm.com" className="flex items-center gap-2 text-night-400 hover:text-gold-400 transition-colors text-sm">
                <Mail className="w-3.5 h-3.5" />
                info@tajmahal-sharm.com
              </a>
              <a href="tel:+20123456789" className="flex items-center gap-2 text-night-400 hover:text-gold-400 transition-colors text-sm">
                <Phone className="w-3.5 h-3.5" />
                +20 123 456 789
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-night-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-night-600 text-xs">
              &copy; 2026 Taj Mahal. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-night-600 hover:text-night-400 text-xs transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-night-600 hover:text-night-400 text-xs transition-colors">
                Privacy
              </Link>
              <Link href="/refund-policy" className="text-night-600 hover:text-night-400 text-xs transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Art deco corner accent */}
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-gold-500/10 pointer-events-none" />
    </footer>
  )
}
