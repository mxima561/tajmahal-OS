import crypto from 'crypto'
import QRCode from 'qrcode'

function getQRSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET
  if (!secret) {
    throw new Error('QR_SIGNING_SECRET environment variable is required')
  }
  return secret
}

export function generateQRPayload(ticketId: string, eventId: string): {
  qrCode: string
  qrSignature: string
} {
  // Generate 4-char nonce using cryptographically secure randomness
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const randomBytes = crypto.randomBytes(4)
  let nonce = ''
  for (let i = 0; i < 4; i++) {
    nonce += chars.charAt(randomBytes[i] % chars.length)
  }

  const payload = `TM:${ticketId}:${eventId}:${nonce}`
  const signature = crypto
    .createHmac('sha256', getQRSecret())
    .update(payload)
    .digest('hex')
    .substring(0, 32)

  const qrCode = `${payload}:${signature}`
  return { qrCode, qrSignature: signature }
}

export function validateQRCode(qrData: string): {
  valid: boolean
  ticketId?: string
  eventId?: string
  error?: string
} {
  const parts = qrData.split(':')
  if (parts.length !== 5 || parts[0] !== 'TM') {
    return { valid: false, error: 'Invalid QR code format' }
  }

  const [prefix, ticketId, eventId, nonce, receivedSignature] = parts
  const payload = `${prefix}:${ticketId}:${eventId}:${nonce}`
  const expectedSignature = crypto
    .createHmac('sha256', getQRSecret())
    .update(payload)
    .digest('hex')
    .substring(0, 32)

  // Use constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(receivedSignature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: 'Invalid ticket — signature mismatch' }
  }

  return { valid: true, ticketId, eventId }
}

export async function generateQRImage(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  })
}
