import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/utils/validation'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()

  // Verify requester is authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const eventId = formData.get('eventId') as string | null

  if (!eventId || !isValidUUID(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${eventId}/cover.${ext}`

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('event-images')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('event-images')
    .getPublicUrl(path)

  const publicUrl = urlData.publicUrl

  // Update event record
  const { error: updateError } = await supabase
    .from('events')
    .update({ featured_image_url: publicUrl })
    .eq('id', eventId)

  if (updateError) {
    console.error('Error updating event image URL:', updateError)
    return NextResponse.json({ error: 'Image uploaded but failed to update event' }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient()

  // Verify requester is authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await request.json()

  if (!eventId || !isValidUUID(eventId)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
  }

  // List and remove files in the event's folder
  const { data: files } = await supabase.storage
    .from('event-images')
    .list(eventId)

  if (files && files.length > 0) {
    const paths = files.map((f) => `${eventId}/${f.name}`)
    await supabase.storage.from('event-images').remove(paths)
  }

  // Clear the URL on the event
  const { error: updateError } = await supabase
    .from('events')
    .update({ featured_image_url: null })
    .eq('id', eventId)

  if (updateError) {
    console.error('Error clearing event image URL:', updateError)
    return NextResponse.json({ error: 'Failed to clear image' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
