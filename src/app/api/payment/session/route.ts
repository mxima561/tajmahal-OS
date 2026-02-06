import { NextResponse } from 'next/server'
import { getPaymentProvider } from '@/lib/payments'

export async function POST() {
  try {
    const provider = getPaymentProvider()
    const session = await provider.getCheckoutSession()

    return NextResponse.json(session)
  } catch (err) {
    console.error('Payment session error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create payment session' },
      { status: 500 }
    )
  }
}
