import { NextResponse, type NextRequest } from 'next/server'
import { resolveVerifiedUserFromCookiesOrHeader } from '@/lib/auth/clientSession'

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

  // Allow static Next.js assets, public images, icons, GoTrue endpoints, API endpoints, and PostgREST rewrites
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

  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )
  const user = resolved?.user || null

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // If unauthenticated and visiting a non-public route (including root /), redirect cleanly to /login
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

  // If genuinely authenticated with a verified customer session and visiting /login or /register, go to /
  if (user && (pathname === '/login' || pathname === '/register')) {
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    const url = request.nextUrl.clone()
    if (redirectParam && redirectParam.startsWith('/')) {
      const targetUrl = new URL(redirectParam, request.url)
      return NextResponse.redirect(targetUrl)
    }
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next({ request })
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
