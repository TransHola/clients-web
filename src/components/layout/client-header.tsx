"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  Bell,
  User,
  ChevronDown,
  Building2,
  FileText,
  CalendarCheck,
  CreditCard,
  Headphones,
  PlusCircle,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function decodeJwtPayloadBrowser(token: string): any | null {
  try {
    if (!token || token.includes("OY2hIsG9vbIZRg1bLu3fAYy")) return null
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "===".slice((b64.length + 3) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const parsed = JSON.parse(new TextDecoder().decode(bytes))
    if (!parsed?.sub || !parsed?.email || parsed?.role === "anon") return null
    if (typeof parsed.exp === "number" && parsed.exp * 1000 < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

function readInitialBrowserSession(): { user: any; profile: any } | null {
  if (typeof document === "undefined") return null
  try {
    const rawCookies = document.cookie.split(";")
    let cwToken = ""
    for (const entry of rawCookies) {
      const trimmed = entry.trim()
      if (trimmed.startsWith("cw_client_session=")) {
        const val = decodeURIComponent(trimmed.slice("cw_client_session=".length))
        if (val && !val.includes("OY2hIsG9vbIZRg1bLu3fAYy")) {
          cwToken = val
          break
        }
      }
    }

    if (!cwToken) return null
    const claims = decodeJwtPayloadBrowser(cwToken)
    if (!claims) return null

    const meta = claims.user_metadata || {}
    const user = {
      id: claims.sub,
      email: claims.email,
      user_metadata: meta,
    }
    const profile = {
      id: claims.sub,
      email: claims.email,
      full_name:
        meta.full_name ||
        [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim() ||
        claims.email.split("@")[0],
      first_name: meta.first_name || "",
      last_name: meta.last_name || "",
      role: meta.role || "client",
      preferences: {
        clientType: meta.client_type || (meta.company_name ? "Corporate" : "Individual"),
        companyName: meta.company_name || null,
      },
    }
    return { user, profile }
  } catch {
    return null
  }
}

const PORTAL_NAV_LINKS = [
  { href: "/", label: "Book Service", icon: PlusCircle },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/bookings", label: "My Bookings", icon: CalendarCheck },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/support", label: "Support", icon: Headphones },
]

export function ClientHeader() {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = React.useState<any>(() => readInitialBrowserSession()?.user ?? null)
  const [profile, setProfile] = React.useState<any>(() => readInitialBrowserSession()?.profile ?? null)
  const [authChecked, setAuthChecked] = React.useState<boolean>(() => Boolean(readInitialBrowserSession()?.user))

  React.useEffect(() => {
    const initial = readInitialBrowserSession()
    if (initial?.user) {
      setUser(initial.user)
      setProfile((prev: any) => prev || initial.profile)
      setAuthChecked(true)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2800)

    fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user)
          if (data.profile) setProfile(data.profile)
        } else if (data && data.authenticated === false) {
          setUser(null)
          setProfile(null)
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer)
        setAuthChecked(true)
      })

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [pathname])

  const displayName = React.useMemo(() => {
    const company = profile?.preferences?.companyName || user?.user_metadata?.company_name
    const full = profile?.full_name || user?.user_metadata?.full_name
    const firstLast = [
      profile?.first_name || user?.user_metadata?.first_name,
      profile?.last_name || user?.user_metadata?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim()
    const emailFallback = (profile?.email || user?.email || "").split("@")[0]
    return (company || full || firstLast || emailFallback || "Client Account").trim()
  }, [profile, user])

  const displayEmail = profile?.email || user?.email || ""
  const clientType =
    profile?.preferences?.clientType ||
    user?.user_metadata?.client_type ||
    (profile?.preferences?.companyName ? "Corporate" : "Individual")

  const avatarInitials = React.useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    return (displayEmail[0] || "C").toUpperCase()
  }, [displayName, displayEmail])

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("transhola_auth_user")
    } catch {}
    window.location.href = "/api/auth/logout?redirect=/login"
  }

  return (
    <header className="sticky top-0 z-[1000] w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex w-full h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 lg:gap-7">
          <Link href="/" className="flex items-center shrink-0">
            <div className="w-[42px] h-[42px] flex items-center justify-center shrink-0 -mr-1 -translate-y-0.5">
              <img
                src="/images/brand/transhola-t-tight-white.png?v=fixed3"
                alt=""
                width={42}
                height={42}
                className="w-full h-full object-contain hidden dark:block"
              />
              <img
                src="/images/brand/transhola-t-tight-black.png?v=fixed3"
                alt=""
                width={42}
                height={42}
                className="w-full h-full object-contain block dark:hidden"
              />
            </div>
            <div className="flex flex-col leading-none hidden sm:flex">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-foreground">
                  ransHola
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Client Portal
                </span>
              </div>
              <span className="text-[8px] font-bold text-muted-foreground leading-tight uppercase tracking-[0.14em] mt-1 -ml-2">
                ONE CLICK TO YOUR ACTIVITY
              </span>
            </div>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold ml-2 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-800">
              {PORTAL_NAV_LINKS.map((link) => {
                const Icon = link.icon
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : link.href === "/bookings"
                      ? pathname?.startsWith("/bookings") || pathname?.startsWith("/trips")
                      : pathname?.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground relative rounded-xl"
                onClick={() => router.push("/bookings")}
                title="Booking & Dispatch Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"></span>
              </Button>

              <div className="h-6 w-px bg-border mx-0.5 hidden sm:block"></div>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-10 px-2.5 py-1.5 items-center gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl outline-none transition-colors cursor-pointer">
                  <Avatar className="h-8 w-8 border border-blue-500/20">
                    <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col items-start hidden sm:flex text-left max-w-[180px]">
                    <span className="text-xs font-bold leading-none text-slate-900 dark:text-slate-100 truncate w-full">
                      {displayName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {clientType}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-0.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-xl border-muted p-1.5">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal px-2.5 py-2">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-bold leading-none text-foreground truncate">
                          {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground leading-none mt-1 truncate">
                          {displayEmail}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 rounded-lg" onClick={() => router.push("/")}>
                      <PlusCircle className="w-4 h-4 text-blue-600" /> Book New Charter
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 rounded-lg" onClick={() => router.push("/quotations")}>
                      <FileText className="w-4 h-4 text-muted-foreground" /> Saved Quotations
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 rounded-lg" onClick={() => router.push("/bookings")}>
                      <CalendarCheck className="w-4 h-4 text-muted-foreground" /> My Bookings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 rounded-lg" onClick={() => router.push("/billing")}>
                      <CreditCard className="w-4 h-4 text-muted-foreground" /> Billing & Invoices
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 rounded-lg" onClick={() => router.push("/profile")}>
                      <Building2 className="w-4 h-4 text-muted-foreground" /> Entity Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 rounded-lg" onClick={() => router.push("/profile")}>
                      <User className="w-4 h-4 text-muted-foreground" /> Personal Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2.5 cursor-pointer py-2 rounded-lg text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : authChecked ? (
            <Link href="/login">
              <Button variant="default" className="font-bold rounded-xl bg-brand-blue hover:bg-blue-700">
                Login
              </Button>
            </Link>
          ) : (
            <div className="h-9 w-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          )}
        </div>
      </div>

      {/* Mobile Authenticated Navigation Bar */}
      {user && (
        <div className="flex md:hidden items-center gap-1 overflow-x-auto px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/80 no-scrollbar">
          {PORTAL_NAV_LINKS.map((link) => {
            const Icon = link.icon
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href === "/bookings"
                  ? pathname?.startsWith("/bookings") || pathname?.startsWith("/trips")
                  : pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
