import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateUpcomingFridays } from '@/lib/events/generate-fridays'

export async function POST() {
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

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await generateUpcomingFridays()

  return NextResponse.json(result)
}
