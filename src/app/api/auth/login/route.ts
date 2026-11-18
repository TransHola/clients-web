import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  extractClientIp,
  validateAuthInputs,
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
  enforceConstantTime,
  ALLOWED_CLIENT_ROLES,
  PROHIBITED_OPERATOR_ROLES,
  sanitizeAuthError,
} from '@/lib/security/authGuard'
import {
  CLIENT_SESSION_COOKIE,
  SUPABASE_SSR_COOKIE,
  buildSessionCookieOptions,
  createClientSessionBundle,
} from '@/lib/auth/clientSession'
import {
  checkPortalSecurityGate,
  extractRequestCountry,
  hashSessionFingerprint,
  recordPortalAuthAttempt,
  registerPortalSecuritySession,
} from '@/lib/security/security-telemetry'

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

export async function OPTIONS(request: Request) {
  return withCors(new NextResponse(null, { status: 204 }), request.headers.get('origin'))
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const clientIp = extractClientIp(request.headers)
  const userAgent = request.headers.get('user-agent') || 'Unknown Client'
  const country = extractRequestCountry(request.headers)
  const adminClient = createAdminClient()

  try {
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      return withCors(
        NextResponse.json({ error: 'Malformed request payload.' }, { status: 400 }),
        origin
      )
    }

    const { email, password } = body || {}

    // 1. Rigorous input validation & Hash-Flooding DoS mitigation
    const validation = validateAuthInputs(email, password)
    if (!validation.isValid || !validation.normalizedEmail) {
      await recordPortalAuthAttempt(adminClient, {
        email: typeof email === 'string' ? email.trim().toLowerCase() : 'invalid-payload',
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        outcome: 'invalid_input',
        blockedAutomatically: true,
        reason: validation.error || 'Rejected malformed client login input',
      })
      await enforceConstantTime(startTime, 300)
      return withCors(
        NextResponse.json(
          { error: validation.error || 'Email and password are required.' },
          { status: 400 }
        ),
        origin
      )
    }

    const normalizedEmail = validation.normalizedEmail

    // 1b. Live Security Gate (IP Blocklist & Emergency Lock Mode)
    const gate = await checkPortalSecurityGate(adminClient, {
      ip: clientIp,
      email: normalizedEmail,
      portal: 'clients-web',
      userAgent,
      country,
    })
    if (!gate.allowed) {
      await enforceConstantTime(startTime, 300)
      return withCors(
        NextResponse.json(
          { error: gate.error },
          {
            status: gate.status || 403,
            headers: gate.retryAfterSeconds
              ? { 'Retry-After': String(gate.retryAfterSeconds) }
              : undefined,
          }
        ),
        origin
      )
    }

    // 2. Sliding-Window Adaptive Rate Limiting
    const rateLimit = checkLoginRateLimit(clientIp, normalizedEmail)
    if (!rateLimit.allowed) {
      await recordPortalAuthAttempt(adminClient, {
        email: normalizedEmail,
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        outcome: 'rate_limited',
        blockedAutomatically: true,
        reason: rateLimit.error || 'Client login rate limit triggered',
        policy: gate.policy,
      })
      await enforceConstantTime(startTime, 300)
      return withCors(
        NextResponse.json(
          { error: rateLimit.error },
          {
            status: 429,
            headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) },
          }
        ),
        origin
      )
    }

    // 3. Cryptographic Password Verification via Postgres pgcrypto RPC
    let verifiedUser: any = null

    const { data: rpcUser } = await (adminClient as any).rpc('verify_user_credentials', {
      p_email: normalizedEmail,
      p_password: password,
    })

    if (rpcUser && rpcUser.id) {
      verifiedUser = rpcUser
    }

    if (!verifiedUser || !verifiedUser.id) {
      recordLoginFailure(clientIp, normalizedEmail)
      await recordPortalAuthAttempt(adminClient, {
        email: normalizedEmail,
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        outcome: 'failed_credentials',
        blockedAutomatically: false,
        reason: 'Invalid client email or password',
        policy: gate.policy,
      })
      await enforceConstantTime(startTime, 350)
      return withCors(
        NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 }),
        origin
      )
    }

    // 4. Role & Portal Isolation Guard
    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', verifiedUser.id)
      .maybeSingle()

    const role = (profile?.role || verifiedUser.user_metadata?.role || 'client')
      .toLowerCase()
      .trim()
    const status = (profile?.status || '').toLowerCase().trim()

    if (status === 'suspended' || status === 'banned' || status === 'inactive') {
      recordLoginFailure(clientIp, normalizedEmail)
      await recordPortalAuthAttempt(adminClient, {
        email: normalizedEmail,
        userId: verifiedUser.id,
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        outcome: 'account_suspended',
        blockedAutomatically: true,
        reason: `Blocked sign-in from ${status} client account`,
        policy: gate.policy,
      })
      await enforceConstantTime(startTime, 350)
      return withCors(
        NextResponse.json(
          { error: 'Access denied. Your account has been suspended or deactivated.' },
          { status: 403 }
        ),
        origin
      )
    }

    if ((PROHIBITED_OPERATOR_ROLES as readonly string[]).includes(role)) {
      recordLoginFailure(clientIp, normalizedEmail)
      await recordPortalAuthAttempt(adminClient, {
        email: normalizedEmail,
        userId: verifiedUser.id,
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        outcome: 'role_denied',
        blockedAutomatically: true,
        reason: `Portal isolation blocked operator role '${role}' on Client Portal`,
        policy: gate.policy,
      })
      await enforceConstantTime(startTime, 350)
      return withCors(
        NextResponse.json(
          {
            error:
              'Access Denied: This account is registered as a Fleet Operator. Please log in at the Fleet Operators portal (operator.transhola.com).',
          },
          { status: 403 }
        ),
        origin
      )
    }

    if (role && !(ALLOWED_CLIENT_ROLES as readonly string[]).includes(role)) {
      recordLoginFailure(clientIp, normalizedEmail)
      await recordPortalAuthAttempt(adminClient, {
        email: normalizedEmail,
        userId: verifiedUser.id,
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        outcome: 'role_denied',
        blockedAutomatically: true,
        reason: `Unauthorized role '${role}' blocked on Client Portal`,
        policy: gate.policy,
      })
      await enforceConstantTime(startTime, 350)
      return withCors(
        NextResponse.json(
          { error: 'Access Denied: Unauthorized role for this portal.' },
          { status: 403 }
        ),
        origin
      )
    }

    // 5. Issue real customer HS256 JWT & session cookies (never static admin mock)
    const bundle = await createClientSessionBundle({
      id: verifiedUser.id,
      email: verifiedUser.email || normalizedEmail,
      user_metadata: verifiedUser.user_metadata || {},
      app_metadata: verifiedUser.app_metadata || {},
      profile,
    })

    recordLoginSuccess(clientIp, normalizedEmail)

    const fp = hashSessionFingerprint(`clients-web:${verifiedUser.id}:${clientIp}:${userAgent}`)
    await Promise.all([
      registerPortalSecuritySession(adminClient, {
        sessionFingerprint: fp,
        userId: verifiedUser.id,
        email: normalizedEmail,
        actorName: profile?.full_name || verifiedUser.user_metadata?.full_name || normalizedEmail,
        role,
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        ttlHours: gate.policy?.sessionTtlHours || 12,
      }),
      recordPortalAuthAttempt(adminClient, {
        email: normalizedEmail,
        userId: verifiedUser.id,
        portal: 'clients-web',
        ip: clientIp,
        userAgent,
        country,
        outcome: 'success',
        blockedAutomatically: false,
        reason: 'Authenticated Client Portal session established',
        policy: gate.policy,
      }),
    ])

    const userPhone =
      profile?.phone ||
      profile?.phone_number ||
      verifiedUser.user_metadata?.phone ||
      ''
    const redirectTo =
      profile?.status === 'Pending Verification'
        ? `/verify?email=${encodeURIComponent(normalizedEmail)}&phone=${encodeURIComponent(userPhone)}`
        : '/'

    const res = NextResponse.json({
      success: true,
      user: bundle.user,
      profile,
      session: bundle.session,
      redirectTo,
    })

    const cookieOpts = buildSessionCookieOptions(host, proto)
    res.cookies.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
    res.cookies.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)

    return withCors(res, origin)
  } catch (err: any) {
    await enforceConstantTime(startTime, 300)
    return withCors(
      NextResponse.json({ error: sanitizeAuthError(err) }, { status: 500 }),
      origin
    )
  }
}
