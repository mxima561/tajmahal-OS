import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateConfirmationToken } from '@/lib/confirmation-token'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const { limited } = await rateLimit(`confirmation:${ip}`, 20, 60000)
  if (limited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token || !validateConfirmationToken(orderId, token)) {
    return NextResponse.json({ error: 'Invalid or expired confirmation link' }, { status: 403 })
  }

  const supabase = await createServiceRoleClient()

  const [orderResult, ticketsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total, events(name, start_time)')
      .eq('id', orderId)
      .single(),
    supabase
      .from('tickets')
      .select('id, display_code, qr_code, status, ticket_types(name)')
      .eq('order_id', orderId),
  ])

  if (orderResult.error || !orderResult.data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (ticketsResult.error) {
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 })
  }

  return NextResponse.json({
    order: orderResult.data,
    tickets: ticketsResult.data || [],
  })
}
