import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/utils/validation'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid order ID format' }, { status: 400 })
  }

  // Verify the order exists and is not already cancelled
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 })
  }

  // Fetch order_items to release ticket capacity
  const { data: orderItems, error: fetchItemsError } = await supabase
    .from('order_items')
    .select('ticket_type_id, quantity')
    .eq('order_id', id)

  if (fetchItemsError) {
    console.error('Error fetching order items for capacity release:', fetchItemsError)
    return NextResponse.json({ error: 'Failed to prepare cancellation' }, { status: 500 })
  }

  // Release capacity by decrementing quantity_sold for each ticket type
  if (orderItems && orderItems.length > 0) {
    for (const item of orderItems) {
      const { data: tt } = await supabase
        .from('ticket_types')
        .select('quantity_sold')
        .eq('id', item.ticket_type_id)
        .single()

      if (tt) {
        const { error: capacityError } = await supabase
          .from('ticket_types')
          .update({ quantity_sold: Math.max(0, (tt.quantity_sold ?? 0) - item.quantity) })
          .eq('id', item.ticket_type_id)

        if (capacityError) {
          console.error('[CRITICAL] Failed to release capacity for ticket_type', { ticketTypeId: item.ticket_type_id, quantity: item.quantity, error: capacityError })
        }
      }
    }
  }

  // Update order status — use 'pending_refund' since the refund has not been processed yet
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'pending_refund', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateOrderError) {
    console.error('Error cancelling order:', updateOrderError)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }

  // Cancel all associated tickets
  const { error: updateTicketsError } = await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('order_id', id)

  if (updateTicketsError) {
    console.error('Error cancelling tickets:', updateTicketsError)
    return NextResponse.json({ error: 'Order cancelled but failed to cancel tickets' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
