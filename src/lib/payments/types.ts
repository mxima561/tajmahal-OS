export interface PaymentResult {
  success: boolean
  transactionId: string
  error?: string
}

export interface RefundResult {
  success: boolean
  refundId: string
  error?: string
}

export interface CheckoutSession {
  provider: 'mock' | 'cybersource'
  clientConfig: Record<string, unknown>
}

export interface PaymentProvider {
  getCheckoutSession(): Promise<CheckoutSession>
  processPayment(token: string, amount: number, currency: string, orderId: string): Promise<PaymentResult>
  refundPayment(transactionId: string, amount: number, currency?: string): Promise<RefundResult>
}
