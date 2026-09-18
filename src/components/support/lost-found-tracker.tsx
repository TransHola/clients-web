"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Package, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Car, 
  Plus, 
  ChevronRight, 
  ShieldCheck, 
  Phone, 
  X, 
  FileText, 
  Key, 
  Laptop, 
  Briefcase, 
  Check, 
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface LostFoundItem {
  id: string
  reference_number: string
  booking_id?: string | null
  booking_ref: string
  user_id?: string | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  category: string
  item_name: string
  description: string
  status: "reported" | "investigating" | "item_located" | "returned" | "closed"
  reported_at: string
  pickup_location?: string | null
  dropoff_location?: string | null
  trip_date?: string | null
  assigned_driver_name?: string | null
  assigned_driver_phone?: string | null
  vehicle_plate?: string | null
  resolution_notes?: string | null
  created_at: string
}

export interface BookingTrip {
  id: string
  booking_ref: string
  status: string
  pickup_location: string
  dropoff_location: string
  pickup_date?: string | null
  start_date?: string | null
  vehicle_type?: string | null
  price?: number | null
  currency?: string | null
  booking_details?: any
}

const CATEGORY_OPTIONS = [
  { label: "Electronics", icon: Laptop, hint: "Phone, Tablet, Laptop, Headphones" },
  { label: "Bag / Luggage", icon: Briefcase, hint: "Backpack, Suitcase, Handbag" },
  { label: "Documents", icon: FileText, hint: "Passport, Wallet, ID, Boarding Pass" },
  { label: "Clothing", icon: Package, hint: "Jacket, Scarf, Coat, Sunglasses" },
  { label: "Keys", icon: Key, hint: "House keys, Car fobs, Keychains" },
  { label: "Other", icon: HelpCircle, hint: "Jewelry, Umbrellas, Personal accessories" },
]

const VEHICLE_LOCATIONS = [
  "Rear Passenger Seat Pocket",
  "Underneath Seat",
  "Between Seat Cushions",
  "Door Storage Compartment",
  "Trunk / Luggage Compartment",
  "Floor Area",
  "Not Certain"
]

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: any; stepIdx: number; desc: string }> = {
  reported: { 
    label: "Under Review", 
    badge: "bg-amber-50 text-amber-700 border-amber-200", 
    icon: Clock, 
    stepIdx: 1,
    desc: "Report received by dispatch. Chauffeur is being notified."
  },
  investigating: { 
    label: "Driver Contacted", 
    badge: "bg-blue-50 text-blue-700 border-blue-200", 
    icon: Search, 
    stepIdx: 2,
    desc: "Chauffeur contacted. Vehicle cabin inspection underway."
  },
  item_located: { 
    label: "Item Located & Secured", 
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200", 
    icon: CheckCircle2, 
    stepIdx: 3,
    desc: "Item secured safely by chauffeur. Ready for collection or return delivery."
  },
  returned: { 
    label: "Returned to Owner", 
    badge: "bg-teal-50 text-teal-700 border-teal-200", 
    icon: ShieldCheck, 
    stepIdx: 4,
    desc: "Successfully returned to the client. Case resolved."
  },
  closed: { 
    label: "Closed", 
    badge: "bg-slate-100 text-slate-700 border-slate-200", 
    icon: Check, 
    stepIdx: 4,
    desc: "Case closed."
  },
}

