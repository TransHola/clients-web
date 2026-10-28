'use server'
import crypto from 'crypto';
import twilio from 'twilio';
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { headers } from 'next/headers'
import {
  extractClientIp,
  validateAuthInputs,
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
  enforceConstantTime,
  ALLOWED_CLIENT_ROLES,
  PROHIBITED_OPERATOR_ROLES,
  sanitizeAuthError
} from '@/lib/security/authGuard'

export async function login(formData: FormData) {
  const startTime = Date.now()
  let clientIp = '127.0.0.1'

  try {
    const reqHeaders = await headers()
    clientIp = extractClientIp(reqHeaders)
  } catch {
    // Fallback in edge runtimes
  }

  const rawEmail = formData.get('email') as string
  const rawPassword = formData.get('password') as string

  // 1. Rigorous input validation & Hash-Flooding DoS mitigation
  const validation = validateAuthInputs(rawEmail, rawPassword)
  if (!validation.isValid || !validation.normalizedEmail) {
    await enforceConstantTime(startTime, 300)
    return { error: validation.error || "Email and password are required." }
  }

  const normalizedEmail = validation.normalizedEmail

  // 2. Sliding-Window Adaptive Rate Limiting
  const rateLimit = checkLoginRateLimit(clientIp, normalizedEmail)
  if (!rateLimit.allowed) {
    await enforceConstantTime(startTime, 300)
    return { error: rateLimit.error }
  }

  // 3. Cryptographic Password Verification via Postgres pgcrypto RPC with Auth fallback
  const adminClient = createAdminClient()
  let verifiedUser: any = null

  const { data: rpcUser, error: verifyError } = await (adminClient as any).rpc(
    'verify_user_credentials',
    {
      p_email: normalizedEmail,
      p_password: rawPassword
    }
  )

  if (rpcUser && rpcUser.id) {
    verifiedUser = rpcUser
  } else {
    const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: rawPassword
    })
    if (authData?.user?.id && !authError) {
      verifiedUser = {
        id: authData.user.id,
        email: authData.user.email,
        user_metadata: authData.user.user_metadata,
        app_metadata: authData.user.app_metadata
      }
    }
  }

  if (!verifiedUser || !verifiedUser.id) {
    recordLoginFailure(clientIp, normalizedEmail)
    await enforceConstantTime(startTime, 350)
    return { error: "Invalid email or password." }
  }

  // 🛡️ ROLE & PORTAL ISOLATION GUARD:
  const { data: profile } = await (adminClient as any)
    .from('profiles')
    .select('role, status, phone, phone_number')
    .eq('id', verifiedUser.id)
    .maybeSingle()

  const role = (profile?.role || verifiedUser.user_metadata?.role || '').toLowerCase().trim()
  const status = (profile?.status || '').toLowerCase().trim()

  if (status === 'suspended' || status === 'banned' || status === 'inactive') {
    recordLoginFailure(clientIp, normalizedEmail)
    await enforceConstantTime(startTime, 350)
    return { error: "Access denied. Your account has been suspended or deactivated." }
  }

  // Strictly isolate portals: Fleet Operators cannot login as clients
  if ((PROHIBITED_OPERATOR_ROLES as readonly string[]).includes(role)) {
    recordLoginFailure(clientIp, normalizedEmail)
    await enforceConstantTime(startTime, 350)
    return { 
      error: "Access Denied: This account is registered as a Fleet Operator. Please log in at the Fleet Operators portal (operator.transhola.com)." 
    }
  }

  // Allow clients, customers, corporate/gov accounts, and administrative accounts
  if (role && !(ALLOWED_CLIENT_ROLES as readonly string[]).includes(role)) {
    recordLoginFailure(clientIp, normalizedEmail)
    await enforceConstantTime(startTime, 350)
    return { error: "Access Denied: Unauthorized role for this portal." }
  }

  // 4. Establish authenticated session
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: rawPassword,
  })

  // Success: clear failed attempts
  recordLoginSuccess(clientIp, normalizedEmail)

  // If status is still Pending Verification, route to verify with both email & phone params
  const userPhone = profile?.phone || profile?.phone_number || data.user.user_metadata?.phone || ''
  if (profile?.status === 'Pending Verification') {
    revalidatePath('/', 'layout')
    return { 
      success: true, 
      redirectTo: `/verify?email=${encodeURIComponent(normalizedEmail)}&phone=${encodeURIComponent(userPhone)}` 
    }
  }

  revalidatePath('/', 'layout')
  return { 
    success: true, 
    redirectTo: '/' 
  }
}

