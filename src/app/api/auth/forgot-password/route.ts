import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createRecoveryBundle } from '@/lib/auth/passwordRecoveryToken'

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
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const countryCode = String(body?.countryCode || 'AE').trim().toUpperCase()

    if (!email || !email.includes('@')) {
      return withCors(
        NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 }),
        origin
      )
    }

    const adminClient = createAdminClient()
    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', email)
      .maybeSingle()

    const bundle = createRecoveryBundle(email, 15)
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://client.transhola.com'
    const resetUrl = `${siteBase}/update-password?token=${encodeURIComponent(bundle.linkToken)}&email=${encodeURIComponent(email)}`

    const dispatchEndpoints = [
      process.env.SUPERADMIN_INTERNAL_URL
        ? `${process.env.SUPERADMIN_INTERNAL_URL}/api/auth-recovery-email`
        : 'http://superadmin-service:3000/api/auth-recovery-email',
      'https://admin.transhola.com/api/auth-recovery-email',
    ]

    let delivered = false
    for (const endpoint of dispatchEndpoints) {
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            customerName: profile?.full_name || email.split('@')[0],
            otpCode: bundle.otpCode,
            resetUrl,
            expiresMinutes: 15,
            countryCode,
          }),
          signal: AbortSignal.timeout(2800),
        })
        if (resp.ok) {
          const json = await resp.json().catch(() => ({}))
          if (json?.ok || json?.delivered) {
            delivered = true
            break
          }
        }
      } catch {
        // Try fallback endpoint
      }
    }

    return withCors(
      NextResponse.json({
        success: true,
        delivered,
        email,
        challengeToken: bundle.challengeToken,
        message: `We sent a 6-digit password reset code and recovery link to ${email}.`,
      }),
      origin
    )
  } catch (err: any) {
    return withCors(
      NextResponse.json({ error: err?.message || 'Unable to initiate password recovery.' }, { status: 500 }),
      origin
    )
  }
}

