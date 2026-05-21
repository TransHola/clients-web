"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Car, MapPin, Clock, Phone, Star, CalendarDays, XCircle, CheckCircle2, Loader2, RotateCcw, FileDown, LayoutGrid, List, AlertTriangle, ChevronLeft, ChevronRight, MoreHorizontal, FileText, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  status: "upcoming" | "in_progress" | "completed" | "cancelled"
  scheduleState?: { label: string; color: string }
  cancellationReason?: string
  refundStatus?: string
  rawDetails?: any
}

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
  upcoming: { label: "Upcoming", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CalendarDays },
  in_progress: { label: "In Progress", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Loader2 },
  completed: { label: "Completed", color: "bg-slate-100 text-slate-600 border-slate-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-rose-100 text-rose-600 border-rose-200", icon: XCircle },
}

export default function TripsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list")
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)
  const [isCancelling, setIsCancelling] = React.useState(false)

  const confirmCancellation = async () => {
    if (!cancellingId) return
    setIsCancelling(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', cancellingId)
      if (error) throw error
      setBookings(prev => prev.map(b => b.id === cancellingId ? { ...b, status: 'cancelled', cancellationReason: 'Cancelled by user' } : b))
      setCancellingId(null)
    } catch (e) {
      console.error("Cancellation failed", e)
    } finally {
      setIsCancelling(false)
    }
  }

  React.useEffect(() => {
    async function loadBookings() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setBookings([])
          setLoading(false)
          return
        }

        // Fetch bookings and join with assigned operator from company_profiles
        const { data, error } = await supabase
          .from('bookings')
          .select('*, operator:assigned_operator_id(company_name, phone_number)')
          .eq('user_id', user.id)
          .neq('status', 'quotation')

        if (error) throw error

        if (data) {
          const mapped: Booking[] = data.map((b: any) => {
            const now = Date.now();
            const details = b.booking_details || {};
            const tripDateStr = details.date || details.pickupDate || (details.multiDayStore ? details.multiDayStore[0]?.dateStr : null);
            const tripTimeStr = details.time || details.pickupTime || (details.multiDayStore ? details.multiDayStore[0]?.startTime : null);
            
            let start = now;
            if (b.pickup_time) {
                start = new Date(b.pickup_time).getTime();
            } else if (tripDateStr) {
                const dateTimeStr = tripTimeStr ? `${tripDateStr}T${tripTimeStr}:00` : tripDateStr;
                const parsed = new Date(dateTimeStr).getTime();
                if (!isNaN(parsed)) start = parsed;
            }

            const end = b.dropoff_time ? new Date(b.dropoff_time).getTime() : start + (2 * 60 * 60 * 1000);
            const isMissed = !b.started_at && !b.completed_at && (b.status === "pending" || b.status === "confirmed") && now > start;

            let scheduleState = undefined;
            if (isMissed) {
                scheduleState = { label: "Missed", color: "bg-rose-100 text-rose-700 border-rose-200" };
            } else if (b.status === "pending" || b.status === "confirmed") {
                scheduleState = { label: "On Schedule", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
            } else if (b.status === "en_route" || b.status === "in_progress") {
              if (b.status === "en_route" && now > start) scheduleState = { label: "Late", color: "bg-amber-100 text-amber-700 border-amber-200" };
              else if (b.status === "in_progress" && now > end) scheduleState = { label: "Late", color: "bg-amber-100 text-amber-700 border-amber-200" };
              else scheduleState = { label: "On Schedule", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
            }

            let computedStatus = (b.status === "pending" || b.status === "confirmed") ? "upcoming" :
                (b.status === "in_progress" || b.status === "en_route" || b.started_at) ? "in_progress" :
                "upcoming"; // fallback
            
            if (b.completed_at || b.status === "completed") {
                computedStatus = "completed";
            }
            if (b.cancelled_at || b.status === "cancelled") {
                computedStatus = "cancelled";
            } else if (isMissed) {
                computedStatus = "completed";
            }

            const displayDate = b.pickup_time ? new Date(b.pickup_time).toLocaleDateString() : (tripDateStr ? new Date(tripDateStr).toLocaleDateString() : "Date pending");
            const displayTime = b.pickup_time ? new Date(b.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (tripTimeStr || "");

            return {
              id: b.id,
              ref: b.booking_ref || b.booking_reference || `BK-${b.id.substring(0, 8).toUpperCase()}`,
              vehicle: b.requested_vehicle_class || "Executive Sedan",
              from: b.booking_details?.pickup?.address || b.pickup_location || "Pickup Location",
              to: b.booking_details?.dropoff?.address || b.dropoff_location || "Dropoff Location",
              date: displayDate,
              time: displayTime,
              price: `${b.booking_details?.currency || "AED"} ${b.price || b.total_amount || '0.00'}`,
              status: computedStatus as "upcoming" | "in_progress" | "completed" | "cancelled",
              scheduleState,
              driver: b.driver ? {
                name: `${b.driver.first_name} ${b.driver.last_name}`,
                phone: b.driver.phone || "N/A",
                rating: 4.9,
                plate: b.driver.license_class || "CDL",
              } : undefined,
              operator: b.operator ? {
                name: b.operator.company_name || "Network Operator",
                phone: b.operator.phone_number || "Contact Support",
              } : undefined,
              cancellationReason: b.status === "cancelled" || b.cancelled_at ? "Cancelled by user" : undefined,
              rawDetails: b.booking_details
            }
          })
          setBookings(mapped)
        }
      } catch (err: any) {
        console.error("Failed to load client bookings:", JSON.stringify(err, null, 2))
      } finally {
        setLoading(false)
      }
    }
    loadBookings()
  }, [])

  const tabs = ["upcoming", "in_progress", "completed", "cancelled"] as const

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Trips</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Track all your bookings in one place.</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-10 px-0 rounded-lg shadow-none"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-10 px-0 rounded-lg shadow-none"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="flex-col">
        <TabsList className="w-full bg-muted/50 rounded-xl h-11 p-1 mb-6">
          {tabs.map((t) => {
            const count = bookings.filter((b) => b.status === t).length
            return (
              <TabsTrigger key={t} value={t} className="flex-1 rounded-lg text-xs font-bold capitalize data-[state=active]:bg-background data-[state=active]:shadow-sm">
                {t.replace("_", " ")}
                {count > 0 && <span className="ml-1.5 bg-muted text-muted-foreground rounded-full px-1.5 text-[10px]">{count}</span>}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t}>
            <BookingList bookings={bookings.filter((b) => b.status === t)} viewMode={viewMode} onCancelClick={(id) => setCancellingId(id)} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Cancellation Modal */}
      {cancellingId && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 min-h-screen">
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

function BookingList({ bookings, viewMode, onCancelClick }: { bookings: Booking[], viewMode: "grid" | "list", onCancelClick: (id: string) => void }) {
  const router = useRouter()
  if (bookings.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-2xl">
        <Car className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-bold text-foreground">No bookings in this category</p>
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
        const cfg = statusConfig[b.status]
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
                <span className="text-[11px] text-muted-foreground font-mono">{b.ref}</span>
              </div>
              <p className="font-black text-lg">{b.price}</p>
            </div>

            {/* Route */}
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                <span className="font-medium truncate">{b.from}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                <div className="w-px h-4 bg-slate-300 ml-0.5" />
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.date} · {b.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-blue-600 shrink-0" />
                <span className="font-medium truncate">{b.to}</span>
              </div>
            </div>

            {/* Operator Info */}
            {b.operator && (
              <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 border border-primary/10 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {b.operator.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-1">Operating Partner</p>
                    <p className="text-sm font-black">{b.operator.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Driver (if available) */}
            {b.driver && (
              <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 border border-dashed">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {b.driver.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{b.driver.name}</p>
                    <p className="text-xs text-muted-foreground">{b.driver.plate} · ⭐ {b.driver.rating}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs font-bold gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Call
                </Button>
              </div>
            )}

            {/* Cancellation info */}
            {b.status === "cancelled" && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3 border">
                <span className="font-bold text-rose-600">Cancelled:</span> {b.cancellationReason}
                {b.refundStatus && <span className="ml-3 font-bold text-emerald-600">· {b.refundStatus}</span>}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t items-center justify-between">
              <Button size="sm" variant="outline" className="rounded-lg text-xs font-bold h-8 flex-1" onClick={(e) => { e.stopPropagation(); router.push(`/trips/${b.id}`); }}>View Detailed Profile</Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl font-medium" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/trips/${b.id}`); }}>
                    <FileText className="w-4 h-4 mr-2 text-slate-500" /> View Detailed Profile
                  </DropdownMenuItem>
                  {b.status === "upcoming" && (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                        <Edit className="w-4 h-4 mr-2 text-slate-500" /> Edit Trip
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={(e) => { e.stopPropagation(); onCancelClick(b.id); }}>
                        <Trash2 className="w-4 h-4 mr-2 text-rose-500" /> Cancel Trip
                      </DropdownMenuItem>
                    </>
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

function BookingListItem({ b, onCancelClick }: { b: Booking, onCancelClick: (id: string) => void }) {
  const router = useRouter()
  const [routeDayIdx, setRouteDayIdx] = React.useState(0)
  const cfg = statusConfig[b.status]

  const details = b.rawDetails || {}
  const numDays = details.tripType === 'multi-day' && details.multiDayStore ? details.multiDayStore.length : 1
  const isMultiDay = numDays > 1
  const currentDay = isMultiDay ? details.multiDayStore[routeDayIdx] : details
  const currentStops = isMultiDay ? (currentDay?.stops || []) : (details.stops || [])
  const defaultFrom = isMultiDay ? (currentDay?.pickupLoc?.name || currentDay?.pickupLoc?.address || 'Unknown Pickup') : b.from
  const defaultTo = isMultiDay ? (currentDay?.dropoffLoc?.name || currentDay?.dropoffLoc?.address || 'Unknown Dropoff') : b.to

  return (
    <div
      onClick={() => router.push(`/trips/${b.id}`)}
      className="rounded-xl border bg-white p-4 sm:px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      {/* Left side: Basic Info */}
      <div className="flex items-center gap-4 w-full xl:w-[320px] shrink-0">
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          <Car className="w-6 h-6 text-slate-400" />
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
            <span className="font-mono">{b.ref}</span>
            <span className="text-slate-300">•</span>
            <span>{b.date} {b.time}</span>
            {isMultiDay && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600">{numDays} Days</span>
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
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
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
            <ChevronRight className="w-5 h-5 text-slate-200" />
            {currentStops.length > 0 && (
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">
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
        <p className="font-black text-lg">{b.price}</p>

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
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                    <Edit className="w-4 h-4 mr-2 text-slate-500" /> Edit Trip
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={(e) => { e.stopPropagation(); onCancelClick(b.id); }}>
                    <Trash2 className="w-4 h-4 mr-2 text-rose-500" /> Cancel Trip
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
