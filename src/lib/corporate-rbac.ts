export type PortalPermissionId =
  | 'portal.book_service'
  | 'portal.quotations.view'
  | 'portal.quotations.create'
  | 'portal.bookings.confirm'
  | 'portal.bookings.manage'
  | 'portal.billing.view'
  | 'portal.support.access'
  | 'portal.team.manage'

export type CorporateRoleId =
  | 'owner'
  | 'admin'
  | 'travel_manager'
  | 'booker'
  | 'finance'
  | 'viewer'

export interface PortalPermissionSpec {
  id: PortalPermissionId
  label: string
  shortTag: string
  description: string
  module: 'Booking' | 'Quotations' | 'Trips' | 'Finance' | 'Support' | 'Governance'
}

export const PORTAL_PERMISSIONS_CATALOG: PortalPermissionSpec[] = [
  {
    id: 'portal.book_service',
    label: 'Book Service Console',
    shortTag: 'Book Service',
    description: 'Configure routes, stops, passenger headcount, and request live fleet pricing.',
    module: 'Booking',
  },
  {
    id: 'portal.quotations.view',
    label: 'View Quotations',
    shortTag: 'View Quotes',
    description: 'View active and historical company trip quotations.',
    module: 'Quotations',
  },
  {
    id: 'portal.quotations.create',
    label: 'Save & Share Quotations',
    shortTag: 'Create Quotes',
    description: 'Save official quotations to the corporate account and dispatch PDF quotes.',
    module: 'Quotations',
  },
  {
    id: 'portal.bookings.confirm',
    label: 'Confirm & Reserve Fleet',
    shortTag: 'Confirm Trips',
    description: 'Convert quotations into confirmed bookings and authorize trip checkout.',
    module: 'Booking',
  },
  {
    id: 'portal.bookings.manage',
    label: 'My Bookings & Live Tracking',
    shortTag: 'Bookings',
    description: 'View confirmed reservations, live GPS vehicle tracking, and modify trips.',
    module: 'Trips',
  },
  {
    id: 'portal.billing.view',
    label: 'Billing & Tax Invoices',
    shortTag: 'Billing',
    description: 'Access corporate invoices, VAT statements, and payment methods.',
    module: 'Finance',
  },
  {
    id: 'portal.support.access',
    label: '24/7 Dispatch Support',
    shortTag: 'Support',
    description: 'Create and track priority dispatch support and Lost & Found requests.',
    module: 'Support',
  },
  {
    id: 'portal.team.manage',
    label: 'Team & Access Governance',
    shortTag: 'Manage Team',
    description: 'Invite portal users, assign roles, and customize access controls.',
    module: 'Governance',
  },
]

export const ALL_PORTAL_PERMISSION_IDS: PortalPermissionId[] = PORTAL_PERMISSIONS_CATALOG.map(
  (p) => p.id
)

export interface CorporateRolePreset {
  id: CorporateRoleId
  label: string
  badgeColor: string
  summary: string
  defaultPermissions: PortalPermissionId[]
}

export const CORPORATE_ROLE_PRESETS: Record<CorporateRoleId, CorporateRolePreset> = {
  owner: {
    id: 'owner',
    label: 'Account Owner',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    summary: 'Primary corporate account holder with unrestricted governance, billing, and team control.',
    defaultPermissions: [...ALL_PORTAL_PERMISSION_IDS],
  },
  admin: {
    id: 'admin',
    label: 'Corporate Admin',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    summary: 'Full operational access including team user management, bookings, quotations, and billing.',
    defaultPermissions: [...ALL_PORTAL_PERMISSION_IDS],
  },
  travel_manager: {
    id: 'travel_manager',
    label: 'Travel Manager',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    summary: 'Manages group itineraries, quotations, confirmed bookings, and billing statements.',
    defaultPermissions: [
      'portal.book_service',
      'portal.quotations.view',
      'portal.quotations.create',
      'portal.bookings.confirm',
      'portal.bookings.manage',
      'portal.billing.view',
      'portal.support.access',
    ],
  },
  booker: {
    id: 'booker',
    label: 'Booking Coordinator',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    summary: 'Can request quotes and book rides for teams; restricted from billing and user governance.',
    defaultPermissions: [
      'portal.book_service',
      'portal.quotations.view',
      'portal.quotations.create',
      'portal.bookings.confirm',
      'portal.bookings.manage',
      'portal.support.access',
    ],
  },
  finance: {
    id: 'finance',
    label: 'Finance & Billing',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    summary: 'Audits invoices, billing statements, and trip history; restricted from creating new bookings.',
    defaultPermissions: [
      'portal.quotations.view',
      'portal.bookings.manage',
      'portal.billing.view',
      'portal.support.access',
    ],
  },
  viewer: {
    id: 'viewer',
    label: 'Read-Only Viewer',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    summary: 'View-only access to itineraries, quotations, and live vehicle tracking.',
    defaultPermissions: [
      'portal.quotations.view',
      'portal.bookings.manage',
      'portal.support.access',
    ],
  },
}

export interface EffectivePortalAccess {
  isCorporate: boolean
  isOwner: boolean
  organizationId: string
  corporateRole: CorporateRoleId
  roleLabel: string
  permissions: PortalPermissionId[]
  canManageTeam: boolean
  monthlySpendLimit: number | null
}

