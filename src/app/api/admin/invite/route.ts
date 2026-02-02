import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['manager', 'staff'], { message: 'Role must be manager or staff' }),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate body
    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, name, role } = parsed.data

    // Verify requester is authenticated and is super_admin
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser || adminUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can invite staff' },
        { status: 403 }
      )
    }

    // Check if email already exists in admin_users
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A staff member with this email already exists' },
        { status: 409 }
      )
    }

    // Create auth user with service role client
    const serviceClient = await createServiceRoleClient()

    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: false,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Insert admin_users record
    const { error: insertError } = await serviceClient
      .from('admin_users')
      .insert({
        auth_user_id: authData.user.id,
        email,
        name,
        role,
      })

    if (insertError) {
      // Rollback: delete the auth user we just created
      await serviceClient.auth.admin.deleteUser(authData.user.id)
      console.error('Error inserting admin user:', insertError)
      return NextResponse.json(
        { error: 'Failed to create staff record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Invite error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
