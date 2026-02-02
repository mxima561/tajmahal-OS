import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy | Taj Mahal',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-night-950 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Refund Policy</h1>

        <div className="prose prose-invert prose-night max-w-none space-y-6 text-night-300 text-sm leading-relaxed">
          <p>Last updated: February 2026</p>

          <h2 className="text-lg font-semibold text-white mt-8">General Policy</h2>
          <p>
            All ticket purchases are final. Refunds are not offered for change of plans,
            scheduling conflicts, or failure to attend the event.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">Event Cancellation</h2>
          <p>
            If an event is cancelled by Taj Mahal, all ticket holders will receive a
            full refund to their original payment method. Refunds will be processed
            within 14 business days of the cancellation announcement.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">Event Rescheduling</h2>
          <p>
            If an event is rescheduled, your tickets remain valid for the new date.
            If you cannot attend the rescheduled event, you may request a refund within
            7 days of the rescheduling announcement.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8">How to Request a Refund</h2>
          <p>
            Eligible refund requests should be sent to{' '}
            <a href="mailto:info@tajmahal-sharm.com" className="text-gold-400 hover:text-gold-300">
              info@tajmahal-sharm.com
            </a>{' '}
            with your order number and the email used during purchase.
          </p>
        </div>
      </div>
    </div>
  )
}
