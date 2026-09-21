'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { register } from "@/app/actions/auth"
import { useActionState, useState, useEffect } from "react"
import Link from "next/link"
import { PhoneInput, type Country } from "@transhola/ui"
import { 
  Building2, 
  User, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  Phone
} from "lucide-react"

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, action, pending] = useActionState(async (prevState: any, formData: FormData) => {
    return await register(formData)
  }, null)

  const [accountType, setAccountType] = useState<"individual" | "entity">("individual")
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState<string>("")
  const [defaultCountry, setDefaultCountry] = useState<Country>("US")

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        if (data && data.country_code) {
          setDefaultCountry(data.country_code as Country)
        }
      })
      .catch(console.error)
  }, [])

  // Calculate dynamic password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "bg-slate-200 dark:bg-slate-800", textColor: "text-slate-400" }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", textColor: "text-rose-500" }
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", textColor: "text-amber-500" }
    if (score === 3) return { score: 3, label: "Good", color: "bg-blue-500", textColor: "text-blue-500" }
    return { score: 4, label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-500" }
  }

  const pwdStrength = getPasswordStrength(password)

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="bg-white/95 dark:bg-[#020817]/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-200/60 dark:shadow-none p-6 sm:p-10 transition-all">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            New Client Registration
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Create your account
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Choose your account tier to configure personalized chauffeur booking and invoicing privileges.
          </p>
        </div>

        {/* Segmented Account Type Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAccountType("individual")}
            className={cn(
              "flex flex-col items-start p-3.5 rounded-xl transition-all text-left relative",
              accountType === "individual"
                ? "bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-900/5 dark:ring-white/10"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/40"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                accountType === "individual"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              )}>
                <User className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm">Individual</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Personal & VIP Travel</span>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("entity")}
            className={cn(
              "flex flex-col items-start p-3.5 rounded-xl transition-all text-left relative",
              accountType === "entity"
                ? "bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-900/5 dark:ring-white/10"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/40"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                accountType === "entity"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              )}>
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm">Corporate / B2B</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Company Invoicing</span>
          </button>
        </div>

        {/* Registration Form */}
        <form action={action} className="space-y-4">
          <input type="hidden" name="isCompany" value={accountType === 'entity' ? 'true' : 'false'} />

          {/* Conditional Corporate Entity Field */}
          {accountType === 'entity' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
              <label htmlFor="entityName" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                Registered Entity / Company Name
              </label>
              <div className="relative">
                <Input
                  id="entityName"
                  name="entityName"
                  placeholder="e.g. Acme Global Logistics LLC"
                  required={accountType === 'entity'}
                  className="h-12 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pl-4"
                />
              </div>
            </div>
          )}

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                First Name
              </label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="John"
                required
                className="h-12 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pl-4"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Last Name
              </label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                required
                className="h-12 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pl-4"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              Mobile Phone Number
            </label>
            <input type="hidden" name="phone" value={phone} />
            <PhoneInput
              id="phone"
              placeholder="Enter mobile phone number"
              defaultCountry={defaultCountry}
              value={phone}
              onChange={setPhone as any}
              required
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-500" />
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="h-12 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pl-4"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-sm bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pl-4 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Live Password Strength Meter */}
            {password.length > 0 && (
              <div className="pt-1.5 space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-slate-400">Password Strength</span>
                  <span className={pwdStrength.textColor}>{pwdStrength.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-300", pwdStrength.score >= 1 ? pwdStrength.color : "bg-transparent")} />
                  <div className={cn("h-full transition-all duration-300", pwdStrength.score >= 2 ? pwdStrength.color : "bg-transparent")} />
                  <div className={cn("h-full transition-all duration-300", pwdStrength.score >= 3 ? pwdStrength.color : "bg-transparent")} />
                  <div className={cn("h-full transition-all duration-300", pwdStrength.score >= 4 ? pwdStrength.color : "bg-transparent")} />
                </div>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {state?.error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {state.error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={pending}
            className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {pending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating your account...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Create Client Account
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          {/* Footer Navigation */}
          <div className="pt-2 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>

          {/* Trust Badge */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit SSL Encrypted • GDPR Compliant & Secure</span>
          </div>
        </form>
      </div>
    </div>
  )
}
