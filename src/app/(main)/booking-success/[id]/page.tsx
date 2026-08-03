"use client"
import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Clock, MapPin, Zap, Eye, Download, FileText, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ReceiptModal } from '@/components/booking/receipt-modal'
import { Button } from '@/components/ui/button'

export default function BookingSuccessPage() {
  const { id } = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showReceipt, setShowReceipt] = useState(false)
  const [mounted, setMounted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    async function fetchBooking() {
      if (!id) return
      
      // we lookup the booking in Supabase
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle()
        
      if (data) {
        setBooking(data)
      }
      setLoading(false)
    }
    fetchBooking()
  }, [id, supabase])

  const details = booking?.booking_details || {}
  const ref = booking?.booking_ref || (id ? `TRN-${(id as string).substring(0, 8).toUpperCase()}` : 'TRN-PENDING')
  
  const tripDateTime = useMemo(() => {
    if (details.startDate && details.startTime) {
      return new Date(`${details.startDate}T${details.startTime}`)
    }
    return new Date() // fallback to immediate
  }, [details])

  const timeDiffMs = tripDateTime.getTime() - Date.now()
  const isFuture = timeDiffMs > 2 * 60 * 60 * 1000 // > 2 hours away
  
  const exactVehicles = details.option?.vehicles && Array.isArray(details.option.vehicles)
    ? details.option.vehicles.map((v: any) => `${v.count}x ${v.type}`).join(' + ')
    : booking?.vehicle_type || details.option?.label || 'Premium Fleet'

  const steps = useMemo(() => {
    if (isFuture) {
      return [
        { label: "Confirmed", icon: CheckCircle2, color: '#10b981', status: 'done', text: 'Secured' },
        { label: "Scheduled", icon: Clock, color: '#3b82f6', status: 'active', text: 'Awaiting date' },
        { label: "Dispatch", icon: MapPin, color: '#94a3b8', status: 'pending', text: 'Prior to pickup' },
      ];
    } else {
      return [
        { label: "Confirmed", icon: CheckCircle2, color: '#10b981', status: 'done', text: 'Secured' },
        { label: "Preparing", icon: Zap, color: '#3b82f6', status: 'active', text: 'Vehicle assigned' },
        { label: "En Route", icon: MapPin, color: '#94a3b8', status: 'pending', text: 'Approaching' },
      ];
    }
  }, [isFuture])

  const pickupLabel = isFuture ? 'SCHEDULED FOR' : 'PICKUP ETA'
  const pickupValue = isFuture 
    ? tripDateTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : (details.option?.eta || '10-20 min')
    
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  // State of the art aesthetic
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center py-12 px-4 overflow-hidden relative selection:bg-blue-500/30">
      <style>
        {`
          @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
          @keyframes glowPulse { 0% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } 100% { opacity: 0.5; transform: scale(1); } }
          @keyframes drawLine { from { width: 0; } to { width: 40%; } }
          @keyframes slideUpFade { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .glass-card {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .glass-panel {
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
        `}
      </style>

      {/* Abstract Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" style={{ animation: 'glowPulse 8s infinite ease-in-out' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/20 blur-[150px] pointer-events-none" style={{ animation: 'glowPulse 10s infinite ease-in-out reverse' }} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      <div className="w-full max-w-xl z-10" style={{ animation: 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        {/* Ticket Header */}
        <div className="glass-card rounded-t-[32px] p-10 flex flex-col items-center text-center relative overflow-hidden">
          {/* Success Checkmark with particles */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border border-emerald-500/30 border-t-emerald-500" style={{ animation: 'spinSlow 4s linear infinite' }} />
            <div className="absolute inset-2 rounded-full border border-emerald-500/20 border-b-emerald-500" style={{ animation: 'spinSlow 3s linear infinite reverse' }} />
            <div className="absolute inset-4 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">Booking Confirmed</h1>
          <p className="text-slate-400 font-medium text-[15px] max-w-sm leading-relaxed">
            Your vehicle has been securely reserved. We've sent the complete itinerary to your email.
          </p>
        </div>

        {/* Ticket Divider (Perforated) */}
        <div className="w-full h-8 flex items-center px-4 relative" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(20px)' }}>
           <div className="absolute left-[-16px] w-8 h-8 bg-[#020617] rounded-full" />
           <div className="w-full border-t-2 border-dashed border-slate-700 opacity-50" />
           <div className="absolute right-[-16px] w-8 h-8 bg-[#020617] rounded-full" />
           <div className="absolute inset-0 border-l border-r border-white/10 pointer-events-none" />
        </div>

        {/* Ticket Body */}
        <div className="glass-card rounded-b-[32px] p-8 sm:p-10 border-t-0">
          
          {/* Dynamic Timeline */}
          <div className="glass-panel rounded-2xl p-6 mb-8 relative">
            <div className="flex items-start justify-between relative">
              <div className="absolute top-4 left-6 right-6 h-1 bg-slate-800 rounded-full" />
              <div className="absolute top-4 left-6 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? '40%' : '0%' }} />
              
              {steps.map((s, i) => {
                const Step = s.icon
                return (
                  <div key={i} className="flex flex-col items-center gap-3 relative z-10" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(10px)', transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15 + 0.3}s` }}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-4 ${s.status === 'done' ? 'bg-emerald-500 border-emerald-500/30' : s.status === 'active' ? 'bg-blue-500 border-blue-500/30' : 'bg-slate-800 border-slate-700'}`}>
                      <Step className={`w-4 h-4 ${s.status !== 'pending' ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${s.status !== 'pending' ? 'text-slate-200' : 'text-slate-500'}`}>{s.label}</span>
                      <span className="text-[10px] text-slate-500 font-medium mt-0.5">{s.text}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Booking Ref</span>
              <span className="text-[15px] font-black text-white tracking-tight">{ref}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fleet</span>
              <span className="text-[15px] font-black text-white tracking-tight truncate" title={exactVehicles}>
                {exactVehicles}
              </span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-1 col-span-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{pickupLabel}</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-[15px] font-bold text-white">{pickupValue}</span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3" style={{ animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
            <Button 
              onClick={() => router.push(`/trips/${ref}`)} 
              className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            >
              View Trip Details <ArrowRight className="w-4 h-4" />
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowReceipt(true)}
                className="h-12 bg-slate-800/50 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> PDF Receipt
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="h-12 bg-slate-800/50 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                New Request
              </Button>
            </div>
          </div>
          
        </div>
      </div>

      <ReceiptModal 
        isOpen={showReceipt} 
        onClose={() => setShowReceipt(false)} 
        bookingDetails={{ ...details, ref, isFuture, pickupLabel, pickupValue, price: booking?.price }} 
      />
    </div>
  )
}
