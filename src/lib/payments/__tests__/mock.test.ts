import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MockPaymentProvider } from '../mock'

describe('MockPaymentProvider', () => {
  const provider = new MockPaymentProvider()

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCheckoutSession', () => {
    it('returns object with provider set to mock', async () => {
      const session = await provider.getCheckoutSession()
      expect(session.provider).toBe('mock')
    })

    it('includes test card configuration', async () => {
      const session = await provider.getCheckoutSession()
      expect(session.clientConfig).toHaveProperty('testCards')
      expect(session.clientConfig.testCards).toHaveProperty('success')
      expect(session.clientConfig.testCards).toHaveProperty('decline')
    })
  })

  describe('processPayment', () => {
    it('returns success with transaction ID for normal token', async () => {
      const promise = provider.processPayment('tok_valid', 1000, 'EGP', 'order-123')
      await vi.advanceTimersByTimeAsync(1600)
      const result = await promise

      expect(result.success).toBe(true)
      expect(result.transactionId).toBeDefined()
      expect(result.transactionId).toMatch(/^MOCK-/)
      expect(result.error).toBeUndefined()
    })

    it('transaction ID has correct format', async () => {
      const promise = provider.processPayment('tok_valid', 1000, 'EGP', 'order-123')
      await vi.advanceTimersByTimeAsync(1600)
      const result = await promise

      expect(result.transactionId).toMatch(/^MOCK-[A-Z0-9]+-[A-Z0-9]+$/)
    })

    it('generates unique transaction IDs', async () => {
      const promise1 = provider.processPayment('tok_1', 1000, 'EGP', 'order-1')
      await vi.advanceTimersByTimeAsync(1600)
      const result1 = await promise1

      const promise2 = provider.processPayment('tok_2', 1000, 'EGP', 'order-2')
      await vi.advanceTimersByTimeAsync(1600)
      const result2 = await promise2

      expect(result1.transactionId).not.toBe(result2.transactionId)
    })

    it('returns failure for tok_decline token', async () => {
      const promise = provider.processPayment('tok_decline', 1000, 'EGP', 'order-123')
      await vi.advanceTimersByTimeAsync(1600)
      const result = await promise

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('declined')
      expect(result.transactionId).toBe('')
    })
  })

  describe('refundPayment', () => {
    it('returns success with refund ID', async () => {
      const promise = provider.refundPayment('txn-123', 1000, 'EGP')
      await vi.advanceTimersByTimeAsync(1100)
      const result = await promise

      expect(result.success).toBe(true)
      expect(result.refundId).toBeDefined()
      expect(result.refundId).toMatch(/^MOCK-REF-/)
    })

    it('refund ID has correct format', async () => {
      const promise = provider.refundPayment('txn-123', 1000, 'EGP')
      await vi.advanceTimersByTimeAsync(1100)
      const result = await promise

      expect(result.refundId).toMatch(/^MOCK-REF-[A-Z0-9]+$/)
    })

    it('generates unique refund IDs', async () => {
      const promise1 = provider.refundPayment('txn-1', 1000, 'EGP')
      await vi.advanceTimersByTimeAsync(1100)
      const result1 = await promise1

      const promise2 = provider.refundPayment('txn-2', 1000, 'EGP')
      await vi.advanceTimersByTimeAsync(1100)
      const result2 = await promise2

      expect(result1.refundId).not.toBe(result2.refundId)
    })
  })
})
