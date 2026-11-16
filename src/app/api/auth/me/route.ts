import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  buildSupabaseUserObject,
  resolveVerifiedUserFromCookiesOrHeader,
} from '@/lib/auth/clientSession'

function withCors(res: NextResponse, origin?: string | null) {
  const allowed =
    origin && (origin === 'https://transhola.com' || origin.endsWith('.transhola.com') || origin.startsWith('http://localhost'))
      ? origin
      : 'https://client.transhola.com'
  res.headers.set('Access-Control-Allow-Origin', allowed)
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request.headers.get('origin'))
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )

  if (!resolved?.user) {
    return withCors(
      NextResponse.json({ authenticated: false, user: null, profile: null }, { status: 200 }),
      origin
    )
  }

  let profile: any = null
  try {
    const adminClient = createAdminClient()
    const profilePromise = (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', resolved.user.id)
      .maybeSingle()

    const timeoutPromise = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 2200)
    )

    const { data } = await Promise.race([profilePromise, timeoutPromise])
    profile = data || null
  } catch {}

  const enrichedUser = buildSupabaseUserObject({
    id: resolved.user.id,
    email: resolved.user.email,
    user_metadata: resolved.user.user_metadata,
    app_metadata: resolved.user.app_metadata,
    profile,
  })

  const normalizedProfile = profile || {
    id: enrichedUser.id,
    email: enrichedUser.email,
    full_name: enrichedUser.user_metadata?.full_name || enrichedUser.email.split('@')[0],
    first_name: enrichedUser.user_metadata?.first_name || '',
    last_name: enrichedUser.user_metadata?.last_name || '',
    phone: enrichedUser.phone || '',
    role: enrichedUser.user_metadata?.role || 'client',
    status: 'Active',
    preferences: {
      clientType: enrichedUser.user_metadata?.client_type || 'Individual',
      companyName: enrichedUser.user_metadata?.company_name || null,
    },
  }

  return withCors(
    NextResponse.json({
      authenticated: true,
      user: enrichedUser,
      profile: normalizedProfile,
    }),
    origin
  )
}

