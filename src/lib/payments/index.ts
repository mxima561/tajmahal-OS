import { PaymentProvider } from './types'
import { MockPaymentProvider } from './mock'
import { CyberSourceProvider } from './cybersource'

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || 'mock'

  switch (provider) {
    case 'mock':
      return new MockPaymentProvider()
    case 'cybersource':
      return new CyberSourceProvider()
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }
}

export type { PaymentProvider, PaymentResult, RefundResult, CheckoutSession } from './types'
