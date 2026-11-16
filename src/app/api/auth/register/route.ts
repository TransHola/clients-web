import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateAuthInputs, sanitizeAuthError } from '@/lib/security/authGuard'
import {
  CLIENT_SESSION_COOKIE,
  SUPABASE_SSR_COOKIE,
  buildSessionCookieOptions,
  createClientSessionBundle,
} from '@/lib/auth/clientSession'

function withCors(res: NextResponse, origin?: string | null) {
  const allowed =
    origin && (origin === 'https://transhola.com' || origin.endsWith('.transhola.com') || origin.startsWith('http://localhost'))
      ? origin
      : 'https://client.transhola.com'
  res.headers.set('Access-Control-Allow-Origin', allowed)
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request.headers.get('origin'))
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'

  try {
    const body = await request.json()
    const rawEmail = String(body?.email || '').trim().toLowerCase()
    const rawPassword = String(body?.password || '')
    const firstName = String(body?.firstName || body?.first_name || '').slice(0, 100).trim()
    const lastName = String(body?.lastName || body?.last_name || '').slice(0, 100).trim()
    const entityName = String(body?.entityName || body?.companyName || body?.company_name || '').slice(0, 150).trim()
    const phone = String(body?.phone || '').slice(0, 30).trim()
    const isCompany = Boolean(body?.isCompany || body?.is_company || entityName)

    const validation = validateAuthInputs(rawEmail, rawPassword)
    if (!validation.isValid || !validation.normalizedEmail) {
      return withCors(
        NextResponse.json({ error: validation.error || 'Valid email and password are required.' }, { status: 400 }),
        origin
      )
    }

    const adminClient = createAdminClient()
    const { data: regResult, error: rpcError } = await (adminClient as any).rpc('register_client_account', {
      p_email: validation.normalizedEmail,
      p_password: rawPassword,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
      p_phone: phone || null,
      p_company_name: entityName || null,
      p_is_company: isCompany,
    })

    if (rpcError) {
      return withCors(
        NextResponse.json({ error: sanitizeAuthError(rpcError) }, { status: 400 }),
        origin
      )
    }

    if (regResult?.error) {
      return withCors(
        NextResponse.json({ error: regResult.error }, { status: 400 }),
        origin
      )
    }

    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', regResult.id)
      .maybeSingle()

    const bundle = await createClientSessionBundle({
      id: regResult.id,
      email: regResult.email,
      user_metadata: regResult.user_metadata || {},
      app_metadata: regResult.app_metadata || {},
      profile,
    })

    const res = NextResponse.json({
      success: true,
      user: bundle.user,
      profile,
      session: bundle.session,
      redirectTo: '/',
    })
    const cookieOpts = buildSessionCookieOptions(host, proto)
    res.cookies.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
    res.cookies.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)
    return withCors(res, origin)
  } catch (err: any) {
    return withCors(
      NextResponse.json({ error: sanitizeAuthError(err) }, { status: 500 }),
      origin
    )
  }
}

