import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const SANDBOX_SECURE_ACCEPTANCE_URL = 'https://testsecureacceptance.cybersource.com/pay'
const PRODUCTION_SECURE_ACCEPTANCE_URL = 'https://secureacceptance.cybersource.com/pay'

interface SecureAcceptanceRequest {
  eventId: string
  items: Array<{ ticketTypeId: string; quantity: number }>
  customer: { name: string; email: string; phone?: string }
  idempotencyKey: string
}

// Generate HMAC-SHA256 signature for Secure Acceptance
function signSecureAcceptanceData(params: Record<string, string>, secretKey: string): string {
  const signedFieldNames = params.signed_field_names?.split(',') || []
  const dataToSign = signedFieldNames
    .map(field => `${field}=${params[field]}`)
    .join(',')

  // Secure Acceptance uses the secret key as a raw UTF-8 string
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(dataToSign)
    .digest('base64')

  return signature
}

export async function POST(request: Request) {
  try {
    const body: SecureAcceptanceRequest = await request.json()
    const { eventId, items, customer, idempotencyKey } = body

    // Validate required fields
    if (!eventId || !items?.length || !customer?.name || !customer?.email || !idempotencyKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if payment provider is CyberSource
    const paymentProvider = process.env.PAYMENT_PROVIDER
    if (paymentProvider !== 'cybersource') {
      return NextResponse.json({ error: 'CyberSource not configured' }, { status: 400 })
    }

    // Get CyberSource credentials
    const merchantId = process.env.CYBERSOURCE_MERCHANT_ID
    const profileId = process.env.CYBERSOURCE_PROFILE_ID
    const accessKey = process.env.CYBERSOURCE_ACCESS_KEY
    const secretKey = process.env.CYBERSOURCE_SECRET_KEY
    const environment = process.env.CYBERSOURCE_ENVIRONMENT || 'sandbox'

    if (!merchantId || !profileId || !accessKey || !secretKey) {
      console.error('[SecureAcceptance] Missing CyberSource credentials')
      return NextResponse.json({ error: 'Payment configuration incomplete' }, { status: 500 })
    }

    // Fetch event and ticket types to calculate total
    const supabase = await createServerSupabaseClient()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.status !== 'published') {
      return NextResponse.json({ error: 'Event is not available' }, { status: 400 })
    }

    // Fetch ticket types and calculate total
    const ticketTypeIds = items.map(i => i.ticketTypeId)
    const { data: ticketTypes, error: ticketError } = await supabase
      .from('ticket_types')
      .select('id, name, price, quantity_total, quantity_sold')
      .in('id', ticketTypeIds)
      .eq('event_id', eventId)

    if (ticketError || !ticketTypes?.length) {
      return NextResponse.json({ error: 'Ticket types not found' }, { status: 404 })
    }

    // Calculate total amount
    let totalAmount = 0
    for (const item of items) {
      const ticketType = ticketTypes.find(t => t.id === item.ticketTypeId)
      if (!ticketType) {
        return NextResponse.json({ error: `Ticket type ${item.ticketTypeId} not found` }, { status: 400 })
      }
      // Check availability
      const available = ticketType.quantity_total - (ticketType.quantity_sold ?? 0)
      if (item.quantity > available) {
        return NextResponse.json({ error: `Not enough tickets available for ${ticketType.name}` }, { status: 400 })
      }
      totalAmount += ticketType.price * item.quantity
    }

    // Convert to decimal format (CyberSource expects amount in major units)
    const amountString = (totalAmount / 100).toFixed(2)

    // Generate unique transaction reference
    const transactionUuid = crypto.randomUUID()
    const referenceNumber = `TM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Set timestamps
    const signedDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

    // Note: Return URLs are configured in CyberSource Business Center profile settings
    // Build form parameters
    // Store order data in the merchant_defined fields for retrieval on return
    const orderData = JSON.stringify({ eventId, items, customer, idempotencyKey })
    const orderDataBase64 = Buffer.from(orderData).toString('base64')

    // Build signed fields - order matters for signature generation
    const signedFieldNames = [
      'access_key',
      'profile_id',
      'transaction_uuid',
      'signed_field_names',
      'unsigned_field_names',
      'signed_date_time',
      'locale',
      'transaction_type',
      'reference_number',
      'amount',
      'currency',
      'bill_to_forename',
      'bill_to_surname',
      'bill_to_email',
      'bill_to_phone',
      'bill_to_address_line1',
      'bill_to_address_city',
      'bill_to_address_state',
      'bill_to_address_postal_code',
      'bill_to_address_country',
      'merchant_defined_data1',
    ].join(',')

    // Parse customer name into first/last
    const nameParts = customer.name.trim().split(/\s+/)
    const firstName = nameParts[0] || 'Customer'
    const lastName = nameParts.slice(1).join(' ') || firstName

    const params: Record<string, string> = {
      access_key: accessKey,
      profile_id: profileId,
      transaction_uuid: transactionUuid,
      signed_field_names: signedFieldNames,
      unsigned_field_names: '',
      signed_date_time: signedDateTime,
      locale: 'en',
      transaction_type: 'sale',
      reference_number: referenceNumber,
      amount: amountString,
      currency: 'EGP',
      bill_to_forename: firstName,
      bill_to_surname: lastName,
      bill_to_email: customer.email,
      bill_to_phone: customer.phone || '',
      bill_to_address_line1: 'N/A',
      bill_to_address_city: 'Sharm El Sheikh',
      bill_to_address_state: 'South Sinai',
      bill_to_address_postal_code: '00000',
      bill_to_address_country: 'EG',
      merchant_defined_data1: orderDataBase64,
    }

    // Generate signature
    const signature = signSecureAcceptanceData(params, secretKey)
    params.signature = signature

    // Determine checkout URL
    const checkoutUrl = environment === 'production'
      ? PRODUCTION_SECURE_ACCEPTANCE_URL
      : SANDBOX_SECURE_ACCEPTANCE_URL

    return NextResponse.json({
      checkoutUrl,
      formParams: params,
      referenceNumber,
    })
  } catch (error) {
    console.error('[SecureAcceptance] Error:', error)
    return NextResponse.json(
      { error: 'Failed to prepare payment' },
      { status: 500 }
    )
  }
}
