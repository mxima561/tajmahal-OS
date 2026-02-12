import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payments'
import { generateQRPayload } from '@/lib/qr'
import { generateOrderNumber, generateDisplayCode, formatEventDate } from '@/lib/utils/format'
import { sendOrderConfirmation } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { generateConfirmationToken } from '@/lib/confirmation-token'
import { formatZodError } from '@/lib/utils/error-response'

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
    const { limited, retryAfterMs } = await rateLimit(`checkout:${ip}`, 10, 60000)
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
        formatZodError(parsed.error),
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
    let validatedPromo: { id: string; discount_type: string; discount_amount: number; current_uses: number } | null = null
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
          validatedPromo = { id: promo.id, discount_type: promo.discount_type, discount_amount: promo.discount_amount, current_uses: promo.current_uses ?? 0 }
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

    // C1: Wrap post-payment operations in try/catch to refund on failure
    try {
      // Upsert customer (H2/M5: check DB write errors)
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, total_orders, total_spent')
        .eq('email', customer.email)
        .single()

      let customerId: string

      if (existingCustomer) {
        customerId = existingCustomer.id
        const { error: customerUpdateError } = await supabase
          .from('customers')
          .update({
            name: customer.name,
            phone: customer.phone || null,
            last_order_at: new Date().toISOString(),
            total_orders: (existingCustomer.total_orders || 0) + 1,
            total_spent: (existingCustomer.total_spent || 0) + total,
          })
          .eq('id', customerId)

        if (customerUpdateError) {
          console.error('[Checkout] Customer update failed:', customerUpdateError)
        }
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
          throw new Error(`Failed to create customer record: ${custError?.message}`)
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
        throw new Error(`Failed to create order: ${orderError?.message}`)
      }

      // C3: Atomic promo code increment — single update with max_uses guard
      if (validatedPromo) {
        const { error: promoError } = await supabase
          .from('promo_codes')
          .update({ current_uses: validatedPromo.current_uses + 1 })
          .eq('id', validatedPromo.id)
          .eq('current_uses', validatedPromo.current_uses)
          .or('max_uses.is.null,current_uses.lt.max_uses')

        if (promoError) {
          console.error('[Checkout] Promo code increment failed:', promoError)
        }
      }

      // H2: Create order items — check DB write error
      const orderItems = ticketTypeDetails.map((tt) => ({
        order_id: order.id,
        ticket_type_id: tt.id,
        quantity: tt.quantity,
        unit_price: tt.price,
        total_price: tt.price * tt.quantity,
      }))

      const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems)
      if (orderItemsError) {
        console.error('[Checkout] Order items insert failed:', orderItemsError)
      }

      // M3: Batch ticket creation — pre-generate UUIDs, single insert
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

      // H2: Check ticket insert error
      const { error: ticketInsertError } = await supabase.from('tickets').insert(ticketRows)

      if (ticketInsertError) {
        console.error('[Checkout] Ticket batch insert failed for order', orderNumber, ':', ticketInsertError)
        await supabase
          .from('orders')
          .update({ status: 'needs_review', updated_at: new Date().toISOString() })
          .eq('id', order.id)

        return NextResponse.json(
          {
            error: 'Some tickets could not be created. Your order has been flagged for review.',
            orderId: order.id,
            orderNumber,
            tickets: [],
          },
          { status: 207 }
        )
      }

      // M8: Send confirmation email and track status
      let emailSent = false
      try {
        await sendOrderConfirmation({
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
        })
        emailSent = true
      } catch (err) {
        console.error('[Email] Send failed:', err)
      }

      const { error: emailStatusError } = await supabase
        .from('orders')
        .update({ email_sent: emailSent, updated_at: new Date().toISOString() })
        .eq('id', order.id)

      if (emailStatusError) {
        console.error('[Checkout] Failed to update email_sent status:', emailStatusError)
      }

      return NextResponse.json({
        orderId: order.id,
        orderNumber,
        tickets,
        confirmationToken: generateConfirmationToken(order.id),
      })
    } catch (postPaymentError) {
      // C1: Payment succeeded but post-payment processing failed — refund
      console.error('[CRITICAL] Payment succeeded but order creation failed', {
        transactionId: paymentResult.transactionId,
        error: postPaymentError,
      })

      try {
        await paymentProvider.refundPayment(paymentResult.transactionId, total)
      } catch (refundError) {
        console.error('[CRITICAL] Automatic refund also failed', {
          transactionId: paymentResult.transactionId,
          refundError,
        })
      }

      // Release reserved tickets
      for (const tt of ticketTypeDetails) {
        await supabase.rpc('release_tickets', { p_ticket_type_id: tt.id, p_quantity: tt.quantity })
      }

      return NextResponse.json(
        { error: 'Order processing failed. Your payment has been refunded.' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'An error occurred during checkout. Please try again.' },
      { status: 500 }
    )
  }
}
