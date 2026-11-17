import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveVerifiedUserFromCookiesOrHeader } from '@/lib/auth/clientSession'
import { resolveEffectivePortalAccess, type EffectivePortalAccess } from '@/lib/corporate-rbac'

export const dynamic = 'force-dynamic'

function isCategoryAllowedForAccess(category: string, access: EffectivePortalAccess): boolean {
  if (!access.isCorporate || access.isOwner) return true
  const cat = String(category || 'system').toLowerCase()
  if (cat === 'billing') return access.permissions.includes('portal.billing.view')
  if (cat === 'quotation') return access.permissions.includes('portal.quotations.view')
  if (cat === 'booking' || cat === 'dispatch') {
    return (
      access.permissions.includes('portal.bookings.manage') ||
      access.permissions.includes('portal.book_service')
    )
  }
  if (cat === 'team') return access.canManageTeam
  return true
}

export async function GET(request: NextRequest) {
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )
  if (!resolved?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: profile } = await (adminClient as any)
    .from('profiles')
    .select('*')
    .eq('id', resolved.user.id)
    .maybeSingle()

  const access = resolveEffectivePortalAccess(profile, resolved.user)
  const prefs = profile?.preferences || {}

  // One-time onboarding notification seed so every account has real, actionable notifications immediately
  if (profile && !prefs.notificationsSeeded) {
    const companyName =
      prefs.companyName || resolved.user.user_metadata?.company_name || 'your account'
    const seedRows: any[] = [
      {
        user_id: resolved.user.id,
        organization_id: access.isCorporate ? access.organizationId : null,
        category: 'system',
        severity: 'info',
        title: access.isCorporate
          ? `Welcome to ${companyName} Client Portal`
          : 'Welcome to TransHola Client Portal',
        message:
          'Configure itineraries, lock instant fleet quotations, and monitor assigned chauffeurs in real time.',
        action_url: access.permissions.includes('portal.book_service') ? '/' : '/profile',
        action_label: access.permissions.includes('portal.book_service')
          ? 'Configure Route'
          : 'View Profile',
        is_read: false,
      },
    ]

    if (access.isCorporate && access.isOwner) {
      seedRows.push({
        user_id: resolved.user.id,
        organization_id: access.organizationId,
        category: 'team',
        severity: 'success',
        title: 'Corporate Team & Access Governance Enabled',
        message:
          'As Account Owner, you can invite team members and limit portal access by role in Team & Access Control.',
        action_url: '/profile?tab=team',
        action_label: 'Manage Team',
        is_read: false,
      })
    }

    // Backfill recent bookings/quotations if any exist prior to trigger installation
    const { data: existingBookings } = await (adminClient as any)
      .from('bookings')
      .select('id, status, pickup_address, dropoff_address, booking_details, created_at')
      .eq('customer_id', resolved.user.id)
      .order('created_at', { ascending: false })
      .limit(3)

    if (Array.isArray(existingBookings)) {
      for (const b of existingBookings) {
        const isQuote = String(b.status || '').toLowerCase() === 'quotation'
        const ref = b.booking_details?.ref || `TH-${String(b.id).slice(0, 6).toUpperCase()}`
        seedRows.push({
          user_id: resolved.user.id,
          organization_id: access.isCorporate ? access.organizationId : null,
          category: isQuote ? 'quotation' : 'booking',
          severity: isQuote ? 'info' : 'success',
          title: isQuote ? `Saved Quotation (${ref})` : `Booking Activity (${ref})`,
          message: `${(b.pickup_address || 'Origin').split(',')[0]} → ${(b.dropoff_address || 'Destination').split(',')[0]}`,
          action_url: isQuote ? '/quotations' : '/bookings',
          action_label: isQuote ? 'Review Quote' : 'View Booking',
          is_read: false,
          created_at: b.created_at || new Date().toISOString(),
        })
      }
    }

    await (adminClient as any).from('client_notifications').insert(seedRows)
    await (adminClient as any)
      .from('profiles')
      .update({
        preferences: { ...prefs, notificationsSeeded: true },
      })
      .eq('id', resolved.user.id)
  }

  let query = (adminClient as any)
    .from('client_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40)

  if (access.isCorporate && access.organizationId) {
    query = query.or(`user_id.eq.${resolved.user.id},organization_id.eq.${access.organizationId}`)
  } else {
    query = query.eq('user_id', resolved.user.id)
  }

  const { data: rows } = await query
  const filtered = (Array.isArray(rows) ? rows : []).filter((r: any) =>
    isCategoryAllowedForAccess(r.category, access)
  )

  const unreadCount = filtered.filter((r: any) => !r.is_read).length

  return NextResponse.json({
    unreadCount,
    notifications: filtered,
  })
}

export async function PATCH(request: NextRequest) {
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )
  if (!resolved?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const adminClient = createAdminClient()

    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('id, preferences, permissions')
      .eq('id', resolved.user.id)
      .maybeSingle()

    const access = resolveEffectivePortalAccess(profile, resolved.user)

    if (body?.markAllRead) {
      let q = (adminClient as any).from('client_notifications').update({ is_read: true })
      if (access.isCorporate && access.organizationId) {
        q = q.or(`user_id.eq.${resolved.user.id},organization_id.eq.${access.organizationId}`)
      } else {
        q = q.eq('user_id', resolved.user.id)
      }
      await q
      return NextResponse.json({ success: true })
    }

    const id = String(body?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 })
    }

    const isRead = body?.isRead !== undefined ? Boolean(body.isRead) : true
    let q = (adminClient as any)
      .from('client_notifications')
      .update({ is_read: isRead })
      .eq('id', id)

    if (access.isCorporate && access.organizationId) {
      q = q.or(`user_id.eq.${resolved.user.id},organization_id.eq.${access.organizationId}`)
    } else {
      q = q.eq('user_id', resolved.user.id)
    }

    await q
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update notification.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )
  if (!resolved?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = String(searchParams.get('id') || '').trim()
  const clearRead = searchParams.get('clearRead') === 'true'

  const adminClient = createAdminClient()
  const { data: profile } = await (adminClient as any)
    .from('profiles')
    .select('id, preferences, permissions')
    .eq('id', resolved.user.id)
    .maybeSingle()
  const access = resolveEffectivePortalAccess(profile, resolved.user)

  if (clearRead) {
    let q = (adminClient as any).from('client_notifications').delete().eq('is_read', true)
    if (access.isCorporate && access.organizationId) {
      q = q.or(`user_id.eq.${resolved.user.id},organization_id.eq.${access.organizationId}`)
    } else {
      q = q.eq('user_id', resolved.user.id)
    }
    await q
    return NextResponse.json({ success: true })
  }

  if (!id) {
    return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 })
  }

  let q = (adminClient as any).from('client_notifications').delete().eq('id', id)
  if (access.isCorporate && access.organizationId) {
    q = q.or(`user_id.eq.${resolved.user.id},organization_id.eq.${access.organizationId}`)
  } else {
    q = q.eq('user_id', resolved.user.id)
  }
  await q

  return NextResponse.json({ success: true })
}

