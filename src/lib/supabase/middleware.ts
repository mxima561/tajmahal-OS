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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect admin routes (except login)
  const isProtectedAdmin =
    request.nextUrl.pathname.startsWith('/admin') &&
    !request.nextUrl.pathname.startsWith('/admin/login')

  // Protect scanner routes (except scanner login)
  const isProtectedScanner =
    request.nextUrl.pathname.startsWith('/scanner') &&
    !request.nextUrl.pathname.startsWith('/scanner/login')

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
  if (request.nextUrl.pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  if (request.nextUrl.pathname === '/scanner/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/scanner'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
