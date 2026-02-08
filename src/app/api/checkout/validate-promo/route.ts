import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const validatePromoSchema = z.object({
  code: z.string().min(1).max(50),
  eventId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const { limited, retryAfterMs } = await rateLimit(`validate-promo:${ip}`, 20, 60000)
    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
      )
    }

    const body = await request.json()
    const parsed = validatePromoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { code, eventId } = parsed.data
    const supabase = await createServiceRoleClient()
    const now = new Date().toISOString()

    // Sanitize code: strip PostgREST LIKE wildcards to prevent filter injection
    const sanitizedCode = code.trim().replace(/[%_]/g, '')
    if (!sanitizedCode) {
      return NextResponse.json(
        { error: 'Invalid or expired promo code' },
        { status: 400 }
      )
    }

    // Look up promo code: case-insensitive exact match, active
    const { data: promos, error: queryError } = await supabase
      .from('promo_codes')
      .select('*')
      .ilike('code', sanitizedCode)
      .eq('is_active', true)

    if (queryError || !promos || promos.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired promo code' },
        { status: 400 }
      )
    }

    // Prefer event-specific code, fall back to global (null event_id)
    const promo = promos.find(p => p.event_id === eventId)
      || promos.find(p => p.event_id === null)

    if (!promo) {
      return NextResponse.json(
        { error: 'Invalid or expired promo code' },
        { status: 400 }
      )
    }

    // Check usage limit: current_uses < max_uses (or max_uses is null for unlimited)
    if (promo.max_uses !== null && (promo.current_uses ?? 0) >= promo.max_uses) {
      return NextResponse.json(
        { error: 'Invalid or expired promo code' },
        { status: 400 }
      )
    }

    // Check valid_from: must be <= now (or null)
    if (promo.valid_from && now < promo.valid_from) {
      return NextResponse.json(
        { error: 'Invalid or expired promo code' },
        { status: 400 }
      )
    }

    // Check valid_until: must be >= now (or null)
    if (promo.valid_until && now > promo.valid_until) {
      return NextResponse.json(
        { error: 'Invalid or expired promo code' },
        { status: 400 }
      )
    }

    // Calculate and return discount info
    if (promo.discount_type === 'percentage') {
      return NextResponse.json({
        discountType: 'percentage',
        discountAmount: promo.discount_amount,
        promoCodeId: promo.id,
        promoterId: promo.promoter_id,
      })
    }

    return NextResponse.json({
      discountType: 'fixed',
      discountAmount: promo.discount_amount,
      promoCodeId: promo.id,
      promoterId: promo.promoter_id,
    })
  } catch (err) {
    console.error('Promo validation error:', err)
    return NextResponse.json(
      { error: 'An error occurred while validating the promo code.' },
      { status: 500 }
    )
  }
}
