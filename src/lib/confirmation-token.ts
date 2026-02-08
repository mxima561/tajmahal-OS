import crypto from 'crypto'

/**
 * Generate a short-lived HMAC token for confirmation page access.
 * Token format: {expiry_hex}:{hmac_signature}
 * Valid for 1 hour by default.
 */
const TOKEN_TTL_MS = 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET
  if (!secret) {
    throw new Error('QR_SIGNING_SECRET environment variable is required')
  }
  return secret
}

export function generateConfirmationToken(orderId: string): string {
  const expiry = Date.now() + TOKEN_TTL_MS
  const expiryHex = expiry.toString(16)
  const payload = `confirmation:${orderId}:${expiryHex}`
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex')
    .substring(0, 32)

  return `${expiryHex}.${signature}`
}

export function validateConfirmationToken(orderId: string, token: string): boolean {
  if (!token || !orderId) return false

  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) return false

  const expiryHex = token.substring(0, dotIndex)
  const receivedSig = token.substring(dotIndex + 1)

  const expiry = parseInt(expiryHex, 16)
  if (isNaN(expiry) || Date.now() > expiry) return false

  const payload = `confirmation:${orderId}:${expiryHex}`
  const expectedSig = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex')
    .substring(0, 32)

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    )
  } catch {
    return false
  }
}
