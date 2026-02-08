import Link from 'next/link'
import { Instagram } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-taj-dark text-white py-12 md:py-20 border-t border-white/5 relative z-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Newsletter */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display text-2xl font-bold uppercase">Stay Updated</h3>
            <p className="text-gray-400 max-w-sm">
              Sign up now to receive pre-sale access, exclusive invites, and event updates.
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="email"
                placeholder="EMAIL ADDRESS"
                className="bg-white/5 border border-white/10 px-4 py-3 rounded-lg flex-grow text-sm focus:outline-none focus:border-taj-gold transition-colors"
              />
              <button className="bg-taj-gold text-black font-bold uppercase text-sm px-6 py-3 rounded-lg hover:bg-white transition-colors">
                Subscribe
              </button>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 md:gap-12 text-sm text-gray-400">
            <div>
              <h4 className="text-white font-bold uppercase mb-4">Explore</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#events" className="hover:text-taj-gold transition-colors">
                    Events Calendar
                  </Link>
                </li>
                <li>
                  <Link href="/vip" className="hover:text-taj-gold transition-colors">
                    VIP Experience
                  </Link>
                </li>
                <li>
                  <Link href="#gallery" className="hover:text-taj-gold transition-colors">
                    Gallery
                  </Link>
                </li>
                <li>
                  <Link href="#location" className="hover:text-taj-gold transition-colors">
                    Location
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase mb-4">Info</h4>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:info@tajmahal-sharm.com" className="hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="hover:text-white transition-colors">
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/tajmahalssh"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-taj-gold hover:text-black transition-all"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            &copy; 2026 Taj Mahal Sharm. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
