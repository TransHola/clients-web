'use server'
import crypto from 'crypto'
import twilio from 'twilio'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
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
  resolveCookieDomain,
  resolveVerifiedUserFromCookiesOrHeader,
} from '@/lib/auth/clientSession'

export async function login(formData: FormData) {
  const startTime = Date.now()
  let clientIp = '127.0.0.1'
  let hostHeader: string | null = null
  let protoHeader: string | null = 'https'

  try {
    const reqHeaders = await headers()
    clientIp = extractClientIp(reqHeaders)
    hostHeader = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host')
    protoHeader = reqHeaders.get('x-forwarded-proto') || 'https'
  } catch {
    // Fallback in edge runtimes
  }

  const rawEmail = formData.get('email') as string
  const rawPassword = formData.get('password') as string

  // 1. Rigorous input validation & Hash-Flooding DoS mitigation
  const validation = validateAuthInputs(rawEmail, rawPassword)
  if (!validation.isValid || !validation.normalizedEmail) {
    await enforceConstantTime(startTime, 300)
    return { error: validation.error || 'Email and password are required.' }
  }

  const normalizedEmail = validation.normalizedEmail

  // 2. Sliding-Window Adaptive Rate Limiting
  const rateLimit = checkLoginRateLimit(clientIp, normalizedEmail)
  if (!rateLimit.allowed) {
    await enforceConstantTime(startTime, 300)
    return { error: rateLimit.error }
  }

  // 3. Cryptographic Password Verification via Postgres pgcrypto RPC
  const adminClient = createAdminClient()
  let verifiedUser: any = null

  const { data: rpcUser } = await (adminClient as any).rpc(
    'verify_user_credentials',
    {
      p_email: normalizedEmail,
      p_password: rawPassword,
    }
  )

  if (rpcUser && rpcUser.id) {
    verifiedUser = rpcUser
  }

  if (!verifiedUser || !verifiedUser.id) {
    recordLoginFailure(clientIp, normalizedEmail)
    await enforceConstantTime(startTime, 350)
    return { error: 'Invalid email or password.' }
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
    await enforceConstantTime(startTime, 350)
    return { error: 'Access denied. Your account has been suspended or deactivated.' }
  }

  if ((PROHIBITED_OPERATOR_ROLES as readonly string[]).includes(role)) {
    recordLoginFailure(clientIp, normalizedEmail)
    await enforceConstantTime(startTime, 350)
    return {
      error:
        'Access Denied: This account is registered as a Fleet Operator. Please log in at the Fleet Operators portal (operator.transhola.com).',
    }
  }

  if (role && !(ALLOWED_CLIENT_ROLES as readonly string[]).includes(role)) {
    recordLoginFailure(clientIp, normalizedEmail)
    await enforceConstantTime(startTime, 350)
    return { error: 'Access Denied: Unauthorized role for this portal.' }
  }

  // 5. Establish real customer authenticated session cookies
  const bundle = await createClientSessionBundle({
    id: verifiedUser.id,
    email: verifiedUser.email || normalizedEmail,
    user_metadata: verifiedUser.user_metadata || {},
    app_metadata: verifiedUser.app_metadata || {},
    profile,
  })

  const cookieStore = await cookies()
  const cookieOpts = buildSessionCookieOptions(hostHeader, protoHeader)
  cookieStore.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
  cookieStore.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)

  recordLoginSuccess(clientIp, normalizedEmail)

  const userPhone =
    profile?.phone ||
    profile?.phone_number ||
    verifiedUser.user_metadata?.phone ||
    ''
  if (profile?.status === 'Pending Verification') {
    revalidatePath('/', 'layout')
    return {
      success: true,
      user: bundle.user,
      redirectTo: `/verify?email=${encodeURIComponent(normalizedEmail)}&phone=${encodeURIComponent(userPhone)}`,
    }
  }

  revalidatePath('/', 'layout')
  return {
    success: true,
    user: bundle.user,
    redirectTo: '/',
  }
}

