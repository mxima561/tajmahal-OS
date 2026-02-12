import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/utils/validation'
import { logAuditEvent, getClientIP, getUserAgent } from '@/lib/audit'

// Magic bytes for supported image formats
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG/JFIF
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
  ],
}

/**
 * Validate file content by checking magic bytes.
 * Returns the detected MIME type or null if invalid.
 */
function validateMagicBytes(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer.slice(0, 12))

  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const signature of signatures) {
      if (signature.every((byte, index) => bytes[index] === byte)) {
        // Additional check for WebP: must have 'WEBP' at offset 8
        if (mimeType === 'image/webp') {
          const webpMarker = new Uint8Array(buffer.slice(8, 12))
          if (webpMarker[0] === 0x57 && webpMarker[1] === 0x45 && 
              webpMarker[2] === 0x42 && webpMarker[3] === 0x50) {
            return mimeType
          }
        } else {
          return mimeType
        }
      }
    }
  }

  return null
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const ip = getClientIP(request)
  const userAgent = getUserAgent(request)

  // Verify requester is authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role, email')
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

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
  }

  // Read file content for magic byte validation
  const arrayBuffer = await file.arrayBuffer()

  // Validate magic bytes (actual file content, not just MIME header)
  const detectedType = validateMagicBytes(arrayBuffer)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!detectedType || !allowedTypes.includes(detectedType)) {
    return NextResponse.json(
      { error: 'Invalid file type. File content must be JPEG, PNG, or WebP.' },
      { status: 400 }
    )
  }

  // Determine extension from detected type, not from user-provided filename
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const ext = extMap[detectedType] || 'jpg'
  const path = `${eventId}/cover.${ext}`

  // Upload to Supabase Storage
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

  // Log successful upload
  logAuditEvent({
    adminUserId: adminUser.id,
    adminEmail: adminUser.email,
    action: 'file_upload',
    resourceType: 'file',
    resourceId: eventId,
    details: { path, fileType: detectedType, fileSize: file.size },
    ipAddress: ip,
    userAgent,
  })

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient()
  const ip = getClientIP(request)
  const userAgent = getUserAgent(request)

  // Verify requester is authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role, email')
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

  // Log successful deletion
  logAuditEvent({
    adminUserId: adminUser.id,
    adminEmail: adminUser.email,
    action: 'file_delete',
    resourceType: 'file',
    resourceId: eventId,
    ipAddress: ip,
    userAgent,
  })

  return NextResponse.json({ success: true })
}
