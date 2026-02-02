'use client'

import { QrCode, ExternalLink, Smartphone } from 'lucide-react'
import Link from 'next/link'

export default function AdminScannerPage() {
  const scannerUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/scanner`
      : '/scanner'

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <QrCode className="w-7 h-7 text-gold-500" />
        <h1 className="text-2xl font-bold">Check-in Scanner</h1>
      </div>

      <div className="bg-night-900 border border-night-700 rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-gold-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-night-200 text-sm">
              The scanner is designed for mobile use at the door. Share this link
              with door staff — they can bookmark it on their phones for quick access.
            </p>
            <div className="bg-night-800 border border-night-600 rounded-lg px-4 py-3">
              <code className="text-gold-400 text-sm break-all">{scannerUrl}</code>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/scanner"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-night-950 font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open Scanner
          </Link>
        </div>
      </div>

      <div className="bg-night-900/50 border border-night-800 rounded-xl p-4">
        <p className="text-night-400 text-xs leading-relaxed">
          Staff members log in at <span className="text-night-300">/scanner/login</span> with
          their staff credentials. Any role (staff, manager, super_admin) can use the scanner.
        </p>
      </div>
    </div>
  )
}
