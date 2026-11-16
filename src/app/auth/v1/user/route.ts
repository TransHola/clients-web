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
  res.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version')
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
      NextResponse.json({ message: 'Auth session missing!', status: 401 }, { status: 401 }),
      origin
    )
  }

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

    const { data: profile } = await Promise.race([profilePromise, timeoutPromise])
    if (profile) {
      const enrichedUser = buildSupabaseUserObject({
        id: resolved.user.id,
        email: resolved.user.email,
        user_metadata: resolved.user.user_metadata,
        app_metadata: resolved.user.app_metadata,
        profile,
      })
      return withCors(NextResponse.json(enrichedUser), origin)
    }
  } catch {
    // Graceful fallback to verified JWT claims
  }

  return withCors(NextResponse.json(resolved.user), origin)
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin')
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )

  if (!resolved?.user) {
    return withCors(
      NextResponse.json({ message: 'Auth session missing!', status: 401 }, { status: 401 }),
      origin
    )
  }

  let body: any = {}
  try {
    body = await request.json()
  } catch {}

  const mergedMeta = {
    ...(resolved.user.user_metadata || {}),
    ...(body?.data || body?.user_metadata || {}),
  }

  const updatedUser = buildSupabaseUserObject({
    id: resolved.user.id,
    email: body?.email || resolved.user.email,
    user_metadata: mergedMeta,
    app_metadata: resolved.user.app_metadata,
  })

  return withCors(NextResponse.json(updatedUser), origin)
}

