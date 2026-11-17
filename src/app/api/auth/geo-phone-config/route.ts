import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  DEFAULT_COUNTRY_PHONE_RULES,
  mergeSuperAdminCountryRules,
} from '@/lib/superadmin-phone-config'

export const dynamic = 'force-dynamic'

function withCors(res: NextResponse, origin?: string | null) {
  const allowed =
    origin &&
    (origin === 'https://transhola.com' ||
      origin.endsWith('.transhola.com') ||
      origin.startsWith('http://localhost'))
      ? origin
      : '*'
  res.headers.set('Access-Control-Allow-Origin', allowed)
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request.headers.get('origin'))
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const { searchParams } = new URL(request.url)

  const explicitCountry = (searchParams.get('country') || '').trim().toUpperCase()
  const cfCountry = (
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-country-code') ||
    ''
  )
    .trim()
    .toUpperCase()

  let detectedCountryCode =
    explicitCountry.length === 2
      ? explicitCountry
      : cfCountry.length === 2 && cfCountry !== 'XX' && cfCountry !== 'T1'
        ? cfCountry
        : 'AE'

  let countries = DEFAULT_COUNTRY_PHONE_RULES
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1800)

  try {
    const adminClient = createAdminClient()
    const { data } = await (adminClient as any)
      .from('country_configurations')
      .select('country_code, country_name, is_active, config')
      .neq('country_code', 'GLOBAL')
      .abortSignal(controller.signal)

    if (Array.isArray(data) && data.length > 0) {
      countries = mergeSuperAdminCountryRules(data)
      if (!countries.some((c) => c.code === detectedCountryCode)) {
        const primaryActive = countries.find((c) => c.isActiveMarket)
        if (primaryActive) detectedCountryCode = primaryActive.code
      }
    }
  } catch {
    // Fast graceful fallback to default SuperAdmin rules
  } finally {
    clearTimeout(timer)
  }

  return withCors(
    NextResponse.json({
      detectedCountryCode,
      countries,
    }),
    origin
  )
}

