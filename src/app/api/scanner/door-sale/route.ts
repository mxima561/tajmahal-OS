import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { generateOrderNumber, generateDisplayCode } from '@/lib/utils/format'
import { generateQRPayload } from '@/lib/qr'
import { getEventCapacity } from '@/lib/capacity'

const doorSaleSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
  paymentMethod: z.enum(['cash', 'card', 'comp']),
  customerName: z.string().min(1).max(200).default('Walk-up'),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, name, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden — staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = doorSaleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { eventId, ticketTypeId, quantity, paymentMethod, customerName, customerEmail, customerPhone, notes } = parsed.data
    const serviceClient = await createServiceRoleClient()

    // Verify event exists and is published
    const { data: event } = await serviceClient
      .from('events')
      .select('id, name, status, cancelled_at')
      .eq('id', eventId)
      .single()

    if (!event || event.status !== 'published' || event.cancelled_at) {
      return NextResponse.json({ error: 'Event not available' }, { status: 400 })
    }

    // Atomically reserve tickets using the same RPC as checkout
    const { data: reserveResult, error: rpcError } = await serviceClient
      .rpc('reserve_tickets', {
        p_ticket_type_id: ticketTypeId,
        p_event_id: eventId,
        p_quantity: quantity,
      })

    if (rpcError || !reserveResult?.success) {
      return NextResponse.json(
        { error: reserveResult?.error || 'Ticket type not found or sold out' },
        { status: 400 }
      )
    }

    // For comps, price is 0; otherwise use reserved ticket price
    const unitPrice = paymentMethod === 'comp' ? 0 : reserveResult.price!
    const total = unitPrice * quantity

    // Upsert customer (use a door-sale email if none provided)
    const email = customerEmail || `door-${Date.now()}@tajmahal.local`
    const { data: existingCustomer } = await serviceClient
      .from('customers')
      .select('id, total_orders, total_spent')
      .eq('email', email)
      .single()

    let customerId: string

    if (existingCustomer) {
      customerId = existingCustomer.id
      await serviceClient
        .from('customers')
        .update({
          name: customerName,
          phone: customerPhone || null,
          last_order_at: new Date().toISOString(),
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_spent: (existingCustomer.total_spent || 0) + total,
        })
        .eq('id', customerId)
    } else {
      const { data: newCustomer, error: custError } = await serviceClient
        .from('customers')
        .insert({
          email,
          name: customerName,
          phone: customerPhone || null,
          first_order_at: new Date().toISOString(),
          last_order_at: new Date().toISOString(),
          total_orders: 1,
          total_spent: total,
        })
        .select('id')
        .single()

      if (custError || !newCustomer) {
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
      }
      customerId = newCustomer.id
    }

    // Create order
    const orderNumber = generateOrderNumber()
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        event_id: eventId,
        customer_id: customerId,
        customer_name: customerName,
        customer_email: email,
        customer_phone: customerPhone || null,
        subtotal: total,
        total,
        currency: 'EGP',
        status: 'completed',
        payment_status: paymentMethod === 'comp' ? 'comp' : 'paid',
        payment_provider: `door-${paymentMethod}`,
        payment_transaction_id: `DOOR-${paymentMethod.toUpperCase()}-${Date.now()}`,
        idempotency_key: `door-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        turnstile_verified: false,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items
    await serviceClient.from('order_items').insert({
      order_id: order.id,
      ticket_type_id: ticketTypeId,
      quantity,
      unit_price: unitPrice,
      total_price: total,
    })

    // quantity_sold already incremented atomically by reserve_tickets RPC

    // Create tickets (already checked in)
    const now = new Date().toISOString()
    for (let i = 0; i < quantity; i++) {
      const displayCode = generateDisplayCode()
      const { data: ticket } = await serviceClient
        .from('tickets')
        .insert({
          order_id: order.id,
          ticket_type_id: ticketTypeId,
          qr_code: `temp-${Date.now()}-${Math.random()}`,
          qr_signature: 'temp',
          display_code: displayCode,
          status: 'used',
          checked_in_at: now,
          checked_in_by: adminUser.id,
        })
        .select('id')
        .single()

      if (ticket) {
        const { qrCode, qrSignature } = generateQRPayload(ticket.id, eventId)
        await serviceClient
          .from('tickets')
          .update({ qr_code: qrCode, qr_signature: qrSignature })
          .eq('id', ticket.id)

        // Log the check-in
        await serviceClient.from('check_in_logs').insert({
          event_id: eventId,
          ticket_id: ticket.id,
          order_id: order.id,
          scanned_by: adminUser.id,
          scan_result: 'valid',
          notes: `Door sale (${paymentMethod})${notes ? ': ' + notes : ''}`,
        })
      }
    }

    const capacity = await getEventCapacity(eventId)

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
      quantity,
      paymentMethod,
      total,
      capacity,
    })
  } catch (error) {
    console.error('Door sale error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
