import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  CLIENT_SESSION_COOKIE,
  SUPABASE_SSR_COOKIE,
  buildSessionCookieOptions,
  createClientSessionBundle,
  resolveVerifiedUserFromCookiesOrHeader,
} from '@/lib/auth/clientSession'
import { resolveEffectivePortalAccess } from '@/lib/corporate-rbac'

export const dynamic = 'force-dynamic'

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

  const meta = resolved.user.user_metadata || {}
  const prefs = profile?.preferences || {}
  const access = resolveEffectivePortalAccess(profile, resolved.user)

  // If corporate sub-user, fetch parent organization owner's corporate fiscal profile too
  let orgPrefs: Record<string, any> = prefs
  if (access.isCorporate && !access.isOwner && access.organizationId) {
    const { data: ownerProf } = await (adminClient as any)
      .from('profiles')
      .select('preferences, full_name, email, phone')
      .eq('id', access.organizationId)
      .maybeSingle()
    if (ownerProf?.preferences) {
      orgPrefs = ownerProf.preferences
    }
  }

  const fullNameRaw = String(profile?.full_name || meta.full_name || '').trim()
  const firstName = String(
    prefs.firstName || meta.first_name || fullNameRaw.split(' ')[0] || ''
  ).trim()
  const lastName = String(
    prefs.lastName ||
      meta.last_name ||
      fullNameRaw.split(' ').slice(1).join(' ') ||
      ''
  ).trim()

  return NextResponse.json({
    id: resolved.user.id,
    email: profile?.email || resolved.user.email,
    status: profile?.status || 'Active',
    createdAt: profile?.created_at || resolved.user.created_at || new Date().toISOString(),
    accountTier: access.isCorporate ? 'Corporate' : 'Individual',
    access,
    personal: {
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' ').trim() || fullNameRaw,
      email: profile?.email || resolved.user.email,
      phone: String(profile?.phone_number || profile?.phone || meta.phone || '').trim(),
      jobTitle: String(prefs.jobTitle || (access.isCorporate && access.isOwner ? 'Account Director' : '')),
      department: String(prefs.department || (access.isCorporate && access.isOwner ? 'Executive Management' : '')),
      preferredLanguage: String(prefs.preferredLanguage || 'English'),
      preferredCurrency: String(prefs.preferredCurrency || 'AED'),
    },
    corporate: {
      companyName: String(orgPrefs.companyName || prefs.companyName || meta.company_name || ''),
      registrationNumber: String(orgPrefs.registrationNumber || ''),
      taxVatNumber: String(orgPrefs.taxVatNumber || ''),
      industry: String(orgPrefs.industry || 'Corporate & Enterprise'),
      billingAddress: String(orgPrefs.billingAddress || ''),
      billingEmail: String(orgPrefs.billingEmail || profile?.email || resolved.user.email || ''),
      requirePurchaseOrder: Boolean(orgPrefs.requirePurchaseOrder ?? false),
      companySize: String(orgPrefs.companySize || '50 - 250 Employees'),
    },
    notifications: {
      emailAlerts: prefs.emailAlerts !== false,
      smsDispatchAlerts: prefs.smsDispatchAlerts !== false,
      invoiceAutoForward: prefs.invoiceAutoForward !== false,
      distanceUnit: String(prefs.distanceUnit || 'km'),
    },
  })
}

