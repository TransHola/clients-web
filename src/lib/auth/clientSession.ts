const DEFAULT_JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ||
  'super-secret-jwt-token-with-at-least-32-characters-long'

export const CLIENT_SESSION_COOKIE = 'cw_client_session'
export const SUPABASE_SSR_COOKIE = 'sb-client-session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function toBase64UrlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function toBase64UrlFromString(str: string): string {
  const bytes = new TextEncoder().encode(str)
  return toBase64UrlFromBytes(bytes)
}

function fromBase64UrlToString(b64url: string): string {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

async function getHmacKey(secret = DEFAULT_JWT_SECRET): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signSupabaseJwt(payload: Record<string, any>, secret = DEFAULT_JWT_SECRET): Promise<string> {
  const headerB64 = toBase64UrlFromString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadB64 = toBase64UrlFromString(JSON.stringify(payload))
  const signingInput = `${headerB64}.${payloadB64}`
  const key = await getHmacKey(secret)
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  const sigB64 = toBase64UrlFromBytes(new Uint8Array(sigBuf))
  return `${signingInput}.${sigB64}`
}

export async function verifySupabaseJwt(token: string, secret = DEFAULT_JWT_SECRET): Promise<Record<string, any> | null> {
  try {
    if (!token || typeof token !== 'string') return null
    const clean = token.replace(/^Bearer\s+/i, '').replace(/^th_rt_/, '').trim()
    // Reject the legacy hardcoded supabase-kong static mock token
    if (clean.includes('OY2hIsG9vbIZRg1bLu3fAYy')) return null

    const parts = clean.split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, sigB64] = parts
    const key = await getHmacKey(secret)

    const padded = sigB64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((sigB64.length + 3) % 4)
    const binary = atob(padded)
    const sigBytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i)
    }

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    )
    if (!valid) return null

    const payload = JSON.parse(fromBase64UrlToString(payloadB64))
    if (!payload?.sub || !payload?.email) return null
    if (payload.role === 'anon') return null
    const nowSec = Math.floor(Date.now() / 1000)
    if (typeof payload.exp === 'number' && payload.exp < nowSec) return null

    // Reject legacy static kong token by exp=1983812996 without transhola_client marker
    const providers: string[] = Array.isArray(payload?.app_metadata?.providers)
      ? payload.app_metadata.providers
      : []
    if (payload.exp === 1983812996 && !providers.includes('transhola_client')) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export interface ClientUserBuildInput {
  id: string
  email: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
  profile?: Record<string, any> | null
}

export function buildSupabaseUserObject(input: ClientUserBuildInput) {
  const meta = input.user_metadata || {}
  const prefs = input.profile?.preferences || {}

  const firstName = (meta.first_name || prefs.firstName || '').trim()
  const lastName = (meta.last_name || prefs.lastName || '').trim()
  const companyName = (prefs.companyName || meta.company_name || '').trim()
  const composedName = [firstName, lastName].filter(Boolean).join(' ').trim()
  const fullName = (
    input.profile?.full_name ||
    meta.full_name ||
    composedName ||
    companyName ||
    input.email.split('@')[0]
  ).trim()
  const clientType =
    prefs.clientType || (meta.is_company || companyName ? 'Corporate' : 'Individual')
  const phone = (
    input.profile?.phone ||
    input.profile?.phone_number ||
    meta.phone ||
    ''
  ).trim()
  const role = (input.profile?.role || meta.role || 'client').toLowerCase().trim()
  const nowIso = new Date().toISOString()

  return {
    id: input.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: input.email.toLowerCase().trim(),
    email_confirmed_at: nowIso,
    phone,
    confirmed_at: nowIso,
    last_sign_in_at: nowIso,
    app_metadata: {
      provider: 'email',
      providers: ['email', 'transhola_client'],
      ...(input.app_metadata || {}),
    },
    user_metadata: {
      ...meta,
      first_name: firstName || fullName.split(' ')[0] || '',
      last_name: lastName,
      full_name: fullName,
      company_name: companyName,
      client_type: clientType,
      phone,
      role,
    },
    identities: [],
    created_at: input.profile?.created_at || nowIso,
    updated_at: nowIso,
  }
}

