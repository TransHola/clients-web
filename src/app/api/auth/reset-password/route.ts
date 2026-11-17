import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  verifyOtpChallengeToken,
  verifyResetLinkToken,
} from '@/lib/auth/passwordRecoveryToken'
import {
  CLIENT_SESSION_COOKIE,
  SUPABASE_SSR_COOKIE,
  buildSessionCookieOptions,
  createClientSessionBundle,
} from '@/lib/auth/clientSession'

export const dynamic = 'force-dynamic'

function withCors(res: NextResponse, origin?: string | null) {
  const allowed =
    origin &&
    (origin === 'https://transhola.com' ||
      origin.endsWith('.transhola.com') ||
      origin.startsWith('http://localhost'))
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
    const newPassword = String(body?.password || body?.newPassword || '')
    const linkToken = String(body?.token || body?.linkToken || '').trim()
    const challengeToken = String(body?.challengeToken || '').trim()
    const otpCode = String(body?.otpCode || body?.otp || '').trim()
    const inputEmail = String(body?.email || '').trim().toLowerCase()

    if (newPassword.length < 8) {
      return withCors(
        NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 }),
        origin
      )
    }

    let verifiedEmail = ''
    if (linkToken) {
      const check = verifyResetLinkToken(linkToken)
      if (!check.valid || !check.email) {
        return withCors(
          NextResponse.json({ error: check.error || 'Invalid or expired reset link.' }, { status: 400 }),
          origin
        )
      }
      verifiedEmail = check.email
    } else if (challengeToken && otpCode) {
      const check = verifyOtpChallengeToken(inputEmail, otpCode, challengeToken)
      if (!check.valid || !check.email) {
        return withCors(
          NextResponse.json({ error: check.error || 'Invalid recovery code.' }, { status: 400 }),
          origin
        )
      }
      verifiedEmail = check.email
    } else {
      return withCors(
        NextResponse.json({ error: 'Recovery verification code or reset token is required.' }, { status: 400 }),
        origin
      )
    }

    const adminClient = createAdminClient()
    const { data: updatedUser, error: rpcError } = await (adminClient as any).rpc(
      'update_client_password_by_email',
      {
        p_email: verifiedEmail,
        p_new_password: newPassword,
      }
    )

    if (rpcError || updatedUser?.error) {
      return withCors(
        NextResponse.json(
          { error: updatedUser?.error || rpcError?.message || 'Unable to update password.' },
          { status: 400 }
        ),
        origin
      )
    }

    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', updatedUser.id)
      .maybeSingle()

    const bundle = await createClientSessionBundle({
      id: updatedUser.id,
      email: updatedUser.email || verifiedEmail,
      user_metadata: updatedUser.user_metadata || {},
      app_metadata: updatedUser.app_metadata || {},
      profile,
    })

    const res = NextResponse.json({
      success: true,
      user: bundle.user,
      profile,
      session: bundle.session,
      redirectTo: '/',
      message: 'Your password has been updated and you are now signed in.',
    })

    const cookieOpts = buildSessionCookieOptions(host, proto)
    res.cookies.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
    res.cookies.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)
    return withCors(res, origin)
  } catch (err: any) {
    return withCors(
      NextResponse.json({ error: err?.message || 'Unexpected error resetting password.' }, { status: 500 }),
      origin
    )
  }
}

