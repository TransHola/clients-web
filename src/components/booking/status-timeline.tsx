"use client"

import * as React from "react"
import { Check, Loader2, MapPin, X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReceiptModal } from "./receipt-modal"

export function StatusTimeline({ serviceMode = "scheduled" }: { serviceMode?: "scheduled" | "asap" }) {
  const [stage, setStage] = React.useState(0) // 0: Searching, 1: Found, 2: Driver En Route (for ASAP mode)
  const [showReceipt, setShowReceipt] = React.useState(false)

  // Simulate ASAP flow
  React.useEffect(() => {
    if (serviceMode === "asap") {
      const timer1 = setTimeout(() => setStage(1), 3000)
      const timer2 = setTimeout(() => setStage(2), 6000)
      return () => { clearTimeout(timer1); clearTimeout(timer2) }
    }
  }, [serviceMode])

  if (serviceMode === "scheduled") {
    return (
      <div className="flex flex-col h-full bg-white relative overflow-hidden items-center justify-center p-8">
        {/* Animated Background Confetti/Glow could go here */}

        <div className="flex flex-col items-center justify-center text-center max-w-lg w-full">
          
           {/* Big Success Icon */}
           <div className="w-24 h-24 rounded-full bg-green-100 border-[3px] border-green-500 flex items-center justify-center mb-8 shadow-xs animate-in zoom-in duration-500">
             <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Check className="w-6 h-6 text-white stroke-[3px]" />
             </div>
           </div>

           {/* Headings */}
           <h2 className="text-[32px] font-black tracking-tight text-slate-900 mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
             Booking Confirmed!
           </h2>
           <p className="text-slate-500 text-[15px] font-medium mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
             Your booking is confirmed. Confirmation sent to your email.
           </p>

           {/* 3-Step Horizontal Timeline */}
           <div className="flex items-start justify-between w-full relative mb-16 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              
              {/* Connector Lines (Absolute) */}
              <div className="absolute top-[20px] left-[50px] right-[50%] h-[3px] bg-blue-600 rounded-full" />
              <div className="absolute top-[20px] left-[50%] right-[50px] h-[3px] bg-purple-500 rounded-full" />

              {/* Step 1: Booking Confirmed */}
              <div className="flex flex-col items-center relative z-10 w-24">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-md mb-3 ring-4 ring-white">
                  <div className="w-4 h-4 rounded-full border border-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                  </div>
                </div>
                <span className="text-[13px] font-bold text-green-600 text-center leading-tight">Booking<br/>Confirmed</span>
              </div>

              {/* Step 2: Driver Assigned */}
              <div className="flex flex-col items-center relative z-10 w-24">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-md mb-3 ring-4 ring-white">
                   <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-[13px] font-bold text-blue-600 text-center leading-tight">Driver<br/>Assigned</span>
                <span className="text-[10px] font-bold text-slate-400 mt-2 bg-slate-100 px-2 py-1 rounded-md text-center max-w-[100px]">Pending 24h prior</span>
              </div>

              {/* Step 3: En Route */}
              <div className="flex flex-col items-center relative z-10 w-24">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shadow-md mb-3 ring-4 ring-white">
                   <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="text-[13px] font-bold text-purple-600 text-center leading-tight">En Route</span>
              </div>

           </div>

           <Button 
             onClick={() => setShowReceipt(true)}
             variant="outline" 
             className="w-full text-slate-700 border-slate-200 hover:bg-slate-50 font-bold h-12 rounded-xl text-[15px] animate-in fade-in duration-700 delay-300"
           >
             View Receipt &amp; Details
           </Button>

        </div>
        
        <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} />
      </div>
    )
  }

  // --- ASAP MODE (Legacy Dispatch Flow) ---
  return (
    <div className="flex flex-col h-full bg-card">
       {/* Animated Header */}
       <div className="flex flex-col items-center justify-center p-12 shrink-0 border-b bg-brand-blue text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          
          {stage === 0 && (
            <>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 relative">
                 <span className="absolute w-full h-full rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                 <MapPin className="w-6 h-6 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-center">Finding your Operator...</h2>
              <p className="text-sm font-medium text-white/70 mt-2 text-center">Scanning verified active fleets nearby</p>
            </>
          )}

          {stage >= 1 && (
            <>
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/50 scale-in-center">
                 <Check className="w-8 h-8 text-white stroke-[3px]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-center">Booking Confirmed!</h2>
              <p className="text-sm font-medium text-emerald-100 mt-2 text-center">Apex Luxury Transit accepted your request.</p>
            </>
          )}
       </div>

       {/* Timeline Body */}
       <div className="flex-1 overflow-y-auto p-8 border-t border-t-white/10 bg-muted/10">
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border z-0">
             
             <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active z-10">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-brand-blue text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                   <Check className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded-2xl shadow-sm border">
                   <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">Quote Reserved</div>
                      <time className="text-[10px] font-bold text-muted-foreground uppercase">10:41 AM</time>
                   </div>
                   <div className="text-xs text-muted-foreground mt-2">Trip pricing locked and payment authorized. Escrow holds secured.</div>
                </div>
             </div>

             <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active z-10">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors ${stage >= 1 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                   {stage >= 1 ? <Check className="w-4 h-4" /> : <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded-2xl shadow-sm border transition-opacity ${stage >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                   <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">Operator Confirmed</div>
                      <time className="text-[10px] font-bold text-muted-foreground uppercase">{stage >= 1 ? '10:42 AM' : '--:--'}</time>
                   </div>
                   <div className="text-xs text-muted-foreground mt-2">Fleet Operator received strict SLA and dispatch request.</div>
                </div>
             </div>

             <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active z-10">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors ${stage >= 2 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                   {stage >= 2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded-2xl shadow-sm border transition-opacity ${stage >= 2 ? 'opacity-100 border-amber-500/30 ring-2 ring-amber-500/10' : 'opacity-40'}`}>
                   <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">Driver En Route</div>
                      <time className="text-[10px] font-bold text-amber-600 uppercase">Live</time>
                   </div>
                   <div className="text-xs text-muted-foreground mt-2">Driver is heading to Corporate HQ via Highway 101.</div>
                </div>
             </div>

          </div>
       </div>

       {/* Footer */}
       <div className="mt-auto p-6 border-t bg-background">
          <Button variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 font-bold h-12 rounded-xl">
            Cancel Reservation
          </Button>
       </div>
    </div>
  )
}