export function resolveEffectivePortalAccess(
  profile?: Record<string, any> | null,
  user?: Record<string, any> | null
): EffectivePortalAccess {
  const userId = String(profile?.id || user?.id || '').trim()
  const prefs = profile?.preferences || {}
  const meta = user?.user_metadata || {}

  const clientTypeRaw =
    prefs.clientType ||
    meta.client_type ||
    (prefs.companyName || meta.company_name || meta.is_company ? 'Corporate' : 'Individual')

  const isCorporate = String(clientTypeRaw).toLowerCase() === 'corporate'

  if (!isCorporate) {
    return {
      isCorporate: false,
      isOwner: true,
      organizationId: userId,
      corporateRole: 'owner',
      roleLabel: 'Individual Account',
      permissions: [...ALL_PORTAL_PERMISSION_IDS],
      canManageTeam: false,
      monthlySpendLimit: null,
    }
  }

  const orgId = String(prefs.organizationId || meta.organization_id || userId).trim()
  const rawRole = String(prefs.corporateRole || meta.corporate_role || '').toLowerCase() as CorporateRoleId
  const isOwner = !prefs.organizationId || orgId === userId || rawRole === 'owner'

  if (isOwner) {
    return {
      isCorporate: true,
      isOwner: true,
      organizationId: userId,
      corporateRole: 'owner',
      roleLabel: 'Account Owner',
      permissions: [...ALL_PORTAL_PERMISSION_IDS],
      canManageTeam: true,
      monthlySpendLimit: null,
    }
  }

  const validRole: CorporateRoleId = CORPORATE_ROLE_PRESETS[rawRole] ? rawRole : 'booker'
  const preset = CORPORATE_ROLE_PRESETS[validRole]

  // Sub-user explicit permissions stored in profile.permissions (jsonb array)
  let resolvedPerms: PortalPermissionId[] = []
  if (Array.isArray(profile?.permissions) && profile.permissions.length > 0) {
    if (profile.permissions.includes('*')) {
      resolvedPerms = [...ALL_PORTAL_PERMISSION_IDS]
    } else {
      resolvedPerms = profile.permissions.filter((p: string) =>
        (ALL_PORTAL_PERMISSION_IDS as string[]).includes(p)
      ) as PortalPermissionId[]
    }
  } else if (Array.isArray(prefs.customPermissions)) {
    resolvedPerms = prefs.customPermissions.filter((p: string) =>
      (ALL_PORTAL_PERMISSION_IDS as string[]).includes(p)
    ) as PortalPermissionId[]
  } else {
    resolvedPerms = [...preset.defaultPermissions]
  }

  const spendLimitNum = Number(prefs.monthlySpendLimit)
  const monthlySpendLimit = !isNaN(spendLimitNum) && spendLimitNum > 0 ? spendLimitNum : null

  return {
    isCorporate: true,
    isOwner: false,
    organizationId: orgId,
    corporateRole: validRole,
    roleLabel: preset.label,
    permissions: resolvedPerms,
    canManageTeam: resolvedPerms.includes('portal.team.manage'),
    monthlySpendLimit,
  }
}

export function checkRoutePermission(
  pathname: string,
  access: EffectivePortalAccess
): { allowed: boolean; requiredPermission?: PortalPermissionSpec; fallbackHref: string } {
  if (!access.isCorporate || access.isOwner) {
    return { allowed: true, fallbackHref: '/' }
  }

  const has = (perm: PortalPermissionId) => access.permissions.includes(perm)

  const computeFirstAllowedHref = (): string => {
    if (has('portal.book_service')) return '/'
    if (has('portal.quotations.view')) return '/quotations'
    if (has('portal.bookings.manage')) return '/bookings'
    if (has('portal.billing.view')) return '/billing'
    if (has('portal.support.access')) return '/support'
    return '/profile'
  }

  if (pathname === '/') {
    if (!has('portal.book_service')) {
      return {
        allowed: false,
        requiredPermission: PORTAL_PERMISSIONS_CATALOG.find((p) => p.id === 'portal.book_service'),
        fallbackHref: computeFirstAllowedHref(),
      }
    }
  } else if (pathname.startsWith('/quotations')) {
    if (!has('portal.quotations.view')) {
      return {
        allowed: false,
        requiredPermission: PORTAL_PERMISSIONS_CATALOG.find((p) => p.id === 'portal.quotations.view'),
        fallbackHref: computeFirstAllowedHref(),
      }
    }
  } else if (pathname.startsWith('/bookings') || pathname.startsWith('/trips')) {
    if (!has('portal.bookings.manage')) {
      return {
        allowed: false,
        requiredPermission: PORTAL_PERMISSIONS_CATALOG.find((p) => p.id === 'portal.bookings.manage'),
        fallbackHref: computeFirstAllowedHref(),
      }
    }
  } else if (pathname.startsWith('/billing')) {
    if (!has('portal.billing.view')) {
      return {
        allowed: false,
        requiredPermission: PORTAL_PERMISSIONS_CATALOG.find((p) => p.id === 'portal.billing.view'),
        fallbackHref: computeFirstAllowedHref(),
      }
    }
  } else if (pathname.startsWith('/support')) {
    if (!has('portal.support.access')) {
      return {
        allowed: false,
        requiredPermission: PORTAL_PERMISSIONS_CATALOG.find((p) => p.id === 'portal.support.access'),
        fallbackHref: computeFirstAllowedHref(),
      }
    }
  }

  return { allowed: true, fallbackHref: '/' }
}

