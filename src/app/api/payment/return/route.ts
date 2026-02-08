import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateQRPayload } from '@/lib/qr'
import { generateOrderNumber, generateDisplayCode, formatEventDate } from '@/lib/utils/format'
import { sendOrderConfirmation } from '@/lib/email'
import { checkoutSessionStore } from '@/lib/payments/checkout-session-store'
import { generateConfirmationToken } from '@/lib/confirmation-token'
import { rateLimit } from '@/lib/rate-limit'

function verifySignature(params: Record<string, string>, signature: string, secretKey: string): boolean {
  const fields = params.signed_field_names?.split(',') || []
  const dataToSign = fields.map(f => `${f}=${params[f]}`).join(',')
  const expected = crypto.createHmac('sha256', secretKey).update(dataToSign).digest('base64')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const { limited } = await rateLimit(`payment-return:${ip}`, 15, 60000)
    if (limited) {
      return NextResponse.redirect(`${siteUrl}/checkout?error=rate_limited`)
    }

    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    console.log('[PaymentReturn] Decision:', params.decision, 'Reason:', params.reason_code)

    const secretKey = process.env.CYBERSOURCE_SECRET_KEY
    if (!secretKey) {
      console.error('[PaymentReturn] Missing secret key')
      return NextResponse.redirect(`${siteUrl}/checkout?error=config`)
    }

    const signature = params.signature
    if (!signature || !verifySignature(params, signature, secretKey)) {
      console.error('[PaymentReturn] Invalid signature')
      return NextResponse.redirect(`${siteUrl}/checkout?error=signature`)
    }

    const decision = params.decision
    const reasonCode = params.reason_code
    const transactionId = params.transaction_id || params.request_id

    if (decision !== 'ACCEPT') {
      const errorMsg = params.message || getDeclineMessage(decision, reasonCode)
      console.error('[PaymentReturn] Payment failed:', decision, reasonCode, errorMsg)
      return NextResponse.redirect(
        `${siteUrl}/checkout?error=${encodeURIComponent(errorMsg)}`
      )
    }

    const referenceNumber = params.req_reference_number
    if (!referenceNumber) {
      console.error('[PaymentReturn] Missing reference_number in response')
      return NextResponse.redirect(`${siteUrl}/checkout?error=missing_data`)
    }

    const orderData = checkoutSessionStore.get(referenceNumber)
    if (!orderData) {
      console.error('[PaymentReturn] No checkout session found for:', referenceNumber)
      return NextResponse.redirect(`${siteUrl}/checkout?error=session_expired`)
    }

    checkoutSessionStore.delete(referenceNumber)

    const { eventId, items, customer, idempotencyKey } = orderData

    const supabase = await createServiceRoleClient()

    // Check idempotency - return existing order if already processed
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single()

    if (existingOrder) {
      console.log('[PaymentReturn] Existing order found:', existingOrder.id)
      const existingToken = generateConfirmationToken(existingOrder.id)
      return NextResponse.redirect(`${siteUrl}/confirmation?orderId=${existingOrder.id}&token=${existingToken}`)
    }

    // Verify event exists and is published
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, cancelled_at, start_time')
      .eq('id', eventId)
      .single()

    if (eventError || !event || event.status !== 'published' || event.cancelled_at) {
      console.error('[PaymentReturn] Event not available:', eventId)
      return NextResponse.redirect(`${siteUrl}/checkout?error=event_unavailable`)
    }

    // Reserve tickets
    let subtotal = 0
    const ticketTypeDetails: { id: string; name: string; price: number; quantity: number }[] = []

    for (const item of items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error: rpcError } = await (supabase.rpc as any)('reserve_tickets', {
          p_ticket_type_id: item.ticketTypeId,
          p_event_id: eventId,
          p_quantity: item.quantity,
        }) as { data: any; error: any }

      if (rpcError) {
        for (const tt of ticketTypeDetails) {
          await (supabase.rpc as any)('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
        }
        console.error('[PaymentReturn] Reserve failed:', rpcError)
        return NextResponse.redirect(`${siteUrl}/checkout?error=tickets_unavailable`)
      }

      if (!result.success) {
        for (const tt of ticketTypeDetails) {
          await (supabase.rpc as any)('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
        }
        console.error('[PaymentReturn] Reserve failed:', result.error)
        return NextResponse.redirect(`${siteUrl}/checkout?error=${encodeURIComponent(result.error || 'tickets_unavailable')}`)
      }

      subtotal += result.price! * result.quantity!
      ticketTypeDetails.push({
        id: item.ticketTypeId,
        name: result.name!,
        price: result.price!,
        quantity: result.quantity!,
      })
    }

    const total = subtotal

    // Upsert customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, total_orders, total_spent')
      .eq('email', customer.email)
      .single()

    let customerId: string

    if (existingCustomer) {
      customerId = existingCustomer.id
      await supabase
        .from('customers')
        .update({
          name: customer.name,
          phone: customer.phone || null,
          last_order_at: new Date().toISOString(),
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_spent: (existingCustomer.total_spent || 0) + total,
        })
        .eq('id', customerId)
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({
          email: customer.email,
          name: customer.name,
          phone: customer.phone || null,
          first_order_at: new Date().toISOString(),
          last_order_at: new Date().toISOString(),
          total_orders: 1,
          total_spent: total,
        })
        .select('id')
        .single()

      if (custError || !newCustomer) {
        console.error('[PaymentReturn] Customer creation failed:', custError)
        for (const tt of ticketTypeDetails) {
          await (supabase.rpc as any)('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
        }
        return NextResponse.redirect(`${siteUrl}/checkout?error=order_failed`)
      }
      customerId = newCustomer.id
    }

    // Create order
    const orderNumber = generateOrderNumber()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        event_id: eventId,
        customer_id: customerId,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || null,
        subtotal,
        total,
        currency: 'EGP',
        status: 'completed',
        payment_status: 'paid',
        payment_provider: 'cybersource',
        payment_transaction_id: transactionId,
        idempotency_key: idempotencyKey,
        turnstile_verified: false,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[PaymentReturn] Order creation failed:', orderError)
      for (const tt of ticketTypeDetails) {
        await (supabase.rpc as any)('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
      }
      return NextResponse.redirect(`${siteUrl}/checkout?error=order_failed`)
    }

    // Create order items
    const orderItems = ticketTypeDetails.map((tt) => ({
      order_id: order.id,
      ticket_type_id: tt.id,
      quantity: tt.quantity,
      unit_price: tt.price,
      total_price: tt.price * tt.quantity,
    }))

    await supabase.from('order_items').insert(orderItems)

    const ticketRows: {
      id: string
      order_id: string
      ticket_type_id: string
      qr_code: string
      qr_signature: string
      display_code: string
      status: string
    }[] = []
    const tickets: { id: string; qrCode: string; displayCode: string; ticketTypeId: string }[] = []

    for (const tt of ticketTypeDetails) {
      for (let i = 0; i < tt.quantity; i++) {
        const ticketId = crypto.randomUUID()
        const displayCode = generateDisplayCode()
        const { qrCode, qrSignature } = generateQRPayload(ticketId, eventId)

        ticketRows.push({
          id: ticketId,
          order_id: order.id,
          ticket_type_id: tt.id,
          qr_code: qrCode,
          qr_signature: qrSignature,
          display_code: displayCode,
          status: 'valid',
        })

        tickets.push({
          id: ticketId,
          qrCode,
          displayCode,
          ticketTypeId: tt.id,
        })
      }
    }

    const { error: ticketInsertError } = await supabase.from('tickets').insert(ticketRows)
    if (ticketInsertError) {
      console.error('[PaymentReturn] Ticket batch insert failed:', ticketInsertError)
    }

    // Send confirmation email (fire-and-forget)
    sendOrderConfirmation({
      to: customer.email,
      customerName: customer.name,
      orderNumber,
      eventName: event.name,
      eventDate: formatEventDate(event.start_time || new Date().toISOString()),
      tickets: tickets.map((t) => {
        const tt = ticketTypeDetails.find((td) => td.id === t.ticketTypeId) || ticketTypeDetails[0]
        return {
          typeName: tt?.name || 'Ticket',
          displayCode: t.displayCode,
          qrCode: t.qrCode,
        }
      }),
      total,
      currency: 'EGP',
    }).catch((err) => console.error('[PaymentReturn] Email failed:', err))

    console.log('[PaymentReturn] Order created:', order.id, orderNumber)

    const confirmToken = generateConfirmationToken(order.id)
    return NextResponse.redirect(`${siteUrl}/confirmation?orderId=${order.id}&token=${confirmToken}`)
  } catch (err) {
    console.error('[PaymentReturn] Error:', err)
    return NextResponse.redirect(`${siteUrl}/checkout?error=unexpected`)
  }
}

// Also handle GET for browser redirects
export async function GET(request: Request) {
  return POST(request)
}

function getDeclineMessage(decision: string, reasonCode: string): string {
  switch (decision) {
    case 'DECLINE':
      return 'Your payment was declined. Please try a different card.'
    case 'REVIEW':
      return 'Your payment requires review. Please try again later.'
    case 'ERROR':
      return 'A payment error occurred. Please try again.'
    case 'CANCEL':
      return 'Payment was cancelled.'
    default:
      return `Payment failed (${reasonCode || decision})`
  }
}
