import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { validateQRCode } from '@/lib/qr'
import { rateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

const RATE_LIMIT = 30          // max requests
const RATE_WINDOW = 60 * 1000  // per 1 minute

export async function POST(request: NextRequest) {
  try {
    // --- Rate limiting (by IP) ---
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const { limited, retryAfterMs } = rateLimit(ip, RATE_LIMIT, RATE_WINDOW)

    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
        }
      )
    }

    // --- Auth guard: require authenticated admin/staff ---
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden — staff access required' }, { status: 403 })
    }

    // --- Route to action handler ---
    const body = await request.json()
    const { action } = body

    if (action === 'verify') {
      return handleVerify(body)
    } else if (action === 'checkin') {
      return handleCheckin(body, adminUser.id)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Scanner API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleVerify(body: { code: string; eventId: string }) {
  const { code, eventId } = body

  if (!code || !eventId) {
    return NextResponse.json({ error: 'Missing code or eventId' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  let ticketId: string | undefined
  let qrEventId: string | undefined

  // Determine lookup method based on code format
  const isDisplayCode = /^TM-[A-Za-z0-9]{4}$/i.test(code.trim())

  if (isDisplayCode) {
    // Look up by display_code
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('id, order_id')
      .eq('display_code', code.trim().toUpperCase())
      .single()

    if (error || !ticket) {
      return NextResponse.json({
        result: 'invalid',
        message: 'Invalid ticket code',
      })
    }

    ticketId = ticket.id
  } else {
    // Parse as QR payload
    const qrResult = validateQRCode(code.trim())

    if (!qrResult.valid) {
      return NextResponse.json({
        result: 'invalid',
        message: qrResult.error || 'Invalid QR code',
      })
    }

    ticketId = qrResult.ticketId
    qrEventId = qrResult.eventId
  }

  if (!ticketId) {
    return NextResponse.json({
      result: 'invalid',
      message: 'Could not resolve ticket',
    })
  }

  // Fetch the full ticket with related order and ticket type info
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      id,
      display_code,
      status,
      checked_in_at,
      order_id,
      ticket_type_id,
      orders!inner (
        id,
        customer_name,
        customer_email,
        event_id
      ),
      ticket_types!inner (
        id,
        name,
        event_id
      )
    `)
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({
      result: 'invalid',
      message: 'Ticket not found',
    })
  }

  // Type assertions for joined data
  const order = ticket.orders as unknown as {
    id: string
    customer_name: string
    customer_email: string
    event_id: string
  }
  const ticketType = ticket.ticket_types as unknown as {
    id: string
    name: string
    event_id: string
  }

  // Verify the ticket belongs to the specified event
  if (order.event_id !== eventId) {
    return NextResponse.json({
      result: 'invalid',
      message: 'Ticket does not belong to this event',
    })
  }

  // If QR code included an eventId, also verify it matches
  if (qrEventId && qrEventId !== eventId) {
    return NextResponse.json({
      result: 'invalid',
      message: 'QR code event mismatch',
    })
  }

  // Check ticket status
  if (ticket.status === 'used') {
    return NextResponse.json({
      result: 'already_used',
      message: `Already checked in at ${ticket.checked_in_at}`,
      ticket: {
        id: ticket.id,
        display_code: ticket.display_code,
        status: ticket.status,
        checked_in_at: ticket.checked_in_at,
        holder_name: order.customer_name,
        holder_email: order.customer_email,
        ticket_type: ticketType.name,
      },
    })
  }

  if (ticket.status === 'cancelled') {
    return NextResponse.json({
      result: 'invalid',
      message: 'This ticket has been cancelled',
    })
  }

  // Valid ticket ready for check-in
  return NextResponse.json({
    result: 'valid',
    ticket: {
      id: ticket.id,
      display_code: ticket.display_code,
      status: ticket.status,
      checked_in_at: ticket.checked_in_at,
      holder_name: order.customer_name,
      holder_email: order.customer_email,
      ticket_type: ticketType.name,
    },
  })
}

async function handleCheckin(body: { ticketId: string }, checkedInBy: string) {
  const { ticketId } = body

  if (!ticketId) {
    return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  // Verify the ticket exists and is valid
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('id, status')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  if (ticket.status === 'used') {
    return NextResponse.json({ error: 'Ticket already checked in' }, { status: 400 })
  }

  if (ticket.status === 'cancelled') {
    return NextResponse.json({ error: 'Ticket has been cancelled' }, { status: 400 })
  }

  if (ticket.status !== 'valid') {
    return NextResponse.json({ error: `Ticket status is "${ticket.status}", cannot check in` }, { status: 400 })
  }

  // Mark ticket as used
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      status: 'used',
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInBy,
    })
    .eq('id', ticketId)

  if (updateError) {
    console.error('Error checking in ticket:', updateError)
    return NextResponse.json({ error: 'Failed to check in ticket' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
