import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { logAuditEvent, getClientIP, getUserAgent } from '@/lib/audit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = getUserAgent(request)

  // Rate limit: 5 attempts per minute per IP
  const { limited, retryAfterMs } = await rateLimit(`login:${ip}`, 5, 60000)
  if (limited) {
    // Log failed attempt due to rate limiting
    logAuditEvent({
      action: 'login_failed',
      resourceType: 'auth',
      details: { reason: 'rate_limited' },
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json(
      { error: 'Too many login attempts. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    // Use service role client for login to avoid RLS issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      // Log failed login attempt
      logAuditEvent({
        action: 'login_failed',
        resourceType: 'auth',
        adminEmail: email,
        details: { reason: 'invalid_credentials' },
        ipAddress: ip,
        userAgent,
      })

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify user is in admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role, name')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (adminError || !adminUser) {
      // Log failed attempt - user exists but is not an admin
      logAuditEvent({
        action: 'login_failed',
        resourceType: 'auth',
        adminEmail: email,
        details: { reason: 'not_admin', authUserId: authData.user.id },
        ipAddress: ip,
        userAgent,
      })

      return NextResponse.json(
        { error: 'You do not have admin access' },
        { status: 403 }
      )
    }

    // Update last login timestamp
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminUser.id)

    // Log successful login
    logAuditEvent({
      adminUserId: adminUser.id,
      adminEmail: email,
      action: 'login',
      resourceType: 'auth',
      details: { role: adminUser.role },
      ipAddress: ip,
      userAgent,
    })

    // Return session data for client to use
    return NextResponse.json({
      success: true,
      session: authData.session,
      user: {
        id: adminUser.id,
        email,
        name: adminUser.name,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