export async function createClientSessionBundle(input: ClientUserBuildInput) {
  const user = buildSupabaseUserObject(input)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + SESSION_TTL_SECONDS

  const accessToken = await signSupabaseJwt({
    iss: 'supabase-demo',
    sub: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    phone: user.phone || '',
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    iat,
    exp,
  })

  const refreshToken = `th_rt_${accessToken}`
  const session = {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: SESSION_TTL_SECONDS,
    expires_at: exp,
    refresh_token: refreshToken,
    user,
  }

  const ssrCookieValue = `base64-${toBase64UrlFromString(JSON.stringify(session))}`

  return {
    user,
    session,
    accessToken,
    refreshToken,
    ssrCookieValue,
  }
}

export function resolveCookieDomain(hostHeader?: string | null): string | undefined {
  if (!hostHeader) return undefined
  const host = hostHeader.split(':')[0].toLowerCase().trim()
  if (host === 'transhola.com' || host.endsWith('.transhola.com')) {
    return '.transhola.com'
  }
  return undefined
}

export function buildSessionCookieOptions(hostHeader?: string | null, protoHeader?: string | null) {
  const domain = resolveCookieDomain(hostHeader)
  const isSecure =
    Boolean(domain) ||
    protoHeader === 'https' ||
    process.env.NODE_ENV === 'production'

  return {
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecure,
    httpOnly: false,
    maxAge: SESSION_TTL_SECONDS,
    ...(domain ? { domain } : {}),
  }
}

export function extractAccessTokenFromCookies(
  allCookies: Array<{ name: string; value: string }>
): string | null {
  // 1. Prefer canonical signed cw_client_session cookie
  const direct = allCookies.filter((c) => c.name === CLIENT_SESSION_COOKIE && c.value)
  for (const item of direct) {
    if (!item.value.includes('OY2hIsG9vbIZRg1bLu3fAYy')) {
      return item.value
    }
  }

  // 2. Fallback to @supabase/ssr sb-client-session cookie (single or chunked)
  const exactSsr = allCookies.filter((c) => c.name === SUPABASE_SSR_COOKIE && c.value)
  for (const c of exactSsr) {
    const parsed = parseSsrSessionCookieValue(c.value)
    if (parsed?.access_token && !parsed.access_token.includes('OY2hIsG9vbIZRg1bLu3fAYy')) {
      return parsed.access_token
    }
  }

  // Reassemble chunked sb-client-session.0, sb-client-session.1, ...
  const chunks = allCookies
    .filter((c) => /^sb-client-session\.\d+$/.test(c.name))
    .sort((a, b) => {
      const idxA = parseInt(a.name.split('.').pop() || '0', 10)
      const idxB = parseInt(b.name.split('.').pop() || '0', 10)
      return idxA - idxB
    })
  if (chunks.length > 0) {
    const joined = chunks.map((c) => c.value).join('')
    const parsed = parseSsrSessionCookieValue(joined)
    if (parsed?.access_token && !parsed.access_token.includes('OY2hIsG9vbIZRg1bLu3fAYy')) {
      return parsed.access_token
    }
  }

  return null
}

export function parseSsrSessionCookieValue(rawValue: string): any | null {
  try {
    let val = decodeURIComponent(rawValue)
    if (val.startsWith('base64-')) {
      val = fromBase64UrlToString(val.slice('base64-'.length))
    }
    return JSON.parse(val)
  } catch {
    return null
  }
}

export async function resolveVerifiedUserFromCookiesOrHeader(
  allCookies: Array<{ name: string; value: string }>,
  authHeader?: string | null
) {
  let candidateToken: string | null = null
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim()
    // Ignore anon key or static mock token in Authorization header and fall back to cookies
    const verifiedBearer = await verifySupabaseJwt(bearer)
    if (verifiedBearer) {
      candidateToken = bearer
      return buildUserFromJwtClaims(verifiedBearer, candidateToken)
    }
  }

  candidateToken = extractAccessTokenFromCookies(allCookies)
  if (!candidateToken) return null

  const claims = await verifySupabaseJwt(candidateToken)
  if (!claims) return null

  return buildUserFromJwtClaims(claims, candidateToken)
}

function buildUserFromJwtClaims(claims: Record<string, any>, accessToken: string) {
  const user = buildSupabaseUserObject({
    id: String(claims.sub),
    email: String(claims.email),
    user_metadata: claims.user_metadata || {},
    app_metadata: claims.app_metadata || {},
  })
  return {
    user,
    claims,
    accessToken,
  }
}

