import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatEventDate,
  formatEventTime,
  generateOrderNumber,
  generateDisplayCode,
  generateSlug,
} from '../format'

describe('Format Utils', () => {
  describe('formatCurrency', () => {
    it('formats amount with EGP currency', () => {
      const result = formatCurrency(1500)
      
      expect(result).toContain('1,500')
      expect(result).toContain('EGP')
    })

    it('formats zero correctly', () => {
      const result = formatCurrency(0)
      
      expect(result).toContain('0')
      expect(result).toContain('EGP')
    })

    it('formats large numbers with thousands separators', () => {
      const result = formatCurrency(1234567)
      
      expect(result).toMatch(/1,234,567/)
    })

    it('handles decimal amounts', () => {
      const result = formatCurrency(99.95)
      
      expect(result).toMatch(/99\.95/)
    })
  })

  describe('formatEventDate', () => {
    it('returns formatted date string', () => {
      const result = formatEventDate('2025-12-25T20:00:00Z')
      
      expect(result).toMatch(/December/)
      expect(result).toMatch(/25/)
      expect(result).toMatch(/2025/)
    })

    it('includes day of week', () => {
      const result = formatEventDate('2025-12-25T20:00:00Z')
      
      expect(result).toMatch(/Thursday/)
    })
  })

  describe('formatEventTime', () => {
    it('returns time string in 12-hour format', () => {
      const result = formatEventTime('2025-12-25T20:00:00Z')
      
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(am|pm)/i)
    })

    it('formats times consistently in 12-hour format', () => {
      const result1 = formatEventTime('2025-12-25T00:00:00Z')
      const result2 = formatEventTime('2025-12-25T12:00:00Z')
      
      expect(result1).toMatch(/\d{1,2}:\d{2}\s?(am|pm)/i)
      expect(result2).toMatch(/\d{1,2}:\d{2}\s?(am|pm)/i)
    })
  })

  describe('generateOrderNumber', () => {
    it('starts with TM- prefix', () => {
      const result = generateOrderNumber()
      
      expect(result).toMatch(/^TM-/)
    })

    it('contains timestamp component', () => {
      const result = generateOrderNumber()
      const parts = result.split('-')
      
      expect(parts.length).toBe(3)
      expect(parts[0]).toBe('TM')
      expect(parts[1].length).toBeGreaterThan(0)
    })

    it('generates unique order numbers', () => {
      const numbers = new Set()
      for (let i = 0; i < 100; i++) {
        numbers.add(generateOrderNumber())
      }
      
      expect(numbers.size).toBe(100)
    })

    it('contains only uppercase alphanumeric characters after prefix', () => {
      const result = generateOrderNumber()
      const withoutPrefix = result.substring(3) // Remove 'TM-'
      
      expect(withoutPrefix).toMatch(/^[A-Z0-9-]+$/)
    })
  })

  describe('generateDisplayCode', () => {
    it('has format TM-XXXX', () => {
      const result = generateDisplayCode()
      
      expect(result).toMatch(/^TM-[A-Z0-9]{4}$/)
    })

    it('uses only non-ambiguous characters', () => {
      const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const result = generateDisplayCode()
      const code = result.substring(3) // Remove 'TM-'
      
      for (const char of code) {
        expect(validChars).toContain(char)
      }
    })

    it('excludes ambiguous characters 0, 1, I, O', () => {
      const ambiguousChars = ['0', '1', 'I', 'O']
      
      for (let i = 0; i < 50; i++) {
        const result = generateDisplayCode()
        const code = result.substring(3)
        
        for (const ambiguous of ambiguousChars) {
          expect(code).not.toContain(ambiguous)
        }
      }
    })

    it('generates different codes on each call', () => {
      const codes = new Set()
      for (let i = 0; i < 50; i++) {
        codes.add(generateDisplayCode())
      }
      
      expect(codes.size).toBeGreaterThan(40) // Allow for some collisions given 4 chars
    })
  })

  describe('generateSlug', () => {
    it('converts to lowercase', () => {
      const result = generateSlug('Hello World')
      
      expect(result).toBe('hello-world')
    })

    it('replaces spaces with hyphens', () => {
      const result = generateSlug('Hello World')
      
      expect(result).toBe('hello-world')
    })

    it('removes special characters', () => {
      const result = generateSlug('Hello World!')
      
      expect(result).toBe('hello-world')
    })

    it('handles multiple special characters', () => {
      const result = generateSlug('Hello @#$ World!!!')
      
      expect(result).toBe('hello-world')
    })

    it('removes leading and trailing hyphens', () => {
      const result = generateSlug('  Hello World  ')
      
      expect(result).not.toMatch(/^-/)
      expect(result).not.toMatch(/-$/)
    })

    it('collapses multiple hyphens', () => {
      const result = generateSlug('Hello    World')
      
      expect(result).toBe('hello-world')
    })

    it('handles already-clean slugs', () => {
      const result = generateSlug('hello-world')
      
      expect(result).toBe('hello-world')
    })
  })
})
