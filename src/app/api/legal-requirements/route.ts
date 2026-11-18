import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveVerifiedUserFromCookiesOrHeader } from '@/lib/auth/clientSession'
import { resolveRegionalLegalBundle, sha256Hex } from '@/lib/regional-legal-engine'

export const dynamic = 'force-dynamic'

interface CachedScopeConfig {
  expiresAt: number
  countryName?: string
  countryConfig: Record<string, any> | null
  globalConfig: Record<string, any> | null
  legalAgreementRows: any[]
}

const scopeCache = new Map<string, CachedScopeConfig>()
const CACHE_TTL_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise
      .then((val) => {
        clearTimeout(timer)
        resolve(val)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(fallback)
      })
  })
}

async function loadScopedLegalConfig(adminClient: any, countryCode: string): Promise<CachedScopeConfig> {
  const cCode = (countryCode || 'AE').toUpperCase()
  const now = Date.now()
  const hit = scopeCache.get(cCode)
  if (hit && hit.expiresAt > now) {
    return hit
  }

  const fetched = await withTimeout(
    (async () => {
      const codes = cCode === 'GLOBAL' ? ['GLOBAL'] : ['GLOBAL', cCode]
      const [cfgRes, agreementsRes] = await Promise.all([
        adminClient
          .from('country_configurations')
          .select('country_code, country_name, config')
          .in('country_code', codes),
        adminClient
          .from('legal_agreements')
          .select('*'),
      ])

      const cfgRows: any[] = Array.isArray(cfgRes?.data) ? cfgRes.data : []
      const globalRow = cfgRows.find((r) => String(r.country_code).toUpperCase() === 'GLOBAL')
      const countryRow = cfgRows.find((r) => String(r.country_code).toUpperCase() === cCode)

      return {
        expiresAt: now + CACHE_TTL_MS,
        countryName: countryRow?.country_name || countryRow?.config?.name,
        countryConfig: countryRow?.config || null,
        globalConfig: globalRow?.config || null,
        legalAgreementRows: Array.isArray(agreementsRes?.data) ? agreementsRes.data : [],
      }
    })(),
    2400,
    {
      expiresAt: now + 5_000,
      countryName: undefined,
      countryConfig: null,
      globalConfig: null,
      legalAgreementRows: [],
    }
  )

  scopeCache.set(cCode, fetched)
  return fetched
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const countryCode = (sp.get('countryCode') || 'AE').trim().toUpperCase()
  const pickupAddress = sp.get('pickupAddress') || ''
  const pickupLatRaw = sp.get('pickupLat')
  const pickupLonRaw = sp.get('pickupLon')
  const pickupLat = pickupLatRaw !== null && pickupLatRaw !== '' ? Number(pickupLatRaw) : null
  const pickupLon = pickupLonRaw !== null && pickupLonRaw !== '' ? Number(pickupLonRaw) : null
  const dropoffCountryCode = (sp.get('dropoffCountryCode') || countryCode).trim().toUpperCase()
  const tripType = sp.get('tripType') || 'one-way'
  const passengers = Number(sp.get('passengers') || 1)
  const vehicleCount = Number(sp.get('vehicleCount') || 1)
  const adaRequired = sp.get('adaRequired') === 'true'
  const isThirdParty = sp.get('isThirdParty') === 'true'
  const amenitiesStr = sp.get('amenities') || ''
  const amenities = amenitiesStr ? amenitiesStr.split('|').filter(Boolean) : []
  const currency = sp.get('currency') || 'AED'
  const totalPrice = Number(sp.get('totalPrice') || 0)
  const bookingRefHint = sp.get('bookingRef') || ''
  let clientName = sp.get('clientName') || ''

  const adminClient = createAdminClient()

  let verifiedUser: any = null
  try {
    const resolved = await withTimeout(
      resolveVerifiedUserFromCookiesOrHeader(
        request.cookies.getAll(),
        request.headers.get('authorization')
      ),
      1500,
      null
    )
    verifiedUser = resolved?.user || null
  } catch {}

  if (!clientName && verifiedUser) {
    clientName =
      verifiedUser.user_metadata?.company_name ||
      verifiedUser.user_metadata?.full_name ||
      verifiedUser.email?.split('@')[0] ||
      ''
  }

  const [scopedConfig, priorAcceptances] = await Promise.all([
    loadScopedLegalConfig(adminClient, countryCode),
    verifiedUser?.id
      ? withTimeout(
          (async () => {
            const { data } = await (adminClient as any)
              .from('client_legal_acceptances')
              .select('doc_id, doc_version, content_sha256')
              .eq('user_id', verifiedUser.id)
              .eq('country_code', countryCode)
              .order('accepted_at', { ascending: false })
              .limit(60)
            return Array.isArray(data) ? data : []
          })(),
          1200,
          []
        )
      : Promise.resolve([]),
  ])

  const bundle = resolveRegionalLegalBundle({
    countryCode,
    countryName: scopedConfig.countryName,
    countryConfig: scopedConfig.countryConfig,
    globalConfig: scopedConfig.globalConfig,
    legalAgreementRows: scopedConfig.legalAgreementRows,
    priorAcceptances,
    pickupAddress,
    pickupLat,
    pickupLon,
    dropoffCountryCode,
    tripType,
    passengers,
    vehicleCount,
    adaRequired,
    amenities,
    isThirdParty,
    clientName,
    currency,
    totalPrice,
    bookingRefHint,
  })

  return NextResponse.json(bundle, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const acceptedDocs: Array<{
      id: string
      docNumber?: number
      name: string
      version: string
      contentSha256: string
      enforcementAction?: string
      triggerBadge?: string
    }> = Array.isArray(body?.acceptedDocs) ? body.acceptedDocs : []

    if (acceptedDocs.length === 0) {
      return NextResponse.json({ error: 'No accepted legal documents provided' }, { status: 400 })
    }

    let verifiedUser: any = null
    try {
      const resolved = await withTimeout(
        resolveVerifiedUserFromCookiesOrHeader(
          request.cookies.getAll(),
          request.headers.get('authorization')
        ),
        1500,
        null
      )
      verifiedUser = resolved?.user || null
    } catch {}

    const userId = verifiedUser?.id || (body?.userId && /^[0-9a-f-]{36}$/i.test(body.userId) ? body.userId : null)
    const userEmail = verifiedUser?.email || body?.userEmail || null
    const bookingId =
      body?.bookingId && /^[0-9a-f-]{36}$/i.test(String(body.bookingId))
        ? String(body.bookingId)
        : null
    const bookingRef = body?.bookingRef ? String(body.bookingRef) : null
    const countryCode = String(body?.countryCode || 'AE').toUpperCase()
    const regionName = body?.regionName ? String(body.regionName) : null
    const paymentIntentId = body?.paymentIntentId ? String(body.paymentIntentId) : null
    const ipAddress =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'client-portal'
    const userAgent = request.headers.get('user-agent') || 'TransHola-Web'
    const acceptedAt = new Date().toISOString()

    const masterSealInput = [
      bookingId || bookingRef || 'BOOKING',
      userId || userEmail || 'CLIENT',
      countryCode,
      regionName || '',
      acceptedAt,
      ...acceptedDocs.map((d) => `${d.id}@${d.version}:${d.contentSha256}`),
    ].join('|')
    const signatureSeal = `TH-SEAL-${sha256Hex(masterSealInput).slice(0, 24).toUpperCase()}`

    const rows = acceptedDocs.map((doc) => ({
      booking_id: bookingId,
      booking_ref: bookingRef,
      user_id: userId,
      user_email: userEmail,
      country_code: countryCode,
      region_name: regionName,
      doc_id: doc.id,
      doc_number: doc.docNumber ?? null,
      doc_name: doc.name,
      doc_version: doc.version || 'v1.0',
      content_sha256: doc.contentSha256,
      enforcement_action: doc.enforcementAction || 'require_consent',
      trigger_reason: doc.triggerBadge || null,
      payment_intent_id: paymentIntentId,
      execution_stage: 'post_payment_confirmation',
      ip_address: ipAddress,
      user_agent: userAgent.slice(0, 300),
      signature_seal: signatureSeal,
      accepted_at: acceptedAt,
    }))

    const adminClient = createAdminClient()
    await withTimeout(
      (adminClient as any).from('client_legal_acceptances').insert(rows),
      2200,
      null
    )

    if (bookingId) {
      await withTimeout(
        (async () => {
          const { data: existing } = await (adminClient as any)
            .from('bookings')
            .select('booking_details')
            .eq('id', bookingId)
            .maybeSingle()
          if (existing) {
            const nextDetails = {
              ...(existing.booking_details || {}),
              legalAcceptance: {
                status: 'signed',
                signatureSeal,
                acceptedAt,
                countryCode,
                regionName,
                documents: acceptedDocs.map((d) => ({
                  id: d.id,
                  docNumber: d.docNumber,
                  name: d.name,
                  version: d.version,
                  sha256: d.contentSha256,
                })),
              },
            }
            await (adminClient as any)
              .from('bookings')
              .update({ booking_details: nextDetails })
              .eq('id', bookingId)
          }
        })(),
        1800,
        null
      )
    }

    return NextResponse.json(
      {
        success: true,
        signatureSeal,
        acceptedAt,
        recordedCount: rows.length,
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to record legal acceptance' },
      { status: 500 }
    )
  }
}

