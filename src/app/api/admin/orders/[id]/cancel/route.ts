import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient()

  // Verify the order exists and is not already cancelled
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', params.id)
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
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (updateOrderError) {
    console.error('Error cancelling order:', updateOrderError)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }

  // Cancel all associated tickets
  const { error: updateTicketsError } = await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('order_id', params.id)

  if (updateTicketsError) {
    console.error('Error cancelling tickets:', updateTicketsError)
    return NextResponse.json({ error: 'Order cancelled but failed to cancel tickets' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
