import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AdminUser } from '@/types/database'
import { Users, ScanLine } from 'lucide-react'
import { StaffManager } from './StaffManager'
import { headers } from 'next/headers'
import { ScannerUrlCopy } from './ScannerUrlCopy'

async function getStaffAndCurrentUser() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: staffList, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching staff:', error)
    return { staff: [], currentAuthUserId: null }
  }

  return {
    staff: (staffList || []) as AdminUser[],
    currentAuthUserId: user?.id || null,
  }
}

export default async function AdminStaffPage() {
  const { staff, currentAuthUserId } = await getStaffAndCurrentUser()
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const scannerUrl = `${protocol}://${host}/scanner`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Management</h1>
      </div>

      {/* Scanner URL for door staff */}
      <div className="bg-night-900 border border-night-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ScanLine className="w-5 h-5 text-gold-500" />
          <h2 className="text-sm font-semibold text-gold-400">Mobile Scanner for Door Staff</h2>
        </div>
        <p className="text-xs text-night-400 mb-3">
          Share this URL with door staff to use the mobile QR scanner on their phones.
        </p>
        <ScannerUrlCopy url={scannerUrl} />
      </div>

      {staff.length === 0 && !currentAuthUserId ? (
        <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Users className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No staff members found</p>
          </div>
        </div>
      ) : (
        <StaffManager staff={staff} currentAuthUserId={currentAuthUserId} />
      )}
    </div>
  )
}
