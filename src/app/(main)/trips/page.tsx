"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Car, MapPin, Clock, Phone, Star, CalendarDays, XCircle, CheckCircle2,
  Loader2, RotateCcw, FileDown, LayoutGrid, List, AlertTriangle,
  ChevronLeft, ChevronRight, MoreHorizontal, FileText, Edit, Trash2,
  Search, ExternalLink, ShieldCheck, User
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Booking = {
  id: string
  ref: string
  vehicle: string
  driver?: { name: string; phone: string; rating: number; plate: string }
  operator?: { name: string; phone: string }
  from: string
  to: string
  date: string
  time: string
  price: string
  rawPrice: number
  status: "upcoming" | "in_progress" | "completed" | "cancelled"
  scheduleState?: { label: string; color: string }
  cancellationReason?: string
  refundStatus?: string
  rawDetails?: any
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  upcoming: { label: "Upcoming", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CalendarDays },
  in_progress: { label: "In Progress", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Loader2 },
  completed: { label: "Completed", color: "bg-slate-100 text-slate-600 border-slate-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-rose-100 text-rose-600 border-rose-200", icon: XCircle },
}

function formatPrice(amount: number | string | undefined, currency?: string): string {
  const num = Number(amount) || 0
  const curr = (currency || 'EUR').toUpperCase()
  const sym = curr === 'EUR' ? '€' : curr === 'USD' ? '$' : curr === 'GBP' ? '£' : `${curr} `
  return `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export default function TripsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list")
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentUser, setCurrentUser] = React.useState<any>(null)
  const [guestLookupRef, setGuestLookupRef] = React.useState("")
  const [isLookingUp, setIsLookingUp] = React.useState(false)

  const confirmCancellation = async () => {
    if (!cancellingId) return
    setIsCancelling(true)
    try {
      const supabase = createClient()
      const { data: statusData } = await supabase.from('booking_statuses').select('id').eq('code', 'cancelled').maybeSingle()
      if (statusData) {
        const { error } = await supabase.from('bookings').update({ status_id: statusData.id }).eq('id', cancellingId)
        if (error) throw error
      }
      setBookings(prev => prev.map(b => b.id === cancellingId ? { ...b, status: 'cancelled', cancellationReason: 'Cancelled by user' } : b))
      setCancellingId(null)
    } catch (e) {
      console.error("Cancellation failed", e)
    } finally {
      setIsCancelling(false)
    }
  }

  const loadBookings = React.useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch session or user
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user || (await supabase.auth.getUser()).data.user
      setCurrentUser(user || null)

      // Get status maps
      const { data: statusesData } = await supabase.from('booking_statuses').select('id, code')
      const quotationId = statusesData?.find(s => s.code === 'quotation')?.id
      const statusMap = Object.fromEntries(statusesData?.map(s => [s.id, s.code]) || [])

      let query = supabase
        .from('bookings')
        .select('*, operator:assigned_operator_id(company_name, phone_number)')
        .order('created_at', { ascending: false })

      if (user) {
        query = query.or(`user_id.eq.${user.id},customer_id.eq.${user.id}`)
      } else {
        // If guest, check localStorage for recent booking refs
        const savedRefsStr = typeof window !== 'undefined' ? localStorage.getItem('transhola_recent_booking_refs') : null
        const savedRefs = savedRefsStr ? JSON.parse(savedRefsStr) : []
        if (savedRefs.length > 0) {
          query = query.in('booking_ref', savedRefs)
        } else {
          setBookings([])
          setLoading(false)
          return
        }
      }

      if (quotationId) {
        query = query.neq('status_id', quotationId)
      }

      const { data, error } = await query
      if (error) throw error

      if (data) {
        const now = Date.now()
        const mapped: Booking[] = data.map((b: any) => {
          const rawStatusCode = statusMap[b.status_id] || b.status || 'pending'
          const details = b.booking_details || {}

          // Trip dates and times
          const tripDateStr = details.startDate || details.date || details.pickupDate ||
            (details.multiDayStore ? details.multiDayStore[0]?.dateStr : null) ||
            b.pickup_date || b.start_date
          const tripTimeStr = details.startTime || details.time || details.pickupTime ||
            (details.multiDayStore ? details.multiDayStore[0]?.startTime : null) || ""

          let start = now
          if (tripDateStr) {
            const dateTimeStr = tripTimeStr ? `${tripDateStr}T${tripTimeStr}:00` : tripDateStr
            const parsed = new Date(dateTimeStr).getTime()
            if (!isNaN(parsed)) start = parsed
          } else if (b.pickup_date) {
            const parsed = new Date(b.pickup_date).getTime()
            if (!isNaN(parsed)) start = parsed
          }

          // Compute status without auto-completing active trips
          let computedStatus: "upcoming" | "in_progress" | "completed" | "cancelled" = "upcoming"
          if (b.cancelled_at || rawStatusCode === "cancelled") {
            computedStatus = "cancelled"
          } else if (b.completed_at || rawStatusCode === "completed") {
            computedStatus = "completed"
          } else if (rawStatusCode === "in_progress" || rawStatusCode === "en_route" || b.started_at) {
            computedStatus = "in_progress"
          } else {
            // Keep pending, confirmed, assigned in upcoming
            computedStatus = "upcoming"
          }

          // Schedule State Badge
          let scheduleState: { label: string; color: string } | undefined = undefined
          if (computedStatus === "upcoming") {
            if (now > start) {
              scheduleState = { label: "Scheduled Today", color: "bg-blue-50 text-blue-700 border-blue-200" }
            } else {
              scheduleState = { label: "On Schedule", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
            }
          } else if (computedStatus === "in_progress") {
            scheduleState = { label: "In Progress", color: "bg-indigo-50 text-indigo-700 border-indigo-200" }
          }

          let displayDate = "Date pending"
          if (tripDateStr) {
            try {
              displayDate = new Date(tripDateStr).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
              })
            } catch {
              displayDate = String(tripDateStr)
            }
          }

          const currency = b.currency || details.currency || "EUR"
          const rawPrice = b.price || b.total_amount || b.total_price || details.option?.price || 0
          const priceFormatted = formatPrice(rawPrice, currency)

          const fromAddress = details.pickup?.address || details.pickupLoc?.address || details.pickupLoc?.name ||
            b.pickup_location || b.pickup_address || "Pickup Location"
          const toAddress = details.dropoff?.address || details.dropoffLoc?.address || details.dropoffLoc?.name ||
            b.dropoff_location || b.dropoff_address || "Dropoff Location"

          return {
            id: b.id,
            ref: b.booking_ref || b.booking_reference || `BK-${b.id.substring(0, 8).toUpperCase()}`,
            vehicle: b.requested_vehicle_class || details.option?.name || b.vehicle_type || "Executive Vehicle",
            from: fromAddress,
            to: toAddress,
            date: displayDate,
            time: tripTimeStr || "Scheduled",
            price: priceFormatted,
            rawPrice,
            status: computedStatus,
            scheduleState,
            driver: b.driver ? {
              name: `${b.driver.first_name} ${b.driver.last_name}`,
              phone: b.driver.phone || "N/A",
              rating: 4.9,
              plate: b.driver.license_class || "CDL",
            } : undefined,
            operator: b.operator ? {
              name: b.operator.company_name || "Licensed Transport Partner",
              phone: b.operator.phone_number || "Contact Support",
            } : undefined,
            cancellationReason: b.status === "cancelled" || b.cancelled_at ? "Cancelled by user" : undefined,
            rawDetails: b.booking_details
          }
        })
        setBookings(mapped)
      }
    } catch (err: any) {
      console.error("Failed to load client bookings:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadBookings()

    const supabase = createClient()
    const channel = supabase
      .channel('client_bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadBookings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadBookings])

  const handleLookupBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestLookupRef.trim()) return
    setIsLookingUp(true)
    try {
      const supabase = createClient()
      const ref = guestLookupRef.trim().toUpperCase()
      const { data, error } = await supabase
        .from('bookings')
        .select('*, operator:assigned_operator_id(company_name, phone_number)')
        .eq('booking_ref', ref)
        .maybeSingle()

      if (data) {
        // Save to recent refs in localStorage
        const savedRefsStr = localStorage.getItem('transhola_recent_booking_refs')
        const savedRefs: string[] = savedRefsStr ? JSON.parse(savedRefsStr) : []
        if (!savedRefs.includes(ref)) {
          savedRefs.unshift(ref)
          localStorage.setItem('transhola_recent_booking_refs', JSON.stringify(savedRefs.slice(0, 10)))
        }
        loadBookings()
      } else {
        alert(`No booking found with reference "${ref}". Please verify the code.`)
      }
    } catch (err) {
      console.error("Lookup error:", err)
    } finally {
      setIsLookingUp(false)
    }
  }

  const tabs = ["all", "upcoming", "in_progress", "completed", "cancelled"] as const

  const filteredBookings = React.useMemo(() => {
    if (!searchQuery.trim()) return bookings
    const q = searchQuery.toLowerCase()
    return bookings.filter(b =>
      b.ref.toLowerCase().includes(q) ||
      b.from.toLowerCase().includes(q) ||
      b.to.toLowerCase().includes(q) ||
      b.vehicle.toLowerCase().includes(q)
    )
  }, [bookings, searchQuery])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Track your reservations, routes, and travel chauffeurs.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference or city..."
              className="pl-9 h-9 text-xs rounded-xl bg-muted/40 border-slate-200"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-slate-200 shrink-0">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 px-0 rounded-lg shadow-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 px-0 rounded-lg shadow-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Unauthenticated Alert Banner */}
      {!currentUser && !loading && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-950">You are browsing as Guest</p>
              <p className="text-xs text-blue-700">Sign in to view your complete booking history, or enter a reference code below.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <form onSubmit={handleLookupBooking} className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                value={guestLookupRef}
                onChange={(e) => setGuestLookupRef(e.target.value)}
                placeholder="TRN-XXXXXX"
                className="h-8 text-xs font-mono uppercase w-36 rounded-lg bg-white border-blue-200"
              />
              <Button type="submit" size="sm" disabled={isLookingUp} className="h-8 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                {isLookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : "Look Up"}
              </Button>
            </form>
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/login'} className="h-8 text-xs font-bold rounded-lg bg-white">
              Sign In
            </Button>
          </div>
        </div>
      )}

      {/* Tabs Filter */}
      <Tabs defaultValue="all" className="flex-col">
        <TabsList className="w-full bg-muted/50 rounded-xl h-11 p-1 mb-6 flex overflow-x-auto">
          {tabs.map((t) => {
            const count = t === "all" ? filteredBookings.length : filteredBookings.filter((b) => b.status === t).length
            return (
              <TabsTrigger
                key={t}
                value={t}
                className="flex-1 min-w-[100px] rounded-lg text-xs font-bold capitalize data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {t === "all" ? "All Bookings" : t.replace("_", " ")}
                {count > 0 && (
                  <span className="ml-1.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.2 text-[10px] font-mono">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {tabs.map((t) => {
          const list = t === "all" ? filteredBookings : filteredBookings.filter((b) => b.status === t)
          return (
            <TabsContent key={t} value={t}>
              <BookingList
                bookings={list}
                viewMode={viewMode}
                loading={loading}
                onCancelClick={(id) => setCancellingId(id)}
              />
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Cancellation Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 border-4 border-rose-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-2">Cancel Booking</h3>
            <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
              Are you sure you want to cancel this booking? This action cannot be undone and cancellation fees may apply depending on your policy.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 font-bold rounded-xl" onClick={() => setCancellingId(null)} disabled={isCancelling}>
                Go Back
              </Button>
              <Button className="flex-1 font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center" onClick={confirmCancellation} disabled={isCancelling}>
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingList({
  bookings,
  viewMode,
  loading,
  onCancelClick
}: {
  bookings: Booking[]
  viewMode: "grid" | "list"
  loading: boolean
  onCancelClick: (id: string) => void
}) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-semibold">Loading your bookings...</p>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-slate-50/50">
        <Car className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-bold text-foreground">No bookings found in this category</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Need a transfer? Configure and reserve your private chauffeur instantly.
        </p>
        <Button size="sm" onClick={() => router.push('/')} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs">
          Book a Ride
        </Button>
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <BookingListItem key={b.id} b={b} onCancelClick={onCancelClick} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookings.map((b) => {
        const cfg = statusConfig[b.status] || statusConfig.upcoming
        return (
          <div
            key={b.id}
            onClick={() => router.push(`/trips/${b.id}`)}
            className="rounded-2xl border bg-card p-5 flex flex-col gap-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-black text-base">{b.vehicle}</span>
                  {b.rawDetails?.isThirdParty && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 rounded-md border border-amber-200">Agency</span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {b.scheduleState && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.scheduleState.color}`}>
                      {b.scheduleState.label}
                    </span>
                  )}
                </div>
                {b.rawDetails?.isThirdParty && b.rawDetails?.thirdPartyInfo && (
                  <p className="text-[10px] font-medium text-slate-500 truncate mb-1">
                    For: {b.rawDetails.thirdPartyInfo.firstName} {b.rawDetails.thirdPartyInfo.lastName} {b.rawDetails.thirdPartyInfo.company ? `(${b.rawDetails.thirdPartyInfo.company})` : ''}
                  </p>
                )}
                <span className="text-[11px] text-muted-foreground font-mono font-bold tracking-wider">{b.ref}</span>
              </div>
              <p className="font-black text-lg text-slate-900">{b.price}</p>
            </div>

            {/* Route */}
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-medium truncate text-slate-700">{b.from}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                <div className="w-px h-4 bg-slate-300 ml-0.5" />
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {b.date} · {b.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-blue-600 shrink-0" />
                <span className="font-medium truncate text-slate-700">{b.to}</span>
              </div>
            </div>

            {/* Operator Info */}
            {b.operator && (
              <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 border border-primary/10 mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-0.5">Operating Partner</p>
                    <p className="text-xs font-black text-slate-900">{b.operator.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t items-center justify-between mt-auto">
              <Button size="sm" variant="outline" className="rounded-lg text-xs font-bold h-8 flex-1" onClick={(e) => { e.stopPropagation(); router.push(`/trips/${b.id}`); }}>
                View Trip Details
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl font-medium" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/trips/${b.id}`); }}>
                    <FileText className="w-4 h-4 mr-2 text-slate-500" /> View Trip Details
                  </DropdownMenuItem>
                  {b.status === "upcoming" && (
                    <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={(e) => { e.stopPropagation(); onCancelClick(b.id); }}>
                      <Trash2 className="w-4 h-4 mr-2 text-rose-500" /> Cancel Trip
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BookingListItem({ b, onCancelClick }: { b: Booking; onCancelClick: (id: string) => void }) {
  const router = useRouter()
  const [routeDayIdx, setRouteDayIdx] = React.useState(0)
  const cfg = statusConfig[b.status] || statusConfig.upcoming

  const details = b.rawDetails || {}
  const numDays = details.tripType === 'multi-day' && details.multiDayStore ? details.multiDayStore.length : 1
  const isMultiDay = numDays > 1
  const currentDay = isMultiDay ? details.multiDayStore[routeDayIdx] : details
  const currentStops = isMultiDay ? (currentDay?.stops || []) : (details.stops || [])
  const defaultFrom = isMultiDay ? (currentDay?.pickupLoc?.name || currentDay?.pickupLoc?.address || 'Pickup Location') : b.from
  const defaultTo = isMultiDay ? (currentDay?.dropoffLoc?.name || currentDay?.dropoffLoc?.address || 'Dropoff Location') : b.to

  return (
    <div
      onClick={() => router.push(`/trips/${b.id}`)}
      className="rounded-xl border bg-white p-4 sm:px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      {/* Left side: Basic Info */}
      <div className="flex items-center gap-4 w-full xl:w-[320px] shrink-0">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <Car className="w-6 h-6 text-blue-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-black text-base truncate max-w-[150px]">{b.vehicle}</span>
            {b.rawDetails?.isThirdParty && (
              <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 rounded-md border border-amber-200">Agency</span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>
              {cfg.label}
            </span>
            {b.scheduleState && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${b.scheduleState.color}`}>
                {b.scheduleState.label}
              </span>
            )}
          </div>
          {b.rawDetails?.isThirdParty && b.rawDetails?.thirdPartyInfo && (
            <p className="text-[10px] font-medium text-slate-500 truncate mb-1">
              For: {b.rawDetails.thirdPartyInfo.firstName} {b.rawDetails.thirdPartyInfo.lastName} {b.rawDetails.thirdPartyInfo.company ? `(${b.rawDetails.thirdPartyInfo.company})` : ''}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-bold uppercase tracking-wider flex-wrap">
            <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{b.ref}</span>
            <span className="text-slate-300">•</span>
            <span>{b.date}</span>
            {isMultiDay && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600 font-bold">{numDays} Days</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle side: Route Details */}
      <div className="flex-1 w-full min-w-0 flex flex-col justify-center xl:border-l xl:border-r border-slate-100 xl:px-8 shrink-0 relative">
        {isMultiDay && (
          <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-50 w-full max-w-xs mx-auto">
            <button
              disabled={routeDayIdx === 0}
              onClick={(e) => { e.stopPropagation(); setRouteDayIdx(Math.max(0, routeDayIdx - 1)) }}
              className="p-1 hover:bg-slate-100 rounded-md text-slate-400 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Day {routeDayIdx + 1} of {numDays}
            </span>
            <button
              disabled={routeDayIdx === numDays - 1}
              onClick={(e) => { e.stopPropagation(); setRouteDayIdx(Math.min(numDays - 1, routeDayIdx + 1)) }}
              className="p-1 hover:bg-slate-100 rounded-md text-slate-400 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 line-clamp-1">Pickup</p>
            <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight" title={defaultFrom}>{defaultFrom}</p>
          </div>

          <div className="flex flex-col items-center justify-center px-1 shrink-0">
            <ChevronRight className="w-5 h-5 text-slate-300" />
            {currentStops.length > 0 && (
              <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">
                {currentStops.length} stop{currentStops.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1 line-clamp-1">Dropoff</p>
            <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight" title={defaultTo}>{defaultTo}</p>
          </div>
        </div>
      </div>

      {/* Right side: Price & Actions */}
      <div className="flex flex-row xl:flex-col items-center xl:items-end justify-between w-full xl:w-[160px] shrink-0 gap-3 pt-2 xl:pt-0">
        <p className="font-black text-lg text-slate-900">{b.price}</p>

        <div className="flex items-center gap-2 w-full xl:w-auto mt-auto justify-end">
          <Button size="sm" variant="outline" className="rounded-lg text-xs font-bold h-8 flex-1 xl:flex-none w-full xl:w-auto" onClick={(e) => { e.stopPropagation(); router.push(`/trips/${b.id}`); }}>
            View Details
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl font-medium" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/trips/${b.id}`); }}>
                <FileText className="w-4 h-4 mr-2 text-slate-500" /> View Detailed Profile
              </DropdownMenuItem>
              {b.status === "upcoming" && (
                <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={(e) => { e.stopPropagation(); onCancelClick(b.id); }}>
                  <Trash2 className="w-4 h-4 mr-2 text-rose-500" /> Cancel Trip
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