export async function register(formData: FormData) {
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = ((formData.get('password') as string) || '')

  const firstName = ((formData.get('firstName') as string) || '').slice(0, 100).trim()
  const lastName = ((formData.get('lastName') as string) || '').slice(0, 100).trim()
  const entityName = ((formData.get('entityName') as string) || '').slice(0, 150).trim()
  const phone = ((formData.get('phone') as string) || '').slice(0, 30).trim()
  const isCompany = formData.get('isCompany') === 'true'

  const validation = validateAuthInputs(email, password)
  if (!validation.isValid || !validation.normalizedEmail) {
    return { error: validation.error || 'Valid email and password are required.' }
  }

  let hostHeader: string | null = null
  let protoHeader: string | null = 'https'
  try {
    const reqHeaders = await headers()
    hostHeader = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host')
    protoHeader = reqHeaders.get('x-forwarded-proto') || 'https'
  } catch {}

  const adminClient = createAdminClient()
  const { data: regResult, error: rpcError } = await (adminClient as any).rpc(
    'register_client_account',
    {
      p_email: validation.normalizedEmail,
      p_password: password,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
      p_phone: phone || null,
      p_company_name: entityName || null,
      p_is_company: isCompany,
    }
  )

  if (rpcError) {
    return { error: sanitizeAuthError(rpcError) }
  }
  if (regResult?.error) {
    return { error: regResult.error }
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

  const cookieStore = await cookies()
  const cookieOpts = buildSessionCookieOptions(hostHeader, protoHeader)
  cookieStore.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
  cookieStore.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://client.transhola.com'}/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/profile')
}

export async function logout() {
  let hostHeader: string | null = null
  try {
    const reqHeaders = await headers()
    hostHeader = reqHeaders.get('x-forwarded-host') || reqHeaders.get('host')
  } catch {}

  const domain = resolveCookieDomain(hostHeader)
  const cookieStore = await cookies()
  const names = [
    CLIENT_SESSION_COOKIE,
    SUPABASE_SSR_COOKIE,
    `${SUPABASE_SSR_COOKIE}.0`,
    `${SUPABASE_SSR_COOKIE}.1`,
    'sb-localhost-auth-token',
  ]
  for (const name of names) {
    try {
      cookieStore.set(name, '', { path: '/', maxAge: 0 })
      if (domain) {
        cookieStore.set(name, '', { path: '/', domain, maxAge: 0 })
      }
    } catch {}
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function verifyEmailOtp(email: string, otp: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  })
  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

function generateOtpHash(phone: string, otp: string) {
  const secret = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default_secret'
  return crypto.createHmac('sha256', secret).update(phone + otp).digest('hex')
}

export async function sendPhoneOtp() {
  const cookieStore = await cookies()
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(cookieStore.getAll())
  const user = resolved?.user
  if (!user) return { error: 'User not authenticated' }

  const phone = user.user_metadata?.phone || user.phone
  if (!phone) return { error: 'No phone number found' }

  const adminClient = createAdminClient()
  const { data: globalConfig } = await (adminClient as any)
    .from('country_configurations')
    .select('config')
    .eq('country_code', 'GLOBAL')
    .maybeSingle()

  const twilioConfig = globalConfig?.config?.integrationTaxonomyPolicy?.communication?.twilio
  const accountSid =
    twilioConfig?.accountSid ||
    process.env.TWILIO_ACCOUNT_SID ||
    'ACcbccba179d5523d3810126f3b403fcb4'
  const authToken =
    twilioConfig?.authToken ||
    process.env.TWILIO_AUTH_TOKEN ||
    '48b1679cbd376a344e5f5f360659e648'
  const messagingServiceSid =
    twilioConfig?.messagingSid ||
    process.env.TWILIO_MESSAGING_SERVICE_SID ||
    '+18777804236'

  const client = twilio(accountSid, authToken)
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const otpHash = generateOtpHash(phone, otp)

  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString()
  const { error: dbError } = await (adminClient as any).from('sms_otps').insert({
    phone_number: phone,
    otp_hash: otpHash,
    expires_at: expiresAt,
  })

  if (dbError) {
    console.error('SMS OTP DB Error:', dbError)
  }

  try {
    await client.messages.create({
      body: `Your TransHola verification code is: ${otp}`,
      from: messagingServiceSid,
      to: phone,
    })
    return { success: true }
  } catch (err: any) {
    console.warn('Twilio SMS Notice:', err?.message || err)
    return { success: true }
  }
}

export async function verifyPhoneOtp(phone: string, otp: string) {
  const adminClient = createAdminClient()
  const otpHash = generateOtpHash(phone, otp)

  const { data, error } = await (adminClient as any)
    .from('sms_otps')
    .select('id, expires_at')
    .eq('phone_number', phone)
    .eq('otp_hash', otpHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return { error: 'Invalid verification code' }
  }
  if (new Date(data.expires_at) < new Date()) return { error: 'Verification code expired' }

  await (adminClient as any).from('sms_otps').delete().eq('id', data.id)

  const cookieStore = await cookies()
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(cookieStore.getAll())
  if (resolved?.user) {
    const { error: updateError } = await (adminClient as any)
      .from('profiles')
      .update({ status: 'Active' })
      .eq('id', resolved.user.id)
    if (updateError) return { error: 'Failed to update profile: ' + updateError.message }
  }

  return { success: true }
}
