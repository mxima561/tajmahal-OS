import { PaymentProvider } from './types'
import { MockPaymentProvider } from './mock'

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || 'mock'

  switch (provider) {
    case 'mock':
      return new MockPaymentProvider()
    case 'cybersource':
      // Will be implemented when credentials are available
      throw new Error('CyberSource provider not yet implemented. Set PAYMENT_PROVIDER=mock')
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }
}

export type { PaymentProvider, PaymentResult, RefundResult, CheckoutSession } from './types'
