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
  const { eventIds } = body as { eventIds: string[] }

  if (!Array.isArray(eventIds) || eventIds.length === 0 || eventIds.length > 100) {
    return NextResponse.json({ error: 'Invalid event IDs (provide 1-100)' }, { status: 400 })
  }

  // Validate all IDs
  for (const id of eventIds) {
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: `Invalid event ID format: ${id}` }, { status: 400 })
    }
  }

  // Check if any events have orders — prevent deletion if so
  const { data: ordersExist } = await supabase
    .from('orders')
    .select('id')
    .in('event_id', eventIds)
    .limit(1)

  if (ordersExist && ordersExist.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete events that have orders. Cancel the orders first.' },
      { status: 400 }
    )
  }

  // Delete ticket_types first (FK dependency)
  const { error: ttError } = await supabase
    .from('ticket_types')
    .delete()
    .in('event_id', eventIds)

  if (ttError) {
    console.error('Error deleting ticket types:', ttError)
    return NextResponse.json({ error: 'Failed to delete ticket types' }, { status: 500 })
  }

  // Delete events
  const { error: eventError } = await supabase
    .from('events')
    .delete()
    .in('id', eventIds)

  if (eventError) {
    console.error('Error deleting events:', eventError)
    return NextResponse.json({ error: 'Failed to delete events' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: eventIds.length })
}
