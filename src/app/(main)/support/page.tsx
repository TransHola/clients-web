"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Package, CheckCircle, Clock, ChevronDown, Send, AlertTriangle } from "lucide-react"

const MY_TICKETS = [
  { id: "TKT-001", subject: "Driver arrived late - 25min delay", category: "Complaint", status: "open" as const, date: "2026-03-22", lastUpdate: "2026-03-23" },
  { id: "TKT-002", subject: "Billing dispute for BK-2024-1045", category: "Billing", status: "in_review" as const, date: "2026-03-18", lastUpdate: "2026-03-20" },
  { id: "TKT-003", subject: "Vehicle AC was not working", category: "Complaint", status: "resolved" as const, date: "2026-03-10", lastUpdate: "2026-03-12" },
]

const ticketStatusCfg = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
}

const MOCK_TICKET_MESSAGES: Record<string, { id: string; sender: "user" | "agent"; name: string; avatar?: string; text: string; date: string }[]> = {
  "TKT-001": [
    { id: "m1", sender: "user", name: "You", text: "The driver arrived 25 minutes late for our pickup at the hotel. This caused us to miss our reservation.", date: "2026-03-22 09:14 AM" },
    { id: "m2", sender: "agent", name: "Sarah (Support)", text: "I'm so sorry to hear about the delay. I'm looking into the GPS logs for the driver now to understand what happened. I will get back to you shortly.", date: "2026-03-22 09:30 AM" },
    { id: "m3", sender: "agent", name: "Sarah (Support)", text: "Our records show there was an unexpected road closure on 5th Avenue, but the driver should have communicated this. We are issuing a 15% refund to your original payment method for the inconvenience.", date: "2026-03-23 10:15 AM" }
  ],
  "TKT-002": [
    { id: "m1", sender: "user", name: "You", text: "I was overcharged by $45 for wait time, but we departed exactly on time.", date: "2026-03-18 14:20 PM" },
    { id: "m2", sender: "agent", name: "Billing Team", text: "Hello, we are reviewing your trip logs to verify the departure time. We will update you within 48 hours.", date: "2026-03-19 09:00 AM" }
  ],
  "TKT-003": [
    { id: "m1", sender: "user", name: "You", text: "The AC in the back of the van wasn't working at all. It was very uncomfortable.", date: "2026-03-10 16:45 PM" },
    { id: "m2", sender: "agent", name: "Mike (Support)", text: "I apologize for the discomfort. We have pulled the vehicle from service to inspect the AC unit. As compensation, we have added a $50 credit to your account for your next ride.", date: "2026-03-11 11:20 AM" },
    { id: "m3", sender: "user", name: "You", text: "Thank you, I see the credit. I appreciate the quick response.", date: "2026-03-12 08:15 AM" }
  ]
}

