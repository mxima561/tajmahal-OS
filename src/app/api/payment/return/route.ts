import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateQRPayload } from '@/lib/qr'
import { generateOrderNumber, generateDisplayCode, formatEventDate } from '@/lib/utils/format'
import { sendOrderConfirmation } from '@/lib/email'

// Verify HMAC-SHA256 signature from CyberSource
function verifySignature(params: Record<string, string>, signature: string, secretKey: string): boolean {
  const signedFieldNames = params.signed_field_names?.split(',') || []
  const dataToSign = signedFieldNames
    .map(field => `${field}=${params[field]}`)
    .join(',')

  // Decode secret key (hex format for Secure Acceptance)
  let decodedSecret: Buffer
  if (/^[0-9a-fA-F]+$/.test(secretKey) && secretKey.length > 50) {
    decodedSecret = Buffer.from(secretKey, 'hex')
  } else {
    decodedSecret = Buffer.from(secretKey, 'base64')
  }

  const expectedSignature = crypto
    .createHmac('sha256', decodedSecret)
    .update(dataToSign)
    .digest('base64')

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    // Parse form data from CyberSource POST
    const formData = await request.formData()
    const params: Record<string, string> = {}

    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    console.log('[PaymentReturn] Received params:', Object.keys(params).join(', '))

    // Verify signature
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

    // Check payment decision
    const decision = params.decision
    const reasonCode = params.reason_code
    const transactionId = params.transaction_id || params.request_id

    console.log('[PaymentReturn] Decision:', decision, 'Reason:', reasonCode, 'TxID:', transactionId)

    if (decision !== 'ACCEPT') {
      // Payment was declined or errored
      const errorMsg = params.message || getDeclineMessage(decision, reasonCode)
      console.error('[PaymentReturn] Payment failed:', decision, reasonCode, errorMsg)
      return NextResponse.redirect(
        `${siteUrl}/checkout?error=${encodeURIComponent(errorMsg)}`
      )
    }

    // Extract order data from merchant_defined_data1
    const orderDataBase64 = params.merchant_defined_data1
    if (!orderDataBase64) {
      console.error('[PaymentReturn] Missing order data')
      return NextResponse.redirect(`${siteUrl}/checkout?error=missing_data`)
    }

    let orderData: {
      eventId: string
      items: Array<{ ticketTypeId: string; quantity: number }>
      customer: { name: string; email: string; phone?: string }
      idempotencyKey: string
    }

    try {
      orderData = JSON.parse(Buffer.from(orderDataBase64, 'base64').toString('utf8'))
    } catch {
      console.error('[PaymentReturn] Invalid order data')
      return NextResponse.redirect(`${siteUrl}/checkout?error=invalid_data`)
    }

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
      return NextResponse.redirect(`${siteUrl}/confirmation?orderId=${existingOrder.id}`)
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
      const { data: result, error: rpcError } = await supabase
        .rpc('reserve_tickets', {
          p_ticket_type_id: item.ticketTypeId,
          p_event_id: eventId,
          p_quantity: item.quantity,
        })

      if (rpcError) {
        for (const tt of ticketTypeDetails) {
          await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
        }
        console.error('[PaymentReturn] Reserve failed:', rpcError)
        return NextResponse.redirect(`${siteUrl}/checkout?error=tickets_unavailable`)
      }

      if (!result.success) {
        for (const tt of ticketTypeDetails) {
          await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
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
          await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
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
        await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
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

    // Create individual tickets with QR codes
    const tickets: { id: string; qrCode: string; displayCode: string; ticketTypeId: string }[] = []

    for (const tt of ticketTypeDetails) {
      for (let i = 0; i < tt.quantity; i++) {
        const displayCode = generateDisplayCode()
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            order_id: order.id,
            ticket_type_id: tt.id,
            qr_code: `temp-${Date.now()}-${Math.random()}`,
            qr_signature: 'temp',
            display_code: displayCode,
            status: 'valid',
          })
          .select('id')
          .single()

        if (ticketError || !ticket) {
          console.error('[PaymentReturn] Ticket creation failed:', ticketError)
          continue
        }

        const { qrCode, qrSignature } = generateQRPayload(ticket.id, eventId)

        await supabase
          .from('tickets')
          .update({ qr_code: qrCode, qr_signature: qrSignature })
          .eq('id', ticket.id)

        tickets.push({
          id: ticket.id,
          qrCode,
          displayCode,
          ticketTypeId: tt.id,
        })
      }
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

    // Redirect to confirmation page
    return NextResponse.redirect(`${siteUrl}/confirmation?orderId=${order.id}`)
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
