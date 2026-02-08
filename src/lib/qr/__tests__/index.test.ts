import { describe, it, expect, beforeEach } from 'vitest'
import { generateQRPayload, validateQRCode, generateQRImage } from '../index'

describe('QR Code Functions', () => {
  beforeEach(() => {
    process.env.QR_SIGNING_SECRET = 'test-secret-key-12345'
  })

  describe('generateQRPayload', () => {
    it('returns object with qrCode and qrSignature', () => {
      const result = generateQRPayload('ticket-123', 'event-456')
      
      expect(result).toHaveProperty('qrCode')
      expect(result).toHaveProperty('qrSignature')
      expect(typeof result.qrCode).toBe('string')
      expect(typeof result.qrSignature).toBe('string')
    })

    it('generates QR code in correct format TM:ticketId:eventId:nonce:signature', () => {
      const result = generateQRPayload('ticket-123', 'event-456')
      const parts = result.qrCode.split(':')
      
      expect(parts.length).toBe(5)
      expect(parts[0]).toBe('TM')
      expect(parts[1]).toBe('ticket-123')
      expect(parts[2]).toBe('event-456')
    })

    it('generates 4-character nonce from valid charset', () => {
      const result = generateQRPayload('ticket-123', 'event-456')
      const parts = result.qrCode.split(':')
      const nonce = parts[3]
      const validChars = 'abcdefghjkmnpqrstuvwxyz23456789'
      
      expect(nonce.length).toBe(4)
      for (const char of nonce) {
        expect(validChars).toContain(char)
      }
    })

    it('generates 32-character hex signature', () => {
      const result = generateQRPayload('ticket-123', 'event-456')
      const parts = result.qrCode.split(':')
      const signature = parts[4]
      
      expect(signature.length).toBe(32)
      expect(signature).toMatch(/^[0-9a-f]{32}$/)
    })

    it('signature matches qrSignature property', () => {
      const result = generateQRPayload('ticket-123', 'event-456')
      const parts = result.qrCode.split(':')
      
      expect(parts[4]).toBe(result.qrSignature)
    })
  })

  describe('validateQRCode', () => {
    it('validates a valid QR code successfully', () => {
      const { qrCode } = generateQRPayload('ticket-123', 'event-456')
      const result = validateQRCode(qrCode)
      
      expect(result.valid).toBe(true)
      expect(result.ticketId).toBe('ticket-123')
      expect(result.eventId).toBe('event-456')
      expect(result.error).toBeUndefined()
    })

    it('returns error for wrong prefix', () => {
      const result = validateQRCode('WRONG:ticket:event:abcd:sig123')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid QR code format')
    })

    it('returns error for wrong part count', () => {
      const result = validateQRCode('TM:ticket:event')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid QR code format')
    })

    it('returns signature mismatch error for tampered data', () => {
      const { qrCode } = generateQRPayload('ticket-123', 'event-456')
      const tampered = qrCode.replace('ticket-123', 'ticket-999')
      const result = validateQRCode(tampered)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid ticket — signature mismatch')
    })

    it('roundtrip test: generate then validate', () => {
      const ticketId = 'test-ticket-abc'
      const eventId = 'test-event-xyz'
      
      const { qrCode } = generateQRPayload(ticketId, eventId)
      const result = validateQRCode(qrCode)
      
      expect(result.valid).toBe(true)
      expect(result.ticketId).toBe(ticketId)
      expect(result.eventId).toBe(eventId)
    })
  })

  describe('generateQRImage', () => {
    it('returns data URL starting with correct prefix', async () => {
      const dataUrl = await generateQRImage('test-data')
      
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    })

    it('generates different images for different data', async () => {
      const dataUrl1 = await generateQRImage('data-1')
      const dataUrl2 = await generateQRImage('data-2')
      
      expect(dataUrl1).not.toBe(dataUrl2)
    })
  })
})
