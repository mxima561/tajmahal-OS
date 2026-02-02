import Link from 'next/link'
import { Instagram, MapPin, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-night-900 border-t border-night-700/50">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* About */}
          <div>
            <h3 className="text-gold-gradient text-xl font-bold tracking-[0.15em] mb-4">
              TAJ MAHAL
            </h3>
            <p className="text-night-300 text-sm leading-relaxed mb-6">
              Sharm El Sheikh&apos;s premier nightlife destination. World-class DJs,
              stunning production, and unforgettable nights on the Red Sea coast.
            </p>
            <div className="flex items-center gap-2 text-night-400 text-sm">
              <MapPin className="w-4 h-4 text-gold-500 shrink-0" />
              <span>Naama Bay, Sharm El Sheikh</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-widest uppercase mb-6">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Upcoming Events', href: '#events' },
                { label: 'VIP Experience', href: '#vip' },
                { label: 'Location', href: '#location' },
                { label: 'Contact Us', href: 'mailto:info@tajmahal-sharm.com' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-night-300 hover:text-gold-400 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-widest uppercase mb-6">
              Follow Us
            </h4>
            <div className="flex gap-4 mb-8">
              <a
                href="https://www.instagram.com/tajmahalssh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full border border-night-600 flex items-center justify-center text-night-300 hover:border-gold-500 hover:text-gold-400 transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
            <div className="space-y-2">
              <a href="mailto:info@tajmahal-sharm.com" className="flex items-center gap-2 text-night-400 hover:text-gold-400 transition-colors text-sm">
                <Mail className="w-4 h-4" />
                info@tajmahal-sharm.com
              </a>
              <a href="tel:+20123456789" className="flex items-center gap-2 text-night-400 hover:text-gold-400 transition-colors text-sm">
                <Phone className="w-4 h-4" />
                +20 123 456 789
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-night-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-night-500 text-xs">
              &copy; 2026 Taj Mahal. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-night-500 hover:text-night-300 text-xs transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-night-500 hover:text-night-300 text-xs transition-colors">
                Privacy
              </Link>
              <Link href="/refund-policy" className="text-night-500 hover:text-night-300 text-xs transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
