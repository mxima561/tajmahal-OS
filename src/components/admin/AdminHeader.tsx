'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminUser } from '@/types/database'
import { User } from 'lucide-react'

export default function AdminHeader() {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('admin_users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single()
        setAdmin(data)
      }
    }
    loadAdmin()
  }, [supabase])

  return (
    <header className="h-14 border-b border-night-700 bg-night-900/50 backdrop-blur-sm flex items-center justify-end px-6">
      {admin && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{admin.name}</p>
            <p className="text-xs text-night-300 capitalize">{admin.role.replace('_', ' ')}</p>
          </div>
          <div className="w-8 h-8 bg-gold-500/20 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gold-400" />
          </div>
        </div>
      )}
    </header>
  )
}
