'use client'
// NOTE: This layout is a client component because it uses usePathname() to detect
// the login page and conditionally render the sidebar/header. A future optimization
// would be to extract the auth/login check into a smaller client boundary (e.g., a
// wrapper component), allowing this layout to remain a Server Component and reducing
// the client-side JS bundle.

import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6 bg-night-950">
          {children}
        </main>
      </div>
    </div>
  )
}
