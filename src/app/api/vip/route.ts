import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'

const vipSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(6, 'Phone is required'),
  partySize: z.number().min(1, 'Party size must be at least 1'),
  message: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = vipSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { name, email, phone, partySize, message } = parsed.data

    const supabase = await createServiceRoleClient()

    // Get the Taj Mahal venue ID
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('slug', 'taj-mahal')
      .single()

    if (venueError || !venue) {
      console.error('Error fetching venue:', venueError)
      return NextResponse.json(
        { error: 'Unable to process inquiry at this time' },
        { status: 500 }
      )
    }

    // Insert the VIP inquiry
    const { error: insertError } = await supabase
      .from('vip_inquiries')
      .insert({
        venue_id: venue.id,
        name,
        email,
        phone,
        party_size: partySize,
        message: message || null,
        status: 'new',
      })

    if (insertError) {
      console.error('Error inserting VIP inquiry:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('VIP inquiry error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
