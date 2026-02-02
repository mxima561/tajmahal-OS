import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staffId = params.id

    // Verify requester is authenticated and is super_admin
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requester } = await supabase
      .from('admin_users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!requester || requester.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can remove staff' },
        { status: 403 }
      )
    }

    // Get the admin_user to be deleted
    const { data: targetUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', staffId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Prevent self-deletion
    if (targetUser.auth_user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself' },
        { status: 400 }
      )
    }

    const serviceClient = await createServiceRoleClient()

    // Delete admin_users record
    const { error: deleteRecordError } = await serviceClient
      .from('admin_users')
      .delete()
      .eq('id', staffId)

    if (deleteRecordError) {
      console.error('Error deleting admin user record:', deleteRecordError)
      return NextResponse.json(
        { error: 'Failed to delete staff record' },
        { status: 500 }
      )
    }

    // Delete auth user
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(
      targetUser.auth_user_id
    )

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
      // Record is already deleted, log but don't fail
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete staff error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
