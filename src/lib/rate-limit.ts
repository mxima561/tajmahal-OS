import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting with automatic backend selection:
 * - Upstash Redis when UPSTASH_REDIS_REST_URL is configured (recommended for production)
 * - In-memory fallback for development or single-instance deployments
 *
 * Note: In-memory state resets on deploy/restart and is per-instance.
 */

// ─── In-memory fallback ─────────────────────────────────────────────────────

type RateLimitEntry = {
  timestamps: number[]
}

const memoryStore = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupMemory(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const cutoff = now - windowMs
  memoryStore.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t: number) => t > cutoff)
    if (entry.timestamps.length === 0) {
      memoryStore.delete(key)
    }
  })
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; retryAfterMs: number } {
  cleanupMemory(windowMs)

  const now = Date.now()
  const cutoff = now - windowMs

  let entry = memoryStore.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    memoryStore.set(key, entry)
  }

  entry.timestamps = entry.timestamps.filter((t: number) => t > cutoff)

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow + windowMs - now
    return { limited: true, remaining: 0, retryAfterMs }
  }

  entry.timestamps.push(now)
  return {
    limited: false,
    remaining: limit - entry.timestamps.length,
    retryAfterMs: 0,
  }
}

// ─── Upstash Redis backend ──────────────────────────────────────────────────

let redis: Redis | null = null
const upstashLimiters = new Map<string, Ratelimit>()

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  redis = new Redis({ url, token })
  return redis
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redisClient = getRedis()
  if (!redisClient) return null

  const key = `${limit}:${windowMs}`
  let limiter = upstashLimiters.get(key)
  if (!limiter) {
    const windowStr =
      windowMs >= 86400000
        ? `${Math.round(windowMs / 86400000)} d`
        : windowMs >= 3600000
          ? `${Math.round(windowMs / 3600000)} h`
          : windowMs >= 60000
            ? `${Math.round(windowMs / 60000)} m`
            : `${Math.round(windowMs / 1000)} s`

    limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(
        limit,
        windowStr as Parameters<typeof Ratelimit.slidingWindow>[1]
      ),
      prefix: '@tajmahal/ratelimit',
      analytics: true,
      ephemeralCache: new Map(),
    })
    upstashLimiters.set(key, limiter)
  }
  return limiter
}

// ─── Public API (unchanged interface) ────────────────────────────────────────

/**
 * Check if a request should be rate-limited.
 * Automatically uses Upstash Redis if configured, otherwise falls back to in-memory.
 *
 * @param key - Unique identifier (e.g. IP address)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { limited: boolean, remaining: number, retryAfterMs: number }
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ limited: boolean; remaining: number; retryAfterMs: number }> {
  const upstashLimiter = getUpstashLimiter(limit, windowMs)

  if (upstashLimiter) {
    const { success, remaining, reset } = await upstashLimiter.limit(key)
    return {
      limited: !success,
      remaining,
      retryAfterMs: success ? 0 : Math.max(0, reset - Date.now()),
    }
  }

  // Fallback to in-memory
  return memoryRateLimit(key, limit, windowMs)
}

/**
 * Pre-configured rate limiters for specific routes.
 */
export const RATE_LIMITS = {
  /** Checkout: 10 requests per hour per identifier */
  checkout: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** VIP inquiry: 5 requests per day per identifier */
  vip: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  /** Scanner: 30 requests per minute per identifier */
  scanner: { limit: 30, windowMs: 60 * 1000 },
  /** Global API: 1000 requests per minute per IP */
  global: { limit: 1000, windowMs: 60 * 1000 },
} as const
