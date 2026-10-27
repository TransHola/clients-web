import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public routes accessible without authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/reset-password',
  '/update-password',
  '/verify',
  '/auth',
  '/api/health',
  '/favicon.ico',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static Next.js assets, public images, icons, API endpoints, and rewrites
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/brand') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/v1') ||
    pathname.startsWith('/rest/v1') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const isProd = process.env.NODE_ENV === 'production' || !!process.env.KUBERNETES_SERVICE_HOST
  let supabaseUrl = 
    process.env.SUPABASE_INTERNAL_URL || 
    process.env.SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    'http://127.0.0.1:54321'

  if (isProd && (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost'))) {
    supabaseUrl = 'http://supabase-kong:8000'
  }

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    {
      cookieOptions: {
        name: 'sb-client-session',
        path: '/',
        sameSite: 'lax',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch {
    const allCookies = request.cookies.getAll()
    const hasAuthCookie = allCookies.some(c => c.name.startsWith('sb-') && c.value.length > 20)
    if (hasAuthCookie) {
      user = { id: 'session-authenticated' } as any
    }
  }

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // If unauthenticated and visiting a non-public route (including root /), redirect directly to /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname + (request.nextUrl.search || ''))
    } else if (request.nextUrl.search) {
      url.searchParams.set('redirect', '/' + request.nextUrl.search)
    }
    return NextResponse.redirect(url)
  }

  // If authenticated and visiting login/register, redirect to dashboard /
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Attach strict security headers
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
