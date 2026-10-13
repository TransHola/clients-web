"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, MapPin, User, ChevronDown, Building2, Search, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logout } from "@/app/actions/auth"
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

import { createClient } from "@/lib/supabase/client"

export function ClientHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = React.useState<any>(null)

  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        setProfile(data)
      }
    }
    loadProfile()
  }, [])
  return (
    <header className="sticky top-0 z-[1000] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex w-full h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black border border-white/10 shadow-sm shrink-0">
              <svg viewBox="0 0 100 100" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cw-t-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="30%" stopColor="#F1F5F9" />
                    <stop offset="70%" stopColor="#CBD5E1" />
                    <stop offset="100%" stopColor="#94A3B8" />
                  </linearGradient>
                </defs>
                <path 
                  d="M16 28 C28 23, 50 23, 62 23 C74 23, 85 23.5, 89 26 C92 28, 92 31.5, 87 34.5 C80 39, 70 39.5, 59 39.5 L54 48 L42 79 C39 86.5, 34 87.5, 30 87.5 C26.5 87.5, 25.5 83.5, 27.5 77.5 L38.5 49 L37.5 39.5 L18 39.5 C14.5 39.5, 13 36.5, 14 32.5 C14.5 30, 15.2 28.5, 16 28 Z
                     M22 34 L38.5 34 L46 28.5 C40 28, 28 28.5, 21.5 31 C21 32, 21.5 33.5, 22 34 Z
                     M57 34 C67 34, 76 33.5, 82 31 C83.5 30, 83 28.5, 80 27.5 C74 26.5, 60 27, 52 28 L49.5 34 L57 34 Z
                     M44.5 46.5 L33.5 74.5 C32.5 77.5, 33.5 80.5, 35.5 80.5 C37 80.5, 38.5 78.5, 40.5 73.5 L50 49.5 C48.5 48.5, 46.5 47.5, 44.5 46.5 Z" 
                  fill="url(#cw-t-grad)" 
                  stroke="#94A3B8" 
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight hidden sm:inline-block">TRANSHOLA</span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold ml-6">
              {[
                { href: '/', label: 'Book Service' },
                { href: '/quotations', label: 'Quotations' },
                { href: '/bookings', label: 'My Bookings' },
                { href: '/billing', label: 'Billing' },
                { href: '/support', label: 'Support' },
              ].map((link) => {
                const isActive = link.href === '/'
                  ? pathname === '/'
                  : link.href === '/bookings'
                    ? pathname?.startsWith('/bookings') || pathname?.startsWith('/trips')
                    : pathname?.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors hover:text-foreground ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-rose-500"></span>
              </Button>

              <div className="h-6 w-px bg-border mx-1"></div>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-10 px-2 py-2 items-center gap-2 hover:bg-muted/50 rounded-xl outline-none transition-colors">
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {profile?.first_name?.[0] || profile?.full_name?.[0] || ''}{profile?.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex flex-col items-start hidden sm:flex">
                      <span className="text-sm font-bold leading-none">
                        {profile?.preferences?.companyName || profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                        {profile?.preferences?.clientType || 'Individual'}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-muted">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium leading-none">
                          {profile?.preferences?.companyName || profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`}
                        </span>
                        <span className="text-xs text-muted-foreground leading-none mt-1">{profile?.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer py-2" onClick={() => router.push('/profile')}>
                      <Building2 className="w-4 h-4 text-muted-foreground" /> Entity Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer py-2" onClick={() => router.push('/profile')}>
                      <User className="w-4 h-4 text-muted-foreground" /> Personal Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="gap-2 cursor-pointer py-2 text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                    onClick={async () => {
                      await logout();
                    }}
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login">
              <Button variant="default" className="font-bold rounded-xl bg-brand-blue hover:bg-blue-700">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
