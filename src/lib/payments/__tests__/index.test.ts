import { describe, it, expect, vi } from 'vitest'
import { getPaymentProvider } from '../index'
import { MockPaymentProvider } from '../mock'
import { CyberSourceProvider } from '../cybersource'

describe('Payment Factory', () => {
  describe('when PAYMENT_PROVIDER=mock', () => {
    it('returns MockPaymentProvider in test environment', () => {
      vi.stubEnv('PAYMENT_PROVIDER', 'mock')
      vi.stubEnv('NODE_ENV', 'test')
      
      const provider = getPaymentProvider()
      
      expect(provider).toBeInstanceOf(MockPaymentProvider)
      vi.unstubAllEnvs()
    })

    it('throws error in production environment', () => {
      vi.stubEnv('PAYMENT_PROVIDER', 'mock')
      vi.stubEnv('NODE_ENV', 'production')
      
      expect(() => getPaymentProvider()).toThrow(
        '[FATAL] Mock payment provider cannot be used in production'
      )
      vi.unstubAllEnvs()
    })
  })

  describe('when PAYMENT_PROVIDER=cybersource', () => {
    it('returns CyberSourceProvider', () => {
      vi.stubEnv('PAYMENT_PROVIDER', 'cybersource')
      vi.stubEnv('CYBERSOURCE_MERCHANT_ID', 'test-merchant')
      vi.stubEnv('CYBERSOURCE_ACCESS_KEY', 'test-access-key')
      vi.stubEnv('CYBERSOURCE_SECRET_KEY', 'test-secret-key')
      vi.stubEnv('CYBERSOURCE_PROFILE_ID', 'test-profile')
      
      const provider = getPaymentProvider()
      
      expect(provider).toBeInstanceOf(CyberSourceProvider)
      vi.unstubAllEnvs()
    })
  })

  describe('when PAYMENT_PROVIDER is not set', () => {
    it('defaults to mock provider in non-production', () => {
      vi.stubEnv('NODE_ENV', 'test')
      
      const provider = getPaymentProvider()
      
      expect(provider).toBeInstanceOf(MockPaymentProvider)
      vi.unstubAllEnvs()
    })
  })

  describe('when PAYMENT_PROVIDER is unknown', () => {
    it('throws error for unknown provider', () => {
      vi.stubEnv('PAYMENT_PROVIDER', 'unknown-provider')
      
      expect(() => getPaymentProvider()).toThrow('Unknown payment provider: unknown-provider')
      vi.unstubAllEnvs()
    })
  })
})
