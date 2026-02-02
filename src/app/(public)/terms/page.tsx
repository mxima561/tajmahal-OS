import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Taj Mahal',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-night-950 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Terms &amp; Conditions</h1>

        <div className="prose prose-invert prose-night max-w-none space-y-6 text-night-300 text-sm leading-relaxed">
          <p>Last updated: February 2026</p>

          <h2 className="text-lg font-semibold text-white mt-8">1. Ticket Purchases</h2>
          <p>
            All ticket sales are final unless the event is cancelled by the organizer.
            Tickets are non-transferable and must be presented via the original QR code
            at the venue entrance. Each ticket grants single-use entry — duplicate
            presentations will be rejected.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">2. Age Requirement</h2>
          <p>
            Guests must be 18 years or older to attend events at Taj Mahal.
            Valid government-issued photo ID is required at the door.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">3. Venue Rules</h2>
          <p>
            Management reserves the right to refuse entry or remove any guest who
            violates venue policies, behaves disruptively, or poses a safety risk.
            No outside food, beverages, or prohibited substances are permitted.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">4. Event Changes</h2>
          <p>
            Event dates, lineups, and times are subject to change. In the event of
            cancellation, ticket holders will be contacted via their purchase email
            for refund arrangements.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">5. Liability</h2>
          <p>
            Taj Mahal is not responsible for lost, stolen, or damaged personal property.
            Attendance is at your own risk. By purchasing a ticket you agree to these terms.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">6. Contact</h2>
          <p>
            For questions regarding these terms, contact us at{' '}
            <a href="mailto:info@tajmahal-sharm.com" className="text-gold-400 hover:text-gold-300">
              info@tajmahal-sharm.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}
