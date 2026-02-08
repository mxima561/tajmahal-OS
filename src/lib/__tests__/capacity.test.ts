import { describe, it, expect } from 'vitest'
import { getCapacityStatus, getCapacityColor, getCapacityBgColor } from '../capacity'

describe('Capacity Utils', () => {
  describe('getCapacityStatus', () => {
    it('returns "locked" when percentage >= 100', () => {
      expect(getCapacityStatus(100)).toBe('locked')
      expect(getCapacityStatus(105)).toBe('locked')
      expect(getCapacityStatus(150)).toBe('locked')
    })

    it('returns "red" when percentage >= 90 and < 100', () => {
      expect(getCapacityStatus(90)).toBe('red')
      expect(getCapacityStatus(95)).toBe('red')
      expect(getCapacityStatus(99)).toBe('red')
    })

    it('returns "yellow" when percentage >= 80 and < 90', () => {
      expect(getCapacityStatus(80)).toBe('yellow')
      expect(getCapacityStatus(85)).toBe('yellow')
      expect(getCapacityStatus(89)).toBe('yellow')
    })

    it('returns "green" when percentage < 80', () => {
      expect(getCapacityStatus(79)).toBe('green')
      expect(getCapacityStatus(50)).toBe('green')
      expect(getCapacityStatus(0)).toBe('green')
    })

    it('handles boundary values correctly', () => {
      expect(getCapacityStatus(100)).toBe('locked')
      expect(getCapacityStatus(99.9)).toBe('red')
      expect(getCapacityStatus(90)).toBe('red')
      expect(getCapacityStatus(89.9)).toBe('yellow')
      expect(getCapacityStatus(80)).toBe('yellow')
      expect(getCapacityStatus(79.9)).toBe('green')
    })
  })

  describe('getCapacityColor', () => {
    it('returns correct Tailwind class for green status', () => {
      expect(getCapacityColor('green')).toBe('text-green-400')
    })

    it('returns correct Tailwind class for yellow status', () => {
      expect(getCapacityColor('yellow')).toBe('text-yellow-400')
    })

    it('returns correct Tailwind class for red status', () => {
      expect(getCapacityColor('red')).toBe('text-red-400')
    })

    it('returns correct Tailwind class for locked status', () => {
      expect(getCapacityColor('locked')).toBe('text-red-500')
    })
  })

  describe('getCapacityBgColor', () => {
    it('returns correct Tailwind class for green status', () => {
      expect(getCapacityBgColor('green')).toBe('bg-green-500')
    })

    it('returns correct Tailwind class for yellow status', () => {
      expect(getCapacityBgColor('yellow')).toBe('bg-yellow-500')
    })

    it('returns correct Tailwind class for red status', () => {
      expect(getCapacityBgColor('red')).toBe('bg-red-500')
    })

    it('returns correct Tailwind class for locked status', () => {
      expect(getCapacityBgColor('locked')).toBe('bg-red-600')
    })
  })
})
