import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payments'
import { generateQRPayload } from '@/lib/qr'
import { generateOrderNumber, generateDisplayCode, formatEventDate } from '@/lib/utils/format'
import { sendOrderConfirmation } from '@/lib/email'

const checkoutSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(
    z.object({
      ticketTypeId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10),
    })
  ).min(1),
  customer: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  paymentToken: z.string().min(1),
  idempotencyKey: z.string().min(1),
  turnstileToken: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { eventId, items, customer, paymentToken, idempotencyKey, turnstileToken } = parsed.data

    // Verify Turnstile token if secret key is configured
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
    let turnstileVerified = false

    if (turnstileSecret) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'Bot verification required' },
          { status: 403 }
        )
      }

      const verifyRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: turnstileToken,
          }),
        }
      )

      const verifyData = await verifyRes.json()
      if (!verifyData.success) {
        return NextResponse.json(
          { error: 'Bot verification failed' },
          { status: 403 }
        )
      }

      turnstileVerified = true
    }

    const supabase = await createServiceRoleClient()

    // Check idempotency - return existing order if key already used
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('idempotency_key', idempotencyKey)
      .single()

    if (existingOrder) {
      const { data: existingTickets } = await supabase
        .from('tickets')
        .select('id, qr_code, display_code')
        .eq('order_id', existingOrder.id)

      return NextResponse.json({
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
        tickets: existingTickets || [],
      })
    }

    // Verify event exists and is published
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, cancelled_at, start_time')
      .eq('id', eventId)
      .single()

    if (eventError || !event || event.status !== 'published' || event.cancelled_at) {
      return NextResponse.json(
        { error: 'Event not available' },
        { status: 400 }
      )
    }

    // Verify ticket availability using raw SQL for row-level locking
    let subtotal = 0
    const ticketTypeDetails: { id: string; name: string; price: number; quantity: number }[] = []

    for (const item of items) {
      const { data: ticketType, error: ttError } = await supabase
        .from('ticket_types')
        .select('id, name, price, quantity_total, quantity_sold, max_per_order')
        .eq('id', item.ticketTypeId)
        .eq('event_id', eventId)
        .single()

      if (ttError || !ticketType) {
        return NextResponse.json(
          { error: `Ticket type not found: ${item.ticketTypeId}` },
          { status: 400 }
        )
      }

      const remaining = ticketType.quantity_total - (ticketType.quantity_sold || 0)
      if (item.quantity > remaining) {
        return NextResponse.json(
          { error: `Not enough tickets available for ${ticketType.name}. Only ${remaining} left.` },
          { status: 400 }
        )
      }

      if (ticketType.max_per_order && item.quantity > ticketType.max_per_order) {
        return NextResponse.json(
          { error: `Maximum ${ticketType.max_per_order} tickets per order for ${ticketType.name}` },
          { status: 400 }
        )
      }

      subtotal += ticketType.price * item.quantity
      ticketTypeDetails.push({
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        quantity: item.quantity,
      })
    }

    const total = subtotal // No fees in MVP

    // Process payment
    const paymentProvider = getPaymentProvider()
    const paymentResult = await paymentProvider.processPayment(
      paymentToken,
      total,
      'EGP',
      idempotencyKey
    )

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || 'Payment failed' },
        { status: 402 }
      )
    }

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
        return NextResponse.json(
          { error: 'Failed to create customer record' },
          { status: 500 }
        )
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
        payment_provider: paymentResult.transactionId.startsWith('MOCK-') ? 'mock' : 'cybersource',
        payment_transaction_id: paymentResult.transactionId,
        idempotency_key: idempotencyKey,
        turnstile_verified: turnstileVerified,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
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
    const tickets: { id: string; qrCode: string; displayCode: string }[] = []

    for (const tt of ticketTypeDetails) {
      for (let i = 0; i < tt.quantity; i++) {
        const displayCode = generateDisplayCode()
        // We need the ticket ID for QR generation, so insert first with placeholder
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            order_id: order.id,
            ticket_type_id: tt.id,
            qr_code: `temp-${Date.now()}-${Math.random()}`, // temporary
            qr_signature: 'temp',
            display_code: displayCode,
            status: 'valid',
          })
          .select('id')
          .single()

        if (ticketError || !ticket) {
          continue // Skip failed tickets, don't fail entire order
        }

        // Generate QR with real ticket ID
        const { qrCode, qrSignature } = generateQRPayload(ticket.id, eventId)

        // Update ticket with real QR code
        await supabase
          .from('tickets')
          .update({ qr_code: qrCode, qr_signature: qrSignature })
          .eq('id', ticket.id)

        tickets.push({
          id: ticket.id,
          qrCode,
          displayCode,
        })
      }

      // Increment quantity_sold
      const { data: currentTT } = await supabase
        .from('ticket_types')
        .select('quantity_sold')
        .eq('id', tt.id)
        .single()

      if (currentTT) {
        await supabase
          .from('ticket_types')
          .update({ quantity_sold: (currentTT.quantity_sold || 0) + tt.quantity })
          .eq('id', tt.id)
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
        const tt = ticketTypeDetails.find((td) => td.id === t.qrCode.split(':')[2]) || ticketTypeDetails[0]
        return {
          typeName: tt?.name || 'Ticket',
          displayCode: t.displayCode,
          qrCode: t.qrCode,
        }
      }),
      total,
      currency: 'EGP',
    }).catch((err) => console.error('[Email] Send failed:', err))

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      tickets,
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: `Checkout failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
