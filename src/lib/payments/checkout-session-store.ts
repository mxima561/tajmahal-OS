export interface CheckoutSessionData {
  eventId: string
  items: Array<{ ticketTypeId: string; quantity: number }>
  customer: { name: string; email: string; phone?: string }
  idempotencyKey: string
}

const SESSION_TTL_MS = 30 * 60 * 1000

interface StoredSession {
  data: CheckoutSessionData
  createdAt: number
}

const globalKey = '__checkout_sessions__' as const

// Persist across HMR in development via globalThis
const store: Map<string, StoredSession> =
  (globalThis as Record<string, unknown>)[globalKey] as Map<string, StoredSession>
  ?? ((globalThis as Record<string, unknown>)[globalKey] = new Map<string, StoredSession>())

function cleanup() {
  const now = Date.now()
  for (const [key, session] of store) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      store.delete(key)
    }
  }
}

export const checkoutSessionStore = {
  set(referenceNumber: string, data: CheckoutSessionData) {
    cleanup()
    store.set(referenceNumber, { data, createdAt: Date.now() })
  },

  get(referenceNumber: string): CheckoutSessionData | null {
    const session = store.get(referenceNumber)
    if (!session) return null
    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      store.delete(referenceNumber)
      return null
    }
    return session.data
  },

  delete(referenceNumber: string) {
    store.delete(referenceNumber)
  },
}
