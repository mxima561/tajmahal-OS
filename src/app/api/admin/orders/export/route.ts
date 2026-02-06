import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

async function getAdminUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, name, role')
    .eq('auth_user_id', user.id)
    .single()

  return adminUser
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // Prevent CSV formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: Request) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const supabase = await createServiceRoleClient()

    let query = supabase
      .from('orders')
      .select('*, events(name)')
      .order('created_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (status) query = query.eq('payment_status', status)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data: orders, error } = await query

    if (error) {
      console.error('Export orders error:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    const headers = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Event',
      'Subtotal',
      'Discount',
      'Total',
      'Payment Status',
      'Payment Provider',
      'Promo Code ID',
      'Promoter ID',
      'Date',
    ]

    const rows = (orders ?? []).map((order: Record<string, unknown>) => {
      const event = order.events as { name: string } | null
      return [
        escapeCSV(order.order_number as string),
        escapeCSV(order.customer_name as string),
        escapeCSV(order.customer_email as string),
        escapeCSV(order.customer_phone as string | null),
        escapeCSV(event?.name),
        escapeCSV(order.subtotal as number),
        escapeCSV(order.discount_amount as number | null),
        escapeCSV(order.total as number),
        escapeCSV(order.payment_status as string),
        escapeCSV(order.payment_provider as string | null),
        escapeCSV(order.promo_code_id as string | null),
        escapeCSV(order.promoter_id as string | null),
        escapeCSV(order.created_at as string),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const today = new Date().toISOString().split('T')[0]

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-export-${today}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export orders error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
