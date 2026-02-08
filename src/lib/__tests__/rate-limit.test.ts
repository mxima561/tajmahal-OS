import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit } from '../rate-limit'

describe('Rate Limiter (In-Memory)', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('first request is not limited', async () => {
    const result = await rateLimit('test-key-1', 5, 1000)
    
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(4)
    expect(result.retryAfterMs).toBe(0)
  })

  it('requests within limit are not limited', async () => {
    const key = 'test-key-2'
    const limit = 3
    const windowMs = 1000
    
    const result1 = await rateLimit(key, limit, windowMs)
    const result2 = await rateLimit(key, limit, windowMs)
    const result3 = await rateLimit(key, limit, windowMs)
    
    expect(result1.limited).toBe(false)
    expect(result2.limited).toBe(false)
    expect(result3.limited).toBe(false)
  })

  it('request exceeding limit is limited', async () => {
    const key = 'test-key-3'
    const limit = 2
    const windowMs = 1000
    
    await rateLimit(key, limit, windowMs)
    await rateLimit(key, limit, windowMs)
    const result = await rateLimit(key, limit, windowMs)
    
    expect(result.limited).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('remaining count decreases properly', async () => {
    const key = 'test-key-4'
    const limit = 5
    const windowMs = 1000
    
    const result1 = await rateLimit(key, limit, windowMs)
    const result2 = await rateLimit(key, limit, windowMs)
    const result3 = await rateLimit(key, limit, windowMs)
    
    expect(result1.remaining).toBe(4)
    expect(result2.remaining).toBe(3)
    expect(result3.remaining).toBe(2)
  })

  it('retryAfterMs is greater than 0 when limited', async () => {
    const key = 'test-key-5'
    const limit = 1
    const windowMs = 5000
    
    await rateLimit(key, limit, windowMs)
    const result = await rateLimit(key, limit, windowMs)
    
    expect(result.limited).toBe(true)
    expect(result.retryAfterMs).toBeGreaterThan(0)
    expect(result.retryAfterMs).toBeLessThanOrEqual(windowMs)
  })

  it('different keys have independent limits', async () => {
    const limit = 2
    const windowMs = 1000
    
    await rateLimit('key-a', limit, windowMs)
    await rateLimit('key-a', limit, windowMs)
    const resultA = await rateLimit('key-a', limit, windowMs)
    
    const resultB = await rateLimit('key-b', limit, windowMs)
    
    expect(resultA.limited).toBe(true)
    expect(resultB.limited).toBe(false)
  })

  it('allows requests after window expires', async () => {
    const key = 'test-key-6'
    const limit = 1
    const windowMs = 100
    
    await rateLimit(key, limit, windowMs)
    const limited = await rateLimit(key, limit, windowMs)
    
    expect(limited.limited).toBe(true)
    
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const afterWindow = await rateLimit(key, limit, windowMs)
    expect(afterWindow.limited).toBe(false)
  })
})