export async function register(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const password = formData.get('password') as string || ''
  
  // Custom fields
  const firstName = (formData.get('firstName') as string || '').slice(0, 100).trim()
  const lastName = (formData.get('lastName') as string || '').slice(0, 100).trim()
  const entityName = (formData.get('entityName') as string || '').slice(0, 150).trim()
  const phone = (formData.get('phone') as string || '').slice(0, 30).trim()
  const isCompany = formData.get('isCompany') === 'true'

  // Input validation
  const validation = validateAuthInputs(email, password)
  if (!validation.isValid || !validation.normalizedEmail) {
    return { error: validation.error || "Valid email and password are required." }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: validation.normalizedEmail,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone,
        company_name: entityName,
        is_company: isCompany,
        role: 'client'
      }
    }
  })

  if (error) {
    return { error: sanitizeAuthError(error) }
  }
  
  // NOTE: We insert the profile directly into the 'profiles' table.
  if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
          phone_number: phone || null,
          role: 'client',
          status: 'Pending Verification',
          preferences: {
            clientType: isCompany ? 'Corporate' : 'Individual',
            companyName: entityName || null
          }
      })
      if (profileError) {
          console.error('[DEBUG] Profile Insert Error:', profileError)
          return { error: "Profile setup failed: " + profileError.message }
      }
  }

  revalidatePath('/', 'layout')
  redirect(`/verify?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`)
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  const supabase = await createClient()

  // The reset-password URL should point to a route that handles the token exchange and shows the "Update Password" form
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8083'}/update-password`,
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
      password: password
    })
  
    if (error) {
      return { error: error.message }
    }
  
    redirect('/profile')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function verifyEmailOtp(email: string, otp: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup'
  })
  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

function generateOtpHash(phone: string, otp: string) {
  // Simple HMAC using anon key as salt (since it's available and constant)
  const secret = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default_secret';
  return crypto.createHmac('sha256', secret).update(phone + otp).digest('hex');
}

export async function sendPhoneOtp() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "User not authenticated" };
  
  const phone = user.user_metadata.phone;
  if (!phone) return { error: "No phone number found" };
  
  // 1. Fetch Twilio config from Super Admin Global Settings
  const { data: globalConfig } = await supabase
    .from('country_configurations')
    .select('config')
    .eq('country_code', 'GLOBAL')
    .maybeSingle();
    
  const twilioConfig = globalConfig?.config?.integrationTaxonomyPolicy?.communication?.twilio;
  
  const accountSid = twilioConfig?.accountSid || process.env.TWILIO_ACCOUNT_SID || 'ACcbccba179d5523d3810126f3b403fcb4';
  const authToken = twilioConfig?.authToken || process.env.TWILIO_AUTH_TOKEN || '48b1679cbd376a344e5f5f360659e648';
  const messagingServiceSid = twilioConfig?.messagingSid || process.env.TWILIO_MESSAGING_SERVICE_SID || '+18777804236';

  const client = twilio(accountSid, authToken);
  
  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = generateOtpHash(phone, otp);
  
  // Store hashed OTP in DB
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 minutes
  const { error: dbError } = await supabase.from('sms_otps').insert({
    phone_number: phone,
    otp_hash: otpHash,
    expires_at: expiresAt
  });
  
  if (dbError) {
    console.error("SMS OTP DB Error:", dbError);
  }
  
  try {
    await client.messages.create({
      body: `Your TransHola verification code is: ${otp}`,
      from: messagingServiceSid,
      to: phone
    });
    return { success: true };
  } catch (err: any) {
    console.warn("Twilio SMS Notice:", err?.message || err);
    return { success: true };
  }
}

export async function verifyPhoneOtp(phone: string, otp: string) {
  const supabase = await createClient();
  const otpHash = generateOtpHash(phone, otp);
  
  // Verify OTP
  const { data, error } = await supabase
    .from('sms_otps')
    .select('id, expires_at')
    .eq('phone_number', phone)
    .eq('otp_hash', otpHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error || !data) {
    return { error: "Invalid verification code" };
  }
  if (new Date(data.expires_at) < new Date()) return { error: "Verification code expired" };
  
  // Clean up used OTP
  await supabase.from('sms_otps').delete().eq('id', data.id);
  
  // Activate Profile
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { error: updateError } = await supabase.from('profiles').update({ status: 'Active' }).eq('id', user.id);
    if (updateError) return { error: "Failed to update profile: " + updateError.message };
  }
  
  return { success: true };
}
