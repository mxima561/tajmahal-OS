import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Skip auth check for public routes — only /admin and /scanner need protection
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/scanner')) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware only verifies authentication (is the user logged in?).
  // Role-based access control (admin, manager, staff) is delegated to individual
  // API route handlers, which check the `admin_users` table for the user's role.

  // Protect admin routes (except login)
  const isProtectedAdmin =
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login')

  // Protect scanner routes (except scanner login)
  const isProtectedScanner =
    pathname.startsWith('/scanner') &&
    !pathname.startsWith('/scanner/login')

  if (isProtectedAdmin && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (isProtectedScanner && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/scanner/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login pages
  if (pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  if (pathname === '/scanner/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/scanner'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
