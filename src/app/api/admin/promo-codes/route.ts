import { NextRequest, NextResponse } from 'next/server'
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
  code: z.string().min(2).max(50),
  event_id: z.string().uuid().optional(),
  promoter_id: z.string().uuid().optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_amount: z.number().positive(),
  max_uses: z.number().int().positive().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(2).max(50).optional(),
  event_id: z.string().uuid().optional(),
  promoter_id: z.string().uuid().optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_amount: z.number().positive().optional(),
  max_uses: z.number().int().positive().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceRoleClient()

    const { searchParams } = request.nextUrl
    const eventId = searchParams.get('event_id')
    const promoterId = searchParams.get('promoter_id')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('promo_codes')
      .select('*, promoters(name), events(name)')
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (promoterId) {
      query = query.eq('promoter_id', promoterId)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching promo codes:', error)
      return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 })
    }

    return NextResponse.json({ promoCodes: data })
  } catch (error) {
    console.error('Promo codes GET error:', error)
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
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        formatZodError(parsed.error),
        { status: 400 }
      )
    }

    const { code, event_id, promoter_id, discount_type, discount_amount, max_uses, valid_from, valid_until } = parsed.data
    const supabase = await createServiceRoleClient()

    // Check for duplicate code + event_id combination
    let dupQuery = supabase.from('promo_codes').select('id').eq('code', code)
    if (event_id) {
      dupQuery = dupQuery.eq('event_id', event_id)
    } else {
      dupQuery = dupQuery.is('event_id', null)
    }

    const { data: existing } = await dupQuery
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A promo code with this code already exists for this event' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code,
        event_id: event_id ?? null,
        promoter_id: promoter_id ?? null,
        discount_type,
        discount_amount,
        max_uses: max_uses ?? null,
        valid_from: valid_from ?? null,
        valid_until: valid_until ?? null,
      })
      .select('*, promoters(name), events(name)')
      .single()

    if (error) {
      console.error('Error creating promo code:', error)
      return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 })
    }

    return NextResponse.json({ promoCode: data }, { status: 201 })
  } catch (error) {
    console.error('Promo codes POST error:', error)
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
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        formatZodError(parsed.error),
        { status: 400 }
      )
    }

    const { id, ...fields } = parsed.data
    const supabase = await createServiceRoleClient()

    const updateData: Record<string, unknown> = {}
    if (fields.code !== undefined) updateData.code = fields.code
    if (fields.event_id !== undefined) updateData.event_id = fields.event_id
    if (fields.promoter_id !== undefined) updateData.promoter_id = fields.promoter_id
    if (fields.discount_type !== undefined) updateData.discount_type = fields.discount_type
    if (fields.discount_amount !== undefined) updateData.discount_amount = fields.discount_amount
    if (fields.max_uses !== undefined) updateData.max_uses = fields.max_uses
    if (fields.valid_from !== undefined) updateData.valid_from = fields.valid_from
    if (fields.valid_until !== undefined) updateData.valid_until = fields.valid_until
    if (fields.is_active !== undefined) updateData.is_active = fields.is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updateData)
      .eq('id', id)
      .select('*, promoters(name), events(name)')
      .single()

    if (error) {
      console.error('Error updating promo code:', error)
      return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 })
    }

    return NextResponse.json({ promoCode: data })
  } catch (error) {
    console.error('Promo codes PUT error:', error)
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
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting promo code:', error)
      return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Promo codes DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
