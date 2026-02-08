import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkoutSessionStore } from '@/lib/payments/checkout-session-store'
import { rateLimit } from '@/lib/rate-limit'

const SANDBOX_URL = 'https://testsecureacceptance.cybersource.com/pay'
const PRODUCTION_URL = 'https://secureacceptance.cybersource.com/pay'

const secureAcceptanceSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(
    z.object({
      ticketTypeId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10),
    })
  ).min(1).max(20),
  customer: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(254),
    phone: z.string().max(20).optional(),
  }),
  idempotencyKey: z.string().min(1).max(100),
})

function signParams(params: Record<string, string>, secretKey: string): string {
  const fields = params.signed_field_names?.split(',') || []
  const dataToSign = fields.map(f => `${f}=${params[f]}`).join(',')
  return crypto.createHmac('sha256', secretKey).update(dataToSign).digest('base64')
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const { limited, retryAfterMs } = await rateLimit(`sa:${ip}`, 10, 60000)
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
      )
    }

    const body = await request.json()
    const parsed = secureAcceptanceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    const { eventId, items, customer, idempotencyKey } = parsed.data

    if (process.env.PAYMENT_PROVIDER !== 'cybersource') {
      return NextResponse.json({ error: 'CyberSource not configured' }, { status: 400 })
    }

    const profileId = process.env.CYBERSOURCE_PROFILE_ID
    const accessKey = process.env.CYBERSOURCE_ACCESS_KEY
    const secretKey = process.env.CYBERSOURCE_SECRET_KEY
    const environment = process.env.CYBERSOURCE_ENVIRONMENT || 'sandbox'

    if (!profileId || !accessKey || !secretKey) {
      console.error('[SecureAcceptance] Missing CyberSource credentials')
      return NextResponse.json({ error: 'Payment configuration incomplete' }, { status: 500 })
    }

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

    const ticketTypeIds = items.map(i => i.ticketTypeId)
    const { data: ticketTypes, error: ticketError } = await supabase
      .from('ticket_types')
      .select('id, name, price, quantity_total, quantity_sold')
      .in('id', ticketTypeIds)
      .eq('event_id', eventId)

    if (ticketError || !ticketTypes?.length) {
      return NextResponse.json({ error: 'Ticket types not found' }, { status: 404 })
    }

    let totalAmount = 0
    for (const item of items) {
      const ticketType = ticketTypes.find(t => t.id === item.ticketTypeId)
      if (!ticketType) {
        return NextResponse.json({ error: `Ticket type ${item.ticketTypeId} not found` }, { status: 400 })
      }
      const available = ticketType.quantity_total - (ticketType.quantity_sold ?? 0)
      if (item.quantity > available) {
        return NextResponse.json({ error: `Not enough tickets available for ${ticketType.name}` }, { status: 400 })
      }
      totalAmount += ticketType.price * item.quantity
    }

    const transactionUuid = crypto.randomUUID()
    const referenceNumber = `TM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    // UTC ISO 8601 without milliseconds — required format for CyberSource SA
    const signedDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

    const nameParts = customer.name.trim().split(/\s+/)
    const firstName = nameParts[0] || 'Customer'
    const lastName = nameParts.slice(1).join(' ') || firstName

    checkoutSessionStore.set(referenceNumber, {
      eventId,
      items,
      customer,
      idempotencyKey,
    })

    const signedFieldsList = [
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
      'bill_to_address_line1',
      'bill_to_address_city',
      'bill_to_address_state',
      'bill_to_address_postal_code',
      'bill_to_address_country',
    ]

    if (customer.phone?.trim()) {
      signedFieldsList.push('bill_to_phone')
    }

    const signedFieldNames = signedFieldsList.join(',')

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
      amount: totalAmount.toFixed(2),
      currency: 'EGP',
      bill_to_forename: firstName,
      bill_to_surname: lastName,
      bill_to_email: customer.email,
      bill_to_address_line1: 'N/A',
      bill_to_address_city: 'Sharm El Sheikh',
      bill_to_address_state: 'South Sinai',
      bill_to_address_postal_code: '00000',
      bill_to_address_country: 'EG',
    }

    if (customer.phone?.trim()) {
      params.bill_to_phone = customer.phone.trim()
    }

    params.signature = signParams(params, secretKey)

    const checkoutUrl = environment === 'production' ? PRODUCTION_URL : SANDBOX_URL

    console.log('[SecureAcceptance] Request prepared:', {
      checkoutUrl,
      amount: params.amount,
      currency: params.currency,
      referenceNumber,
    })

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
