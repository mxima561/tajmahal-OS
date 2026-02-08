import crypto from 'crypto'
import { PaymentProvider, CheckoutSession, PaymentResult, RefundResult } from './types'

/**
 * CyberSource Secure Acceptance Payment Provider
 * 
 * Sandbox Test Cards:
 * - Visa (success):        4111111111111111  (any future exp, any CVV)
 * - Mastercard (success):  5555555555554444
 * - Amex (success):        378282246310005
 * - Visa (decline):        4000000000000002
 * - Insufficient funds:    4000000000009995
 * 
 * @see https://developer.cybersource.com/hello-world/testing-guide.html
 */

const SANDBOX_HOST = 'apitest.cybersource.com'
const PRODUCTION_HOST = 'api.cybersource.com'

interface CyberSourceConfig {
  merchantId: string
  accessKey: string  // Access Key for Secure Acceptance
  secretKey: string  // Secret Key for Secure Acceptance signing
  environment: 'sandbox' | 'production'
  profileId?: string  // Secure Acceptance Profile ID
}

function getConfig(): CyberSourceConfig {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID
  const accessKey = process.env.CYBERSOURCE_ACCESS_KEY
  const secretKey = process.env.CYBERSOURCE_SECRET_KEY
  const environment = (process.env.CYBERSOURCE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'
  const profileId = process.env.CYBERSOURCE_PROFILE_ID

  if (!merchantId || !accessKey || !secretKey) {
    throw new Error('CyberSource credentials not configured')
  }

  return { merchantId, accessKey, secretKey, environment, profileId }
}

/**
 * Validate CyberSource configuration at startup.
 * Call this during app initialization to fail fast on missing credentials.
 */
export function validateCyberSourceConfig(): { valid: boolean; missing: string[] } {
  const required = [
    'CYBERSOURCE_MERCHANT_ID',
    'CYBERSOURCE_ACCESS_KEY',
    'CYBERSOURCE_SECRET_KEY',
  ] as const

  const missing = required.filter(key => !process.env[key])

  return {
    valid: missing.length === 0,
    missing,
  }
}

function getHost(config: CyberSourceConfig): string {
  return config.environment === 'production' ? PRODUCTION_HOST : SANDBOX_HOST
}

function generateDigest(payload: string): string {
  const hash = crypto.createHash('sha256').update(payload, 'utf8').digest('base64')
  return `SHA-256=${hash}`
}

function generateSignature(
  config: CyberSourceConfig,
  method: string,
  path: string,
  date: string,
  digest: string | null
): string {
  const host = getHost(config)

  // Build signing string
  const signingParts: string[] = []
  const headerNames: string[] = []

  // host header
  headerNames.push('host')
  signingParts.push(`host: ${host}`)

  // date header
  headerNames.push('date')
  signingParts.push(`date: ${date}`)

  // request-target
  headerNames.push('(request-target)')
  signingParts.push(`(request-target): ${method.toLowerCase()} ${path}`)

  // digest (for POST/PUT)
  if (digest) {
    headerNames.push('digest')
    signingParts.push(`digest: ${digest}`)
  }

  // v-c-merchant-id
  headerNames.push('v-c-merchant-id')
  signingParts.push(`v-c-merchant-id: ${config.merchantId}`)

  const signingString = signingParts.join('\n')

  // Create HMAC signature
  // Support both base64 (standard) and hex (alternative) secret formats
  let decodedSecret: Buffer
  if (/^[0-9a-fA-F]+$/.test(config.secretKey) && config.secretKey.length > 100) {
    // Long hex string - decode as hex
    decodedSecret = Buffer.from(config.secretKey, 'hex')
    // hex-encoded secret
  } else {
    // Standard base64 secret
    decodedSecret = Buffer.from(config.secretKey, 'base64')
  }
  const signature = crypto
    .createHmac('sha256', decodedSecret)
    .update(signingString)
    .digest('base64')

  // Build authorization header
  return `keyid="${config.accessKey}", algorithm="HmacSHA256", headers="${headerNames.join(' ')}", signature="${signature}"`
}

async function makeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: object
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const config = getConfig()
  const host = getHost(config)
  const date = new Date().toUTCString()
  const payload = body ? JSON.stringify(body) : ''
  const digest = body ? generateDigest(payload) : null

  const signature = generateSignature(config, method, path, date, digest)

  const headers: Record<string, string> = {
    'Host': host,
    'Date': date,
    'v-c-merchant-id': config.merchantId,
    'Signature': signature,
    'Content-Type': 'application/json',
  }

  if (digest) {
    headers['Digest'] = digest
  }

  try {
    const response = await fetch(`https://${host}${path}`, {
      method,
      headers,
      body: payload || undefined,
    })

    const responseText = await response.text()

    if (!response.ok) {
      // Try to parse error as JSON
      let errorData: { message?: string; reason?: string; details?: Array<{ field?: string; reason?: string }> } | undefined
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // Error response not JSON
      }
      console.error('[CyberSource] API Error:', response.status)
      const detailsMsg = errorData?.details?.map(d => `${d.field}: ${d.reason}`).join(', ')
      return {
        success: false,
        error: detailsMsg || errorData?.message || errorData?.reason || `HTTP ${response.status}`,
        status: response.status,
      }
    }

    // Try to parse as JSON
    let data: T
    try {
      data = JSON.parse(responseText) as T
    } catch {
      data = responseText as T
    }

    return { success: true, data, status: response.status }
  } catch (err) {
    console.error('[CyberSource] Fetch error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

interface RefundResponse {
  id: string
  status: string
  errorInformation?: { reason?: string; message?: string }
}

export class CyberSourceProvider implements PaymentProvider {
  async getCheckoutSession(): Promise<CheckoutSession> {
    // For Secure Acceptance Hosted Checkout, we don't need to create a session
    // The actual payment flow is handled via form POST redirect to CyberSource
    // See: /api/payment/secure-acceptance for form data generation

    const config = getConfig()

    return {
      provider: 'cybersource',
      clientConfig: {
        // Minimal config for Secure Acceptance redirect flow
        environment: config.environment,
      },
    }
  }

  async processPayment(
    _token: string,
    _amount: number,
    _currency: string,
    _orderId: string
  ): Promise<PaymentResult> {
    // With Secure Acceptance Hosted Checkout, payment processing happens on CyberSource's
    // hosted page and the result is returned via redirect to /api/payment/return
    // This method is not used in the Secure Acceptance flow
    return {
      success: false,
      transactionId: '',
      error: 'CyberSource Secure Acceptance uses redirect flow - processPayment should not be called directly',
    }
  }

  async refundPayment(transactionId: string, amount: number, currency = 'EGP'): Promise<RefundResult> {
    const requestBody = {
      orderInformation: {
        amountDetails: {
          totalAmount: (amount / 100).toFixed(2),
          currency: currency,
        },
      },
    }

    const result = await makeRequest<RefundResponse>(
      'POST',
      `/pts/v2/payments/${transactionId}/refunds`,
      requestBody
    )

    if (!result.success || !result.data) {
      return {
        success: false,
        refundId: '',
        error: result.error || 'Refund processing failed',
      }
    }

    const { status, id, errorInformation } = result.data

    if (status === 'PENDING' || status === 'SUCCEEDED') {
      return {
        success: true,
        refundId: id,
      }
    }

    return {
      success: false,
      refundId: id || '',
      error: errorInformation?.message || 'Refund was declined',
    }
  }
}
