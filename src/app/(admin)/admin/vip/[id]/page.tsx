import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils/format'
import { VipInquiry } from '@/types/database'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VipInquiryEditor } from './VipInquiryEditor'

async function getInquiry(id: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('vip_inquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as VipInquiry
}

export default async function VipInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const inquiry = await getInquiry(id)

  if (!inquiry) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back Button */}
      <Link
        href="/admin/vip"
        className="inline-flex items-center gap-2 text-night-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to VIP Inquiries
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{inquiry.name}</h1>
        <p className="text-night-400 text-sm mt-1">
          Submitted {inquiry.created_at ? formatDateTime(inquiry.created_at) : '--'}
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-night-900 border border-night-700 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-night-400 uppercase tracking-wider">Name</label>
            <p className="text-white mt-1">{inquiry.name}</p>
          </div>
          <div>
            <label className="text-xs text-night-400 uppercase tracking-wider">Email</label>
            <p className="text-white mt-1">{inquiry.email}</p>
          </div>
          <div>
            <label className="text-xs text-night-400 uppercase tracking-wider">Phone</label>
            <p className="text-white mt-1">{inquiry.phone}</p>
          </div>
          <div>
            <label className="text-xs text-night-400 uppercase tracking-wider">Party Size</label>
            <p className="text-white mt-1">{inquiry.party_size ?? '--'}</p>
          </div>
        </div>

        {inquiry.message && (
          <div className="pt-4 border-t border-night-700">
            <label className="text-xs text-night-400 uppercase tracking-wider">Message</label>
            <p className="text-white mt-1 whitespace-pre-wrap">{inquiry.message}</p>
          </div>
        )}
      </div>

      {/* Editable Section (Client Component) */}
      <VipInquiryEditor
        inquiryId={inquiry.id}
        initialStatus={inquiry.status}
        initialNotes={inquiry.notes || ''}
      />
    </div>
  )
}
