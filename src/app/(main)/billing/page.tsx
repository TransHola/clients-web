"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, CreditCard, Plus, CheckCircle, AlertCircle, Clock, Trash2, Star, Shield, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// Invoices will be fetched dynamically

const PAYMENT_METHODS = [
  { id: "pm1", type: "Visa", last4: "4242", expiry: "08/27", isDefault: true },
  { id: "pm2", type: "Mastercard", last4: "5353", expiry: "12/25", isDefault: false },
  { id: "pm3", type: "Amex", last4: "3782", expiry: "03/26", isDefault: false },
]

const invoiceStatusCfg: Record<string, any> = {
  paid: { label: "Paid", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  open: { label: "Unpaid", icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200" },
  overdue: { label: "Overdue", icon: AlertCircle, color: "bg-rose-100 text-rose-700 border-rose-200" },
  draft: { label: "Draft", icon: Clock, color: "bg-slate-100 text-slate-700 border-slate-200" },
}

export default function BillingPage() {
  const [invoiceFilter, setInvoiceFilter] = React.useState<"all" | "paid" | "open" | "overdue">("all")
  const [invoices, setInvoices] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadInvoices() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
        if (data) setInvoices(data)
      } catch (err) {
        console.error("Failed to load invoices:", err)
      } finally {
        setLoading(false)
      }
    }
    loadInvoices()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Manage your invoices and payment methods.</p>
      </div>

      <Tabs defaultValue="invoices" className="flex-col">
        <TabsList className="w-full max-w-md bg-muted/50 rounded-xl h-11 p-1 mb-6">
          <TabsTrigger value="invoices" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Invoices</TabsTrigger>
          <TabsTrigger value="payment_methods" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <Tabs defaultValue="all" onValueChange={(v: any) => setInvoiceFilter(v)} className="flex-col">
            <TabsList className="inline-flex bg-muted/50 rounded-xl h-11 p-1 mb-2">
              <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="paid" className="rounded-lg text-xs font-bold px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Paid</TabsTrigger>
              <TabsTrigger value="open" className="rounded-lg text-xs font-bold px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Unpaid</TabsTrigger>
              <TabsTrigger value="overdue" className="rounded-lg text-xs font-bold px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-4" />
                <p className="text-sm font-medium">Loading invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border rounded-2xl border-dashed">
                <FileText className="w-8 h-8 mb-4 text-slate-300" />
                <p className="text-sm font-medium">No invoices found.</p>
              </div>
            ) : invoices.filter(inv => invoiceFilter === "all" || inv.status === invoiceFilter).map((inv) => {
              const cfg = invoiceStatusCfg[inv.status] || invoiceStatusCfg.draft
              const Icon = cfg.icon
              return (
                <div key={inv.id} className="rounded-2xl border bg-card p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                  {/* Left side: Icon & Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-base truncate">{inv.invoice_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-wider flex-wrap">
                        <span className="font-mono">{inv.booking_id ? inv.booking_id.slice(0, 8) : "N/A"}</span>
                        <span className="text-slate-300">•</span>
                        <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Middle side: Description */}
                  <div className="flex-1 w-full min-w-0 bg-muted/30 rounded-xl p-3 border border-dashed hidden lg:flex">
                     <p className="text-sm font-medium text-slate-700 truncate" title={inv.notes || "Trip Services"}>{inv.notes || "Trip Services"}</p>
                  </div>
                  
                  {/* Right side: Amount & Actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-[140px] shrink-0 gap-3">
                    <p className="font-black text-lg leading-none">${Number(inv.total_amount).toFixed(2)}</p>
                    <div className="flex gap-2 w-full md:w-auto">
                       <Button size="sm" variant="outline" className="rounded-lg text-xs font-bold h-8 text-blue-600 hover:bg-blue-50 w-full md:w-auto gap-1">
                         <Download className="w-3 h-3" /> PDF
                       </Button>
                       {(inv.status === "open" || inv.status === "overdue") && (
                          <Button size="sm" className="rounded-lg h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 w-full md:w-auto">Pay</Button>
                       )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="payment_methods">
          <div className="flex flex-col gap-3 mb-5">
            {PAYMENT_METHODS.map((pm) => (
              <div key={pm.id} className={`rounded-2xl border bg-card p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${pm.isDefault ? "border-blue-300 ring-1 ring-blue-200 shadow-sm" : "hover:border-slate-300"}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-inner">
                    <CreditCard className="w-6 h-6 text-white/90" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-black text-base truncate">{pm.type} •••• {pm.last4}</span>
                      {pm.isDefault && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">Default</span>}
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expires {pm.expiry}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  {!pm.isDefault && (
                    <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs font-bold flex-1 md:flex-initial">Set Default</Button>
                  )}
                  <Button size="sm" variant="outline" className="rounded-lg h-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 px-3 w-full md:w-auto">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-start">
            <Button variant="outline" className="rounded-xl h-12 font-bold border-dashed gap-2 px-6">
              <Plus className="w-4 h-4" /> Add Payment Method
            </Button>
          </div>
          <div className="flex items-center justify-start gap-2 mt-4 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" /> All payment data is encrypted and PCI DSS compliant
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