export async function PUT(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'

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

    const { data: existingProfile } = await (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', resolved.user.id)
      .maybeSingle()

    const prevPrefs = existingProfile?.preferences || {}
    const currentAccess = resolveEffectivePortalAccess(existingProfile, resolved.user)

    const personal = body?.personal || {}
    const corporate = body?.corporate || {}
    const notifications = body?.notifications || {}

    const firstName = String(personal.firstName ?? prevPrefs.firstName ?? '').slice(0, 100).trim()
    const lastName = String(personal.lastName ?? prevPrefs.lastName ?? '').slice(0, 100).trim()
    const phone = String(
      personal.phone ?? existingProfile?.phone_number ?? existingProfile?.phone ?? ''
    )
      .slice(0, 30)
      .trim()

    // Allow Individual -> Corporate upgrade if requested by owner
    const requestedTier =
      body?.accountTier === 'Corporate' || Boolean(corporate.companyName?.trim() && currentAccess.isCorporate)
        ? 'Corporate'
        : body?.accountTier === 'Individual' && currentAccess.isOwner
          ? 'Individual'
          : currentAccess.isCorporate
            ? 'Corporate'
            : 'Individual'

    const canEditCorpEntity =
      requestedTier === 'Corporate' && (currentAccess.isOwner || !currentAccess.isCorporate)

    const nextCompanyName = canEditCorpEntity
      ? String(corporate.companyName ?? prevPrefs.companyName ?? '').slice(0, 150).trim()
      : String(prevPrefs.companyName || '')

    if (requestedTier === 'Corporate' && canEditCorpEntity && !nextCompanyName) {
      return NextResponse.json(
        { error: 'Legal Company / Entity Name is required for a Corporate account.' },
        { status: 400 }
      )
    }

    const composedFullName =
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      existingProfile?.full_name ||
      resolved.user.email.split('@')[0]

    const updatedPrefs: Record<string, any> = {
      ...prevPrefs,
      clientType: requestedTier,
      firstName,
      lastName,
      jobTitle: String(personal.jobTitle ?? prevPrefs.jobTitle ?? '').slice(0, 100).trim(),
      department: String(personal.department ?? prevPrefs.department ?? '').slice(0, 100).trim(),
      preferredLanguage: String(personal.preferredLanguage ?? prevPrefs.preferredLanguage ?? 'English'),
      preferredCurrency: String(personal.preferredCurrency ?? prevPrefs.preferredCurrency ?? 'AED'),
      emailAlerts: Boolean(notifications.emailAlerts ?? prevPrefs.emailAlerts ?? true),
      smsDispatchAlerts: Boolean(notifications.smsDispatchAlerts ?? prevPrefs.smsDispatchAlerts ?? true),
      invoiceAutoForward: Boolean(notifications.invoiceAutoForward ?? prevPrefs.invoiceAutoForward ?? true),
      distanceUnit: String(notifications.distanceUnit ?? prevPrefs.distanceUnit ?? 'km'),
    }

    if (canEditCorpEntity) {
      updatedPrefs.companyName = nextCompanyName
      updatedPrefs.organizationId = prevPrefs.organizationId || resolved.user.id
      updatedPrefs.corporateRole = 'owner'
      updatedPrefs.registrationNumber = String(
        corporate.registrationNumber ?? prevPrefs.registrationNumber ?? ''
      )
        .slice(0, 80)
        .trim()
      updatedPrefs.taxVatNumber = String(corporate.taxVatNumber ?? prevPrefs.taxVatNumber ?? '')
        .slice(0, 80)
        .trim()
      updatedPrefs.industry = String(corporate.industry ?? prevPrefs.industry ?? '').slice(0, 80).trim()
      updatedPrefs.billingAddress = String(
        corporate.billingAddress ?? prevPrefs.billingAddress ?? ''
      )
        .slice(0, 240)
        .trim()
      updatedPrefs.billingEmail = String(corporate.billingEmail ?? prevPrefs.billingEmail ?? '')
        .slice(0, 120)
        .trim()
      updatedPrefs.requirePurchaseOrder = Boolean(
        corporate.requirePurchaseOrder ?? prevPrefs.requirePurchaseOrder ?? false
      )
      updatedPrefs.companySize = String(corporate.companySize ?? prevPrefs.companySize ?? '').slice(0, 60)
    }

    const { data: savedProfile, error: updateErr } = await (adminClient as any)
      .from('profiles')
      .update({
        full_name: composedFullName,
        phone: phone || null,
        phone_number: phone || null,
        preferences: updatedPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolved.user.id)
      .select('*')
      .maybeSingle()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    // Sync auth.users metadata
    await (adminClient as any).rpc('sync_client_auth_metadata', {
      p_user_id: resolved.user.id,
      p_meta: {
        first_name: firstName,
        last_name: lastName,
        full_name: composedFullName,
        phone,
        company_name: updatedPrefs.companyName || '',
        is_company: requestedTier === 'Corporate',
        client_type: requestedTier,
      },
    })

    // Propagate companyName update to sub-users if Corporate Owner renamed entity
    if (canEditCorpEntity && nextCompanyName && nextCompanyName !== prevPrefs.companyName) {
      const { data: teamRows } = await (adminClient as any)
        .from('profiles')
        .select('id, preferences')
        .contains('preferences', { organizationId: resolved.user.id })

      if (Array.isArray(teamRows)) {
        for (const member of teamRows) {
          if (member.id !== resolved.user.id) {
            await (adminClient as any)
              .from('profiles')
              .update({
                preferences: { ...(member.preferences || {}), companyName: nextCompanyName },
              })
              .eq('id', member.id)
          }
        }
      }
    }

    // Refresh session cookie so header immediately reflects updated name/company/tier
    const bundle = await createClientSessionBundle({
      id: resolved.user.id,
      email: resolved.user.email,
      user_metadata: resolved.user.user_metadata,
      app_metadata: resolved.user.app_metadata,
      profile: savedProfile,
    })

    const res = NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
    })
    const cookieOpts = buildSessionCookieOptions(host, proto)
    res.cookies.set(CLIENT_SESSION_COOKIE, bundle.accessToken, cookieOpts)
    res.cookies.set(SUPABASE_SSR_COOKIE, bundle.ssrCookieValue, cookieOpts)
    return res
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected error saving profile.' },
      { status: 500 }
    )
  }
}
