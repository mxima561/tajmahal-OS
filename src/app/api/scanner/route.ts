import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { validateQRCode } from '@/lib/qr'
import { rateLimit } from '@/lib/rate-limit'
import { getEventCapacity } from '@/lib/capacity'
import { NextRequest, NextResponse } from 'next/server'

const RATE_LIMIT = 30
const RATE_WINDOW = 60 * 1000

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const eventId = request.nextUrl.searchParams.get('eventId')
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
    }

    const capacity = await getEventCapacity(eventId)

    // Get recent scan history (last 20)
    const serviceClient = await createServiceRoleClient()
    const { data: recentScans } = await serviceClient
      .from('check_in_logs')
      .select('id, scan_result, scanned_at, notes, ticket_id, order_id')
      .eq('event_id', eventId)
      .order('scanned_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      capacity,
      recentScans: recentScans || [],
    })
  } catch (error) {
    console.error('Scanner stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { action } = body

    if (action === 'verify') {
      return handleVerify(body, adminUser.id)
    } else if (action === 'checkin') {
      return handleCheckin(body, adminUser.id)
    } else if (action === 'guest-checkin') {
      return handleGuestCheckin(body, adminUser.id)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Scanner API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleVerify(body: { code: string; eventId: string }, scannedBy: string) {
  const { code, eventId } = body

  if (!code || !eventId) {
    return NextResponse.json({ error: 'Missing code or eventId' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  let ticketId: string | undefined
  let qrEventId: string | undefined

  const isDisplayCode = /^TM-[A-Za-z0-9]{4}$/i.test(code.trim())

  if (isDisplayCode) {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('id, order_id')
      .eq('display_code', code.trim().toUpperCase())
      .single()

    if (error || !ticket) {
      await logScan(supabase, { eventId, scannedBy, result: 'invalid', notes: `Invalid display code: ${code}` })
      return NextResponse.json({
        result: 'invalid',
        message: 'Invalid ticket code',
      })
    }

    ticketId = ticket.id
  } else {
    const qrResult = validateQRCode(code.trim())

    if (!qrResult.valid) {
      await logScan(supabase, { eventId, scannedBy, result: 'invalid', notes: qrResult.error || 'Invalid QR code' })
      return NextResponse.json({
        result: 'invalid',
        message: qrResult.error || 'Invalid QR code',
      })
    }

    ticketId = qrResult.ticketId
    qrEventId = qrResult.eventId
  }

  if (!ticketId) {
    await logScan(supabase, { eventId, scannedBy, result: 'invalid', notes: 'Could not resolve ticket' })
    return NextResponse.json({
      result: 'invalid',
      message: 'Could not resolve ticket',
    })
  }

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
    await logScan(supabase, { eventId, scannedBy, result: 'invalid', notes: 'Ticket not found in DB' })
    return NextResponse.json({
      result: 'invalid',
      message: 'Ticket not found',
    })
  }

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

  if (order.event_id !== eventId) {
    await logScan(supabase, { eventId, ticketId, orderId: order.id, scannedBy, result: 'invalid', notes: 'Wrong event' })
    return NextResponse.json({
      result: 'invalid',
      message: 'Ticket does not belong to this event',
    })
  }

  if (qrEventId && qrEventId !== eventId) {
    await logScan(supabase, { eventId, ticketId, orderId: order.id, scannedBy, result: 'invalid', notes: 'QR event mismatch' })
    return NextResponse.json({
      result: 'invalid',
      message: 'QR code event mismatch',
    })
  }

  if (ticket.status === 'used') {
    await logScan(supabase, { eventId, ticketId, orderId: order.id, scannedBy, result: 'duplicate', notes: `First check-in: ${ticket.checked_in_at}` })
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
    await logScan(supabase, { eventId, ticketId, orderId: order.id, scannedBy, result: 'invalid', notes: 'Ticket cancelled' })
    return NextResponse.json({
      result: 'invalid',
      message: 'This ticket has been cancelled',
    })
  }

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

async function handleCheckin(body: { ticketId: string; eventId?: string }, checkedInBy: string) {
  const { ticketId, eventId } = body

  if (!ticketId) {
    return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('id, status, order_id, orders!inner(event_id)')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const orderData = ticket.orders as unknown as { event_id: string }
  const resolvedEventId = eventId || orderData.event_id

  if (ticket.status === 'used') {
    await logScan(supabase, { eventId: resolvedEventId, ticketId, orderId: ticket.order_id, scannedBy: checkedInBy, result: 'duplicate' })
    return NextResponse.json({ error: 'Ticket already checked in' }, { status: 400 })
  }

  if (ticket.status === 'cancelled') {
    await logScan(supabase, { eventId: resolvedEventId, ticketId, orderId: ticket.order_id, scannedBy: checkedInBy, result: 'invalid', notes: 'Cancelled ticket' })
    return NextResponse.json({ error: 'Ticket has been cancelled' }, { status: 400 })
  }

  if (ticket.status !== 'valid') {
    return NextResponse.json({ error: `Ticket status is "${ticket.status}", cannot check in` }, { status: 400 })
  }

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

  // Log the successful check-in
  await logScan(supabase, { eventId: resolvedEventId, ticketId, orderId: ticket.order_id, scannedBy: checkedInBy, result: 'valid' })

  // Return updated capacity
  const capacity = await getEventCapacity(resolvedEventId)

  return NextResponse.json({ success: true, capacity })
}

async function handleGuestCheckin(
  body: { guestId: string; eventId: string },
  checkedInBy: string
) {
  const { guestId, eventId } = body

  if (!guestId || !eventId) {
    return NextResponse.json({ error: 'Missing guestId or eventId' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: guest, error } = await supabase
    .from('guest_list_entries')
    .select('id, name, status, plus_count')
    .eq('id', guestId)
    .eq('event_id', eventId)
    .single()

  if (error || !guest) {
    return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  }

  if (guest.status === 'checked_in') {
    return NextResponse.json({ error: 'Guest already checked in' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('guest_list_entries')
    .update({
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', guestId)

  if (updateError) {
    console.error('Error checking in guest:', updateError)
    return NextResponse.json({ error: 'Failed to check in guest' }, { status: 500 })
  }

  const capacity = await getEventCapacity(eventId)

  return NextResponse.json({
    success: true,
    guest: { id: guest.id, name: guest.name, plusCount: guest.plus_count },
    capacity,
  })
}

// Helper to log scan attempts
type ScanLogParams = {
  eventId: string
  ticketId?: string
  orderId?: string
  scannedBy: string
  result: 'valid' | 'duplicate' | 'invalid' | 'expired'
  notes?: string
}

async function logScan(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  params: ScanLogParams
) {
  const { eventId, ticketId, orderId, scannedBy, result, notes } = params

  await supabase.from('check_in_logs').insert({
    event_id: eventId,
    ticket_id: ticketId || null,
    order_id: orderId || null,
    scanned_by: scannedBy,
    scan_result: result,
    notes: notes || null,
  }).then(({ error }) => {
    if (error) console.error('Failed to log scan:', error)
  })
}
