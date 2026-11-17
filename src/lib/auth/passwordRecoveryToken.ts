import crypto from 'crypto'

const RECOVERY_SECRET =
  process.env.PGRST_JWT_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'super-secret-jwt-token-with-at-least-32-characters-long'

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8')
}

export function createRecoveryBundle(email: string, ttlMinutes = 15): {
  otpCode: string
  challengeToken: string
  linkToken: string
  expiresAt: number
} {
  const normEmail = email.trim().toLowerCase()
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = Math.floor(Date.now() / 1000) + ttlMinutes * 60
  const nonce = crypto.randomBytes(8).toString('hex')

  // Challenge token binds email + expiry + HMAC(otp), never exposing otpCode in cleartext
  const otpMac = crypto
    .createHmac('sha256', RECOVERY_SECRET)
    .update(`otp:${normEmail}:${expiresAt}:${nonce}:${otpCode}`)
    .digest('hex')

  const challengePayload = base64UrlEncode(
    JSON.stringify({ e: normEmail, exp: expiresAt, n: nonce, m: otpMac })
  )
  const challengeSig = base64UrlEncode(
    crypto.createHmac('sha256', RECOVERY_SECRET).update(`chal:${challengePayload}`).digest()
  )
  const challengeToken = `${challengePayload}.${challengeSig}`

  // Direct link token sent only inside the user's email inbox
  const linkPayload = base64UrlEncode(
    JSON.stringify({ e: normEmail, exp: expiresAt, n: nonce, k: 'reset_link' })
  )
  const linkSig = base64UrlEncode(
    crypto.createHmac('sha256', RECOVERY_SECRET).update(`link:${linkPayload}`).digest()
  )
  const linkToken = `${linkPayload}.${linkSig}`

  return { otpCode, challengeToken, linkToken, expiresAt }
}

export function verifyOtpChallengeToken(
  email: string,
  otpCode: string,
  challengeToken: string
): { valid: boolean; email?: string; error?: string } {
  try {
    const parts = String(challengeToken || '').split('.')
    if (parts.length !== 2) return { valid: false, error: 'Invalid recovery session. Please request a new code.' }
    const [payloadB64, sigB64] = parts

    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', RECOVERY_SECRET).update(`chal:${payloadB64}`).digest()
    )
    if (sigB64.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) {
      return { valid: false, error: 'Invalid recovery signature. Please request a new code.' }
    }

    const parsed = JSON.parse(base64UrlDecode(payloadB64))
    const now = Math.floor(Date.now() / 1000)
    if (!parsed?.exp || now > parsed.exp) {
      return { valid: false, error: 'Recovery code has expired. Please request a new code.' }
    }

    const normEmail = String(email || parsed.e || '').trim().toLowerCase()
    if (normEmail !== parsed.e) {
      return { valid: false, error: 'Email mismatch for recovery code.' }
    }

    const expectedOtpMac = crypto
      .createHmac('sha256', RECOVERY_SECRET)
      .update(`otp:${normEmail}:${parsed.exp}:${parsed.n}:${String(otpCode || '').trim()}`)
      .digest('hex')

    if (
      expectedOtpMac.length !== String(parsed.m || '').length ||
      !crypto.timingSafeEqual(Buffer.from(expectedOtpMac), Buffer.from(String(parsed.m)))
    ) {
      return { valid: false, error: 'Incorrect 6-digit recovery code. Please check your email and try again.' }
    }

    return { valid: true, email: normEmail }
  } catch {
    return { valid: false, error: 'Invalid recovery token. Please request a new code.' }
  }
}

export function verifyResetLinkToken(linkToken: string): {
  valid: boolean
  email?: string
  error?: string
} {
  try {
    const parts = String(linkToken || '').split('.')
    if (parts.length !== 2) return { valid: false, error: 'Invalid or malformed password reset link.' }
    const [payloadB64, sigB64] = parts

    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', RECOVERY_SECRET).update(`link:${payloadB64}`).digest()
    )
    if (sigB64.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) {
      return { valid: false, error: 'Invalid password reset link signature.' }
    }

    const parsed = JSON.parse(base64UrlDecode(payloadB64))
    const now = Math.floor(Date.now() / 1000)
    if (!parsed?.exp || now > parsed.exp || parsed.k !== 'reset_link' || !parsed.e) {
      return { valid: false, error: 'This password reset link has expired. Please request a new one.' }
    }

    return { valid: true, email: String(parsed.e).trim().toLowerCase() }
  } catch {
    return { valid: false, error: 'Invalid password reset link.' }
  }
}

