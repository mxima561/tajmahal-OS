import { createServiceRoleClient } from '@/lib/supabase/server'

export type CapacityStatus = 'green' | 'yellow' | 'red' | 'locked'

export type CapacityInfo = {
  ticketCheckIns: number
  guestCheckIns: number
  totalHeadcount: number
  venueCapacity: number | null
  ticketCapacity: number
  status: CapacityStatus
  percentage: number
}

export async function getEventCapacity(eventId: string): Promise<CapacityInfo> {
  const supabase = await createServiceRoleClient()

  const { data: event } = await supabase
    .from('events')
    .select('total_capacity, venue_capacity')
    .eq('id', eventId)
    .single()

  const venueCapacity = event?.venue_capacity ?? null
  const ticketCapacity = event?.total_capacity ?? 0

  // Count checked-in tickets for this event via check_in_logs
  // Each successful check-in creates a 'valid' log entry
  const { count: ticketCheckIns } = await supabase
    .from('check_in_logs')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('scan_result', 'valid')

  const ticketCount = ticketCheckIns ?? 0

  // Count checked-in guests with their plus counts
  const { data: checkedInGuests } = await supabase
    .from('guest_list_entries')
    .select('id, plus_count')
    .eq('event_id', eventId)
    .eq('status', 'checked_in')

  const guestCount = checkedInGuests?.reduce(
    (sum, g) => sum + 1 + (g.plus_count ?? 0),
    0
  ) ?? 0

  const totalHeadcount = ticketCount + guestCount
  const effectiveCapacity = venueCapacity ?? ticketCapacity
  const percentage = effectiveCapacity > 0
    ? Math.round((totalHeadcount / effectiveCapacity) * 100)
    : 0

  return {
    ticketCheckIns: ticketCount,
    guestCheckIns: guestCount,
    totalHeadcount,
    venueCapacity,
    ticketCapacity,
    status: getCapacityStatus(percentage),
    percentage,
  }
}

export function getCapacityStatus(percentage: number): CapacityStatus {
  if (percentage >= 100) return 'locked'
  if (percentage >= 90) return 'red'
  if (percentage >= 80) return 'yellow'
  return 'green'
}

export function getCapacityColor(status: CapacityStatus): string {
  switch (status) {
    case 'green': return 'text-green-400'
    case 'yellow': return 'text-yellow-400'
    case 'red': return 'text-red-400'
    case 'locked': return 'text-red-500'
  }
}

export function getCapacityBgColor(status: CapacityStatus): string {
  switch (status) {
    case 'green': return 'bg-green-500'
    case 'yellow': return 'bg-yellow-500'
    case 'red': return 'bg-red-500'
    case 'locked': return 'bg-red-600'
  }
}
