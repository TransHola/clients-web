"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  MessageSquare, 
  Package, 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  Send, 
  AlertTriangle,
  Car,
  MapPin,
  Calendar,
  X,
  CreditCard,
  ShieldAlert,
  HelpCircle,
  Wrench,
  Check,
  Plus,
  ArrowLeft,
  User,
  Headphones,
  Search
} from "lucide-react"
import { LostFoundTracker } from "@/components/support/lost-found-tracker"

interface SupportTicket {
  id: string
  ticket_number: string
  user_id?: string | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  category: string
  priority: "normal" | "high" | "urgent"
  subject: string
  status: "open" | "in_review" | "waiting_customer" | "resolved" | "closed"
  booking_id?: string | null
  booking_ref?: string | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
}

interface TicketMessage {
  id: string
  ticket_id: string
  sender_type: "user" | "agent" | "system"
  sender_id?: string | null
  sender_name: string
  message: string
  created_at: string
}

const TICKET_CATEGORIES = [
  { id: "Complaint", label: "Complaint", icon: AlertTriangle, desc: "Driver conduct, delays, vehicle condition" },
  { id: "Billing", label: "Billing & Invoicing", icon: CreditCard, desc: "Invoice copy, disputes, payment queries" },
  { id: "Trip & Scheduling", label: "Trip & Scheduling", icon: Car, desc: "Schedule changes, itinerary adjustments" },
  { id: "Technical", label: "Technical Support", icon: Wrench, desc: "Portal access, account or booking issues" },
  { id: "Safety", label: "Safety & Security", icon: ShieldAlert, desc: "Urgent safety incidents or vehicle concerns" },
  { id: "General", label: "General Inquiry", icon: HelpCircle, desc: "Fleet capabilities, corporate rates, questions" },
]

