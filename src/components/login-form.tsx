'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login } from "@/app/actions/auth"
import { useActionState, useState } from "react"
import Link from "next/link"
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff, Fingerprint } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { loginSchema, type LoginFormData } from '@transhola/ui'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [biometricError, setBiometricError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

  const {
      register,
      handleSubmit,
      setValue,
      watch,
      formState: { errors }
  } = useForm<LoginFormData>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
          email: "",
          password: "",
          rememberMe: true
      }
  })

  const rememberMe = watch("rememberMe")

  useEffect(() => {
      const stored = localStorage.getItem("cw_remembered_email")
      if (stored) {
          setValue("email", stored)
          setValue("rememberMe", true)
      }
  }, [setValue])

  const onSubmit = async (data: LoginFormData) => {
      setLoading(true)
      setAuthError(null)

      if (data.rememberMe) {
          localStorage.setItem("cw_remembered_email", data.email)
      } else {
          localStorage.removeItem("cw_remembered_email")
      }

      const formData = new FormData()
      formData.append("email", data.email)
      formData.append("password", data.password)

      try {
          const result = await login(formData)
          if (result?.error) {
              setAuthError(result.error)
          } else if (result?.success) {
              router.push(`/verify?email=${encodeURIComponent(result.email)}`)
          }
      } catch (err: any) {
          console.error(err)
          setAuthError(err.message || "An unexpected error occurred.")
      } finally {
          setLoading(false)
      }
  }

  const handleBiometricLogin = async () => {
      setBiometricLoading(true)
      setBiometricError(null)
      try {
          const supabase = createClient()
          // @ts-ignore - passkey API is experimental
          const { error } = await supabase.auth.passkey.authenticate()
          if (error) throw error
          
          router.push("/dashboard")
          router.refresh()
      } catch (err: any) {
          setBiometricError(err.message || "Biometric credential not found on this device. Please log in with password first to enroll.")
      } finally {
          setBiometricLoading(false)
      }
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to book and manage your premium rides.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
        {(authError || biometricError) && (
            <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-sm text-red-600 dark:text-red-400 font-medium animate-in fade-in slide-in-from-top-2">
                <ShieldCheck size={16} className="text-red-500 dark:text-red-400 shrink-0" />
                <span>{authError || biometricError}</span>
            </div>
        )}

        <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
            <div className="relative flex items-center">
                <Mail size={18} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    {...register("email")}
                    className={`w-full bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-slate-200 text-sm rounded-xl py-3 pl-10 pr-4 outline-none transition-all focus:ring-4 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm dark:shadow-none ${
                        errors.email ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-blue-500/10 dark:focus:border-blue-500/50"
                    }`}
                    autoComplete="email"
                />
            </div>
            {errors.email && (
                <p className="text-red-500 dark:text-red-400 text-xs ml-1 font-medium">{errors.email.message}</p>
            )}
        </div>

        <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <Link href="/reset-password" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
                    Forgot password?
                </Link>
            </div>
            <div className="relative flex items-center">
                <Lock size={18} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    {...register("password")}
                    className={`w-full bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-slate-200 text-sm rounded-xl py-3 pl-10 pr-10 outline-none transition-all focus:ring-4 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm dark:shadow-none ${
                        errors.password ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-blue-500/10 dark:focus:border-blue-500/50"
                    }`}
                    autoComplete="current-password"
                />
                <button
                    type="button"
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {errors.password && (
                <p className="text-red-500 dark:text-red-400 text-xs ml-1 font-medium">{errors.password.message}</p>
            )}
        </div>

        <div className="flex items-center space-x-2 pt-1 pb-1 ml-1">
            <input
                type="checkbox"
                id="rememberMe"
                {...register("rememberMe")}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-blue-600 focus:ring-blue-500/50"
            />
            <label
                htmlFor="rememberMe"
                className="text-sm font-medium text-slate-600 dark:text-slate-400 select-none cursor-pointer"
            >
                Remember me on this device
            </label>
        </div>

        <button
            type="submit"
            disabled={loading || biometricLoading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
        >
            {loading ? (
                <>
                    <Loader2 size={18} className="animate-spin" />
                    Authenticating...
                </>
            ) : (
                <>
                    Sign In
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
            )}
        </button>
        
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-[#020817] text-slate-500">Or continue with</span>
            </div>
        </div>
        
        <button
            type="button"
            disabled
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
        </button>

        <button
            type="button"
            disabled={loading || biometricLoading}
            onClick={handleBiometricLogin}
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
        >
            <Fingerprint size={18} className="text-blue-600 dark:text-blue-400" />
            {biometricLoading ? "Waiting for Biometrics..." : "Passkey / Biometrics"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
                  Sign up
              </Link>
          </p>
      </div>
    </div>
  )
}
