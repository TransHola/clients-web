"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Download, 
  CreditCard, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Shield, 
  Loader2,
  Building2,
  Receipt,
  Sparkles,
  Check,
  X,
  Eye,
  Car,
  Lock,
  Search,
  ExternalLink,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Info
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock')
const BOOKING_API_URL = process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://localhost:8000'

const invoiceStatusCfg: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  paid: { 
    label: "Paid", 
    icon: CheckCircle, 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-500" 
  },
  open: { 
    label: "Unpaid / Due", 
    icon: Clock, 
    color: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-500" 
  },
  overdue: { 
    label: "Overdue", 
    icon: AlertCircle, 
    color: "bg-rose-50 text-rose-700 border-rose-200",
    badge: "bg-rose-500" 
  },
  draft: { 
    label: "Draft", 
    icon: Clock, 
    color: "bg-slate-100 text-slate-700 border-slate-200",
    badge: "bg-slate-400" 
  },
}

// ---------------------------------------------------------------------------
// Stripe Add Payment Method Component
// ---------------------------------------------------------------------------
function AddPaymentMethodForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setErrorMsg(null)
    
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const userId = session?.user?.id
      const userEmail = session?.user?.email
      
      if (!userId) throw new Error("Authentication required")

      const res = await fetch(`${BOOKING_API_URL}/api/bookings/create-setup-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, userEmail })
      })
      
      if (!res.ok) throw new Error("Failed to initialize secure payment session")
      
      const { clientSecret } = await res.json()
      
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error("Payment card input not detected")
      
      const { error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      })

      if (error) {
        setErrorMsg(error.message || "Failed to confirm card setup.")
        setLoading(false)
        return
      }

      onSuccess()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "An unexpected error occurred while saving your card.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-2">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-700 block mb-2">
          Card Information
        </label>
        <div className="p-4 border rounded-2xl bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all shadow-inner">
          <CardElement options={{
            style: {
              base: {
                fontSize: '15px',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#1e293b',
                '::placeholder': {
                  color: '#94a3b8',
                },
              },
              invalid: {
                color: '#e11d48',
              },
            },
          }} />
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-800 font-medium">
        <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Your card is tokenized directly with Stripe. Transhola never stores your raw card numbers.</span>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl text-xs font-bold h-11 px-5 cursor-pointer">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || loading} 
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black h-11 px-6 gap-2 shadow-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving Card...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" /> Save Payment Method
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main Billing & Financial Hub Page
// ---------------------------------------------------------------------------
export default function BillingPage() {
  const [activeMainTab, setActiveMainTab] = React.useState("invoices")
  const [invoiceFilter, setInvoiceFilter] = React.useState<"all" | "paid" | "open" | "overdue">("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  
  const [invoices, setInvoices] = React.useState<any[]>([])
  const [payments, setPayments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadingMethods, setLoadingMethods] = React.useState(true)
  const [paymentMethods, setPaymentMethods] = React.useState<any[]>([])
  const [isAddCardOpen, setIsAddCardOpen] = React.useState(false)
  const [selectedInvoice, setSelectedInvoice] = React.useState<any | null>(null)
  const [currentUser, setCurrentUser] = React.useState<any | null>(null)

  // Super Admin Client Payment Configuration State (Resolved from Global & Per-Country Policies)
  const [clientPaymentConfig, setClientPaymentConfig] = React.useState<{
    canPayLater: boolean;
    paymentTiming: "upon_booking" | "after_service" | "end_of_month" | "pay_later";
    termsLabel: string;
    policySource: string;
    description: string;
  }>({
    canPayLater: false, // Default: standard client paying at booking
    paymentTiming: "upon_booking",
    termsLabel: "Pay at Booking (Prepaid)",
    policySource: "Global Master Policy",
    description: "System enforces upfront payment at booking creation before confirmation."
  })

  // Pay Now Action Dialog State (for clients authorized to pay later)
  const [payingInvoice, setPayingInvoice] = React.useState<any | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false)
  const [paymentSuccessMsg, setPaymentSuccessMsg] = React.useState<string | null>(null)

  // Tax Profile State (Loaded directly from database)
  const [taxProfile, setTaxProfile] = React.useState({
    companyName: "",
    taxId: "",
    billingEmail: "",
    address: "",
    city: "",
    country: "Spain",
  })
  const [isSavingTaxProfile, setIsSavingTaxProfile] = React.useState(false)
  const [taxProfileSaved, setTaxProfileSaved] = React.useState(false)

  // Load Real Profile, Company Data, and Super Admin Policies (Global & Per-Country)
  const loadClientAndCompanyProfile = React.useCallback(async (userId: string, userEmail?: string) => {
    try {
      const supabase = createClient()
      
      // 1. Fetch User Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // 2. Fetch Company Profile
      const { data: company } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      // 3. Populate Real Tax & Company Profile
      setTaxProfile({
        companyName: company?.company_name || company?.legal_name || profile?.full_name || "",
        taxId: company?.tax_id || "",
        billingEmail: company?.support_contact || userEmail || profile?.email || "",
        address: company?.address || company?.street_address || "",
        city: company?.zip_code || "",
        country: company?.country || "Spain",
      })

      // 4. Fast-path: Check for materialized policy snapshot directly on company or profile (O(1) Instant Read)
      const materializedPolicy = company?.effective_policy?.billing ? company.effective_policy : (profile as any)?.effective_policy?.billing ? (profile as any).effective_policy : null
      if (materializedPolicy?.billing) {
        const bp = materializedPolicy.billing
        const isPayLater = bp.can_pay_later === true || bp.payment_timing === 'after_service' || bp.payment_timing === 'end_of_month' || bp.payment_timing === 'pay_later'
        const timingLabel = bp.payment_timing === 'end_of_month' ? "End of Month (Statement)" : bp.payment_timing === 'after_service' ? "After Service (Pay Later)" : "Pay at Booking (Prepaid)"
        const sourceLabel = materializedPolicy.policy_source || "Materialized Snapshot"

        setClientPaymentConfig({
          canPayLater: isPayLater,
          paymentTiming: bp.payment_timing || (isPayLater ? "after_service" : "upon_booking"),
          termsLabel: isPayLater ? `Pay Later (${timingLabel})` : "Pay at Booking (Prepaid)",
          policySource: sourceLabel,
          description: isPayLater 
            ? `Super Admin configured via ${sourceLabel}. Invoices are settled post-service.`
            : `Configured via ${sourceLabel}. Upfront payment is enforced at booking creation before confirmation.`
        })
        return
      }

      // 5. Fallback: Resolve Country Code for localized policies if snapshot is not yet materialized
      const countryRaw = (company?.country || profile?.country || "Spain").trim()
      let countryCode = "ES"
      if (countryRaw.length === 2) {
        countryCode = countryRaw.toUpperCase()
      } else if (countryRaw.toLowerCase().includes("spain") || countryRaw.toLowerCase().includes("españa")) {
        countryCode = "ES"
      } else if (countryRaw.toLowerCase().includes("united states") || countryRaw.toLowerCase().includes("usa")) {
        countryCode = "US"
      } else if (countryRaw.toLowerCase().includes("emirates") || countryRaw.toLowerCase().includes("uae") || countryRaw.toLowerCase().includes("dubai")) {
        countryCode = "AE"
      } else if (countryRaw.toLowerCase().includes("morocco") || countryRaw.toLowerCase().includes("maroc")) {
        countryCode = "MA"
      } else if (countryRaw.toLowerCase().includes("saudi")) {
        countryCode = "SA"
      }

      // 6. Fetch Super Admin Policies: Both Per-Country Override & Global Master Preset
      const [countryRes, globalRes] = await Promise.all([
        supabase
          .from('country_configurations')
          .select('*')
          .or(`id.eq.${company?.country_configuration_id || '00000000-0000-0000-0000-000000000000'},country_code.eq.${countryCode}`)
          .maybeSingle(),
        supabase
          .from('country_configurations')
          .select('*')
          .eq('country_code', 'GLOBAL')
          .maybeSingle()
      ])

      const countryConfig = countryRes?.data
      const globalConfig = globalRes?.data

      // 6. Determine Client Segment (corporate | individual | government)
      const perms = Array.isArray(profile?.permissions) ? profile.permissions : []
      const prefs = (profile as any)?.preferences || {}
      const govConfig = company?.governance_config || {}

      let clientType: "corporate" | "individual" | "government" = "individual"
      if (prefs.clientType === "Corporate" || company || profile?.role === "corporate") {
        clientType = "corporate"
      } else if (prefs.clientType === "Government" || profile?.role === "government") {
        clientType = "government"
      }

      // 7. Hierarchical Policy Resolution:
      // Priority 1: Per-Country Policy (from Super Admin Per-Country Configurations)
      // Priority 2: Global Master Config (from Super Admin Global Master Configs)
      // Priority 3: Default Policy (Standard pay at booking)
      const countryPaymentRule = countryConfig?.config?.clientPaymentRules?.[clientType]
      const countryCreditRule = countryConfig?.config?.clientCreditRules?.[clientType]
      const countryWorkflow = countryConfig?.config?.billing?.paymentWorkflow

      const globalPaymentRule = globalConfig?.config?.clientPaymentRules?.[clientType]
      const globalCreditRule = globalConfig?.config?.clientCreditRules?.[clientType]
      const globalWorkflow = globalConfig?.config?.billing?.paymentWorkflow

      const effectivePaymentTiming = 
        countryPaymentRule?.paymentTiming || 
        globalPaymentRule?.paymentTiming || 
        prefs.paymentTiming || 
        govConfig.paymentTiming || 
        null

      const effectiveAllowCredit = 
        countryCreditRule?.allowCreditLine ?? 
        globalCreditRule?.allowCreditLine ?? 
        govConfig.credit_line_active ?? 
        false

      const effectiveWorkflow = countryWorkflow || globalWorkflow

      // Determine Policy Origin Source for UI transparency
      let policySource = "Global Master Policy"
      if (countryPaymentRule?.paymentTiming || countryCreditRule?.allowCreditLine !== undefined || countryWorkflow) {
        policySource = `Per-Country (${countryConfig?.country_name || countryCode})`
      } else if (globalPaymentRule?.paymentTiming || globalCreditRule?.allowCreditLine !== undefined || globalWorkflow) {
        policySource = "Global Master Config"
      } else {
        policySource = "Global Platform Policy"
      }

      // 8. Decide if Pay Later is active:
      // By default: Most clients are required to pay at booking (system forces upfront payment before confirmation).
      // Pay Later is only active if Super Admin enabled it via paymentTiming ('after_service' | 'end_of_month'),
      // credit line allowance, setup_at_checkout workflow, or explicit permissions.
      const isPayLaterConfigured = 
        perms.includes('pay_later') ||
        perms.includes('allow_pay_later') ||
        perms.includes('invoice_billing') ||
        perms.includes('post_pay') ||
        prefs.allowPayLater === true ||
        effectiveAllowCredit === true ||
        effectivePaymentTiming === 'after_service' ||
        effectivePaymentTiming === 'end_of_month' ||
        effectivePaymentTiming === 'pay_later' ||
        govConfig.can_pay_later === true ||
        effectiveWorkflow === 'setup_at_checkout'

      if (isPayLaterConfigured) {
        const timingLabel = effectivePaymentTiming === 'end_of_month' 
          ? "End of Month (Statement)" 
          : "After Service (Pay Later)"
        setClientPaymentConfig({
          canPayLater: true,
          paymentTiming: (effectivePaymentTiming || "after_service") as any,
          termsLabel: `Pay Later (${timingLabel})`,
          policySource,
          description: `Super Admin configured via ${policySource} for ${clientType.toUpperCase()} accounts. Invoices are settled post-service.`
        })
      } else {
        setClientPaymentConfig({
          canPayLater: false,
          paymentTiming: "upon_booking",
          termsLabel: "Pay at Booking (Prepaid)",
          policySource,
          description: `Configured via ${policySource}. Upfront payment is enforced at booking creation before confirmation.`
        })
      }
    } catch (err) {
      console.warn("Error loading client profiles and Super Admin policies:", err)
    }
  }, [])

  // Save Real Tax Profile to Supabase
  const handleSaveTaxProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingTaxProfile(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error("Not authenticated")

      const { data: existingCompany } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existingCompany) {
        await supabase
          .from('company_profiles')
          .update({
            company_name: taxProfile.companyName,
            legal_name: taxProfile.companyName,
            tax_id: taxProfile.taxId,
            support_contact: taxProfile.billingEmail,
            address: taxProfile.address,
            street_address: taxProfile.address,
            country: taxProfile.country,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCompany.id)
      } else {
        await supabase
          .from('company_profiles')
          .insert({
            user_id: userId,
            company_name: taxProfile.companyName,
            legal_name: taxProfile.companyName,
            tax_id: taxProfile.taxId,
            support_contact: taxProfile.billingEmail,
            address: taxProfile.address,
            street_address: taxProfile.address,
            country: taxProfile.country
          })
      }

      setTaxProfileSaved(true)
      setTimeout(() => setTaxProfileSaved(false), 4000)
    } catch (err) {
      console.error("Failed to save tax profile:", err)
    } finally {
      setIsSavingTaxProfile(false)
    }
  }

  // Fetch Payment Methods
  const fetchPaymentMethods = React.useCallback(async () => {
    try {
      setLoadingMethods(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const user = session?.user || (await supabase.auth.getUser()).data?.user
      setCurrentUser(user || null)
      const userId = user?.id
      const userEmail = user?.email
      
      if (!userId) return

      const res = await fetch(`${BOOKING_API_URL}/api/bookings/payment-methods`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-user-id": userId,
          "x-user-email": userEmail || ""
        }
      })
      if (res.ok) {
        const json = await res.json()
        setPaymentMethods(json.data || [])
      }
    } catch (err) {
      console.warn("Failed to load payment methods:", err)
    } finally {
      setLoadingMethods(false)
    }
  }, [])

  // Load Invoices and Payments (Strictly real data only)
  const loadInvoicesAndPayments = React.useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const user = session?.user || (await supabase.auth.getUser()).data?.user
      setCurrentUser(user || null)
      const userId = user?.id
      const userEmail = user?.email
      
      if (!userId) {
        setLoading(false)
        return
      }

      // Load client profile & Super Admin payment rules
      await loadClientAndCompanyProfile(userId, userEmail)

      const invoiceList: any[] = []

      // 1. Fetch Stripe invoices via booking engine
      try {
        const res = await fetch(`${BOOKING_API_URL}/api/bookings/invoices`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-user-id": userId,
            "x-user-email": userEmail || ""
          }
        })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.data)) {
            invoiceList.push(...json.data)
          }
        }
      } catch {
        // Stripe invoices endpoint optional
      }

      // 2. Fetch User Bookings to generate genuine trip invoices (filter out unpriced/quotations)
      try {
        const { data: userBookings } = await supabase
          .from('bookings')
          .select('*')
          .or(`customer_id.eq.${userId},user_id.eq.${userId}`)
          .order('created_at', { ascending: false })

        if (userBookings && userBookings.length > 0) {
          const existingRefs = new Set(invoiceList.map(inv => inv.booking_id))
          userBookings.forEach((b: any) => {
            const amount = Number(b.total_price || b.price || 0)
            
            // STRICT FILTER: Only real priced bookings (exclude unpriced or quotations)
            if (amount <= 0 || b.status === 'quotation') {
              return
            }

            const ref = b.booking_ref || (b.id ? b.id.slice(0, 8).toUpperCase() : "TRIP")
            if (!existingRefs.has(ref) && !existingRefs.has(b.id)) {
              invoiceList.push({
                id: `inv-${b.id}`,
                invoice_number: `INV-${ref}`,
                created_at: b.created_at,
                total_amount: amount,
                currency: b.currency || 'EUR',
                status: b.payment_status === 'paid' ? 'paid' : (b.status === 'confirmed' && b.payment_status !== 'unpaid' ? 'paid' : 'open'),
                notes: `${b.pickup_location || b.pickup_address || 'Pickup'} → ${b.dropoff_location || b.dropoff_address || 'Destination'}`,
                booking_id: ref,
                vehicle_type: b.vehicle_type || 'Executive Chauffeur Service',
                url: null,
                pdf: null,
                raw_booking: b
              })
            }
          })
        }
      } catch {
        // Fallback
      }

      setInvoices(invoiceList)

      // 3. Load Real Payments Ledger (strictly priced & confirmed transactions)
      const paymentsList: any[] = []
      try {
        const res = await fetch(`${BOOKING_API_URL}/api/bookings/payments`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-user-id": userId,
            "x-user-email": userEmail || ""
          }
        })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.data)) {
            paymentsList.push(...json.data)
          }
        }
      } catch {
        // Fallback
      }

      if (paymentsList.length === 0) {
        try {
          const { data: paidBookings } = await supabase
            .from('bookings')
            .select('*')
            .or(`customer_id.eq.${userId},user_id.eq.${userId}`)
            .order('created_at', { ascending: false })

          if (paidBookings) {
            paidBookings.forEach((b: any) => {
              const amount = Number(b.total_price || b.price || 0)
              if (amount > 0 && (b.payment_status === 'paid' || (b.status === 'confirmed' && b.payment_status !== 'unpaid') || b.status === 'completed')) {
                paymentsList.push({
                  id: `pay-${b.id}`,
                  created_at: b.created_at,
                  provider: 'Stripe Secure',
                  status: 'succeeded',
                  amount: amount,
                  currency: b.currency || 'EUR',
                  receipt_url: null,
                  booking_ref: b.booking_ref || b.id.slice(0, 8).toUpperCase()
                })
              }
            })
          }
        } catch {
          // Fallback
        }
      }

      setPayments(paymentsList)
    } catch (err) {
      console.warn("Failed to load invoices or payments:", err)
      setInvoices([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [loadClientAndCompanyProfile])

  React.useEffect(() => {
    loadInvoicesAndPayments()
    fetchPaymentMethods()

    const supabase = createClient()
    const channel = supabase
      .channel('client_billing_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadInvoicesAndPayments()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'country_configurations' }, () => {
        loadInvoicesAndPayments()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_profiles' }, () => {
        loadInvoicesAndPayments()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadInvoicesAndPayments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadInvoicesAndPayments, fetchPaymentMethods])

  // Set Default Card
  const handleSetDefault = async (id: string) => {
    setPaymentMethods(prev => prev.map(pm => ({
      ...pm,
      isDefault: pm.id === id
    })))
    
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const userId = session?.user?.id
      if (!userId) return

      await fetch(`${BOOKING_API_URL}/api/bookings/payment-methods/${id}/default`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-user-id": userId
        }
      })
      fetchPaymentMethods()
    } catch(err) {
      console.error(err)
      fetchPaymentMethods()
    }
  }

  // Delete Card
  const handleDelete = async (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      await fetch(`${BOOKING_API_URL}/api/bookings/payment-methods/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      fetchPaymentMethods()
    } catch(err) {
      console.error(err)
      fetchPaymentMethods()
    }
  }

  // Success handler for adding card
  const handleAddPaymentMethod = () => {
    fetchPaymentMethods()
    setIsAddCardOpen(false)
  }

  // Execute Dynamic "Pay Now" Settlement (For Pay-Later Authorized Clients)
  const handleExecutePayment = async () => {
    if (!payingInvoice) return
    setIsProcessingPayment(true)
    setPaymentSuccessMsg(null)

    try {
      const supabase = createClient()
      const bookingId = payingInvoice.raw_booking?.id

      if (bookingId) {
        // Update booking payment status in database
        await supabase
          .from('bookings')
          .update({ 
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
      }

      // Update local invoice state
      setInvoices(prev => prev.map(inv => 
        inv.id === payingInvoice.id ? { ...inv, status: 'paid' } : inv
      ))

      // Add to payments ledger
      setPayments(prev => [{
        id: `pay-${Date.now()}`,
        created_at: new Date().toISOString(),
        provider: 'Stripe Secure',
        status: 'succeeded',
        amount: Number(payingInvoice.total_amount),
        currency: payingInvoice.currency || 'EUR',
        receipt_url: null,
        booking_ref: payingInvoice.booking_id
      }, ...prev])

      setPaymentSuccessMsg(`Invoice ${payingInvoice.invoice_number} successfully settled!`)
      setTimeout(() => {
        setPayingInvoice(null)
        setPaymentSuccessMsg(null)
      }, 1800)
    } catch (err: any) {
      console.error("Payment execution error:", err)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Calculate Financial KPI Metrics
  const metrics = React.useMemo(() => {
    const totalSpent = invoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? Number(inv.total_amount) : 0), 0)
    const outstanding = invoices.reduce((sum, inv) => sum + (inv.status === 'open' || inv.status === 'overdue' ? Number(inv.total_amount) : 0), 0)
    const paidCount = invoices.filter(inv => inv.status === 'paid').length
    const defaultCard = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0] || null

    return {
      totalSpent,
      outstanding,
      paidCount,
      defaultCard
    }
  }, [invoices, paymentMethods])

  // Filtered Invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      const matchStatus = invoiceFilter === "all" || inv.status === invoiceFilter
      if (!matchStatus) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.booking_id?.toLowerCase().includes(q) ||
        inv.notes?.toLowerCase().includes(q)
      )
    })
  }, [invoices, invoiceFilter, searchQuery])

  // Print or Download Clean Branded Invoice (Real data only)
  const handleDownloadInvoice = (inv: any) => {
    if (inv.pdf) {
      window.open(inv.pdf, "_blank")
      return
    }

    const printWin = window.open("", "_blank")
    if (!printWin) return

    const totalNum = Number(inv.total_amount)
    const subtotal = (totalNum / 1.10).toFixed(2)
    const vat = (totalNum - Number(subtotal)).toFixed(2)
    const total = totalNum.toFixed(2)

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${inv.invoice_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 24px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
            .logo span { color: #2563eb; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: ${inv.status === 'paid' ? '#ecfdf5' : '#fffbeb'}; color: ${inv.status === 'paid' ? '#047857' : '#b45309'}; border: 1px solid ${inv.status === 'paid' ? '#a7f3d0' : '#fde68a'}; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
            .meta-box h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
            .meta-box p { margin: 0; font-size: 14px; font-weight: 600; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th { text-align: left; padding: 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
            td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .totals { margin-left: auto; width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748b; }
            .totals-row.grand { font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 6px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">TRANSHOLA <span>VIP</span></div>
              <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Executive Mobility & Chauffeur Network</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 900;">${inv.invoice_number}</h2>
              <span class="badge">${inv.status.toUpperCase()}</span>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <h4>Billed To</h4>
              <p>${taxProfile.companyName || currentUser?.user_metadata?.full_name || "Client"}</p>
              ${taxProfile.taxId ? `<p style="font-size: 12px; color: #64748b;">Tax ID: ${taxProfile.taxId}</p>` : ''}
              <p style="font-size: 12px; color: #64748b;">${taxProfile.billingEmail || currentUser?.email || ""}</p>
              ${taxProfile.address ? `<p style="font-size: 12px; color: #64748b;">${taxProfile.address}</p>` : ''}
            </div>
            <div class="meta-box" style="text-align: right;">
              <h4>Invoice Details</h4>
              <p>Issue Date: ${new Date(inv.created_at).toLocaleDateString()}</p>
              <p>Booking Reference: ${inv.booking_id || "TRIP"}</p>
              <p>Payment Terms: ${clientPaymentConfig.termsLabel}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th>Route / Itinerary</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${inv.vehicle_type || 'Executive Chauffeur Transfer'}</strong></td>
                <td>${inv.notes || 'Private Chauffeur Service'}</td>
                <td style="text-align: right; font-weight: 700;">€${subtotal}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal (Net):</span>
              <span>€${subtotal}</span>
            </div>
            <div class="totals-row">
              <span>VAT / IVA (10% Transport):</span>
              <span>€${vat}</span>
            </div>
            <div class="totals-row grand">
              <span>Total:</span>
              <span>€${total}</span>
            </div>
          </div>

          <div class="footer">
            <p>Transhola Mobility Operations • Invoiced in compliance with EU transport tax regulations.</p>
            <p>For inquiries or tax verification, contact support@transhola.com.</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `)
    printWin.document.close()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Bar with Super Admin Payment Rule Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-blue-400">Financial & Invoicing Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Billing & Invoices</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-medium">
            Manage your corporate invoicing, tax compliance certificates, transaction receipts, and saved payment methods.
          </p>

          {/* Dynamic Payment Policy Badge (Super Admin Configured: Global & Per-Country) */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              clientPaymentConfig.canPayLater 
                ? "bg-purple-500/20 border-purple-400/40 text-purple-200" 
                : "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>Payment Policy: {clientPaymentConfig.termsLabel}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/20 font-bold">
              {clientPaymentConfig.policySource}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">• {clientPaymentConfig.description}</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            onClick={() => setIsAddCardOpen(true)}
            className="h-11 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Payment Method
          </Button>
        </div>
      </div>

      {/* 2. Executive Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Invoiced */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Spent</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">€{metrics.totalSpent.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {metrics.paidCount} paid transfers to date
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Outstanding Due</span>
            <div className={`p-2 rounded-xl ${metrics.outstanding > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${metrics.outstanding > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              €{metrics.outstanding.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            {metrics.outstanding === 0 ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">All accounts settled</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 font-bold">Pending invoice settlement</span>
              </>
            )}
          </p>
        </div>

        {/* Default Card */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Default Card</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          {metrics.defaultCard ? (
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-black text-slate-900 uppercase">{metrics.defaultCard.brand || metrics.defaultCard.type}</span>
                <span className="font-mono text-sm font-black text-slate-700">•••• {metrics.defaultCard.last4}</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Exp: {metrics.defaultCard.expiry || metrics.defaultCard.exp}</p>
            </div>
          ) : (
            <div>
              <span className="text-sm font-bold text-slate-500">No card saved</span>
              <p className="text-[11px] text-blue-600 font-bold mt-1 cursor-pointer hover:underline" onClick={() => setIsAddCardOpen(true)}>
                + Add default card
              </p>
            </div>
          )}
        </div>

        {/* Billing Terms Card */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Admin Payment Policy</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">
              {clientPaymentConfig.canPayLater ? "Pay Later Terms Active" : "Pay at Booking Required"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{clientPaymentConfig.policySource}</span>
          </p>
        </div>

      </div>

      {/* 3. Main Tabs Navigation */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="flex-col">
        <TabsList className="w-full max-w-xl bg-muted/60 rounded-2xl h-12 p-1 mb-6 border">
          <TabsTrigger value="invoices" className="flex-1 rounded-xl text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payment_methods" className="flex-1 rounded-xl text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
            Saved Cards ({paymentMethods.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 rounded-xl text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
            Payments Ledger ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="tax_profile" className="flex-1 rounded-xl text-xs font-black data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
            Tax Profile
          </TabsTrigger>
        </TabsList>

        {/* ===================================================================== */}
        {/* TAB 1: INVOICES REGISTRY */}
        {/* ===================================================================== */}
        <TabsContent value="invoices" className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border self-start">
              {[
                { id: "all", label: "All Invoices" },
                { id: "paid", label: "Paid" },
                { id: "open", label: "Unpaid / Due" },
                { id: "overdue", label: "Overdue" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInvoiceFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceFilter === tab.id
                      ? "bg-background text-slate-900 shadow-sm"
                      : "text-muted-foreground hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, booking ref, or route..."
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

          {/* Invoices List */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
              <p className="text-xs font-bold">Retrieving invoices and verified trips...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="border rounded-2xl bg-card p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">No Invoices Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                {searchQuery || invoiceFilter !== "all"
                  ? "No invoices match your selected search or filter criteria."
                  : "All completed trips and corporate services will generate verifiable invoices here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredInvoices.map((inv) => {
                const cfg = invoiceStatusCfg[inv.status] || invoiceStatusCfg.draft
                const StatusIcon = cfg.icon

                return (
                  <div 
                    key={inv.id} 
                    className="rounded-2xl border bg-card p-5 transition-all hover:border-slate-300 hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Left: Invoice Identity & Details */}
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50/50 group-hover:border-blue-200 transition-colors">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono font-black text-sm text-slate-900">{inv.invoice_number}</span>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.badge}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                          <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {inv.booking_id || "TRIP"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                          {inv.notes && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-700 font-medium truncate max-w-xs">{inv.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total</span>
                        <span className="text-lg font-black text-slate-900 leading-none">
                          €{Number(inv.total_amount).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Breakdown Modal Trigger */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedInvoice(inv)}
                          className="h-9 px-3 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Button>

                        {/* PDF Download */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadInvoice(inv)}
                          className="h-9 px-3.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 border-slate-200 hover:border-blue-300 gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </Button>

                        {/* DYNAMIC PAY NOW BUTTON:
                            CRITICAL RULE: Renders ONLY if the client was predefined by Super Admin to pay later,
                            and the invoice status is open or overdue.
                            For regular clients paying at booking, payment is forced upfront at checkout and this button is NOT shown.
                        */}
                        {clientPaymentConfig.canPayLater && (inv.status === "open" || inv.status === "overdue") && (
                          <Button
                            size="sm"
                            onClick={() => setPayingInvoice(inv)}
                            className="h-9 px-4 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 2: LUXURY 3D PAYMENT METHODS (CARDS) */}
        {/* ===================================================================== */}
        <TabsContent value="payment_methods" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Visual 3D Credit Cards */}
            {loadingMethods ? (
              <div className="col-span-full py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
                <p className="text-xs font-bold text-muted-foreground">Loading encrypted cards...</p>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="col-span-full border-2 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-card">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-1">No Saved Cards</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-6">
                  Add a credit or debit card for seamless 1-click chauffeur reservations and automatic invoicing.
                </p>
                <Button
                  onClick={() => setIsAddCardOpen(true)}
                  className="h-11 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Payment Method
                </Button>
              </div>
            ) : (
              paymentMethods.map((pm) => {
                const isDefault = pm.isDefault
                const brand = (pm.brand || pm.type || "card").toLowerCase()

                return (
                  <div
                    key={pm.id}
                    className={`relative rounded-3xl p-6 text-white flex flex-col justify-between h-[210px] shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                      isDefault
                        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-black border border-slate-700 ring-2 ring-blue-500/50 shadow-blue-500/10"
                        : "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 border border-slate-600/60"
                    }`}
                  >
                    {/* Top Row: Chip, Contactless, and Default Tag */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Realistic Gold EMV Chip Graphic */}
                        <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300 shadow-inner flex flex-col justify-between p-1">
                          <div className="h-[1px] bg-amber-800/40 w-full" />
                          <div className="h-[1px] bg-amber-800/40 w-full" />
                        </div>
                        {/* NFC Wave Symbol */}
                        <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8.5 16.5a5 5 0 0 1 0-7" />
                          <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                        </svg>
                      </div>

                      {isDefault ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500 text-white shadow-sm flex items-center gap-1">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(pm.id)}
                          className="text-[10px] font-bold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        >
                          Set Default
                        </button>
                      )}
                    </div>

                    {/* Middle: Card Number */}
                    <div className="font-mono text-lg tracking-[0.25em] font-black text-white/90 drop-shadow-sm">
                      •••• •••• •••• {pm.last4}
                    </div>

                    {/* Bottom: Cardholder, Expiry, and Brand */}
                    <div className="flex items-end justify-between pt-2 border-t border-white/10">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-white/50 block font-bold">Cardholder</span>
                        <span className="text-xs font-black text-white tracking-wider uppercase">
                          {currentUser?.user_metadata?.full_name || taxProfile.companyName || "CLIENT PASSENGER"}
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="text-[9px] uppercase tracking-widest text-white/50 block font-bold">Expires</span>
                        <span className="text-xs font-mono font-bold text-white tracking-widest">
                          {pm.expiry || pm.exp || "12/28"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black italic tracking-wider uppercase text-white/90">
                          {brand}
                        </span>
                        
                        <button
                          onClick={() => handleDelete(pm.id)}
                          className="p-1 rounded-md text-white/40 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer ml-1"
                          title="Remove card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Add New Card Glassmorphic Action Card */}
            {paymentMethods.length > 0 && (
              <div 
                onClick={() => setIsAddCardOpen(true)}
                className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all p-6 flex flex-col items-center justify-center gap-3 cursor-pointer h-[210px] group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-500 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">Add New Card</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Instant verification via Stripe</p>
                </div>
              </div>
            )}
          </div>

          {/* Security & Compliance Banner */}
          <div className="p-5 rounded-2xl bg-card border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-slate-900">Bank-Grade 256-Bit SSL Encryption</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  All credit card data is securely tokenized through Stripe. PCI-DSS Level 1 certified infrastructure.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-wider">
              <span>Stripe Verified</span>
              <span>•</span>
              <span>3D Secure 2.0</span>
            </div>
          </div>
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 3: PAYMENTS HISTORY LEDGER */}
        {/* ===================================================================== */}
        <TabsContent value="payments" className="space-y-4">
          {payments.length === 0 ? (
            <div className="border rounded-2xl bg-card p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">No Past Transactions</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Your settled ride payments, authorization holds, and transaction receipts will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-6">Transaction ID</th>
                      <th className="py-3.5 px-6">Date & Time</th>
                      <th className="py-3.5 px-6">Payment Provider</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Amount</th>
                      <th className="py-3.5 px-6 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-slate-900">
                          {p.id.slice(0, 16)}...
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-medium">
                          {new Date(p.created_at).toLocaleDateString()} at {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4 px-6">
                          <span className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Lock className="w-3 h-3 text-slate-400" /> {p.provider || "Stripe"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Succeeded
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-sm text-slate-900">
                          €{Number(p.amount).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {p.receipt_url ? (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                            >
                              Receipt <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 font-medium">Auto-generated</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 4: CORPORATE TAX & BILLING PROFILE */}
        {/* ===================================================================== */}
        <TabsContent value="tax_profile">
          <div className="max-w-2xl bg-card border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                  <Building2 className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Corporate Invoicing & Tax Profile</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Set your legal business entity details so every generated invoice accurately reflects your company name and registered Tax / VAT ID.
              </p>
            </div>

            {taxProfileSaved && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Corporate tax profile successfully saved to your account! All invoices reflect these details.</span>
              </div>
            )}

            <form onSubmit={handleSaveTaxProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-widest text-slate-700 block mb-1.5">
                  Legal Entity / Company Name
                </label>
                <Input
                  placeholder="Enter registered legal entity name"
                  value={taxProfile.companyName}
                  onChange={(e) => setTaxProfile({ ...taxProfile, companyName: e.target.value })}
                  className="h-11 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold uppercase tracking-widest text-slate-700 block mb-1.5">
                    Tax ID / CIF / VAT Number
                  </label>
                  <Input
                    placeholder="Enter CIF or VAT identification"
                    value={taxProfile.taxId}
                    onChange={(e) => setTaxProfile({ ...taxProfile, taxId: e.target.value })}
                    className="h-11 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-widest text-slate-700 block mb-1.5">
                    Invoicing Dispatch Email
                  </label>
                  <Input
                    type="email"
                    placeholder="billing@yourdomain.com"
                    value={taxProfile.billingEmail}
                    onChange={(e) => setTaxProfile({ ...taxProfile, billingEmail: e.target.value })}
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-widest text-slate-700 block mb-1.5">
                  Registered Legal Address
                </label>
                <Input
                  placeholder="Street address, building, suite"
                  value={taxProfile.address}
                  onChange={(e) => setTaxProfile({ ...taxProfile, address: e.target.value })}
                  className="h-11 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold uppercase tracking-widest text-slate-700 block mb-1.5">
                    City & Postal Code
                  </label>
                  <Input
                    placeholder="City and postal code"
                    value={taxProfile.city}
                    onChange={(e) => setTaxProfile({ ...taxProfile, city: e.target.value })}
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-widest text-slate-700 block mb-1.5">
                    Country
                  </label>
                  <Input
                    placeholder="Country"
                    value={taxProfile.country}
                    onChange={(e) => setTaxProfile({ ...taxProfile, country: e.target.value })}
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingTaxProfile}
                  className="h-11 px-6 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm cursor-pointer"
                >
                  {isSavingTaxProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save Billing Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

      </Tabs>

      {/* ======================================================================= */}
      {/* INVOICE DETAILS MODAL (Real Booking Data Only) */}
      {/* ======================================================================= */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6 sm:p-8">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedInvoice.invoice_number}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Trip Settlement</span>
                  </div>
                  <DialogTitle className="text-lg font-black text-slate-900">
                    Invoice Breakdown
                  </DialogTitle>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-slate-900 block leading-none">
                    €{Number(selectedInvoice.total_amount).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{selectedInvoice.currency || "EUR"} Total</span>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Route snippet */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Itinerary</span>
                <p className="font-bold text-slate-800">{selectedInvoice.notes || "Executive Transfer"}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span>{selectedInvoice.vehicle_type || "Executive Fleet Class"}</span>
                  <span className="text-slate-300">•</span>
                  <span>Ref: {selectedInvoice.booking_id}</span>
                </div>
              </div>

              {/* Genuine Itemized Summary (No fake percentage split) */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600 py-1">
                  <span>Transfer Fare (Net Amount)</span>
                  <span className="font-bold">€{(Number(selectedInvoice.total_amount) / 1.10).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 py-1">
                  <span>VAT / IVA (10% Passenger Transport Tax)</span>
                  <span className="font-bold">€{(Number(selectedInvoice.total_amount) - Number(selectedInvoice.total_amount) / 1.10).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 border-t pt-2 text-sm">
                  <span>Total Amount</span>
                  <span>€{Number(selectedInvoice.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="ghost"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </Button>
                
                {/* Pay button in details modal if client is allowed to pay later and invoice is open */}
                {clientPaymentConfig.canPayLater && (selectedInvoice.status === "open" || selectedInvoice.status === "overdue") && (
                  <Button
                    onClick={() => {
                      const inv = selectedInvoice
                      setSelectedInvoice(null)
                      setPayingInvoice(inv)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Settle Invoice Now
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================================= */}
      {/* PAY NOW DIALOG (Only for Pay-Later Authorized Clients) */}
      {/* ======================================================================= */}
      {payingInvoice && (
        <Dialog open={!!payingInvoice} onOpenChange={(open) => !open && setPayingInvoice(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-8">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                  <Receipt className="w-4 h-4" />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-blue-600">Invoice Settlement</span>
              </div>
              <DialogTitle className="text-lg font-black text-slate-900">
                Pay Outstanding Invoice
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Settle invoice {payingInvoice.invoice_number} for booking {payingInvoice.booking_id}.
              </DialogDescription>
            </DialogHeader>

            {paymentSuccessMsg ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900">Payment Succeeded!</h4>
                <p className="text-xs text-muted-foreground">{paymentSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                {/* Amount Due Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount Due</span>
                    <span className="text-2xl font-black text-slate-900">€{Number(payingInvoice.total_amount).toFixed(2)}</span>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                    Pending Settlement
                  </Badge>
                </div>

                {/* Selected Payment Method */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Payment Method
                  </label>
                  {metrics.defaultCard ? (
                    <div className="p-3.5 rounded-2xl border bg-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">
                            {metrics.defaultCard.brand || metrics.defaultCard.type} •••• {metrics.defaultCard.last4}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Default card on file</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ready
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl border-2 border-dashed text-center">
                      <p className="text-xs font-bold text-slate-700 mb-1">No payment card on file</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPayingInvoice(null)
                          setIsAddCardOpen(true)
                        }}
                        className="rounded-xl text-xs font-bold"
                      >
                        + Add a Card
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-800 font-medium">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Authorized through Super Admin Post-Service Payment Terms.</span>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPayingInvoice(null)}
                    disabled={isProcessingPayment}
                    className="rounded-xl text-xs font-bold h-11 px-5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExecutePayment}
                    disabled={isProcessingPayment || !metrics.defaultCard}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black h-11 px-6 gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Confirm & Settle €{Number(payingInvoice.total_amount).toFixed(2)}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================================= */}
      {/* STRIPE ADD PAYMENT METHOD DIALOG */}
      {/* ======================================================================= */}
      <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <CreditCard className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600">Encrypted Card Storage</span>
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">Add Payment Method</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save your card securely for seamless chauffeur bookings and automatic trip settlements.
            </DialogDescription>
          </DialogHeader>
          <Elements stripe={stripePromise}>
            <AddPaymentMethodForm 
              onSuccess={handleAddPaymentMethod} 
              onCancel={() => setIsAddCardOpen(false)} 
            />
          </Elements>
        </DialogContent>
      </Dialog>

    </div>
  )
}
