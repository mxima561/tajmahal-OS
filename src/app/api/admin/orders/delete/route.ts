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

  // Fetch order_items to release ticket capacity before deletion
  const { data: orderItems, error: fetchItemsError } = await supabase
    .from('order_items')
    .select('ticket_type_id, quantity')
    .in('order_id', orderIds)

  if (fetchItemsError) {
    console.error('Error fetching order items for capacity release:', fetchItemsError)
    return NextResponse.json({ error: 'Failed to prepare order deletion' }, { status: 500 })
  }

  // Release capacity by decrementing quantity_sold for each ticket type
  if (orderItems && orderItems.length > 0) {
    const capacityMap = new Map<string, number>()
    for (const item of orderItems) {
      capacityMap.set(item.ticket_type_id, (capacityMap.get(item.ticket_type_id) || 0) + item.quantity)
    }

    for (const [ticketTypeId, quantity] of capacityMap) {
      const { data: tt } = await supabase
        .from('ticket_types')
        .select('quantity_sold')
        .eq('id', ticketTypeId)
        .single()

      if (tt) {
        const { error: capacityError } = await supabase
          .from('ticket_types')
          .update({ quantity_sold: Math.max(0, (tt.quantity_sold ?? 0) - quantity) })
          .eq('id', ticketTypeId)

        if (capacityError) {
          console.error('[CRITICAL] Failed to release capacity for ticket_type', { ticketTypeId, quantity, error: capacityError })
        }
      }
    }
  }

  // NOTE: Supabase does not support multi-table transactions. If a later step fails
  // after an earlier one succeeds, we have an atomicity gap. Critical errors are
  // logged so operators can investigate and restore data.

  // Delete associated tickets first
  const { error: ticketsError } = await supabase
    .from('tickets')
    .delete()
    .in('order_id', orderIds)

  if (ticketsError) {
    console.error('[CRITICAL] Partial cascade delete - capacity released but tickets delete failed', { orderIds, error: ticketsError })
    return NextResponse.json({ error: 'Failed to delete tickets' }, { status: 500 })
  }

  // Delete order items
  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .in('order_id', orderIds)

  if (itemsError) {
    console.error('[CRITICAL] Partial cascade delete - tickets deleted but order_items delete failed', { orderIds, error: itemsError })
    return NextResponse.json({ error: 'Failed to delete order items' }, { status: 500 })
  }

  // Delete orders
  const { error: ordersError } = await supabase
    .from('orders')
    .delete()
    .in('id', orderIds)

  if (ordersError) {
    console.error('[CRITICAL] Partial cascade delete - order_items deleted but orders delete failed', { orderIds, error: ordersError })
    return NextResponse.json({ error: 'Failed to delete orders' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: orderIds.length })
}
