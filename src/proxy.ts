import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  // 1. Generate nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com ${isDev ? "'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://*.ingest.sentry.io;
    frame-src https://challenges.cloudflare.com https://www.google.com https://maps.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://testsecureacceptance.cybersource.com https://secureacceptance.cybersource.com;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  // 2. Set nonce on request headers so Server Components can read it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  // 3. Create response with updated headers
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('Content-Security-Policy', cspHeader)

  // Preserve other security headers (previously in next.config.mjs)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // 4. Supabase session refresh + route protection
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
          response = NextResponse.next({
            request: { headers: requestHeaders },
          })
          // Re-apply security headers after recreating response
          response.headers.set('Content-Security-Policy', cspHeader)
          response.headers.set('X-Frame-Options', 'DENY')
          response.headers.set('X-Content-Type-Options', 'nosniff')
          response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
          response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
          response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Skip auth check for public routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/scanner')) {
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect admin routes (except login)
  const isProtectedAdmin =
    pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')

  // Protect scanner routes (except scanner login)
  const isProtectedScanner =
    pathname.startsWith('/scanner') && !pathname.startsWith('/scanner/login')

  if (isProtectedAdmin && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set('Content-Security-Policy', cspHeader)
    return redirectResponse
  }

  if (isProtectedScanner && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/scanner/login'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set('Content-Security-Policy', cspHeader)
    return redirectResponse
  }

  // Redirect logged-in users away from login pages
  if (pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set('Content-Security-Policy', cspHeader)
    return redirectResponse
  }

  if (pathname === '/scanner/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/scanner'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set('Content-Security-Policy', cspHeader)
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
