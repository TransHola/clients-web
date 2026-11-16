import { NextRequest, NextResponse } from 'next/server'
import {
  CLIENT_SESSION_COOKIE,
  SUPABASE_SSR_COOKIE,
  resolveCookieDomain,
} from '@/lib/auth/clientSession'

function clearCookies(res: NextResponse, hostHeader?: string | null) {
  const domain = resolveCookieDomain(hostHeader)
  const names = [
    CLIENT_SESSION_COOKIE,
    SUPABASE_SSR_COOKIE,
    `${SUPABASE_SSR_COOKIE}.0`,
    `${SUPABASE_SSR_COOKIE}.1`,
    'sb-localhost-auth-token',
  ]
  for (const name of names) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 })
    if (domain) {
      res.cookies.set(name, '', { path: '/', domain, maxAge: 0 })
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const res = NextResponse.json({ success: true })
  clearCookies(res, host)
  return res
}

export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const redirectParam = request.nextUrl.searchParams.get('redirect') || '/login'
  const safeTarget =
    redirectParam.startsWith('https://transhola.com') ||
    redirectParam.startsWith('https://client.transhola.com') ||
    redirectParam.startsWith('/')
      ? redirectParam
      : '/login'
  const url = safeTarget.startsWith('http')
    ? new URL(safeTarget)
    : new URL(safeTarget, request.url)

  const res = NextResponse.redirect(url)
  clearCookies(res, host)
  return res
}

