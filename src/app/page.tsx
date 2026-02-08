import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { EventWithTicketTypes } from '@/types/database'

export const dynamic = 'force-dynamic'
import Navbar from '@/components/public/Navbar'
import Footer from '@/components/public/Footer'
import HeroSection from '@/components/public/HeroSection'
import EventsGrid from '@/components/public/EventsGrid'
import TextInterlude from '@/components/public/TextInterlude'
import VipSection from '@/components/public/VipSection'
import GallerySection from '@/components/public/GallerySection'
import LocationSection from '@/components/public/LocationSection'

async function getUpcomingEvents(): Promise<EventWithTicketTypes[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('status', 'published')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(6)

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return (data as EventWithTicketTypes[]) ?? []
}

export default async function HomePage() {
  const events = await getUpcomingEvents()

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <HeroSection />
        <EventsGrid events={events} />
        <TextInterlude />
        <VipSection />
        <GallerySection />
        <LocationSection />
      </main>
      <Footer />
    </>
  )
}
