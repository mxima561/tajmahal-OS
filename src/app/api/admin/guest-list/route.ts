import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

const addGuestSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  plusCount: z.number().int().min(0).max(20).default(0),
  notes: z.string().max(500).optional(),
})

const updateGuestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  plusCount: z.number().int().min(0).max(20).optional(),
  status: z.enum(['pending', 'confirmed', 'checked_in', 'no_show']).optional(),
  notes: z.string().max(500).nullable().optional(),
})

async function getAdminUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, name, role')
    .eq('auth_user_id', user.id)
    .single()

  return adminUser
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = request.nextUrl.searchParams.get('eventId')
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
    }

    const search = request.nextUrl.searchParams.get('search') || ''

    const supabase = await createServiceRoleClient()

    let query = supabase
      .from('guest_list_entries')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (search.trim()) {
      const sanitizedSearch = search.trim().replace(/[%_]/g, '')
      if (sanitizedSearch) {
        query = query.ilike('name', `%${sanitizedSearch}%`)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching guest list:', error)
      return NextResponse.json({ error: 'Failed to fetch guest list' }, { status: 500 })
    }

    // Summary stats
    const entries = data || []
    const stats = {
      total: entries.length,
      totalWithPlus: entries.reduce((sum, e) => sum + 1 + (e.plus_count ?? 0), 0),
      pending: entries.filter(e => e.status === 'pending').length,
      confirmed: entries.filter(e => e.status === 'confirmed').length,
      checkedIn: entries.filter(e => e.status === 'checked_in').length,
      noShow: entries.filter(e => e.status === 'no_show').length,
    }

    return NextResponse.json({ entries, stats })
  } catch (error) {
    console.error('Guest list GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = addGuestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { eventId, name, email, phone, plusCount, notes } = parsed.data

    const supabase = await createServiceRoleClient()

    const { data, error } = await supabase
      .from('guest_list_entries')
      .insert({
        event_id: eventId,
        name,
        email: email || null,
        phone: phone || null,
        plus_count: plusCount,
        added_by: adminUser.id,
        added_by_name: adminUser.name,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding guest:', error)
      return NextResponse.json({ error: 'Failed to add guest' }, { status: 500 })
    }

    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (error) {
    console.error('Guest list POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateGuestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id, name, email, phone, plusCount, status, notes } = parsed.data

    const supabase = await createServiceRoleClient()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (plusCount !== undefined) updateData.plus_count = plusCount
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    if (status === 'checked_in') {
      updateData.checked_in_at = new Date().toISOString()
      updateData.checked_in_by = adminUser.id
    }

    const { data, error } = await supabase
      .from('guest_list_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating guest:', error)
      return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('Guest list PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { error } = await supabase
      .from('guest_list_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting guest:', error)
      return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Guest list DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
