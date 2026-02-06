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

  // Update order status
  const { error: updateOrderError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'refunded', updated_at: new Date().toISOString() })
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
