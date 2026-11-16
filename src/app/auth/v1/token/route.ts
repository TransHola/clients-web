import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  CLIENT_SESSION_COOKIE,
  SUPABASE_SSR_COOKIE,
  buildSessionCookieOptions,
  createClientSessionBundle,
  resolveVerifiedUserFromCookiesOrHeader,
  verifySupabaseJwt,
} from '@/lib/auth/clientSession'
import {
  ALLOWED_CLIENT_ROLES,
  PROHIBITED_OPERATOR_ROLES,
} from '@/lib/security/authGuard'

function withCors(res: NextResponse, origin?: string | null) {
  const allowed =
    origin && (origin === 'https://transhola.com' || origin.endsWith('.transhola.com') || origin.startsWith('http://localhost'))
      ? origin
      : 'https://client.transhola.com'
  res.headers.set('Access-Control-Allow-Origin', allowed)
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version')
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request.headers.get('origin'))
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const grantType = request.nextUrl.searchParams.get('grant_type') || 'password'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'

  let body: any = {}
  try {
    body = await request.json()
  } catch {}

  if (grantType === 'refresh_token') {
    const rawRefresh = body?.refresh_token || ''
    const claims = await verifySupabaseJwt(rawRefresh)
    const fallback = claims
      ? {
          id: String(claims.sub),
          email: String(claims.email),
          user_metadata: claims.user_metadata || {},
          app_metadata: claims.app_metadata || {},
        }
      : (
          await resolveVerifiedUserFromCookiesOrHeader(
            request.cookies.getAll(),
            request.headers.get('authorization')
          )
        )?.user

    if (!fallback?.id) {
      return withCors(
        NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid refresh token' }, { status: 400 }),
        origin
      )
    }

    const adminClient = createAdminClient()
    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', fallback.id)
      .maybeSingle()

    const bundle = await createClientSessionBundle({
      id: fallback.id,
      email: fallback.email,
      user_metadata: fallback.user_metadata,
      app_metadata: fallback.app_metadata,
      profile,
    })

    const res = NextResponse.json(bundle.session)
    const cookieOpts = buildSessionCookieOptions(host, proto)
    res.cookies.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
    res.cookies.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)
    return withCors(res, origin)
  }

  // Password grant
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  if (!email || !password) {
    return withCors(
      NextResponse.json({ error: 'invalid_grant', error_description: 'Email and password are required.' }, { status: 400 }),
      origin
    )
  }

  const adminClient = createAdminClient()
  const { data: rpcUser } = await (adminClient as any).rpc('verify_user_credentials', {
    p_email: email,
    p_password: password,
  })

  if (!rpcUser || !rpcUser.id) {
    return withCors(
      NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, { status: 400 }),
      origin
    )
  }

  const { data: profile } = await (adminClient as any)
    .from('profiles')
    .select('*')
    .eq('id', rpcUser.id)
    .maybeSingle()

  const role = (profile?.role || rpcUser.user_metadata?.role || 'client').toLowerCase().trim()
  const status = (profile?.status || '').toLowerCase().trim()

  if (status === 'suspended' || status === 'banned' || status === 'inactive') {
    return withCors(
      NextResponse.json({ error: 'access_denied', error_description: 'Account suspended or deactivated.' }, { status: 403 }),
      origin
    )
  }

  if ((PROHIBITED_OPERATOR_ROLES as readonly string[]).includes(role)) {
    return withCors(
      NextResponse.json({ error: 'access_denied', error_description: 'Fleet Operators must sign in at operator.transhola.com.' }, { status: 403 }),
      origin
    )
  }

  if (role && !(ALLOWED_CLIENT_ROLES as readonly string[]).includes(role)) {
    return withCors(
      NextResponse.json({ error: 'access_denied', error_description: 'Unauthorized role for Client Portal.' }, { status: 403 }),
      origin
    )
  }

  const bundle = await createClientSessionBundle({
    id: rpcUser.id,
    email: rpcUser.email || email,
    user_metadata: rpcUser.user_metadata || {},
    app_metadata: rpcUser.app_metadata || {},
    profile,
  })

  const res = NextResponse.json(bundle.session)
  const cookieOpts = buildSessionCookieOptions(host, proto)
  res.cookies.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
  res.cookies.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)
  return withCors(res, origin)
}

