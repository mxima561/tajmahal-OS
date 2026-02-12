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

  // H6: Verify user exists in admin_users table for protected routes
  // This prevents non-admin Supabase users from accessing admin/scanner pages
  if ((isProtectedAdmin || isProtectedScanner) && user) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser) {
      // User is authenticated but not an admin - sign them out and redirect
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = isProtectedScanner ? '/scanner/login' : '/admin/login'
      url.searchParams.set('error', 'access_denied')
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from login pages
  if (pathname === '/admin/login' && user) {
    // Verify they're actually an admin before redirecting
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (adminUser) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  if (pathname === '/scanner/login' && user) {
    // Verify they're actually an admin before redirecting
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (adminUser) {
      const url = request.nextUrl.clone()
      url.pathname = '/scanner'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
