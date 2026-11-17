import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveVerifiedUserFromCookiesOrHeader } from '@/lib/auth/clientSession'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const mode = (request.nextUrl.searchParams.get('mode') || 'quotations').toLowerCase()
  const refsParam = request.nextUrl.searchParams.get('refs') || ''
  const lookupRef = (request.nextUrl.searchParams.get('lookupRef') || '').trim().toUpperCase()

  const guestRefs = refsParam
    .split(',')
    .map((r) => r.trim())
    .filter((r) => /^[A-Z0-9_-]{4,24}$/i.test(r))
    .slice(0, 40)

  let verifiedUser: any = null
  try {
    const resolved = await resolveVerifiedUserFromCookiesOrHeader(
      request.cookies.getAll(),
      request.headers.get('authorization')
    )
    verifiedUser = resolved?.user || null
  } catch {}

  const adminClient = createAdminClient()

  // Optional single-reference lookup for guest booking search
  if (lookupRef) {
    const { data, error } = await (adminClient as any)
      .from('bookings')
      .select('*, operator:assigned_operator_id(company_name, phone_number)')
      .eq('booking_ref', lookupRef)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ found: false, error: error.message }, { status: 200 })
    }
    return NextResponse.json({ found: Boolean(data), record: data || null }, { status: 200 })
  }

  const userId = verifiedUser?.id || null
  let orgId: string | null = verifiedUser?.user_metadata?.organization_id || null

  if (userId && !orgId) {
    try {
      const { data: prof } = await (adminClient as any)
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle()
      orgId = prof?.preferences?.organizationId || null
    } catch {}
  }

  if (!userId && guestRefs.length === 0) {
    return NextResponse.json({ authenticated: false, records: [] }, { status: 200 })
  }

  try {
    let query = (adminClient as any)
      .from('bookings')
      .select('*, operator:assigned_operator_id(company_name, phone_number)')
      .order('created_at', { ascending: false })
      .limit(100)

    const ownershipClauses: string[] = []
    if (userId) {
      ownershipClauses.push(`customer_id.eq.${userId}`, `user_id.eq.${userId}`)
    }
    if (orgId && orgId !== userId && /^[0-9a-f-]{36}$/i.test(orgId)) {
      ownershipClauses.push(`customer_id.eq.${orgId}`, `user_id.eq.${orgId}`)
    }
    if (guestRefs.length > 0) {
      ownershipClauses.push(`booking_ref.in.(${guestRefs.join(',')})`)
    }

    if (ownershipClauses.length > 0) {
      query = query.or(ownershipClauses.join(','))
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ authenticated: Boolean(userId), records: [], error: error.message }, { status: 200 })
    }

    const rows: any[] = Array.isArray(data) ? data : []
    const filtered = rows.filter((r) => {
      const st = String(r.status || '').toLowerCase()
      const ref = String(r.booking_ref || r.booking_details?.ref || '').toUpperCase()
      const isQuote = st === 'quotation' || ref.startsWith('QTE-') || ref.startsWith('Q-') || ref.startsWith('TH-Q-')
      return mode === 'quotations' ? isQuote : !isQuote
    })

    return NextResponse.json(
      {
        authenticated: Boolean(userId),
        userId,
        records: filtered,
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: Boolean(userId), records: [], error: err?.message || 'Unexpected error' },
      { status: 200 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const bookingId = String(body?.bookingId || '').trim()
    const action = String(body?.action || '').trim()

    if (!bookingId || action !== 'cancel') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const resolved = await resolveVerifiedUserFromCookiesOrHeader(
      request.cookies.getAll(),
      request.headers.get('authorization')
    )
    const userId = resolved?.user?.id

    const adminClient = createAdminClient()
    const { data: existing } = await (adminClient as any)
      .from('bookings')
      .select('id, customer_id, user_id, booking_ref')
      .eq('id', bookingId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Verify ownership (either authenticated owner or matching guest reference)
    const guestRef = String(body?.bookingRef || '').trim().toUpperCase()
    const isOwner =
      (userId && (existing.customer_id === userId || existing.user_id === userId)) ||
      (guestRef && String(existing.booking_ref || '').toUpperCase() === guestRef)

    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: updErr } = await (adminClient as any)
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update booking' }, { status: 500 })
  }
}
