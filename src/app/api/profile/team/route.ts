import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveVerifiedUserFromCookiesOrHeader } from '@/lib/auth/clientSession'
import {
  ALL_PORTAL_PERMISSION_IDS,
  CORPORATE_ROLE_PRESETS,
  type CorporateRoleId,
  type PortalPermissionId,
  resolveEffectivePortalAccess,
} from '@/lib/corporate-rbac'

export const dynamic = 'force-dynamic'

function sanitizePermissions(
  rawPerms: any,
  role: CorporateRoleId
): PortalPermissionId[] {
  const preset = CORPORATE_ROLE_PRESETS[role] || CORPORATE_ROLE_PRESETS.booker
  if (!Array.isArray(rawPerms)) return [...preset.defaultPermissions]
  return rawPerms.filter((p) => (ALL_PORTAL_PERMISSION_IDS as string[]).includes(p)) as PortalPermissionId[]
}

function mapTeamMemberRow(row: any, orgId: string) {
  const prefs = row?.preferences || {}
  const isOwner = row.id === orgId || prefs.corporateRole === 'owner'
  const role: CorporateRoleId = isOwner
    ? 'owner'
    : CORPORATE_ROLE_PRESETS[prefs.corporateRole as CorporateRoleId]
      ? (prefs.corporateRole as CorporateRoleId)
      : 'booker'

  const preset = CORPORATE_ROLE_PRESETS[role]
  const permissions: PortalPermissionId[] = isOwner
    ? [...ALL_PORTAL_PERMISSION_IDS]
    : Array.isArray(row?.permissions) && row.permissions.length > 0
      ? (row.permissions.filter((p: string) =>
          (ALL_PORTAL_PERMISSION_IDS as string[]).includes(p)
        ) as PortalPermissionId[])
      : [...preset.defaultPermissions]

  const firstName = String(
    prefs.firstName || String(row?.full_name || '').split(' ')[0] || ''
  ).trim()
  const lastName = String(
    prefs.lastName || String(row?.full_name || '').split(' ').slice(1).join(' ') || ''
  ).trim()
  const spendLimit = Number(prefs.monthlySpendLimit)

  return {
    id: row.id,
    email: row.email || '',
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(' ').trim() || row.full_name || row.email,
    phone: row.phone_number || row.phone || '',
    corporateRole: role,
    roleLabel: preset.label,
    department: String(prefs.department || (isOwner ? 'Executive Management' : '')),
    jobTitle: String(prefs.jobTitle || (isOwner ? 'Account Owner' : '')),
    status: String(row.status || 'Active'),
    isOwner,
    permissions,
    monthlySpendLimit: !isNaN(spendLimit) && spendLimit > 0 ? spendLimit : null,
    createdAt: row.created_at,
  }
}

async function resolveCallerContext(request: NextRequest) {
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )
  if (!resolved?.user) return null

  const adminClient = createAdminClient()
  const { data: profile } = await (adminClient as any)
    .from('profiles')
    .select('*')
    .eq('id', resolved.user.id)
    .maybeSingle()

  const access = resolveEffectivePortalAccess(profile, resolved.user)
  return { user: resolved.user, profile, access, adminClient }
}

export async function GET(request: NextRequest) {
  const ctx = await resolveCallerContext(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!ctx.access.isCorporate) {
    return NextResponse.json({ members: [], isCorporate: false })
  }

  const orgId = ctx.access.organizationId
  const { data: ownerRow } = await (ctx.adminClient as any)
    .from('profiles')
    .select('*')
    .eq('id', orgId)
    .maybeSingle()

  const { data: subRows } = await (ctx.adminClient as any)
    .from('profiles')
    .select('*')
    .contains('preferences', { organizationId: orgId })
    .order('created_at', { ascending: true })

  const byId = new Map<string, any>()
  if (ownerRow) {
    byId.set(ownerRow.id, mapTeamMemberRow(ownerRow, orgId))
  }
  if (Array.isArray(subRows)) {
    for (const r of subRows) {
      if (!byId.has(r.id)) {
        byId.set(r.id, mapTeamMemberRow(r, orgId))
      }
    }
  }

  const members = Array.from(byId.values()).sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1
    return String(a.fullName).localeCompare(String(b.fullName))
  })

  return NextResponse.json({
    isCorporate: true,
    organizationId: orgId,
    canManageTeam: ctx.access.canManageTeam,
    members,
  })
}

