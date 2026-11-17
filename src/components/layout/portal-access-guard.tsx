'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  checkRoutePermission,
  resolveEffectivePortalAccess,
  type EffectivePortalAccess,
} from '@/lib/corporate-rbac'

export function PortalAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const [access, setAccess] = React.useState<EffectivePortalAccess | null>(null)

  React.useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)

    fetch('/api/auth/me', {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.authenticated) return
        setAccess(resolveEffectivePortalAccess(data.profile, data.user))
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer))

    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [pathname])

  if (access) {
    const check = checkRoutePermission(pathname, access)
    if (!check.allowed) {
      return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-slate-50/60 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Lock className="w-3 h-3" />
                Role: {access.roleLabel}
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Module Restricted by Access Policy
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Your corporate administrator has limited access to{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {check.requiredPermission?.label || 'this section'}
                </strong>{' '}
                for your role. Contact your Account Owner if you need elevated permissions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                onClick={() => router.push(check.fallbackHref)}
                className="flex-1 h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Go to Permitted Workspace
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/profile')}
                className="h-11 rounded-xl font-bold cursor-pointer"
              >
                My Profile
              </Button>
            </div>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}

