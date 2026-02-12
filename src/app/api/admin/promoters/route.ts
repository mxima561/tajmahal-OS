import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { formatZodError } from '@/lib/utils/error-response'

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

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  commission_rate: z.number().min(0).max(100).optional().default(0),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  notes: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// GET — List all promoters with live stats
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceRoleClient()

    const { data: promoters, error } = await supabase
      .from('promoters')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching promoters:', error)
      return NextResponse.json({ error: 'Failed to fetch promoters' }, { status: 500 })
    }

    // Compute live stats per promoter from the orders table
    const promoterIds = (promoters || []).map(p => p.id)
    let salesByPromoter: Record<string, { count: number; revenue: number }> = {}

    if (promoterIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('promoter_id, total')
        .in('promoter_id', promoterIds)

      if (orders) {
        for (const order of orders) {
          if (!order.promoter_id) continue
          if (!salesByPromoter[order.promoter_id]) {
            salesByPromoter[order.promoter_id] = { count: 0, revenue: 0 }
          }
          salesByPromoter[order.promoter_id].count++
          salesByPromoter[order.promoter_id].revenue += order.total || 0
        }
      }
    }

    const enriched = (promoters || []).map(p => ({
      ...p,
      live_sales: salesByPromoter[p.id]?.count ?? 0,
      live_revenue: salesByPromoter[p.id]?.revenue ?? 0,
      live_commission:
        (salesByPromoter[p.id]?.revenue ?? 0) * ((p.commission_rate ?? 0) / 100),
    }))

    return NextResponse.json({ promoters: enriched })
  } catch (error) {
    console.error('Promoters GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new promoter
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        formatZodError(parsed.error),
        { status: 400 },
      )
    }

    const { name, email, phone, commission_rate, notes } = parsed.data
    const supabase = await createServiceRoleClient()

    const { data, error } = await supabase
      .from('promoters')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        commission_rate,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating promoter:', error)
      return NextResponse.json({ error: 'Failed to create promoter' }, { status: 500 })
    }

    return NextResponse.json({ promoter: data }, { status: 201 })
  } catch (error) {
    console.error('Promoters POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PUT — Update a promoter by id (partial fields)
// ---------------------------------------------------------------------------
export async function PUT(request: Request) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        formatZodError(parsed.error),
        { status: 400 },
      )
    }

    const { id, ...fields } = parsed.data
    const supabase = await createServiceRoleClient()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (fields.name !== undefined) updateData.name = fields.name
    if (fields.email !== undefined) updateData.email = fields.email
    if (fields.phone !== undefined) updateData.phone = fields.phone
    if (fields.commission_rate !== undefined) updateData.commission_rate = fields.commission_rate
    if (fields.status !== undefined) updateData.status = fields.status
    if (fields.notes !== undefined) updateData.notes = fields.notes

    const { data, error } = await supabase
      .from('promoters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating promoter:', error)
      return NextResponse.json({ error: 'Failed to update promoter' }, { status: 500 })
    }

    return NextResponse.json({ promoter: data })
  } catch (error) {
    console.error('Promoters PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — Delete a promoter by id (blocked if codes or orders exist)
// ---------------------------------------------------------------------------
export async function DELETE(request: Request) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Check for existing promo_codes tied to this promoter
    const { count: codesCount, error: codesError } = await supabase
      .from('promo_codes')
      .select('id', { count: 'exact', head: true })
      .eq('promoter_id', id)

    if (codesError) {
      console.error('Error checking promo codes:', codesError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Check for existing orders tied to this promoter
    const { count: ordersCount, error: ordersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('promoter_id', id)

    if (ordersError) {
      console.error('Error checking orders:', ordersError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if ((codesCount ?? 0) > 0 || (ordersCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete promoter with existing codes or orders. Deactivate instead.' },
        { status: 400 },
      )
    }

    const { error } = await supabase
      .from('promoters')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting promoter:', error)
      return NextResponse.json({ error: 'Failed to delete promoter' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Promoters DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
