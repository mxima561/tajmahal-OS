import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/utils/validation'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()

  // Verify requester is authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser || !['manager', 'super_admin'].includes(adminUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { orderIds } = body as { orderIds: string[] }

  if (!Array.isArray(orderIds) || orderIds.length === 0 || orderIds.length > 100) {
    return NextResponse.json({ error: 'Invalid order IDs (provide 1-100)' }, { status: 400 })
  }

  for (const id of orderIds) {
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: `Invalid order ID format: ${id}` }, { status: 400 })
    }
  }

  // Delete associated tickets first
  const { error: ticketsError } = await supabase
    .from('tickets')
    .delete()
    .in('order_id', orderIds)

  if (ticketsError) {
    console.error('Error deleting tickets:', ticketsError)
    return NextResponse.json({ error: 'Failed to delete tickets' }, { status: 500 })
  }

  // Delete order items
  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .in('order_id', orderIds)

  if (itemsError) {
    console.error('Error deleting order items:', itemsError)
    return NextResponse.json({ error: 'Failed to delete order items' }, { status: 500 })
  }

  // Delete orders
  const { error: ordersError } = await supabase
    .from('orders')
    .delete()
    .in('id', orderIds)

  if (ordersError) {
    console.error('Error deleting orders:', ordersError)
    return NextResponse.json({ error: 'Failed to delete orders' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: orderIds.length })
}
