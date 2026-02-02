import { PaymentProvider, CheckoutSession, PaymentResult, RefundResult } from './types'

export class MockPaymentProvider implements PaymentProvider {
  async getCheckoutSession(): Promise<CheckoutSession> {
    return {
      provider: 'mock',
      clientConfig: {
        testCards: {
          success: '4111111111111111',
          decline: '4000000000000002',
        },
      },
    }
  }

  async processPayment(
    token: string,
    _amount: number,
    _currency: string,
    _orderId: string
  ): Promise<PaymentResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simulate declined card
    if (token === 'tok_decline') {
      return {
        success: false,
        transactionId: '',
        error: 'Your card was declined. Please try another card.',
      }
    }

    // Generate mock transaction ID
    const transactionId = `MOCK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    return {
      success: true,
      transactionId,
    }
  }

  async refundPayment(_transactionId: string, _amount: number): Promise<RefundResult> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      success: true,
      refundId: `MOCK-REF-${Date.now().toString(36).toUpperCase()}`,
    }
  }
}
