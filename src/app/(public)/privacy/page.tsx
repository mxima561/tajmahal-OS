import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Taj Mahal',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-night-950 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-night max-w-none space-y-6 text-night-300 text-sm leading-relaxed">
          <p>Last updated: February 2026</p>

          <h2 className="text-lg font-semibold text-white mt-8">Information We Collect</h2>
          <p>
            When you purchase tickets, we collect your name, email address, and phone
            number. Payment processing is handled by our third-party payment provider —
            we do not store credit card details on our servers.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">How We Use Your Information</h2>
          <p>
            Your information is used to process ticket orders, send order confirmations
            and QR codes, and communicate event updates or cancellations. We may also
            use your email to send promotional offers — you can opt out at any time.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">Data Sharing</h2>
          <p>
            We do not sell your personal data. Information may be shared with payment
            processors and email service providers solely for order fulfillment.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">Data Security</h2>
          <p>
            We implement industry-standard security measures including encrypted
            connections (HTTPS), secure database access controls, and cryptographically
            signed QR codes to protect your ticket data.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">Contact</h2>
          <p>
            For privacy-related inquiries, contact us at{' '}
            <a href="mailto:info@tajmahal-sharm.com" className="text-gold-400 hover:text-gold-300">
              info@tajmahal-sharm.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}