export default function SupportPage() {
  const [category, setCategory] = React.useState("")
  const [lostTrip, setLostTrip] = React.useState("")
  const [description, setDescription] = React.useState("")
  
  const [selectedTicket, setSelectedTicket] = React.useState<typeof MY_TICKETS[0] | null>(null)
  const [replyText, setReplyText] = React.useState("")

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Get help, report issues, or find your lost items.</p>
      </div>

      <Tabs defaultValue="new_ticket" className="flex-col">
        <TabsList className="w-full max-w-md bg-muted/50 rounded-xl h-11 p-1 mb-6">
          <TabsTrigger value="new_ticket" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Open Ticket</TabsTrigger>
          <TabsTrigger value="my_tickets" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">My Tickets</TabsTrigger>
          <TabsTrigger value="lost_found" className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Lost & Found</TabsTrigger>
        </TabsList>

        {/* Open Ticket */}
        <TabsContent value="new_ticket">
          <div className="max-w-3xl mx-auto rounded-2xl border bg-card p-6 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {["Complaint", "Billing", "Technical", "Lost Item", "Safety", "Other"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm font-bold transition-all ${category === c ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "hover:bg-muted/30"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Subject</label>
              <Input placeholder="Brief description of your issue..." className="h-11 rounded-xl" />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Details</label>
              <textarea
                rows={5}
                placeholder="Please describe your issue in detail, including booking references if applicable..."
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            <Button className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Send className="w-4 h-4" /> Submit Ticket
            </Button>
          </div>
        </TabsContent>

        {/* My Tickets */}
        <TabsContent value="my_tickets">
          {selectedTicket ? (
            <div className="max-w-4xl mx-auto flex flex-col h-[650px] border rounded-2xl bg-card overflow-hidden shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:px-6 border-b bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedTicket(null)} className="p-2 -ml-2 rounded-lg hover:bg-slate-200/50 text-slate-500 transition-colors">
                    <ChevronDown className="w-5 h-5 rotate-90" />
                  </button>
                  <div>
                    <h2 className="font-black text-lg text-slate-900 leading-tight">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                      <span>{selectedTicket.id}</span>
                      <span className="text-slate-300">•</span>
                      <span>{selectedTicket.category}</span>
                    </div>
                  </div>
                </div>
                {(() => {
                  const cfg = ticketStatusCfg[selectedTicket.status];
                  const Icon = cfg.icon;
                  return (
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 shrink-0 ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {cfg.label}
                    </span>
                  )
                })()}
              </div>

              {/* Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30">
                {(MOCK_TICKET_MESSAGES[selectedTicket.id] || []).map((msg, idx) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm border ${msg.sender === 'user' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>
                      {msg.name.charAt(0)}
                    </div>
                    <div className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-700">{msg.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{msg.date}</span>
                      </div>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm' : 'bg-white border text-slate-700 rounded-tl-sm shadow-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Area */}
              {selectedTicket.status !== 'resolved' ? (
                <div className="p-4 sm:p-6 border-t bg-white">
                  <div className="flex gap-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      className="flex-1 rounded-xl border bg-muted/20 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                      rows={2}
                    />
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button className="rounded-xl h-full px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <Send className="w-4 h-4 mr-2" /> Send
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" className="text-xs font-bold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 h-8 px-3 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark as Resolved
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-t bg-emerald-50 border-emerald-100 flex items-center justify-center gap-2 text-emerald-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">This ticket has been resolved and closed.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {MY_TICKETS.map((t) => {
                const cfg = ticketStatusCfg[t.status]
                const Icon = cfg.icon
                return (
                  <div key={t.id} onClick={() => setSelectedTicket(t)} className="rounded-2xl border bg-card p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-black text-base truncate">{t.subject}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                          <span className="font-mono">{t.id}</span>
                          <span className="text-slate-300">•</span>
                          <span>{t.category}</span>
                          <span className="text-slate-300">•</span>
                          <span>Updated {t.lastUpdate}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-[140px] shrink-0 gap-3">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 shrink-0 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" /> {cfg.label}
                      </span>
                      <Button size="sm" variant="ghost" className="rounded-lg h-8 text-xs font-bold text-slate-500 hover:bg-slate-100 hidden md:flex">
                        View Details
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Lost & Found */}
        <TabsContent value="lost_found">
          <div className="max-w-3xl mx-auto rounded-2xl border bg-card p-6 space-y-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-800 leading-relaxed">
                Items reported within 24 hours of the trip have the highest recovery rate. Our team will contact the driver immediately upon submission.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Trip / Booking Reference</label>
              <Input placeholder="e.g. BK-2024-1075" className="h-11 rounded-xl" value={lostTrip} onChange={(e) => setLostTrip(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Item Category</label>
              <div className="grid grid-cols-3 gap-2">
                {["Electronics", "Bag / Luggage", "Documents", "Clothing", "Keys", "Other"].map((c) => (
                  <button key={c} className="text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-muted/30">{c}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">Description</label>
              <textarea
                rows={4}
                placeholder="Describe the lost item in detail (colour, brand, size, distinguishing features)..."
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-muted-foreground"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Package className="w-4 h-4" /> Report Lost Item
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
