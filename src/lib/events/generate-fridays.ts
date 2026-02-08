import { createServiceRoleClient } from '@/lib/supabase/server'

const CAIRO_TZ = 'Africa/Cairo'

/**
 * Get the next N Fridays starting from today (Egypt/Cairo timezone).
 * Returns dates as YYYY-MM-DD strings.
 */
function getUpcomingFridays(count: number): string[] {
  const fridays: string[] = []
  // Current date in Cairo timezone
  const now = new Date()
  const cairoDate = new Date(now.toLocaleString('en-US', { timeZone: CAIRO_TZ }))

  // Start from today
  const current = new Date(cairoDate)
  current.setHours(0, 0, 0, 0)

  // Advance to next Friday (or today if it's Friday)
  const dayOfWeek = current.getDay()
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6 // Sunday=0, Friday=5
  current.setDate(current.getDate() + daysUntilFriday)

  for (let i = 0; i < count; i++) {
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    fridays.push(`${year}-${month}-${day}`)
    current.setDate(current.getDate() + 7)
  }

  return fridays
}

/**
 * Combine a date string (YYYY-MM-DD) with a time string (HH:MM:SS)
 * into an ISO timestamp in Cairo timezone (UTC+2).
 */
function combineDateAndTime(dateStr: string, timeStr: string): string {
  // Parse as Cairo local time, then convert to UTC for storage
  // Cairo is UTC+2 (no DST since 2014)
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes, seconds] = timeStr.split(':').map(Number)

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours - 2, minutes, seconds || 0))
  return utcDate.toISOString()
}

function slugify(name: string, dateStr: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  return `${slug}-${dateStr}`
}

export type GenerationResult = {
  created: number
  skipped: number
  errors: string[]
}

/**
 * Generate upcoming Friday events from the active template.
 * Idempotent — safe to call repeatedly.
 */
export async function generateUpcomingFridays(): Promise<GenerationResult> {
  const supabase = await createServiceRoleClient()
  const result: GenerationResult = { created: 0, skipped: 0, errors: [] }

  // 1. Fetch active template
  const { data: template, error: templateError } = await supabase
    .from('friday_event_template')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (templateError || !template) {
    result.errors.push('No active Friday template found')
    return result
  }

  // 2. Fetch template ticket types
  const { data: templateTickets, error: ticketsError } = await supabase
    .from('friday_template_ticket_types')
    .select('*')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true })

  if (ticketsError) {
    result.errors.push(`Failed to fetch template ticket types: ${ticketsError.message}`)
    return result
  }

  // 3. Calculate upcoming Fridays
  const fridays = getUpcomingFridays(template.weeks_ahead)

  // 4. Check which events already exist for these dates
  // We match by slug pattern since slugs include the date
  const slugs = fridays.map((date) => slugify(template.event_name, date))

  const { data: existingEvents } = await supabase
    .from('events')
    .select('slug')
    .eq('venue_id', template.venue_id)
    .in('slug', slugs)

  const existingSlugs = new Set((existingEvents || []).map((e) => e.slug))

  // 5. Create missing events
  for (let i = 0; i < fridays.length; i++) {
    const dateStr = fridays[i]
    const slug = slugs[i]

    if (existingSlugs.has(slug)) {
      result.skipped++
      continue
    }

    const startTime = combineDateAndTime(dateStr, template.start_time)
    const endTime = combineDateAndTime(dateStr, template.end_time)
    const doorsOpen = combineDateAndTime(dateStr, template.doors_open_time)

    // Calculate total capacity from ticket types
    const totalCapacity = (templateTickets || []).reduce(
      (sum, tt) => sum + tt.quantity_total,
      0
    )

    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert({
        name: template.event_name,
        slug,
        description: template.description,
        venue_id: template.venue_id,
        start_time: startTime,
        end_time: endTime,
        doors_open: doorsOpen,
        status: template.default_status,
        total_capacity: totalCapacity || 100,
        is_auto_generated: true,
        is_featured: false,
      })
      .select('id')
      .single()

    if (eventError || !newEvent) {
      result.errors.push(`Failed to create event for ${dateStr}: ${eventError?.message}`)
      continue
    }

    // Create ticket types for this event
    if (templateTickets && templateTickets.length > 0) {
      const ticketTypeRows = templateTickets.map((tt) => ({
        event_id: newEvent.id,
        name: tt.name,
        price: tt.price,
        currency: tt.currency,
        quantity_total: tt.quantity_total,
        max_per_order: tt.max_per_order,
        description: tt.description,
        sort_order: tt.sort_order,
      }))

      const { error: ttError } = await supabase
        .from('ticket_types')
        .insert(ticketTypeRows)

      if (ttError) {
        result.errors.push(`Created event for ${dateStr} but failed to add ticket types: ${ttError.message}`)
        continue
      }
    }

    result.created++
  }

  return result
}
