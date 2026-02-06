import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payments'
import { generateQRPayload } from '@/lib/qr'
import { generateOrderNumber, generateDisplayCode, formatEventDate } from '@/lib/utils/format'
import { sendOrderConfirmation } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

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
  promoCodeId: z.string().uuid().optional(),
  promoterId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    // Rate limit: 10 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const { limited, retryAfterMs } = rateLimit(`checkout:${ip}`, 10, 60000)
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
      )
    }

    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { eventId, items, customer, paymentToken, idempotencyKey, turnstileToken, promoCodeId, promoterId } = parsed.data

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

    // Atomically reserve tickets using row-level locking RPC
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
        // Release any previously reserved tickets
        for (const tt of ticketTypeDetails) {
          await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
        }
        return NextResponse.json(
          { error: 'Failed to check ticket availability' },
          { status: 500 }
        )
      }

      if (!result.success) {
        // Release any previously reserved tickets
        for (const tt of ticketTypeDetails) {
          await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
        }
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      subtotal += result.price! * result.quantity!
      ticketTypeDetails.push({
        id: item.ticketTypeId,
        name: result.name!,
        price: result.price!,
        quantity: result.quantity!,
      })
    }

    // Apply promo code discount if provided (validated but NOT incremented until after payment)
    let discountAmount = 0
    let validatedPromo: { id: string; discount_type: string; discount_amount: number } | null = null
    if (promoCodeId) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('id', promoCodeId)
        .eq('is_active', true)
        .single()

      if (promo) {
        // Re-validate: check event_id, dates, and usage limits
        const now = new Date().toISOString()
        const withinDates = (!promo.valid_from || now >= promo.valid_from) && (!promo.valid_until || now <= promo.valid_until)
        const withinUsage = promo.max_uses === null || (promo.current_uses ?? 0) < promo.max_uses
        const matchesEvent = !promo.event_id || promo.event_id === eventId

        if (withinDates && withinUsage && matchesEvent) {
          if (promo.discount_type === 'percentage') {
            discountAmount = Math.round(subtotal * promo.discount_amount / 100)
          } else {
            discountAmount = Math.min(promo.discount_amount, subtotal)
          }
          validatedPromo = { id: promo.id, discount_type: promo.discount_type, discount_amount: promo.discount_amount }
        }
      }
    }

    const total = subtotal - discountAmount

    // Process payment
    const paymentProvider = getPaymentProvider()
    const paymentResult = await paymentProvider.processPayment(
      paymentToken,
      total,
      'EGP',
      idempotencyKey
    )

    if (!paymentResult.success) {
      // Release reserved tickets on payment failure
      for (const tt of ticketTypeDetails) {
        await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
      }
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
        promoter_id: promoterId || null,
        promo_code_id: promoCodeId || null,
        discount_amount: discountAmount,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Increment promo code usage AFTER successful payment and order creation
    if (validatedPromo) {
      const { data: latestPromo } = await supabase
        .from('promo_codes')
        .select('current_uses')
        .eq('id', validatedPromo.id)
        .single()
      if (latestPromo) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: (latestPromo.current_uses || 0) + 1 })
          .eq('id', validatedPromo.id)
      }
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
    // quantity_sold already incremented atomically by reserve_tickets RPC
    const tickets: { id: string; qrCode: string; displayCode: string; ticketTypeId: string }[] = []
    const failedTickets: { ticketTypeId: string; error: string }[] = []

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
          failedTickets.push({
            ticketTypeId: tt.id,
            error: ticketError?.message || 'Unknown insert error',
          })
          continue
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
          ticketTypeId: tt.id,
        })
      }
    }

    // If any tickets failed to create, flag order for manual review
    if (failedTickets.length > 0) {
      console.error('Ticket creation failures for order', orderNumber, ':', failedTickets)
      await supabase
        .from('orders')
        .update({ status: 'needs_review', updated_at: new Date().toISOString() })
        .eq('id', order.id)

      return NextResponse.json(
        {
          error: 'Some tickets could not be created. Your order has been flagged for review.',
          orderId: order.id,
          orderNumber,
          tickets,
          failedCount: failedTickets.length,
        },
        { status: 207 }
      )
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
    }).catch((err) => console.error('[Email] Send failed:', err))

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      tickets,
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'An error occurred during checkout. Please try again.' },
      { status: 500 }
    )
  }
}
