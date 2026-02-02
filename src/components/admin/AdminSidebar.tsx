'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  Users,
  Crown,
  ScanLine,
  UserCog,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/vip', label: 'VIP Inquiries', icon: Crown },
  { href: '/admin/scanner', label: 'Scanner', icon: ScanLine },
  { href: '/admin/staff', label: 'Staff', icon: UserCog },
  { href: '/admin/recurring', label: 'Recurring', icon: RefreshCw },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } bg-night-900 border-r border-night-700 h-screen flex flex-col transition-all duration-200`}
    >
      {/* Brand */}
      <div className="p-4 border-b border-night-700 flex items-center justify-between">
        {!collapsed && (
          <Link href="/admin" className="text-lg font-bold text-gold-gradient">
            Taj Mahal
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-night-400 hover:text-white transition-colors p-1"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                  : 'text-night-200 hover:bg-night-800 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-gold-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-night-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-night-300 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
