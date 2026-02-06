import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils/format'
import { VipInquiry } from '@/types/database'
import { Crown, Filter } from 'lucide-react'
import Link from 'next/link'

async function getVipInquiries(status?: string) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('vip_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching VIP inquiries:', error)
    return []
  }

  return (data || []) as VipInquiry[]
}

const statusStyles: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  contacted: 'bg-yellow-500/10 text-yellow-400',
  confirmed: 'bg-green-500/10 text-green-400',
  declined: 'bg-red-500/10 text-red-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
        statusStyles[status] || 'bg-night-700 text-night-300'
      }`}
    >
      {status}
    </span>
  )
}

export default async function AdminVipPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const activeStatus = resolvedSearchParams.status || 'all'
  const inquiries = await getVipInquiries(activeStatus)

  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'declined', label: 'Declined' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VIP Inquiries</h1>
      </div>

      {/* Table Card */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-night-700 flex items-center gap-4">
          <Filter className="w-4 h-4 text-night-400" />
          <div className="flex gap-1 bg-night-800 rounded-lg p-1">
            {statusFilters.map((filter) => (
              <Link
                key={filter.key}
                href={`/admin/vip?status=${filter.key}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeStatus === filter.key
                    ? 'bg-night-700 text-white'
                    : 'text-night-400 hover:text-night-200'
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        {inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Crown className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No VIP inquiries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-700 text-night-400">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 font-medium">Party Size</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Date Submitted</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="border-b border-night-800 last:border-0">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/vip/${inquiry.id}`}
                        className="font-medium text-white hover:text-gold-400 transition-colors"
                      >
                        {inquiry.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-night-300">{inquiry.phone}</td>
                    <td className="py-3 px-4 text-night-300">
                      {inquiry.party_size ?? '--'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inquiry.status} />
                    </td>
                    <td className="py-3 px-4 text-night-300">
                      {inquiry.created_at ? formatDateTime(inquiry.created_at) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
