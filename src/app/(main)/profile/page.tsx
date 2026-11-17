'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  CORPORATE_ROLE_PRESETS,
  PORTAL_PERMISSIONS_CATALOG,
  type CorporateRoleId,
  type PortalPermissionId,
  type EffectivePortalAccess,
} from '@/lib/corporate-rbac'
import {
  DEFAULT_COUNTRY_PHONE_RULES,
  type CountryPhoneRule,
  normalizeAndFormatLocalPhone,
  validatePhoneAgainstSuperAdminRule,
} from '@/lib/superadmin-phone-config'
import {
  Building2,
  User,
  Users,
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Pencil,
  Check,
  X,
  Plus,
  Crown,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Bell,
  Globe,
  FileText,
  Briefcase,
  MapPin,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Ban,
  Trash2,
  Copy,
  ChevronsUpDown,
  Search,
  Sliders,
  Download,
} from 'lucide-react'

interface ProfileData {
  id: string
  email: string
  status: string
  createdAt: string
  accountTier: 'Individual' | 'Corporate'
  access: EffectivePortalAccess
  personal: {
    firstName: string
    lastName: string
    fullName: string
    email: string
    phone: string
    jobTitle: string
    department: string
    preferredLanguage: string
    preferredCurrency: string
  }
  corporate: {
    companyName: string
    registrationNumber: string
    taxVatNumber: string
    industry: string
    billingAddress: string
    billingEmail: string
    requirePurchaseOrder: boolean
    companySize: string
  }
  notifications: {
    emailAlerts: boolean
    smsDispatchAlerts: boolean
    invoiceAutoForward: boolean
    distanceUnit: string
  }
}

interface TeamMemberItem {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  phone: string
  corporateRole: CorporateRoleId
  roleLabel: string
  department: string
  jobTitle: string
  status: string
  isOwner: boolean
  permissions: PortalPermissionId[]
  monthlySpendLimit: number | null
  createdAt: string
}

function SuperAdminPhoneEditor({
  valueE164,
  onChangeE164,
  countries,
}: {
  valueE164: string
  onChangeE164: (e164: string) => void
  countries: CountryPhoneRule[]
}) {
  const detectInitialCountry = React.useCallback(() => {
    const clean = String(valueE164 || '').trim()
    if (clean.startsWith('+')) {
      const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length)
      const matched = sorted.find((c) => clean.startsWith(c.dialCode))
      if (matched) return matched.code
    }
    return 'AE'
  }, [valueE164, countries])

  const [countryCode, setCountryCode] = React.useState<string>(detectInitialCountry)
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    setCountryCode(detectInitialCountry())
  }, [detectInitialCountry])

  const activeRule = React.useMemo(
    () =>
      countries.find((c) => c.code === countryCode) ||
      countries.find((c) => c.code === 'AE') ||
      DEFAULT_COUNTRY_PHONE_RULES[0],
    [countries, countryCode]
  )

  const formattedLocal = React.useMemo(
    () => normalizeAndFormatLocalPhone(valueE164 || '', activeRule).formattedLocal,
    [valueE164, activeRule]
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return countries
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    )
  }, [countries, search])

  return (
    <div className="space-y-1">
      <div className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 overflow-hidden">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-full items-center gap-1.5 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
            >
              <span>{activeRule.flag}</span>
              <span className="font-mono font-extrabold">{activeRule.dialCode}</span>
              <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[290px] p-0 z-[10005]" align="start">
            <div className="flex items-center border-b px-3">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or +code..."
                className="h-9 w-full bg-transparent text-xs outline-none"
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto p-1">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCountryCode(c.code)
                    setOpen(false)
                    setSearch('')
                    const localDigits = normalizeAndFormatLocalPhone(valueE164, activeRule).localDigits
                    const next = normalizeAndFormatLocalPhone(localDigits, c)
                    onChangeE164(next.e164)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span>{c.flag}</span>
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  <span className="font-mono font-bold text-slate-500">{c.dialCode}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <input
          type="tel"
          inputMode="numeric"
          placeholder={activeRule.phonePlaceholder}
          value={formattedLocal}
          onChange={(e) => {
            const res = normalizeAndFormatLocalPhone(e.target.value, activeRule)
            onChangeE164(res.e164)
          }}
          className="flex-1 h-full px-3.5 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
        />
      </div>
      <p className="text-[10.5px] font-mono text-slate-400">
        Format: {activeRule.dialCode} • {activeRule.phoneFormatMask}
      </p>
    </div>
  )
}

function ReadOnlyFieldTile({
  label,
  value,
  icon: Icon,
  mono = false,
  badge,
}: {
  label: string
  value?: string | null
  icon?: any
  mono?: boolean
  badge?: string
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label}
        </span>
        {badge && (
          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            {badge}
          </span>
        )}
      </div>
      <div
        className={cn(
          'text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5',
          mono && 'font-mono',
          !value && 'text-slate-400 italic font-medium'
        )}
      >
        {value || 'Not configured'}
      </div>
    </div>
  )
}

function ProfileInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestedTab = searchParams.get('tab')

  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<ProfileData | null>(null)
  const [draft, setDraft] = React.useState<ProfileData | null>(null)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'team' | 'security' | 'preferences'>(
    requestedTab === 'team'
      ? 'team'
      : requestedTab === 'security'
        ? 'security'
        : requestedTab === 'preferences'
          ? 'preferences'
          : 'overview'
  )

  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )
  const [countries, setCountries] = React.useState<CountryPhoneRule[]>(DEFAULT_COUNTRY_PHONE_RULES)

  // Corporate Team State
  const [teamLoading, setTeamLoading] = React.useState(false)
  const [teamMembers, setTeamMembers] = React.useState<TeamMemberItem[]>([])

  // Add / Edit Corporate User Modal State
  const [userModalOpen, setUserModalOpen] = React.useState(false)
  const [editingMember, setEditingMember] = React.useState<TeamMemberItem | null>(null)
  const [uFirstName, setUFirstName] = React.useState('')
  const [uLastName, setULastName] = React.useState('')
  const [uEmail, setUEmail] = React.useState('')
  const [uPhone, setUPhone] = React.useState('')
  const [uDepartment, setUDepartment] = React.useState('')
  const [uJobTitle, setUJobTitle] = React.useState('')
  const [uRole, setURole] = React.useState<CorporateRoleId>('booker')
  const [uPermissions, setUPermissions] = React.useState<PortalPermissionId[]>(
    CORPORATE_ROLE_PRESETS.booker.defaultPermissions
  )
  const [uSpendLimit, setUSpendLimit] = React.useState('')
  const [uPassword, setUPassword] = React.useState('')
  const [uStatus, setUStatus] = React.useState<'Active' | 'Suspended'>('Active')
  const [uSubmitting, setUSubmitting] = React.useState(false)
  const [uError, setUError] = React.useState<string | null>(null)
  const [createdCredsCard, setCreatedCredsCard] = React.useState<{
    name: string
    email: string
    password: string
    roleLabel: string
  } | null>(null)

  // Security Password State
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [showPw, setShowPw] = React.useState(false)
  const [updatingPw, setUpdatingPw] = React.useState(false)

  React.useEffect(() => {
    if (requestedTab === 'team' || requestedTab === 'security' || requestedTab === 'preferences') {
      setActiveTab(requestedTab)
    }
  }, [requestedTab])

  const fetchProfileData = React.useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { cache: 'no-store', credentials: 'include' })
      if (res.status === 401) {
        router.push('/login?redirect=/profile')
        return
      }
      const json = await res.json()
      if (res.ok && json?.id) {
        setData(json)
        setDraft(JSON.parse(JSON.stringify(json)))
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchTeamMembers = React.useCallback(async () => {
    setTeamLoading(true)
    try {
      const res = await fetch('/api/profile/team', { cache: 'no-store', credentials: 'include' })
      const json = await res.json()
      if (res.ok && Array.isArray(json?.members)) {
        setTeamMembers(json.members)
      }
    } catch {}
    setTeamLoading(false)
  }, [])

  React.useEffect(() => {
    fetchProfileData()
    fetch('/api/auth/geo-phone-config')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.countries) && d.countries.length > 0) {
          setCountries(d.countries)
        }
      })
      .catch(() => {})
  }, [fetchProfileData])

  React.useEffect(() => {
    if (data?.accountTier === 'Corporate') {
      fetchTeamMembers()
    }
  }, [data?.accountTier, fetchTeamMembers])

  const handleEnterEditMode = () => {
    if (!data) return
    setDraft(JSON.parse(JSON.stringify(data)))
    setBanner(null)
    setIsEditMode(true)
  }

  const handleCancelEditMode = () => {
    if (data) setDraft(JSON.parse(JSON.stringify(data)))
    setBanner(null)
    setIsEditMode(false)
  }

  const handleSaveProfile = async () => {
    if (!draft) return
    setBanner(null)

    if (!draft.personal.firstName.trim() || !draft.personal.lastName.trim()) {
      setBanner({ type: 'error', text: 'First name and last name are required.' })
      return
    }

    if (draft.personal.phone) {
      const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length)
      const matchedRule =
        sorted.find((c) => draft.personal.phone.startsWith(c.dialCode)) || countries[0]
      const { localDigits } = normalizeAndFormatLocalPhone(draft.personal.phone, matchedRule)
      const check = validatePhoneAgainstSuperAdminRule(localDigits, matchedRule)
      if (!check.valid) {
        setBanner({ type: 'error', text: check.message || 'Invalid mobile phone format.' })
        return
      }
    }

    if (draft.accountTier === 'Corporate' && draft.access.isOwner && !draft.corporate.companyName.trim()) {
      setBanner({
        type: 'error',
        text: 'Legal Entity / Company Name is required for Corporate accounts.',
      })
      return
    }

    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountTier: draft.accountTier,
          personal: draft.personal,
          corporate: draft.corporate,
          notifications: draft.notifications,
        }),
      })
      const json = await res.json()
      if (!res.ok || json?.error) {
        setBanner({ type: 'error', text: json?.error || 'Failed to save profile changes.' })
        return
      }

      await fetchProfileData()
      setIsEditMode(false)
      setBanner({ type: 'success', text: 'Profile changes saved cleanly.' })
      window.dispatchEvent(new Event('th:profile-updated'))
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Network error while saving profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const generateStrongTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    let out = 'Th!'
    for (let i = 0; i < 8; i++) {
      out += chars[Math.floor(Math.random() * chars.length)]
    }
    return out + '9@'
  }

  const openAddUserModal = () => {
    setEditingMember(null)
    setUFirstName('')
    setULastName('')
    setUEmail('')
    setUPhone('')
    setUDepartment('')
    setUJobTitle('')
    setURole('booker')
    setUPermissions([...CORPORATE_ROLE_PRESETS.booker.defaultPermissions])
    setUSpendLimit('')
    setUPassword(generateStrongTempPassword())
    setUStatus('Active')
    setUError(null)
    setCreatedCredsCard(null)
    setUserModalOpen(true)
  }

  const openEditMemberModal = (m: TeamMemberItem) => {
    setEditingMember(m)
    setUFirstName(m.firstName)
    setULastName(m.lastName)
    setUEmail(m.email)
    setUPhone(m.phone)
    setUDepartment(m.department)
    setUJobTitle(m.jobTitle)
    setURole(m.corporateRole)
    setUPermissions([...m.permissions])
    setUSpendLimit(m.monthlySpendLimit ? String(m.monthlySpendLimit) : '')
    setUPassword('')
    setUStatus(m.status === 'Suspended' ? 'Suspended' : 'Active')
    setUError(null)
    setCreatedCredsCard(null)
    setUserModalOpen(true)
  }

  const handleSelectRolePreset = (roleId: CorporateRoleId) => {
    setURole(roleId)
    setUPermissions([...CORPORATE_ROLE_PRESETS[roleId].defaultPermissions])
  }

  const togglePermissionItem = (permId: PortalPermissionId) => {
    setUPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    )
  }

  const handleSaveTeamUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUError(null)
    setUSubmitting(true)

    try {
      if (!editingMember) {
        const res = await fetch('/api/profile/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firstName: uFirstName.trim(),
            lastName: uLastName.trim(),
            email: uEmail.trim().toLowerCase(),
            phone: uPhone,
            department: uDepartment.trim(),
            jobTitle: uJobTitle.trim(),
            corporateRole: uRole,
            permissions: uPermissions,
            monthlySpendLimit: uSpendLimit ? Number(uSpendLimit) : null,
            password: uPassword,
          }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
          setUError(json?.error || 'Unable to create portal user.')
          setUSubmitting(false)
          return
        }
        setCreatedCredsCard({
          name: `${uFirstName.trim()} ${uLastName.trim()}`,
          email: uEmail.trim().toLowerCase(),
          password: uPassword,
          roleLabel: CORPORATE_ROLE_PRESETS[uRole].label,
        })
        await fetchTeamMembers()
      } else {
        const res = await fetch('/api/profile/team', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            memberId: editingMember.id,
            department: uDepartment.trim(),
            jobTitle: uJobTitle.trim(),
            corporateRole: uRole,
            permissions: uPermissions,
            monthlySpendLimit: uSpendLimit ? Number(uSpendLimit) : 0,
            status: uStatus,
            newPassword: uPassword.trim() ? uPassword.trim() : undefined,
          }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) {
          setUError(json?.error || 'Unable to update user access.')
          setUSubmitting(false)
          return
        }
        await fetchTeamMembers()
        setUserModalOpen(false)
        setBanner({ type: 'success', text: json.message || 'Team member access updated.' })
      }
    } catch (err: any) {
      setUError(err?.message || 'Unexpected error saving portal user.')
    } finally {
      setUSubmitting(false)
    }
  }

  const handleToggleMemberSuspend = async (m: TeamMemberItem) => {
    const nextStatus = m.status === 'Suspended' ? 'Active' : 'Suspended'
    const res = await fetch('/api/profile/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        memberId: m.id,
        corporateRole: m.corporateRole,
        permissions: m.permissions,
        status: nextStatus,
      }),
    })
    if (res.ok) {
      await fetchTeamMembers()
      setBanner({
        type: 'success',
        text: `${m.fullName} is now ${nextStatus.toLowerCase()}.`,
      })
    }
  }

  const handleRemoveMember = async (m: TeamMemberItem) => {
    if (!confirm(`Remove ${m.fullName} (${m.email}) from your corporate portal?`)) return
    const res = await fetch(`/api/profile/team?id=${encodeURIComponent(m.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (res.ok) {
      await fetchTeamMembers()
      setBanner({ type: 'success', text: `${m.fullName} was removed from your portal.` })
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setBanner(null)
    setUpdatingPw(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()
      if (!res.ok || json?.error) {
        setBanner({ type: 'error', text: json?.error || 'Unable to update password.' })
      } else {
        setCurrentPassword('')
        setNewPassword('')
        setBanner({ type: 'success', text: json.message || 'Password updated securely.' })
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Network error updating password.' })
    } finally {
      setUpdatingPw(false)
    }
  }

  const handleExportProfileJson = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transhola-profile-${data.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || !data || !draft) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Loading your structured profile...</p>
      </div>
    )
  }

  const isCorporate = (isEditMode ? draft.accountTier : data.accountTier) === 'Corporate'
  const canEditOrg = data.access.isOwner
  const canManageTeam = data.access.canManageTeam
  const activeView = isEditMode ? draft : data

  const heroTitle =
    isCorporate && activeView.corporate.companyName
      ? activeView.corporate.companyName
      : activeView.personal.fullName || activeView.email.split('@')[0]

  const initials = heroTitle
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* EXECUTIVE HERO HEADER WITH STRICT VIEW MODE / EDIT MODE CONTROLS */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
        <div className="h-24 sm:h-28 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 relative">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,#3b82f6,transparent_55%)]" />
          <div className="absolute top-4 right-5 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border backdrop-blur-md',
                isEditMode
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                  : 'bg-white/10 text-slate-200 border-white/15'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isEditMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                )}
              />
              {isEditMode ? 'Edit Mode Active' : 'Read-Only View Mode'}
            </span>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-6 -mt-10 sm:-mt-12 relative flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-white dark:border-slate-950 shadow-lg">
              <AvatarFallback
                className={cn(
                  'rounded-2xl text-2xl sm:text-3xl font-black text-white',
                  isCorporate
                    ? 'bg-gradient-to-br from-indigo-600 to-blue-700'
                    : 'bg-gradient-to-br from-blue-600 to-sky-600'
                )}
              >
                {initials || 'TH'}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border',
                    isCorporate
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  )}
                >
                  {isCorporate ? (
                    <Building2 className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  {isCorporate ? 'Corporate B2B Account' : 'Individual VIP Account'}
                </span>

                {isCorporate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                    {data.access.isOwner && <Crown className="w-3 h-3 text-amber-500" />}
                    {data.access.roleLabel}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {heroTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {data.email}
                </span>
                {data.personal.phone && (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {data.personal.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* VIEW MODE <-> EDIT MODE ACTION BUTTONS */}
          {activeTab === 'overview' || activeTab === 'preferences' ? (
            <div className="flex items-center gap-2.5 shrink-0">
              {!isEditMode ? (
                <Button
                  onClick={handleEnterEditMode}
                  className="h-11 px-5 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm cursor-pointer gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEditMode}
                    disabled={savingProfile}
                    className="h-11 px-4 rounded-xl font-bold cursor-pointer gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="h-11 px-5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer gap-2"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </div>
          ) : isCorporate && activeTab === 'team' && canManageTeam ? (
            <Button
              onClick={openAddUserModal}
              className="h-11 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Portal User
            </Button>
          ) : null}
        </div>
      </div>

      {/* STATUS FEEDBACK BANNER */}
      {banner && (
        <div
          className={cn(
            'p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200',
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          )}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STRUCTURED NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 w-fit max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer',
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          {isCorporate ? <Building2 className="w-4 h-4 text-indigo-600" /> : <User className="w-4 h-4 text-blue-600" />}
          {isCorporate ? 'Corporate & Personal Info' : 'Personal Profile'}
        </button>

        {data.accountTier === 'Corporate' && (
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'team'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Users className="w-4 h-4 text-blue-600" />
            Team &amp; Access Control
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
              {teamMembers.length || 1}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer',
            activeTab === 'security'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Shield className="w-4 h-4 text-emerald-600" />
          Security &amp; Password
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer',
            activeTab === 'preferences'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Sliders className="w-4 h-4 text-amber-600" />
          Preferences &amp; Privacy
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW & STRUCTURED IDENTITY (VIEW MODE <-> EDIT MODE)     */}
      {/* =================================================================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Main Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* ACCOUNT TIER SWITCHER (Only shown in Edit Mode for Owners) */}
            {isEditMode && canEditOrg && (
              <div className="rounded-3xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Account Classification Tier
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Corporate accounts unlock multi-user portal seats, role-based access controls, and VAT invoicing.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, accountTier: 'Individual' })}
                    className={cn(
                      'p-3.5 rounded-2xl border text-left transition-all cursor-pointer',
                      draft.accountTier === 'Individual'
                        ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/15'
                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                    )}
                  >
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" /> Individual VIP
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Personal &amp; private group bookings</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, accountTier: 'Corporate' })}
                    className={cn(
                      'p-3.5 rounded-2xl border text-left transition-all cursor-pointer',
                      draft.accountTier === 'Corporate'
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/15'
                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                    )}
                  >
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Corporate / B2B
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Company invoicing + Team RBAC</p>
                  </button>
                </div>
              </div>
            )}

            {/* PERSONAL / REPRESENTATIVE CARD */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-7 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    {isCorporate ? 'Authorized Representative Details' : 'Personal Contact Information'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Used for chauffeur dispatch coordination, live trip alerts, and e-tickets.
                  </p>
                </div>
                {!isEditMode && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    View Mode
                  </Badge>
                )}
              </div>

              {!isEditMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <ReadOnlyFieldTile
                    label="First Name"
                    value={data.personal.firstName}
                    icon={User}
                  />
                  <ReadOnlyFieldTile
                    label="Last Name"
                    value={data.personal.lastName}
                    icon={User}
                  />
                  <ReadOnlyFieldTile
                    label="Verified Email Address"
                    value={data.personal.email}
                    icon={Mail}
                    badge="Verified"
                  />
                  <ReadOnlyFieldTile
                    label="Mobile Phone Number"
                    value={data.personal.phone}
                    icon={Phone}
                    mono
                  />
                  {isCorporate && (
                    <>
                      <ReadOnlyFieldTile
                        label="Job Title / Position"
                        value={data.personal.jobTitle}
                        icon={Briefcase}
                      />
                      <ReadOnlyFieldTile
                        label="Department"
                        value={data.personal.department}
                        icon={Users}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      First Name *
                    </label>
                    <Input
                      value={draft.personal.firstName}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          personal: { ...draft.personal, firstName: e.target.value },
                        })
                      }
                      className="h-11 rounded-xl"
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Last Name *
                    </label>
                    <Input
                      value={draft.personal.lastName}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          personal: { ...draft.personal, lastName: e.target.value },
                        })
                      }
                      className="h-11 rounded-xl"
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Verified Account Email (Locked)
                    </label>
                    <Input
                      value={draft.personal.email}
                      disabled
                      className="h-11 rounded-xl bg-slate-100 dark:bg-slate-900 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Mobile Phone Number
                    </label>
                    <SuperAdminPhoneEditor
                      valueE164={draft.personal.phone}
                      onChangeE164={(val) =>
                        setDraft({
                          ...draft,
                          personal: { ...draft.personal, phone: val },
                        })
                      }
                      countries={countries}
                    />
                  </div>
                  {isCorporate && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Job Title
                        </label>
                        <Input
                          value={draft.personal.jobTitle}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              personal: { ...draft.personal, jobTitle: e.target.value },
                            })
                          }
                          placeholder="e.g. Head of Corporate Travel"
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Department
                        </label>
                        <Input
                          value={draft.personal.department}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              personal: { ...draft.personal, department: e.target.value },
                            })
                          }
                          placeholder="e.g. Operations & Logistics"
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* CORPORATE ORGANIZATION & TAX PROFILE CARD (Only for Corporate Accounts) */}
            {isCorporate && (
              <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-7 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Corporate Entity &amp; Invoicing Profile
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Printed on official VAT tax invoices, charter contracts, and B2B statements.
                    </p>
                  </div>
                  {!canEditOrg && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      Managed by Account Owner
                    </Badge>
                  )}
                </div>

                {!isEditMode || !canEditOrg ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <ReadOnlyFieldTile
                      label="Registered Legal Entity"
                      value={data.corporate.companyName}
                      icon={Building2}
                    />
                    <ReadOnlyFieldTile
                      label="Tax / VAT Registration (TRN)"
                      value={data.corporate.taxVatNumber}
                      icon={Receipt}
                      mono
                    />
                    <ReadOnlyFieldTile
                      label="Commercial License / CR No."
                      value={data.corporate.registrationNumber}
                      icon={FileText}
                      mono
                    />
                    <ReadOnlyFieldTile
                      label="Accounts Payable Email"
                      value={data.corporate.billingEmail}
                      icon={Mail}
                    />
                    <div className="sm:col-span-2">
                      <ReadOnlyFieldTile
                        label="Registered Billing Address"
                        value={data.corporate.billingAddress}
                        icon={MapPin}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Registered Legal Entity / Company Name *
                      </label>
                      <Input
                        value={draft.corporate.companyName}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            corporate: { ...draft.corporate, companyName: e.target.value },
                          })
                        }
                        placeholder="e.g. Global Tech Solutions LLC"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Tax / VAT Registration (TRN)
                      </label>
                      <Input
                        value={draft.corporate.taxVatNumber}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            corporate: { ...draft.corporate, taxVatNumber: e.target.value },
                          })
                        }
                        placeholder="e.g. 100293847500003"
                        className="h-11 rounded-xl font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Commercial Registration / License No.
                      </label>
                      <Input
                        value={draft.corporate.registrationNumber}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            corporate: { ...draft.corporate, registrationNumber: e.target.value },
                          })
                        }
                        placeholder="e.g. CN-4489120"
                        className="h-11 rounded-xl font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Accounts Payable / Billing Email
                      </label>
                      <Input
                        type="email"
                        value={draft.corporate.billingEmail}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            corporate: { ...draft.corporate, billingEmail: e.target.value },
                          })
                        }
                        placeholder="finance@company.com"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Industry Sector
                      </label>
                      <Input
                        value={draft.corporate.industry}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            corporate: { ...draft.corporate, industry: e.target.value },
                          })
                        }
                        placeholder="e.g. Technology, Hospitality, Events"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Registered Corporate Billing Address
                      </label>
                      <Input
                        value={draft.corporate.billingAddress}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            corporate: { ...draft.corporate, billingAddress: e.target.value },
                          })
                        }
                        placeholder="Tower, Street, City, Country"
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Summary / Governance Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* ACCOUNT SUMMARY & GOVERNANCE CARD */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Account Governance
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Account Status</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                    {data.status}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Account Tier</span>
                  <span className="font-bold text-slate-900 dark:text-white">{data.accountTier}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Assigned Role</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {data.access.roleLabel}
                  </span>
                </div>
                {data.access.monthlySpendLimit && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">Monthly Spend Cap</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {data.personal.preferredCurrency} {data.access.monthlySpendLimit.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {data.accountTier === 'Corporate' ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('team')}
                    className="w-full h-10 rounded-xl font-bold text-xs gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    {canManageTeam
                      ? `Manage Team & Access (${teamMembers.length || 1} Users)`
                      : 'View My Corporate Permissions'}
                  </Button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900 space-y-2">
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Booking for a company or team?
                  </p>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                    Click <strong>Edit Profile</strong> to switch to a <strong>Corporate B2B Account</strong> and add team members with role-based access controls.
                  </p>
                </div>
              )}
            </div>

            {/* ACTIVE PERMISSIONS SUMMARY */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-3.5 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Enabled Portal Capabilities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {PORTAL_PERMISSIONS_CATALOG.map((perm) => {
                  const enabled = data.access.permissions.includes(perm.id)
                  return (
                    <span
                      key={perm.id}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border',
                        enabled
                          ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-900 dark:border-slate-800'
                      )}
                    >
                      {enabled ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {perm.shortTag}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: CORPORATE TEAM & ACCESS CONTROL (RBAC)                       */}
      {/* =================================================================== */}
      {activeTab === 'team' && data.accountTier === 'Corporate' && (
        <div className="space-y-6">
          {/* KPIGovernance Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                Total Portal Users
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {teamMembers.length || 1}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                Active Seats
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {teamMembers.filter((m) => m.status !== 'Suspended').length || 1}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                Suspended Seats
              </span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {teamMembers.filter((m) => m.status === 'Suspended').length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                Your Governance Tier
              </span>
              <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-2 truncate">
                {data.access.roleLabel}
              </p>
            </div>
          </div>

          {/* Team Directory Card */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Corporate Portal Users &amp; Access Matrix
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add team members and restrict or grant exact portal sections (Booking, Quotations, Billing, Support) per user.
                </p>
              </div>
              {canManageTeam && (
                <Button
                  onClick={openAddUserModal}
                  className="h-10 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Portal User
                </Button>
              )}
            </div>

            {teamLoading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                Loading corporate team directory...
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {teamMembers.map((m) => {
                  const rolePreset =
                    CORPORATE_ROLE_PRESETS[m.corporateRole] || CORPORATE_ROLE_PRESETS.booker
                  const isSuspended = m.status === 'Suspended'

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'p-5 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors',
                        isSuspended && 'opacity-65 bg-slate-50/40'
                      )}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <Avatar className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                          <AvatarFallback
                            className={cn(
                              'rounded-xl text-xs font-black text-white',
                              m.isOwner ? 'bg-indigo-600' : 'bg-slate-700'
                            )}
                          >
                            {m.fullName
                              .split(' ')
                              .slice(0, 2)
                              .map((x) => x[0]?.toUpperCase())
                              .join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {m.fullName}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border',
                                rolePreset.badgeColor
                              )}
                            >
                              {m.isOwner && <Crown className="w-3 h-3 text-amber-500" />}
                              {rolePreset.label}
                            </span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                isSuspended
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              )}
                            >
                              {m.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                            <span>{m.email}</span>
                            {m.jobTitle && <span>• {m.jobTitle}</span>}
                            {m.department && <span>({m.department})</span>}
                            {m.monthlySpendLimit && (
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                • Cap: {data.personal.preferredCurrency}{' '}
                                {m.monthlySpendLimit.toLocaleString()}/mo
                              </span>
                            )}
                          </div>

                          {/* Granular Access Chips */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {PORTAL_PERMISSIONS_CATALOG.map((perm) => {
                              const allowed = m.isOwner || m.permissions.includes(perm.id)
                              if (!allowed) return null
                              return (
                                <span
                                  key={perm.id}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                                >
                                  ✓ {perm.shortTag}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Member Actions (Only for Owner / Team Admins on non-owner seats) */}
                      {canManageTeam && !m.isOwner && (
                        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditMemberModal(m)}
                            className="h-8 rounded-xl text-xs font-bold cursor-pointer gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                            Access &amp; Role
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleMemberSuspend(m)}
                            className={cn(
                              'h-8 rounded-xl text-xs font-bold cursor-pointer gap-1',
                              isSuspended
                                ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                : 'text-amber-700 border-amber-200 hover:bg-amber-50'
                            )}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(m)}
                            className="h-8 w-8 p-0 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Remove user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: SECURITY & PASSWORD                                          */}
      {/* =================================================================== */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handlePasswordChange}
            className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-7 space-y-4 shadow-xs"
          >
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                Change Account Password
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify your current password to establish a new encrypted credential.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Current Password
              </label>
              <Input
                type={showPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter current password"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                New Password (Min. 8 Characters)
              </label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter strong new password"
                  className="h-11 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={updatingPw || newPassword.length < 8 || !currentPassword}
              className="w-full h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              {updatingPw ? 'Updating Password...' : 'Update Password Securely'}
            </Button>
          </form>

          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-7 space-y-4 shadow-xs">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Session &amp; Cryptographic Security
            </h2>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Current Authenticated Session
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Signed HS256 Cross-Subdomain Session ({data.email})
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-emerald-100 text-emerald-700">
                Active Now
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your session is protected by HTTP-only SameSite cookies and role-based portal isolation across <code>transhola.com</code> and <code>client.transhola.com</code>.
            </p>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PREFERENCES & PRIVACY (VIEW MODE <-> EDIT MODE)              */}
      {/* =================================================================== */}
      {activeTab === 'preferences' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                Dispatch &amp; Billing Notifications
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                {isEditMode ? 'Editing' : 'View Mode'}
              </Badge>
            </div>

            {[
              {
                key: 'emailAlerts' as const,
                title: 'Official Email Confirmations & E-Tickets',
                desc: 'Receive quotation PDFs, booking confirmations, and route updates.',
              },
              {
                key: 'smsDispatchAlerts' as const,
                title: 'SMS Chauffeur & Live Arrival Alerts',
                desc: 'Instant SMS notifications when your assigned vehicle arrives at pickup.',
              },
              {
                key: 'invoiceAutoForward' as const,
                title: 'Automatic Tax Invoice Forwarding',
                desc: 'Automatically send settled VAT invoices to your billing email.',
              },
            ].map((item) => {
              const checked = activeView.notifications[item.key]
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-3 border-b last:border-0 border-slate-100 dark:border-slate-800"
                >
                  <div className="pr-4">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!isEditMode}
                    onClick={() =>
                      isEditMode &&
                      setDraft({
                        ...draft,
                        notifications: {
                          ...draft.notifications,
                          [item.key]: !draft.notifications[item.key],
                        },
                      })
                    }
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative inline-flex items-center shrink-0',
                      checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
                      !isEditMode ? 'opacity-70 cursor-default' : 'cursor-pointer'
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 bg-white rounded-full shadow transition-transform',
                        checked ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-7 space-y-4 shadow-xs">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              Regional Units &amp; GDPR Data Portability
            </h2>

            <div className="grid grid-cols-2 gap-3.5">
              <ReadOnlyFieldTile
                label="Distance Unit"
                value={
                  activeView.notifications.distanceUnit === 'mi'
                    ? 'Miles (mi)'
                    : 'Kilometers (km)'
                }
              />
              <ReadOnlyFieldTile
                label="Preferred Currency"
                value={activeView.personal.preferredCurrency}
              />
            </div>

            {isEditMode && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                    Distance Unit
                  </label>
                  <select
                    value={draft.notifications.distanceUnit}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        notifications: { ...draft.notifications, distanceUnit: e.target.value },
                      })
                    }
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
                  >
                    <option value="km">Kilometers (km)</option>
                    <option value="mi">Miles (mi)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                    Preferred Currency
                  </label>
                  <select
                    value={draft.personal.preferredCurrency}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        personal: { ...draft.personal, preferredCurrency: e.target.value },
                      })
                    }
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
                  >
                    <option value="AED">AED (د.إ)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="MAD">MAD (DH)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportProfileJson}
                className="w-full h-11 rounded-xl font-bold gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export My Account &amp; Governance Data (JSON)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD / EDIT CORPORATE PORTAL USER & GRANULAR ACCESS CONTROL   */}
      {/* =================================================================== */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              {createdCredsCard
                ? 'Portal User Created & Active'
                : editingMember
                  ? `Configure Role & Access — ${editingMember.fullName}`
                  : `Add Portal User to ${data.corporate.companyName || 'Corporate Account'}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {createdCredsCard
                ? 'Share these login credentials securely with your team member. Their role and module restrictions are active immediately.'
                : 'Assign a corporate role preset and customize exact portal access permissions for this user.'}
            </DialogDescription>
          </DialogHeader>

          {createdCredsCard ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {createdCredsCard.name} ({createdCredsCard.roleLabel}) is ready to sign in!
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-1">
                  <div>
                    <span className="text-slate-400">Portal URL:</span> https://client.transhola.com/login
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span> {createdCredsCard.email}
                  </div>
                  <div>
                    <span className="text-slate-400">Password:</span> {createdCredsCard.password}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `TransHola Corporate Portal\nLogin: https://client.transhola.com/login\nEmail: ${createdCredsCard.email}\nTemporary Password: ${createdCredsCard.password}`
                    )
                    setBanner({ type: 'success', text: 'Login credentials copied to clipboard.' })
                  }}
                  className="w-full h-10 rounded-xl font-bold text-xs gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Login Credentials
                </Button>
              </div>
              <Button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="w-full h-11 rounded-xl font-bold bg-slate-900 text-white cursor-pointer"
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSaveTeamUser} className="space-y-5 pt-2">
              {!editingMember && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-600">
                        First Name *
                      </label>
                      <Input
                        value={uFirstName}
                        onChange={(e) => setUFirstName(e.target.value)}
                        required
                        placeholder="Sarah"
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-600">
                        Last Name *
                      </label>
                      <Input
                        value={uLastName}
                        onChange={(e) => setULastName(e.target.value)}
                        required
                        placeholder="Jenkins"
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-600">
                        Work Email *
                      </label>
                      <Input
                        type="email"
                        value={uEmail}
                        onChange={(e) => setUEmail(e.target.value)}
                        required
                        placeholder="sarah@company.com"
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-600">
                        Mobile Phone
                      </label>
                      <SuperAdminPhoneEditor
                        valueE164={uPhone}
                        onChangeE164={setUPhone}
                        countries={countries}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-600">Job Title</label>
                  <Input
                    value={uJobTitle}
                    onChange={(e) => setUJobTitle(e.target.value)}
                    placeholder="e.g. Travel Coordinator"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-600">Department</label>
                  <Input
                    value={uDepartment}
                    onChange={(e) => setUDepartment(e.target.value)}
                    placeholder="e.g. Procurement"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Monthly Spend Cap ({data.personal.preferredCurrency})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={uSpendLimit}
                    onChange={(e) => setUSpendLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* ROLE PRESET SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  1. Select User Role Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    ['admin', 'travel_manager', 'booker', 'finance', 'viewer'] as CorporateRoleId[]
                  ).map((rId) => {
                    const preset = CORPORATE_ROLE_PRESETS[rId]
                    const selected = uRole === rId
                    return (
                      <button
                        key={rId}
                        type="button"
                        onClick={() => handleSelectRolePreset(rId)}
                        className={cn(
                          'p-3 rounded-2xl border text-left transition-all cursor-pointer',
                          selected
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-600/15'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {preset.label}
                          </span>
                          {selected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                          {preset.summary}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* GRANULAR PORTAL ACCESS CONTROL MATRIX */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Customize Granular Portal Access Controls ({uPermissions.length}/
                    {PORTAL_PERMISSIONS_CATALOG.length} Enabled)
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/40">
                  {PORTAL_PERMISSIONS_CATALOG.map((perm) => {
                    const checked = uPermissions.includes(perm.id)
                    return (
                      <label
                        key={perm.id}
                        className={cn(
                          'flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none',
                          checked
                            ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 shadow-2xs'
                            : 'bg-transparent border-transparent opacity-65 hover:opacity-100'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermissionItem(perm.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {perm.label}
                          </p>
                          <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-slate-600">
                    {editingMember ? 'Reset Password (Optional)' : 'Initial Login Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setUPassword(generateStrongTempPassword())}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Generate Strong Password
                  </button>
                </div>
                <Input
                  type="text"
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  required={!editingMember}
                  minLength={editingMember ? undefined : 8}
                  placeholder={
                    editingMember
                      ? 'Leave blank to keep existing password'
                      : 'Minimum 8 characters'
                  }
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>

              {uError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {uError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUserModalOpen(false)}
                  className="h-10 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uSubmitting}
                  className="h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5"
                >
                  {uSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingMember ? 'Save Role & Access Limits' : 'Create Corporate User'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileInner />
    </Suspense>
  )
}