export async function POST(request: NextRequest) {
  const ctx = await resolveCallerContext(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!ctx.access.isCorporate || !ctx.access.canManageTeam) {
    return NextResponse.json(
      { error: 'Only the Corporate Account Owner or an authorized Team Admin can add portal users.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const firstName = String(body?.firstName || '').slice(0, 100).trim()
    const lastName = String(body?.lastName || '').slice(0, 100).trim()
    const phone = String(body?.phone || '').slice(0, 30).trim()
    const department = String(body?.department || '').slice(0, 80).trim()
    const jobTitle = String(body?.jobTitle || '').slice(0, 80).trim()
    const rawSpend = Number(body?.monthlySpendLimit)
    const monthlySpendLimit = !isNaN(rawSpend) && rawSpend > 0 ? rawSpend : null

    const rawRole = String(body?.corporateRole || 'booker').toLowerCase() as CorporateRoleId
    const corporateRole: CorporateRoleId =
      rawRole !== 'owner' && CORPORATE_ROLE_PRESETS[rawRole] ? rawRole : 'booker'

    const permissions = sanitizePermissions(body?.permissions, corporateRole)

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 })
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid work email is required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Initial password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    // Resolve company name from organization owner
    const orgId = ctx.access.organizationId
    const { data: ownerProf } = await (ctx.adminClient as any)
      .from('profiles')
      .select('preferences, full_name')
      .eq('id', orgId)
      .maybeSingle()

    const companyName =
      ownerProf?.preferences?.companyName ||
      ctx.profile?.preferences?.companyName ||
      ctx.user?.user_metadata?.company_name ||
      'Corporate Account'

    const { data: created, error: rpcErr } = await (ctx.adminClient as any).rpc(
      'provision_corporate_portal_user',
      {
        p_org_id: orgId,
        p_company_name: companyName,
        p_email: email,
        p_password: password,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone || null,
        p_corporate_role: corporateRole,
        p_permissions: permissions,
        p_preferences: {
          department,
          jobTitle,
          monthlySpendLimit,
          invitedBy: ctx.user.email,
        },
      }
    )

    if (rpcErr || created?.error) {
      return NextResponse.json(
        { error: created?.error || rpcErr?.message || 'Unable to create corporate user.' },
        { status: 400 }
      )
    }

    const { data: newRow } = await (ctx.adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', created.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      member: newRow ? mapTeamMemberRow(newRow, orgId) : created,
      message: `${firstName} ${lastName} has been added to ${companyName} as ${CORPORATE_ROLE_PRESETS[corporateRole].label}.`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected error creating portal user.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await resolveCallerContext(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!ctx.access.isCorporate || !ctx.access.canManageTeam) {
    return NextResponse.json(
      { error: 'Only the Corporate Account Owner or an authorized Team Admin can modify user access.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const memberId = String(body?.memberId || '').trim()
    const orgId = ctx.access.organizationId

    if (!memberId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 })
    }
    if (memberId === orgId) {
      return NextResponse.json(
        { error: 'The primary Corporate Account Owner always retains full unrestricted access.' },
        { status: 400 }
      )
    }

    const { data: targetRow } = await (ctx.adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .maybeSingle()

    if (!targetRow || targetRow.preferences?.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'User not found in your corporate organization.' },
        { status: 404 }
      )
    }

    const prevPrefs = targetRow.preferences || {}
    const rawRole = String(
      body?.corporateRole || prevPrefs.corporateRole || 'booker'
    ).toLowerCase() as CorporateRoleId
    const nextRole: CorporateRoleId =
      rawRole !== 'owner' && CORPORATE_ROLE_PRESETS[rawRole] ? rawRole : 'booker'

    const nextPermissions = Array.isArray(body?.permissions)
      ? sanitizePermissions(body.permissions, nextRole)
      : sanitizePermissions(targetRow.permissions, nextRole)

    const nextStatus =
      body?.status === 'Suspended'
        ? 'Suspended'
        : body?.status === 'Active'
          ? 'Active'
          : targetRow.status || 'Active'

    const rawSpend =
      body?.monthlySpendLimit !== undefined
        ? Number(body.monthlySpendLimit)
        : Number(prevPrefs.monthlySpendLimit)
    const nextSpendLimit = !isNaN(rawSpend) && rawSpend > 0 ? rawSpend : null

    const nextPrefs = {
      ...prevPrefs,
      corporateRole: nextRole,
      department:
        body?.department !== undefined
          ? String(body.department).slice(0, 80).trim()
          : prevPrefs.department || '',
      jobTitle:
        body?.jobTitle !== undefined
          ? String(body.jobTitle).slice(0, 80).trim()
          : prevPrefs.jobTitle || '',
      monthlySpendLimit: nextSpendLimit,
    }

    const { data: updatedRow, error: updErr } = await (ctx.adminClient as any)
      .from('profiles')
      .update({
        status: nextStatus,
        permissions: nextPermissions,
        preferences: nextPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .select('*')
      .maybeSingle()

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 })
    }

    // Optional password reset by corporate owner if newPassword provided
    if (typeof body?.newPassword === 'string' && body.newPassword.length >= 8) {
      await (ctx.adminClient as any).rpc('update_client_password_by_email', {
        p_email: targetRow.email,
        p_new_password: body.newPassword,
      })
    }

    await (ctx.adminClient as any).rpc('sync_client_auth_metadata', {
      p_user_id: memberId,
      p_meta: {
        corporate_role: nextRole,
        permissions: nextPermissions,
      },
    })

    return NextResponse.json({
      success: true,
      member: mapTeamMemberRow(updatedRow, orgId),
      message: 'User role and portal access controls updated.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected error updating user access.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await resolveCallerContext(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!ctx.access.isCorporate || !ctx.access.canManageTeam) {
    return NextResponse.json(
      { error: 'Only the Corporate Account Owner or an authorized Team Admin can remove portal users.' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const memberId = String(searchParams.get('id') || '').trim()
  if (!memberId) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 })
  }

  const { data: res, error: rpcErr } = await (ctx.adminClient as any).rpc(
    'delete_corporate_portal_user',
    {
      p_user_id: memberId,
      p_org_id: ctx.access.organizationId,
    }
  )

  if (rpcErr || res?.error) {
    return NextResponse.json(
      { error: res?.error || rpcErr?.message || 'Unable to remove user.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Portal user removed from your corporate organization.',
  })
}
