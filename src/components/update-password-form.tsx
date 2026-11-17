'use client'

import * as React from 'react'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Lock, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

function UpdatePasswordInner({ className }: { className?: string }) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        setErrorMsg(data?.error || 'Unable to update password. Your reset link may have expired.')
        return
      }
      setDone(true)
      setTimeout(() => {
        window.location.href = data?.redirectTo || '/'
      }, 900)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while updating password.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      <div className="bg-white/95 dark:bg-[#020817]/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 sm:p-9 space-y-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Set Your New Password
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {email ? `Updating password for ${email}` : 'Choose a strong password (minimum 8 characters).'}
          </p>
        </div>

        {done ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Password updated! Redirecting you to your Client Portal...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="upd-password"
                className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                New Password
              </label>
              <div className="relative">
                <Input
                  id="upd-password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="h-11 rounded-xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="upd-confirm"
                className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
              >
                Confirm New Password
              </label>
              <Input
                id="upd-confirm"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="h-11 rounded-xl"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{errorMsg}</span>
                <Link href="/reset-password" className="underline font-bold shrink-0">
                  Request new code
                </Link>
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Password...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Save Password & Sign In
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-Bit Encrypted Password Recovery</span>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function UpdatePasswordForm(props: React.ComponentProps<'div'>) {
  return (
    <Suspense fallback={null}>
      <UpdatePasswordInner className={props.className} />
    </Suspense>
  )
}