export function LostFoundTracker() {
  const [items, setItems] = React.useState<LostFoundItem[]>([])
  const [bookings, setBookings] = React.useState<BookingTrip[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  // Modal / Form state
  const [showAddForm, setShowAddForm] = React.useState(true) // Always displayed by default in initial stage!
  const [isTripSelectorOpen, setIsTripSelectorOpen] = React.useState(false)
  const [tripSearch, setTripSearch] = React.useState("")
  
  // New Item Form state
  const [selectedTrip, setSelectedTrip] = React.useState<BookingTrip | null>(null)
  const [category, setCategory] = React.useState("Electronics")
  const [itemName, setItemName] = React.useState("")
  const [vehicleLocation, setVehicleLocation] = React.useState("Rear Passenger Seat Pocket")
  const [description, setDescription] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // Details Modal
  const [inspectingItem, setInspectingItem] = React.useState<LostFoundItem | null>(null)

  const [currentUser, setCurrentUser] = React.useState<any | null>(null)

  // Load items and bookings on mount
  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user || (await supabase.auth.getUser()).data?.user
      setCurrentUser(user || null)
      const currentUserId = user?.id

      // 1. Fetch bookings for trip selector (excluding pure quotations)
      let bQuery = supabase
        .from("bookings")
        .select("id, booking_ref, status, pickup_location, dropoff_location, pickup_date, start_date, vehicle_type, price, currency, booking_details")
        .order("created_at", { ascending: false })

      if (currentUserId) {
        bQuery = bQuery.or(`user_id.eq.${currentUserId},customer_id.eq.${currentUserId}`)
      }

      const { data: bData } = await bQuery
      
      // Filter out quotes to ensure only real trips are selectable
      const validTrips = (bData || []).filter((b: any) => {
        const ref = (b.booking_ref || "").toUpperCase()
        const st = (b.status || "").toLowerCase()
        return st !== "quotation" && !ref.startsWith("QTE-") && !ref.startsWith("Q-")
      })
      setBookings(validTrips)

      // 2. Fetch Lost & Found Items from PostgreSQL
      let lfQuery = supabase
        .from("lost_found_items")
        .select("*")
        .order("created_at", { ascending: false })

      const { data: lfData, error: lfError } = await lfQuery

      if (!lfError && lfData) {
        setItems(lfData)
        if (lfData.length > 0) {
          setShowAddForm(false)
        } else {
          setShowAddForm(true) // Initial stage: always displayed by default!
        }
      } else {
        setItems([])
        setShowAddForm(true)
      }
    } catch (err) {
      console.error("Error loading Lost & Found data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Filter items based on search and status
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchSearch = 
        !searchQuery.trim() ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.booking_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.pickup_location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.dropoff_location || "").toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus = 
        statusFilter === "all" ||
        (statusFilter === "active" && (item.status === "reported" || item.status === "investigating")) ||
        (statusFilter === "located" && item.status === "item_located") ||
        (statusFilter === "resolved" && (item.status === "returned" || item.status === "closed"))

      return matchSearch && matchStatus
    })
  }, [items, searchQuery, statusFilter])

  // Filter bookings for selector
  const filteredBookings = React.useMemo(() => {
    if (!tripSearch.trim()) return bookings
    const q = tripSearch.toLowerCase()
    return bookings.filter((b) => 
      b.booking_ref.toLowerCase().includes(q) ||
      (b.pickup_location || "").toLowerCase().includes(q) ||
      (b.dropoff_location || "").toLowerCase().includes(q) ||
      (b.vehicle_type || "").toLowerCase().includes(q)
    )
  }, [bookings, tripSearch])

  // Handle reporting new lost item
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Bulletproof validation
    if (!selectedTrip) {
      setSubmitError("Please select the trip where the item was left behind. Manual entry is not allowed.")
      return
    }
    if (!itemName.trim()) {
      setSubmitError("Please provide the name or type of the lost item.")
      return
    }
    if (!description.trim()) {
      setSubmitError("Please provide a detailed description to assist our driver in locating it.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const refNumber = `LF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

      const payload: Partial<LostFoundItem> = {
        reference_number: refNumber,
        booking_id: selectedTrip.id || null,
        booking_ref: selectedTrip.booking_ref,
        user_id: currentUser?.id || null,
        customer_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || "Client Passenger",
        customer_email: currentUser?.email || "client@transhola.com",
        customer_phone: customerPhone || null,
        category,
        item_name: itemName.trim(),
        description: `${description.trim()}${vehicleLocation ? `\n\nEstimated Location in Vehicle: ${vehicleLocation}` : ''}`,
        status: "reported",
        reported_at: new Date().toISOString(),
        pickup_location: selectedTrip.pickup_location || "Pickup Address",
        dropoff_location: selectedTrip.dropoff_location || "Dropoff Address",
        trip_date: selectedTrip.pickup_date || selectedTrip.start_date || new Date().toISOString(),
        assigned_driver_name: selectedTrip.booking_details?.driver?.name || "Assigned Fleet Chauffeur",
        vehicle_plate: selectedTrip.booking_details?.vehicle?.plate || selectedTrip.vehicle_type || "Chauffeur Vehicle"
      }

      const { data, error } = await supabase
        .from("lost_found_items")
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      // Prepend to state
      setItems([data, ...items])

      // Reset form
      setSelectedTrip(null)
      setItemName("")
      setDescription("")
      setCustomerPhone("")
      setShowAddForm(false)
      setSuccessBanner(`Case ${refNumber} logged! Our dispatch team has alerted the chauffeur for trip ${payload.booking_ref}.`)

      // Clear banner after 8s
      setTimeout(() => {
        setSuccessBanner(null)
      }, 8000)
    } catch (err: any) {
      console.error("Submission error:", err)
      setSubmitError(err.message || "Failed to submit lost item report. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Success */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm">{successBanner}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                You can track real-time recovery status and driver verification notes below.
              </p>
            </div>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-500 hover:text-emerald-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Lost & Found Registry</h2>
          </div>
          <p className="text-xs text-muted-foreground font-medium max-w-xl">
            Recover items left behind on your rides. Reports are instantly transmitted to your vehicle&apos;s chauffeur and 24/7 central dispatch.
          </p>
        </div>

        <Button
          onClick={() => {
            setSubmitError(null)
            setShowAddForm(!showAddForm)
          }}
          className="h-11 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-center cursor-pointer"
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4" /> Close Form
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Report Lost Item
            </>
          )}
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold">
            <Package className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Logged</span>
            <span className="text-lg font-black text-slate-900">{items.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 font-bold">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Active Search</span>
            <span className="text-lg font-black text-amber-700">
              {items.filter(i => i.status === "reported" || i.status === "investigating").length}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Items Located</span>
            <span className="text-lg font-black text-emerald-700">
              {items.filter(i => i.status === "item_located").length}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 font-bold">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Returned</span>
            <span className="text-lg font-black text-teal-700">
              {items.filter(i => i.status === "returned" || i.status === "closed").length}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REPORT LOST ITEM INLINE FORM - DISPLAYED BY DEFAULT IN INITIAL STAGE */}
      {/* ========================================================================= */}
      {showAddForm && (
        <div className="bg-card border-2 border-blue-500/40 rounded-2xl p-6 sm:p-8 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between mb-6 pb-4 border-b">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
                  <Package className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Report a Lost Item</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Select your ride from your verified bookings below. Manual reference typing is blocked to guarantee zero user error.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <X className="w-4 h-4" /> Close Form
            </button>
          </div>

          {submitError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleReportSubmit} className="space-y-6">
            {/* 1. MANDATORY TRIP SELECTOR (BULLETPROOF - NO MANUAL TYPING) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                  <span>Trip / Booking Reference</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  Must Select From Bookings
                </span>
              </div>

              {!selectedTrip ? (
                <div
                  onClick={() => setIsTripSelectorOpen(true)}
                  className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer group text-center flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      Select Trip from Your Bookings
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click here to select the exact ride where the item was left behind.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1 mt-1">
                    Choose Booking <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border-2 border-blue-500/80 bg-blue-50/30 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black bg-blue-600 text-white px-2 py-0.5 rounded">
                        {selectedTrip.booking_ref}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Trip Verified
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-0.5 pt-1">
                      <p className="truncate font-medium">
                        <span className="text-slate-400 font-normal">From:</span> {selectedTrip.pickup_location}
                      </p>
                      <p className="truncate font-medium">
                        <span className="text-slate-400 font-normal">To:</span> {selectedTrip.dropoff_location}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-0.5">
                      {selectedTrip.pickup_date ? new Date(selectedTrip.pickup_date).toLocaleDateString() : "Recent Trip"} • {selectedTrip.vehicle_type || "Chauffeur Fleet"}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTripSelectorOpen(true)}
                    className="h-9 px-3 rounded-xl text-xs font-bold shrink-0 self-start sm:self-center border-blue-200 text-blue-700 hover:bg-blue-100/60 cursor-pointer"
                  >
                    Change Trip
                  </Button>
                </div>
              )}
            </div>

            {/* 2. ITEM CATEGORY */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
                Item Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORY_OPTIONS.map((cat) => {
                  const Icon = cat.icon
                  const isSel = category === cat.label
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategory(cat.label)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                        isSel
                          ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm"
                          : "hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSel ? "text-blue-600" : "text-slate-400"}`} />
                        {isSel && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <span className="text-xs font-black leading-tight">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{cat.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. ITEM NAME & VEHICLE LOCATION */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
                  Item Name / Brand <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Apple iPad Pro 11-inch (Space Gray)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="h-11 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
                  Estimated Cabin Location
                </label>
                <select
                  value={vehicleLocation}
                  onChange={(e) => setVehicleLocation(e.target.value)}
                  className="w-full h-11 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                >
                  {VEHICLE_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. DESCRIPTION */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe color, stickers, passcode locks, specific markings, bag contents, or any details to help the chauffeur positively identify it..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground"
                required
              />
            </div>

            {/* 5. CONTACT PHONE */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-1">
                Contact Phone for Immediate Chauffeur Callback
              </label>
              <Input
                placeholder="+34 600 000 000 (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-11 rounded-xl text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Our dispatch desk will alert the chauffeur immediately upon submission.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
                className="h-11 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedTrip}
                className="h-11 px-6 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Logging Case...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" /> Submit Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar & Main Listing View (Only shown when not editing form) */}
      {!showAddForm && (
        <>
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50 self-start">
          {[
            { id: "all", label: "All Cases" },
            { id: "active", label: "In Search" },
            { id: "located", label: "Located" },
            { id: "resolved", label: "Returned" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-background text-slate-900 shadow-sm"
                  : "text-muted-foreground hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by case #, item, booking ref, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9 rounded-xl text-xs bg-card"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Listing View */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-muted-foreground">Loading Lost & Found records...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="border rounded-2xl bg-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900 mb-1">No Lost Items Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            {searchQuery || statusFilter !== "all"
              ? "No reports match your current filter criteria."
              : "You have not logged any lost items yet. Items left in vehicles can be recovered quickly by filing a report linked to your booking."}
          </p>
          <Button
            onClick={() => {
              setSearchQuery("")
              setStatusFilter("all")
              setShowAddForm(true)
            }}
            className="h-10 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs"
          >
            <Plus className="w-4 h-4" /> Report Lost Item Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item) => {
            const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.reported
            const StatusIcon = st.icon
            const CategoryIcon = CATEGORY_OPTIONS.find(c => c.label.toLowerCase() === item.category.toLowerCase())?.icon || Package

            return (
              <div
                key={item.id}
                className="rounded-2xl border bg-card p-5 sm:p-6 transition-all hover:border-slate-300 hover:shadow-sm flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Status Color Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {item.reference_number}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                      <CategoryIcon className="w-3.5 h-3.5 text-blue-600" />
                      {item.category}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Reported {new Date(item.reported_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <span className={`text-[11px] font-black px-3 py-1 rounded-full border flex items-center gap-1.5 self-start sm:self-auto ${st.badge}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {st.label}
                  </span>
                </div>

                {/* Body Content */}
                <div className="grid md:grid-cols-12 gap-5">
                  <div className="md:col-span-7 space-y-2">
                    <h3 className="text-base font-black text-slate-900 leading-snug">{item.item_name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3">
                      {item.description}
                    </p>

                    {item.resolution_notes && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-black block">Dispatch Note:</span>
                          <span className="text-[11px] font-medium leading-relaxed">{item.resolution_notes}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trip Connection Card */}
                  <div className="md:col-span-5 bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between text-xs space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verified Ride</span>
                        </div>
                        <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-700">
                          {item.booking_ref}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                          <span className="text-slate-700 truncate font-medium">{item.pickup_location || "Málaga Hotel"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                          <span className="text-slate-700 truncate font-medium">{item.dropoff_location || "Airport Terminal"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.assigned_driver_name ? `Chauffeur: ${item.assigned_driver_name}` : "Assigned Chauffeur"}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInspectingItem(item)}
                        className="h-7 px-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg gap-1 cursor-pointer"
                      >
                        Track Case <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
        </>
      )}



      {/* ========================================================================= */}
      {/* TRIP SELECTOR POPUP MODAL (PULLS FROM USER BOOKINGS ONLY) */}
      {/* ========================================================================= */}
      {isTripSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Select Booking</h3>
                <p className="text-xs text-muted-foreground">
                  Choose the trip where the item was left behind.
                </p>
              </div>
              <button
                onClick={() => setIsTripSelectorOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by booking ref (TR-...), location, or vehicle..."
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  className="h-10 pl-9 rounded-xl text-xs bg-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Bookings List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredBookings.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Car className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No verified bookings found</p>
                  <p className="mt-1">Ensure you have active or completed trips in your booking history.</p>
                </div>
              ) : (
                filteredBookings.map((trip) => {
                  const isCurrent = selectedTrip?.id === trip.id
                  return (
                    <div
                      key={trip.id}
                      onClick={() => {
                        setSelectedTrip(trip)
                        setIsTripSelectorOpen(false)
                        setSubmitError(null)
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                        isCurrent
                          ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-500"
                          : "hover:border-slate-300 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {trip.booking_ref}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {trip.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-700">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="truncate font-medium">{trip.pickup_location || "Pickup Location"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span className="truncate font-medium">{trip.dropoff_location || "Dropoff Location"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {trip.pickup_date ? new Date(trip.pickup_date).toLocaleDateString() : "Recent Trip"}
                        </span>
                        <span className="font-semibold text-blue-600">Select Trip →</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-slate-50 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTripSelectorOpen(false)}
                className="text-xs font-bold cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE AUDIT & RECOVERY TRACKER DEEP DIVE MODAL */}
      {/* ========================================================================= */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative space-y-6">
            <button
              onClick={() => setInspectingItem(null)}
              className="absolute top-5 right-5 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-black bg-blue-100 text-blue-800 px-2.5 py-1 rounded">
                  {inspectingItem.reference_number}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {inspectingItem.category}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900">{inspectingItem.item_name}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Reported on {new Date(inspectingItem.reported_at).toLocaleString()}
              </p>
            </div>

            {/* 4-Step Recovery Progression Tracker */}
            <div className="p-5 rounded-2xl border bg-slate-50/60 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">Recovery Status Timeline</h4>
              
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { title: "Reported", desc: "Dispatch alerted" },
                  { title: "Driver Alert", desc: "Inspection active" },
                  { title: "Item Located", desc: "Secured safely" },
                  { title: "Returned", desc: "Case resolved" },
                ].map((step, idx) => {
                  const currentIdx = STATUS_CONFIG[inspectingItem.status]?.stepIdx || 1
                  const isDone = idx + 1 <= currentIdx
                  const isCurrent = idx + 1 === currentIdx

                  return (
                    <div key={step.title} className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mb-1.5 transition-all ${
                          isDone
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-200 text-slate-400"
                        } ${isCurrent ? "ring-4 ring-blue-100" : ""}`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-[11px] font-black ${isDone ? "text-slate-900" : "text-slate-400"}`}>
                        {step.title}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{step.desc}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Case Details */}
            <div className="space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Item Description</span>
                <div className="p-4 rounded-xl bg-muted/40 border text-slate-800 leading-relaxed whitespace-pre-line">
                  {inspectingItem.description}
                </div>
              </div>

              {/* Linked Ride Information */}
              <div className="p-4 rounded-xl border bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                  <span className="font-bold text-slate-600 uppercase tracking-wider">Associated Trip</span>
                  <span className="font-mono font-black text-blue-700">{inspectingItem.booking_ref}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Route</span>
                    <span className="font-medium truncate block">{inspectingItem.pickup_location} → {inspectingItem.dropoff_location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Chauffeur</span>
                    <span className="font-medium">{inspectingItem.assigned_driver_name || "Central Dispatch Fleet"}</span>
                  </div>
                </div>
              </div>

              {/* Resolution Notes */}
              {inspectingItem.resolution_notes && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="font-black uppercase tracking-wider text-[10px] block mb-1 text-emerald-800">
                    Chauffeur & Depot Log
                  </span>
                  <p className="leading-relaxed font-medium">{inspectingItem.resolution_notes}</p>
                </div>
              )}
            </div>

            {/* Footer Support Action */}
            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>Need urgent dispatch assistance? Call <strong>+34 900 800 900</strong></span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingItem(null)}
                className="rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Tracker
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