const PRIORITY_OPTIONS = [
  { id: "normal", label: "Normal", badge: "bg-slate-100 text-slate-700 border-slate-200", desc: "Standard inquiry (within 24h)" },
  { id: "high", label: "High Priority", badge: "bg-amber-100 text-amber-800 border-amber-200", desc: "Important request (within 4h)" },
  { id: "urgent", label: "Urgent", badge: "bg-rose-100 text-rose-800 border-rose-200", desc: "Immediate assistance required" },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  waiting_customer: { label: "Waiting on You", color: "bg-purple-50 text-purple-700 border-purple-200", icon: MessageSquare },
  resolved: { label: "Resolved", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Check },
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = React.useState("tickets")
  const [currentUser, setCurrentUser] = React.useState<any | null>(null)

  // Open Ticket Form State
  const [showAddTicket, setShowAddTicket] = React.useState(true) // Always displayed by default in initial stage!
  const [category, setCategory] = React.useState("Complaint")
  const [priority, setPriority] = React.useState<"normal" | "high" | "urgent">("normal")
  const [subject, setSubject] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [selectedTrip, setSelectedTrip] = React.useState<any | null>(null)
  const [isTripPickerOpen, setIsTripPickerOpen] = React.useState(false)
  const [tripSearch, setTripSearch] = React.useState("")
  const [isSubmittingTicket, setIsSubmittingTicket] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // My Tickets State
  const [tickets, setTickets] = React.useState<SupportTicket[]>([])
  const [isLoadingTickets, setIsLoadingTickets] = React.useState(true)
  const [ticketFilter, setTicketFilter] = React.useState<string>("all")
  const [ticketSearch, setTicketSearch] = React.useState("")
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null)
  const [messages, setMessages] = React.useState<TicketMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false)
  const [replyText, setReplyText] = React.useState("")
  const [isSendingReply, setIsSendingReply] = React.useState(false)

  // User Bookings for Trip Selection
  const [userBookings, setUserBookings] = React.useState<any[]>([])

  // Load User & Bookings
  React.useEffect(() => {
    async function initUserAndTrips() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user || (await supabase.auth.getUser()).data?.user
        setCurrentUser(user || null)

        let query = supabase
          .from("bookings")
          .select("id, booking_ref, status, pickup_location, dropoff_location, pickup_date, vehicle_type")
          .order("created_at", { ascending: false })

        if (user?.id) {
          query = query.or(`user_id.eq.${user.id},customer_id.eq.${user.id}`)
        }

        const { data } = await query
        const validRides = (data || []).filter((b: any) => {
          const ref = (b.booking_ref || "").toUpperCase()
          const st = (b.status || "").toLowerCase()
          return st !== "quotation" && !ref.startsWith("QTE-") && !ref.startsWith("Q-")
        })
        setUserBookings(validRides)
      } catch (err) {
        console.error("Failed to load user or bookings:", err)
      }
    }
    initUserAndTrips()
  }, [])

  // Load Real Tickets from Database
  const loadTickets = React.useCallback(async () => {
    setIsLoadingTickets(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user || (await supabase.auth.getUser()).data?.user

      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })

      if (user?.id) {
        query = query.eq("user_id", user.id)
      }

      const { data, error } = await query
      if (!error && data) {
        setTickets(data)
        if (data.length > 0) {
          setShowAddTicket(false)
        } else {
          setShowAddTicket(true) // Initial stage: always displayed by default!
        }
      } else {
        setTickets([])
        setShowAddTicket(true)
      }
    } catch (err) {
      console.error("Failed to load support tickets:", err)
      setTickets([])
      setShowAddTicket(true)
    } finally {
      setIsLoadingTickets(false)
    }
  }, [])

  React.useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Load Messages for Selected Ticket
  React.useEffect(() => {
    if (!selectedTicket) {
      setMessages([])
      return
    }

    async function loadTicketMessages() {
      setIsLoadingMessages(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("support_ticket_messages")
          .select("*")
          .eq("ticket_id", selectedTicket.id)
          .order("created_at", { ascending: true })

        if (!error && data) {
          setMessages(data)
        } else {
          setMessages([])
        }
      } catch (err) {
        console.error("Failed to load ticket messages:", err)
        setMessages([])
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadTicketMessages()
  }, [selectedTicket])

  // Handle Ticket Submission
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!subject.trim()) {
      setFormError("Please enter a subject for your ticket.")
      return
    }
    if (!details.trim()) {
      setFormError("Please provide details explaining your issue.")
      return
    }

    setIsSubmittingTicket(true)
    try {
      const supabase = createClient()
      const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const customerName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || "Client Passenger"
      const customerEmail = currentUser?.email || "client@transhola.com"

      // 1. Insert Ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          ticket_number: ticketNumber,
          user_id: currentUser?.id || null,
          customer_name: customerName,
          customer_email: customerEmail,
          category,
          priority,
          subject: subject.trim(),
          status: "open",
          booking_id: selectedTrip?.id || null,
          booking_ref: selectedTrip?.booking_ref || null,
        })
        .select()
        .single()

      if (ticketError) throw ticketError

      // 2. Insert Initial Message
      await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: ticketData.id,
          sender_type: "user",
          sender_id: currentUser?.id || null,
          sender_name: customerName,
          message: details.trim(),
        })

      // Reset form
      setSubject("")
      setDetails("")
      setSelectedTrip(null)
      setPriority("normal")
      setCategory("Complaint")

      // Refresh tickets and switch to view ticket thread
      await loadTickets()
      setShowAddTicket(false)
      setSelectedTicket(ticketData)
      setActiveTab("tickets")
      setSuccessBanner(`Ticket ${ticketNumber} created successfully! Our team will review it shortly.`)
      setTimeout(() => setSuccessBanner(null), 8000)
    } catch (err: any) {
      console.error("Error creating support ticket:", err)
      setFormError(err.message || "Failed to create support ticket. Please try again.")
    } finally {
      setIsSubmittingTicket(false)
    }
  }

  // Handle Sending a Reply
  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return

    setIsSendingReply(true)
    try {
      const supabase = createClient()
      const customerName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || "Client Passenger"

      const { data, error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: selectedTicket.id,
          sender_type: "user",
          sender_id: currentUser?.id || null,
          sender_name: customerName,
          message: replyText.trim(),
        })
        .select()
        .single()

      if (error) throw error

      setMessages((prev) => [...prev, data])
      setReplyText("")

      // If ticket was resolved or waiting_customer, reopen to 'open'
      if (selectedTicket.status !== "open" && selectedTicket.status !== "in_review") {
        await supabase
          .from("support_tickets")
          .update({ status: "open", updated_at: new Date().toISOString() })
          .eq("id", selectedTicket.id)

        setSelectedTicket((prev) => prev ? { ...prev, status: "open" } : null)
        loadTickets()
      }
    } catch (err: any) {
      console.error("Failed to send reply:", err)
      alert(err.message || "Failed to send reply. Please try again.")
    } finally {
      setIsSendingReply(false)
    }
  }

  // Handle Marking Ticket as Resolved
  const handleResolveTicket = async () => {
    if (!selectedTicket) return

    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "resolved", resolved_at: now, updated_at: now })
        .eq("id", selectedTicket.id)

      if (error) throw error

      setSelectedTicket((prev) => prev ? { ...prev, status: "resolved", resolved_at: now } : null)
      loadTickets()
    } catch (err: any) {
      console.error("Failed to resolve ticket:", err)
      alert(err.message || "Failed to mark ticket as resolved.")
    }
  }

  // Filter tickets
  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      const matchStatus = (() => {
        if (ticketFilter === "open") return t.status === "open" || t.status === "in_review" || t.status === "waiting_customer"
        if (ticketFilter === "resolved") return t.status === "resolved" || t.status === "closed"
        return true
      })()
      if (!matchStatus) return false

      if (!ticketSearch.trim()) return true
      const q = ticketSearch.toLowerCase()
      return (
        t.ticket_number.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.booking_ref || "").toLowerCase().includes(q)
      )
    })
  }, [tickets, ticketFilter, ticketSearch])

  // Filter bookings for trip selector
  const filteredTrips = React.useMemo(() => {
    if (!tripSearch.trim()) return userBookings
    const q = tripSearch.toLowerCase()
    return userBookings.filter((b) => 
      b.booking_ref.toLowerCase().includes(q) ||
      (b.pickup_location || "").toLowerCase().includes(q) ||
      (b.dropoff_location || "").toLowerCase().includes(q)
    )
  }, [userBookings, tripSearch])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Support Desk</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Direct assistance from our 24/7 central operations desk. Open tickets, track real-time resolution, or report lost items.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-3 text-emerald-800 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm">{successBanner}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Our support desk has been alerted and will update your case directly.
              </p>
            </div>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-500 hover:text-emerald-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-col">
        <TabsList className="w-full max-w-md bg-muted/50 rounded-xl h-11 p-1 mb-6">
          <TabsTrigger value="tickets" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
            Support Tickets {tickets.length > 0 && `(${tickets.length})`}
          </TabsTrigger>
          <TabsTrigger value="lost_found" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
            Lost & Found
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: SUPPORT TICKETS (LISTING VIEW + DEFAULT ADD NEW IN INITIAL STAGE) */}
        {/* ========================================================================= */}
        <TabsContent value="tickets" className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <MessageSquare className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Support Tickets Registry</h2>
              </div>
              <p className="text-xs text-muted-foreground font-medium max-w-xl">
                Direct communication with central dispatch and client care. Open a ticket for flight changes, driver inquiries, or billing questions.
              </p>
            </div>

            <Button
              onClick={() => {
                setFormError(null)
                setShowAddTicket(!showAddTicket)
                if (selectedTicket) setSelectedTicket(null)
              }}
              className="h-11 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-center cursor-pointer"
            >
              {showAddTicket ? (
                <>
                  <X className="w-4 h-4" /> Close Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Open Ticket
                </>
              )}
            </Button>
          </div>

          {/* KPI Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold">
                <MessageSquare className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Tickets</span>
                <span className="text-lg font-black text-slate-900">{tickets.length}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 font-bold">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Open & Review</span>
                <span className="text-lg font-black text-blue-700">
                  {tickets.filter(t => t.status === "open" || t.status === "in_review").length}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 font-bold">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Waiting on You</span>
                <span className="text-lg font-black text-purple-700">
                  {tickets.filter(t => t.status === "waiting_customer").length}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-card/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Resolved</span>
                <span className="text-lg font-black text-emerald-700">
                  {tickets.filter(t => t.status === "resolved" || t.status === "closed").length}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* OPEN TICKET FORM OR TICKET LISTING / THREAD */}
          {/* ========================================================================= */}
          {showAddTicket ? (
            <div className="bg-card border-2 border-blue-500/40 rounded-2xl p-6 sm:p-8 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start justify-between mb-6 pb-4 border-b">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
                      <Plus className="w-4 h-4" />
                    </span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Open a Support Ticket</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submit your inquiry or issue. Our dispatch and client-services desk responds promptly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTicket(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <X className="w-4 h-4" /> Close Form
                </button>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 mb-6">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitTicket} className="space-y-6">
                {/* Category Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {TICKET_CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      const isSel = category === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                            isSel
                              ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm"
                              : "hover:bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${isSel ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black">{cat.label}</span>
                              {isSel && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cat.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRIORITY_OPTIONS.map((p) => {
                      const isSel = priority === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id as any)}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSel
                              ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm"
                              : "hover:bg-slate-50 border-slate-200"
                          }`}
                        >
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${p.badge}`}>
                            {p.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{p.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Optional Trip Linker (NO USER ERROR) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-700">
                      Related Trip (Optional)
                    </label>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Link a specific ride from your bookings
                    </span>
                  </div>

                  {!selectedTrip ? (
                    <div
                      onClick={() => setIsTripPickerOpen(true)}
                      className="p-3.5 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <Car className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                        <span>Click to select an associated trip from your rides...</span>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600">Select Trip →</span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border-2 border-blue-500/80 bg-blue-50/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono font-black text-xs bg-blue-600 text-white px-2 py-0.5 rounded shrink-0">
                          {selectedTrip.booking_ref}
                        </span>
                        <span className="text-slate-700 truncate font-medium">
                          {selectedTrip.pickup_location} → {selectedTrip.dropoff_location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsTripPickerOpen(true)}
                          className="h-8 px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100/60 rounded-lg cursor-pointer"
                        >
                          Change
                        </Button>
                        <button
                          type="button"
                          onClick={() => setSelectedTrip(null)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Schedule adjustment request for tomorrow's transfer..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                    required
                  />
                </div>

                {/* Details */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
                    Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Please describe your question or issue in detail. If this relates to flight changes, delays, or invoices, include relevant specifics..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full rounded-xl border bg-background px-4 py-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddTicket(false)}
                    className="h-11 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingTicket}
                    className="h-11 px-6 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingTicket ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting Ticket...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Support Ticket
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : selectedTicket ? (
            /* Deep Dive Ticket Chat Thread View */
            <div className="max-w-4xl mx-auto flex flex-col h-[700px] border rounded-2xl bg-card overflow-hidden shadow-sm animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:px-6 border-b bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 -ml-2 rounded-lg hover:bg-slate-200/50 text-slate-500 transition-colors cursor-pointer"
                    title="Back to Tickets List"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedTicket.ticket_number}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{selectedTicket.category}</span>
                      {selectedTicket.booking_ref && (
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Trip: {selectedTicket.booking_ref}
                        </span>
                      )}
                    </div>
                    <h2 className="font-black text-base text-slate-900 leading-tight">{selectedTicket.subject}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const st = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.open
                    const Icon = st.icon
                    return (
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 shrink-0 ${st.color}`}>
                        <Icon className="w-3.5 h-3.5" /> {st.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/20">
                {isLoadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">No messages in this case yet</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.sender_type === "user"
                    return (
                      <div key={msg.id} className={`flex gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs border ${
                            isUser
                              ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                              : "bg-slate-200 text-slate-700 border-slate-300"
                          }`}
                        >
                          {isUser ? <User className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                        </div>
                        <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-700">{msg.sender_name}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                              isUser
                                ? "bg-blue-600 text-white rounded-tr-sm"
                                : "bg-white border text-slate-800 rounded-tl-sm"
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                <div className="p-4 sm:p-5 border-t bg-white">
                  <div className="flex gap-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your message to support desk..."
                      className="flex-1 rounded-xl border bg-muted/20 px-4 py-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                      rows={2}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className="rounded-xl px-5 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm self-end h-11 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 mr-1.5" /> Send
                    </Button>
                  </div>
                  <div className="flex justify-end mt-2.5">
                    <Button
                      variant="ghost"
                      onClick={handleResolveTicket}
                      className="text-xs font-bold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 h-8 px-3 rounded-lg cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Mark as Resolved
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-5 border-t bg-emerald-50 border-emerald-100 flex items-center justify-center gap-2 text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs">This ticket has been marked as resolved.</span>
                </div>
              )}
            </div>
          ) : (
            /* Ticket List View */
            <div className="space-y-4">
              {/* Filter Tabs & Search */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50 self-start">
                  {[
                    { id: "all", label: "All Tickets" },
                    { id: "open", label: "Open & In Review" },
                    { id: "resolved", label: "Resolved" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTicketFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        ticketFilter === tab.id
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
                    placeholder="Search tickets by #, subject, category, or trip ref..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="h-10 pl-9 rounded-xl text-xs bg-card"
                  />
                  {ticketSearch && (
                    <button onClick={() => setTicketSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isLoadingTickets ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold text-muted-foreground">Loading your support tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                /* Pure Real Data Empty State - ZERO Simulated Items */
                <div className="border rounded-2xl bg-card p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1">No Support Tickets Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mb-6">
                    {ticketSearch || ticketFilter !== "all"
                      ? "No tickets match your selected search or filter criteria."
                      : "You currently have no support tickets logged. Fill in the form above to submit an inquiry directly to our 24/7 central desk."}
                  </p>
                  {!showAddTicket && (
                    <Button
                      onClick={() => setShowAddTicket(true)}
                      className="h-10 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Open a Support Ticket
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((t) => {
                    const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                    const Icon = st.icon
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="rounded-2xl border bg-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-black text-sm text-slate-900 truncate">{t.subject}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                              <span className="font-mono text-blue-700">{t.ticket_number}</span>
                              <span className="text-slate-300">•</span>
                              <span>{t.category}</span>
                              {t.booking_ref && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono text-slate-600">Trip: {t.booking_ref}</span>
                                </>
                              )}
                              <span className="text-slate-300">•</span>
                              <span>{new Date(t.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full border flex items-center gap-1.5 ${st.color}`}>
                            <Icon className="w-3.5 h-3.5" /> {st.label}
                          </span>
                          <ChevronDown className="w-4 h-4 -rotate-90 text-slate-400 group-hover:text-slate-700" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: LOST & FOUND (PURE REAL DATA) */}
        {/* ========================================================================= */}
        <TabsContent value="lost_found">
          <LostFoundTracker />
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* TRIP PICKER MODAL FOR OPEN TICKET (BULLETPROOF - NO MANUAL TYPING) */}
      {/* ========================================================================= */}
      {isTripPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Select Related Trip</h3>
                <p className="text-xs text-muted-foreground">
                  Choose a verified booking to attach to this support inquiry.
                </p>
              </div>
              <button
                onClick={() => setIsTripPickerOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b bg-slate-50/50">
              <Input
                placeholder="Search rides by reference (TR-...) or location..."
                value={tripSearch}
                onChange={(e) => setTripSearch(e.target.value)}
                className="h-10 text-xs bg-white rounded-xl"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredTrips.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Car className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No verified rides found</p>
                  <p className="mt-1">You can still open a ticket without linking a specific trip.</p>
                </div>
              ) : (
                filteredTrips.map((trip) => {
                  const isCurrent = selectedTrip?.id === trip.id
                  return (
                    <div
                      key={trip.id}
                      onClick={() => {
                        setSelectedTrip(trip)
                        setIsTripPickerOpen(false)
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isCurrent
                          ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-500"
                          : "hover:border-slate-300 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                          {trip.booking_ref}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {trip.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 truncate font-medium">
                        {trip.pickup_location} → {trip.dropoff_location}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>{trip.pickup_date ? new Date(trip.pickup_date).toLocaleDateString() : "Recent Trip"}</span>
                        <span className="text-blue-600 font-semibold">Select Trip →</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-3 border-t bg-slate-50 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTripPickerOpen(false)}
                className="text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
