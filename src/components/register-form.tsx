'use client'

import * as React from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DEFAULT_COUNTRY_PHONE_RULES,
  type CountryPhoneRule,
  normalizeAndFormatLocalPhone,
  validatePhoneAgainstSuperAdminRule,
} from '@/lib/superadmin-phone-config'
import {
  Building2,
  User,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
  Phone,
  ChevronsUpDown,
  Check,
  Search,
  KeyRound,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export interface CentralizedClientAccountFormProps extends React.ComponentProps<'div'> {
  initialMode?: 'register' | 'login' | 'reset' | 'guest'
  initialEmail?: string
  countryHint?: string
  embedded?: boolean
  redirectTo?: string
  allowGuestQuickAccess?: boolean
  onGuestContinue?: (email: string) => Promise<void> | void
  onAuthSuccess?: (payload?: any) => void
}

export function RegisterForm({
  className,
  initialMode = 'register',
  initialEmail = '',
  countryHint,
  embedded = false,
  redirectTo,
  allowGuestQuickAccess = false,
  onGuestContinue,
  onAuthSuccess,
  ...props
}: CentralizedClientAccountFormProps) {
  const [mode, setMode] = useState<'register' | 'login' | 'reset' | 'guest'>(initialMode)
  const [accountType, setAccountType] = useState<'individual' | 'entity'>('individual')
  const [entityName, setEntityName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // SuperAdmin Country Dial Code & Format State
  const [countries, setCountries] = useState<CountryPhoneRule[]>(DEFAULT_COUNTRY_PHONE_RULES)
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    (countryHint || 'AE').trim().toUpperCase()
  )
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [localPhoneDigits, setLocalPhoneDigits] = useState('')
  const [formattedLocalPhone, setFormattedLocalPhone] = useState('')
  const [e164Phone, setE164Phone] = useState('')
  const userManuallyPickedCountry = useRef(false)

  // Submission & Duplicate-Email / Recovery State
  const [pending, setPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isEmailAlreadyRegistered, setIsEmailAlreadyRegistered] = useState(false)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Inline Password Reset (6-Digit OTP + New Password) State
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request')
  const [challengeToken, setChallengeToken] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newResetPassword, setNewResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  // Sync country hint from parent (e.g. active booking city/country)
  useEffect(() => {
    if (countryHint && countryHint.trim().length === 2 && !userManuallyPickedCountry.current) {
      setSelectedCountryCode(countryHint.trim().toUpperCase())
    }
  }, [countryHint])

  // Fetch authoritative SuperAdmin country area codes & phone formats
  useEffect(() => {
    let cancelled = false
    let hintIso = (countryHint || '').trim().toUpperCase()
    if (!hintIso && typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search)
        const qCountry = (params.get('country') || '').trim().toUpperCase()
        const qEmail = (params.get('email') || '').trim()
        const qMode = (params.get('mode') || '').trim().toLowerCase()
        if (qEmail && !email) setEmail(qEmail)
        if (qMode === 'reset') setMode('reset')
        if (qCountry.length === 2) {
          hintIso = qCountry
        } else {
          const savedCountry = (
            localStorage.getItem('th_selected_country') ||
            localStorage.getItem('cw_selected_country') ||
            ''
          )
            .trim()
            .toUpperCase()
          if (savedCountry.length === 2) hintIso = savedCountry
        }
      } catch {}
    }

    const query = hintIso ? `?country=${encodeURIComponent(hintIso)}` : ''
    fetch(`/api/auth/geo-phone-config${query}`, { signal: AbortSignal.timeout(2500) })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data?.countries) && data.countries.length > 0) {
          setCountries(data.countries)
        }
        if (data?.detectedCountryCode && !userManuallyPickedCountry.current) {
          setSelectedCountryCode(String(data.detectedCountryCode).toUpperCase())
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [countryHint])

  const activeCountryRule = useMemo<CountryPhoneRule>(() => {
    return (
      countries.find((c) => c.code === selectedCountryCode) ||
      countries.find((c) => c.code === 'AE') ||
      DEFAULT_COUNTRY_PHONE_RULES[0]
    )
  }, [countries, selectedCountryCode])

  // Re-normalize local phone digits whenever country rule changes
  useEffect(() => {
    if (localPhoneDigits) {
      const res = normalizeAndFormatLocalPhone(localPhoneDigits, activeCountryRule)
      setLocalPhoneDigits(res.localDigits)
      setFormattedLocalPhone(res.formattedLocal)
      setE164Phone(res.e164)
    } else {
      setFormattedLocalPhone('')
      setE164Phone('')
    }
  }, [activeCountryRule])

  const handleLocalPhoneChange = (rawVal: string) => {
    const res = normalizeAndFormatLocalPhone(rawVal, activeCountryRule)
    setLocalPhoneDigits(res.localDigits)
    setFormattedLocalPhone(res.formattedLocal)
    setE164Phone(res.e164)
    if (errorMsg) setErrorMsg(null)
  }

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase()
    if (!q) return countries
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    )
  }, [countries, countrySearch])

  const activeMarkets = useMemo(
    () => filteredCountries.filter((c) => c.isActiveMarket),
    [filteredCountries]
  )
  const otherMarkets = useMemo(
    () => filteredCountries.filter((c) => !c.isActiveMarket),
    [filteredCountries]
  )

  const getPasswordStrength = (pwd: string) => {
    if (!pwd)
      return {
        score: 0,
        label: '',
        color: 'bg-slate-200 dark:bg-slate-800',
        textColor: 'text-slate-400',
      }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1)
      return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-500' }
    if (score === 2)
      return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-500' }
    if (score === 3)
      return { score: 3, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500' }
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' }
  }

  const pwdStrength = getPasswordStrength(password)
  const resetPwdStrength = getPasswordStrength(newResetPassword)

  const resolveRedirectAfterAuth = (fallbackPath = '/') => {
    if (redirectTo) return redirectTo
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const r = sp.get('redirect')
      if (r && r.startsWith('/')) return r
    }
    return fallbackPath
  }

  const switchToMode = (nextMode: 'register' | 'login' | 'reset' | 'guest') => {
    setMode(nextMode)
    setErrorMsg(null)
    setIsEmailAlreadyRegistered(false)
    setSuccessBanner(null)
    if (nextMode === 'reset') {
      setResetStep('request')
      setOtpCode('')
    }
  }

  const handleTriggerDirectResetCode = async () => {
    const cleanEmail = email.trim().toLowerCase()
    setMode('reset')
    setErrorMsg(null)
    setIsEmailAlreadyRegistered(false)
    setSuccessBanner(null)

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setResetStep('request')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, countryCode: activeCountryRule.code }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        setResetStep('request')
        setErrorMsg(data?.error || 'Could not send reset code. Please verify your email.')
      } else {
        setChallengeToken(data.challengeToken || '')
        setResetStep('verify')
        setSuccessBanner(`6-digit recovery code sent to ${cleanEmail}. Check your inbox!`)
      }
    } catch (err: any) {
      setResetStep('request')
      setErrorMsg(err?.message || 'Network error while requesting password reset.')
    } finally {
      setPending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsEmailAlreadyRegistered(false)
    setSuccessBanner(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    if (mode === 'guest' && onGuestContinue) {
      setPending(true)
      try {
        await onGuestContinue(cleanEmail)
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unable to continue with email.')
      } finally {
        setPending(false)
      }
      return
    }

    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('Please enter your first and last name.')
        return
      }
      if (accountType === 'entity' && !entityName.trim()) {
        setErrorMsg('Please enter your registered company or entity name.')
        return
      }
      const phoneCheck = validatePhoneAgainstSuperAdminRule(localPhoneDigits, activeCountryRule)
      if (!phoneCheck.valid) {
        setErrorMsg(phoneCheck.message || 'Please enter a valid mobile phone number.')
        return
      }
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.')
        return
      }

      setPending(true)
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            entityName: accountType === 'entity' ? entityName.trim() : '',
            isCompany: accountType === 'entity',
            phone: e164Phone,
          }),
        })
        const data = await res.json()
        if (!res.ok || data?.error) {
          const msg = String(data?.error || 'Unable to create account.')
          if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
            setIsEmailAlreadyRegistered(true)
            setErrorMsg(msg)
          } else {
            setErrorMsg(msg)
          }
          return
        }

        if (onAuthSuccess) {
          onAuthSuccess(data)
          return
        }
        window.location.href = resolveRedirectAfterAuth(data?.redirectTo || '/')
      } catch (err: any) {
        setErrorMsg(err?.message || 'Network error while creating your account.')
      } finally {
        setPending(false)
      }
      return
    }

    if (mode === 'login') {
      if (!password) {
        setErrorMsg('Please enter your password.')
        return
      }
      setPending(true)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        })
        const data = await res.json()
        if (!res.ok || data?.error) {
          setErrorMsg(data?.error || 'Invalid email or password.')
          return
        }
        try {
          localStorage.setItem('cw_remembered_email', cleanEmail)
        } catch {}

        if (onAuthSuccess) {
          onAuthSuccess(data)
          return
        }
        window.location.href = resolveRedirectAfterAuth(data?.redirectTo || '/')
      } catch (err: any) {
        setErrorMsg(err?.message || 'Network error during sign in.')
      } finally {
        setPending(false)
      }
      return
    }

    if (mode === 'reset') {
      setPending(true)
      try {
        if (resetStep === 'request') {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, countryCode: activeCountryRule.code }),
          })
          const data = await res.json()
          if (!res.ok || data?.error) {
            setErrorMsg(data?.error || 'Unable to send recovery code.')
            return
          }
          setChallengeToken(data.challengeToken || '')
          setResetStep('verify')
          setSuccessBanner(
            data.message || `We sent a 6-digit recovery code and reset link to ${cleanEmail}.`
          )
        } else {
          if (otpCode.trim().length < 6) {
            setErrorMsg('Please enter the 6-digit recovery code sent to your email.')
            setPending(false)
            return
          }
          if (newResetPassword.length < 8) {
            setErrorMsg('New password must be at least 8 characters long.')
            setPending(false)
            return
          }
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              otpCode: otpCode.trim(),
              challengeToken,
              newPassword: newResetPassword,
            }),
          })
          const data = await res.json()
          if (!res.ok || data?.error) {
            setErrorMsg(data?.error || 'Invalid or expired recovery code.')
            return
          }
          if (onAuthSuccess) {
            onAuthSuccess(data)
            return
          }
          window.location.href = resolveRedirectAfterAuth(data?.redirectTo || '/')
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unexpected error during password reset.')
      } finally {
        setPending(false)
      }
    }
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      <div
        className={cn(
          'transition-all',
          embedded
            ? 'bg-transparent p-0'
            : 'bg-white/95 dark:bg-[#020817]/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-200/60 dark:shadow-none p-6 sm:p-10'
        )}
      >
        {/* Top Mode Tabs when embedded or when switching between Register / Sign In */}
        {embedded ? (
          <div
            className={cn(
              'grid gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 mb-5',
              allowGuestQuickAccess ? 'grid-cols-3' : 'grid-cols-2'
            )}
          >
            {allowGuestQuickAccess && (
              <button
                type="button"
                onClick={() => switchToMode('guest')}
                className={cn(
                  'py-2 px-2.5 rounded-lg text-xs font-bold transition-all',
                  mode === 'guest'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Quick Access
              </button>
            )}
            <button
              type="button"
              onClick={() => switchToMode('register')}
              className={cn(
                'py-2 px-2.5 rounded-lg text-xs font-bold transition-all',
                mode === 'register'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => switchToMode('login')}
              className={cn(
                'py-2 px-2.5 rounded-lg text-xs font-bold transition-all',
                mode === 'login' || mode === 'reset'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {mode === 'register'
                ? 'New Client Registration'
                : mode === 'login'
                  ? 'Client Portal Sign In'
                  : 'Account Password Recovery'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {mode === 'register'
                ? 'Create your account'
                : mode === 'login'
                  ? 'Welcome back'
                  : 'Reset your password'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {mode === 'register'
                ? 'Choose your account tier to configure personalized chauffeur booking and invoicing privileges.'
                : mode === 'login'
                  ? 'Sign in with your registered email and password to access your quotations and bookings.'
                  : 'Verify your email with a 6-digit security code to set a new password immediately.'}
            </p>
          </div>
        )}

        {/* Segmented Account Tier Selector (Create Account Mode) */}
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-2.5 mb-5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAccountType('individual')}
              className={cn(
                'flex flex-col items-start p-3 rounded-xl transition-all text-left relative cursor-pointer',
                accountType === 'individual'
                  ? 'bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/40'
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                    accountType === 'individual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-sm">Individual</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Personal & VIP Travel
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('entity')}
              className={cn(
                'flex flex-col items-start p-3 rounded-xl transition-all text-left relative cursor-pointer',
                accountType === 'entity'
                  ? 'bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/40'
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                    accountType === 'entity'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-sm">Corporate / B2B</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Company Invoicing
              </span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* REGISTER FIELDS */}
          {mode === 'register' && (
            <>
              {accountType === 'entity' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label
                    htmlFor="central-entityName"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    Registered Entity / Company Name
                  </label>
                  <Input
                    id="central-entityName"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="e.g. Acme Global Logistics LLC"
                    required
                    className="h-11 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl pl-3.5"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="central-firstName"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    First Name
                  </label>
                  <Input
                    id="central-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                    autoComplete="given-name"
                    className="h-11 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl pl-3.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="central-lastName"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                  >
                    Last Name
                  </label>
                  <Input
                    id="central-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                    autoComplete="family-name"
                    className="h-11 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl pl-3.5"
                  />
                </div>
              </div>

              {/* SuperAdmin-Governed Country Dial Code + Formatted Local Mobile Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="central-phone-local"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    Mobile Phone Number
                  </label>
                  <span className="text-[10.5px] font-mono font-semibold text-slate-400 dark:text-slate-500">
                    {activeCountryRule.dialCode} • {activeCountryRule.phoneFormatMask}
                  </span>
                </div>

                <div className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shadow-xs transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 overflow-hidden">
                  <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Select country area code"
                        className="flex h-full items-center gap-1.5 px-3 border-r border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        <span className="text-base leading-none">{activeCountryRule.flag}</span>
                        <span className="font-mono text-xs sm:text-sm font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                          {activeCountryRule.dialCode}
                        </span>
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[310px] p-0 z-[10002]" align="start">
                      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                        <input
                          autoFocus
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Search country or +code..."
                          className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
                        />
                      </div>
                      <div className="max-h-[280px] overflow-y-auto p-1">
                        {filteredCountries.length === 0 ? (
                          <div className="py-5 text-center text-xs text-slate-400">
                            No matching country found.
                          </div>
                        ) : (
                          <>
                            {activeMarkets.length > 0 && (
                              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                Active Operating Markets
                              </div>
                            )}
                            {activeMarkets.map((c) => (
                              <button
                                key={`active-${c.code}`}
                                type="button"
                                onClick={() => {
                                  userManuallyPickedCountry.current = true
                                  setSelectedCountryCode(c.code)
                                  setCountryPickerOpen(false)
                                  setCountrySearch('')
                                }}
                                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    'h-3.5 w-3.5 text-blue-600 shrink-0',
                                    activeCountryRule.code === c.code ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <span className="text-base leading-none">{c.flag}</span>
                                <span className="flex-1 truncate font-medium">{c.name}</span>
                                <span className="font-mono text-xs font-bold text-slate-500">
                                  {c.dialCode}
                                </span>
                              </button>
                            ))}

                            {otherMarkets.length > 0 && (
                              <div className="px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-1">
                                International
                              </div>
                            )}
                            {otherMarkets.map((c) => (
                              <button
                                key={`intl-${c.code}`}
                                type="button"
                                onClick={() => {
                                  userManuallyPickedCountry.current = true
                                  setSelectedCountryCode(c.code)
                                  setCountryPickerOpen(false)
                                  setCountrySearch('')
                                }}
                                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    'h-3.5 w-3.5 text-blue-600 shrink-0',
                                    activeCountryRule.code === c.code ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <span className="text-base leading-none">{c.flag}</span>
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className="font-mono text-xs text-slate-500">
                                  {c.dialCode}
                                </span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <input
                    id="central-phone-local"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={activeCountryRule.phonePlaceholder}
                    value={formattedLocalPhone}
                    onChange={(e) => handleLocalPhoneChange(e.target.value)}
                    required
                    className="flex-1 h-full bg-transparent px-3.5 text-sm font-semibold tracking-wide text-slate-900 dark:text-white outline-none placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </>
          )}

          {/* EMAIL FIELD (All Modes) */}
          <div className="space-y-1.5">
            <label
              htmlFor="central-email"
              className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-blue-500" />
              Email Address
            </label>
            <Input
              id="central-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (isEmailAlreadyRegistered) {
                  setIsEmailAlreadyRegistered(false)
                  setErrorMsg(null)
                }
              }}
              placeholder="name@example.com"
              required
              disabled={mode === 'reset' && resetStep === 'verify'}
              autoComplete="email"
              className="h-11 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl pl-3.5"
            />
          </div>

          {/* PASSWORD FIELD (Register & Login Modes) */}
          {(mode === 'register' || mode === 'login') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="central-password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleTriggerDirectResetCode}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="central-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="h-11 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {mode === 'register' && password.length > 0 && (
                <div className="pt-1 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-400">Password Strength</span>
                    <span className={pwdStrength.textColor}>{pwdStrength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        pwdStrength.score >= 1 ? pwdStrength.color : 'bg-transparent'
                      )}
                    />
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        pwdStrength.score >= 2 ? pwdStrength.color : 'bg-transparent'
                      )}
                    />
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        pwdStrength.score >= 3 ? pwdStrength.color : 'bg-transparent'
                      )}
                    />
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        pwdStrength.score >= 4 ? pwdStrength.color : 'bg-transparent'
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSWORD RESET STEP 2: 6-DIGIT CODE + NEW PASSWORD */}
          {mode === 'reset' && resetStep === 'verify' && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="central-otp"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                    6-Digit Security Code
                  </label>
                  <button
                    type="button"
                    onClick={handleTriggerDirectResetCode}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
                <Input
                  id="central-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="h-11 text-center font-mono text-lg font-extrabold tracking-[0.35em] bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="central-new-password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="central-new-password"
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    required
                    className="h-11 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {newResetPassword.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5">
                    <span className="text-slate-400">Strength</span>
                    <span className={resetPwdStrength.textColor}>{resetPwdStrength.label}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUCCESS BANNER */}
          {successBanner && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* SMART DUPLICATE-EMAIL RECOVERY BANNER (Sign In or Reset Password Right From This Screen!) */}
          {isEmailAlreadyRegistered ? (
            <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 border border-amber-300/80 dark:border-amber-800/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                    An account is already registered for{' '}
                    <span className="underline">{email.trim()}</span>
                  </p>
                  <p className="text-[11.5px] text-amber-800/90 dark:text-amber-300/80 leading-snug">
                    Sign in directly with your existing password, or reset your password right from
                    this screen:
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => switchToMode('login')}
                  className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In Now
                </button>
                <button
                  type="button"
                  onClick={handleTriggerDirectResetCode}
                  disabled={pending}
                  className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-100/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-amber-300 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Reset Password
                </button>
              </div>
            </div>
          ) : (
            errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>{errorMsg}</span>
                </div>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleTriggerDirectResetCode}
                    className="shrink-0 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Reset?
                  </button>
                )}
              </div>
            )
          )}

          {/* PRIMARY SUBMIT BUTTON */}
          <Button
            type="submit"
            disabled={pending}
            className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 cursor-pointer"
          >
            {pending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'register'
                  ? 'Creating your account...'
                  : mode === 'login'
                    ? 'Signing you in...'
                    : mode === 'reset'
                      ? resetStep === 'request'
                        ? 'Sending 6-digit code...'
                        : 'Updating password...'
                      : 'Continuing...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {mode === 'register'
                  ? 'Create Client Account'
                  : mode === 'login'
                    ? 'Sign In to Client Portal'
                    : mode === 'reset'
                      ? resetStep === 'request'
                        ? 'Send 6-Digit Reset Code'
                        : 'Verify Code & Set New Password'
                      : 'Continue with Email'}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          {/* FOOTER MODE NAVIGATION */}
          <div className="pt-1.5 text-center space-y-1.5">
            {mode === 'register' && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchToMode('login')}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 cursor-pointer"
                >
                  Sign In
                </button>
                {' • '}
                <button
                  type="button"
                  onClick={() => switchToMode('reset')}
                  className="font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:underline underline-offset-4 cursor-pointer"
                >
                  Reset Password
                </button>
              </p>
            )}

            {mode === 'login' && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                New to TransHola?{' '}
                {embedded ? (
                  <button
                    type="button"
                    onClick={() => switchToMode('register')}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 cursor-pointer"
                  >
                    Create Client Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchToMode('register')}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 cursor-pointer"
                  >
                    Create Client Account
                  </button>
                )}
              </p>
            )}

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchToMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            )}
          </div>

          {!embedded && (
            <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-Bit SSL Encrypted • GDPR Compliant & Secure</span>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
