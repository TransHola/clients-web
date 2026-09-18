"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Car, Clock, MapPin, RefreshCw, Zap, Users, ShieldCheck, FileText, ChevronRight, ChevronLeft, Eye, AlertTriangle, Calendar, CarFront } from "lucide-react"
import { CountdownTimer } from "@/components/quotations/countdown-timer"

import { createClient } from "@/lib/supabase/client"
import { QuotationPanel, PaymentPanel } from "@/components/booking/quotation-panel"
import { ItineraryTimelinePanel } from "@/components/booking/itinerary-timeline-panel"
import { VehicleDetailsPanel } from "@/components/booking/vehicle-details-panel"
import { LiveMapWrapper } from "@/components/map/live-map-wrapper"
import { useRouter } from "next/navigation"

export default function QuotationsPage() {
  const router = useRouter()
  const [quotes, setQuotes] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedQuote, setSelectedQuote] = React.useState<any | null>(null)
  const [viewingTimeline, setViewingTimeline] = React.useState<any | null>(null)
  const [showEditWarning, setShowEditWarning] = React.useState(false)
  const [isCheckingOut, setIsCheckingOut] = React.useState(false)
  const [previewDayIdx, setPreviewDayIdx] = React.useState(0)

  // Reset day index when reviewing a brand new quotation draft
  React.useEffect(() => {
    setPreviewDayIdx(0)
  }, [viewingTimeline])

  React.useEffect(() => {
    async function loadQuotes() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const authUser = session?.user || (await supabase.auth.getUser()).data?.user
        const currentUserId = authUser?.id

        const { data: statusData } = await supabase.from('booking_statuses').select('id').eq('code', 'quotation').maybeSingle()
        
        let query = supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })

        // Check for local storage recent quote refs (e.g. for guest or newly saved quotes)
        const savedRefsStr = typeof window !== 'undefined' ? localStorage.getItem('transhola_recent_quote_refs') : null
        const savedRefs: string[] = savedRefsStr ? JSON.parse(savedRefsStr) : []

        if (currentUserId) {
          if (savedRefs.length > 0) {
            query = query.or(`user_id.eq.${currentUserId},customer_id.eq.${currentUserId},booking_ref.in.(${savedRefs.join(',')})`)
          } else {
            query = query.or(`user_id.eq.${currentUserId},customer_id.eq.${currentUserId}`)
          }
        } else if (savedRefs.length > 0) {
          query = query.in('booking_ref', savedRefs)
        }

        if (statusData?.id) {
          query = query.or(`status_id.eq.${statusData.id},status.eq.quotation,booking_ref.ilike.QTE-%,booking_ref.ilike.Q-%`)
        } else {
          query = query.or(`status.eq.quotation,booking_ref.ilike.QTE-%,booking_ref.ilike.Q-%`)
        }
        
        const { data, error } = await query

        if (error) throw error

        const mapped = (data || []).map((row) => {
          const details = row.booking_details || row.quotation_details || {}
          if (details.option && details.option.priceAED && !details.option.price) {
             details.option.price = details.option.priceAED;
          }
          // Inject actual DB row currency downward into the parsed rawDetails payload
          details.currency = row.currency || "USD";
          
          const expiresAt = new Date(new Date(row.created_at).getTime() + 86400000);
          
          return {
            db_id: row.id,
            id: row.booking_ref || row.ref || `Q-${row.id.substring(0, 8).toUpperCase()}`,
            vehicle: details.option?.label || "Charter Vehicle",
            from: typeof details.pickup === 'string' ? details.pickup : (details.pickup?.name || details.pickup?.address || row.pickup_location || "Unknown Pickup"),
            to: typeof details.dropoff === 'string' ? details.dropoff : (details.dropoff?.name || details.dropoff?.address || row.dropoff_location || "Unknown Dropoff"),
            price: row.price || 0,
            currency: details.currency,
            seats: details.passengers || details.option?.totalSeats || row.vehicle_count || 1,
            eta: details.option?.eta || "N/A",
            isPremium: false,
            status: expiresAt.getTime() < Date.now() ? "expired" : "valid",
            expiresAt: expiresAt,
            createdAt: row.created_at,
            rawDetails: details
          }
        })
        
        setQuotes(mapped)
      } catch (err) {
        console.error("Failed to fetch quotes:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadQuotes()
  }, [])

  const valid = quotes.filter((q) => q.status === "valid")
  const expired = quotes.filter((q) => q.status === "expired")

  const hasActivePanel = !!selectedQuote || !!viewingTimeline

  const renderActivePanel = () => {
    if (selectedQuote) {
      return (
        <div className="flex flex-col h-full bg-zinc-50 overflow-y-auto">
          <QuotationPanel 
            onBack={() => setSelectedQuote(null)}
            onSelect={(id) => {
              if (id) router.push(`/trips/${id}`);
            }}
            passengers={selectedQuote.seats}
            routeDistanceKm={40} // Default or computed via directions API implicitly
            tripType={selectedQuote.rawDetails?.tripType || "one-way"}
            pickupLabel={selectedQuote.from}
            dropoffLabel={selectedQuote.to}
            bookingDetails={{ ...selectedQuote.rawDetails, quotation_db_id: selectedQuote.db_id }}
          />
        </div>
      )
    }

    if (viewingTimeline) {
      const details = viewingTimeline.rawDetails
      
      const isMultiDay = details.tripType === 'multi-day' && details.multiDayStore && details.multiDayStore.length > 0;
      const effPickup = isMultiDay ? details.multiDayStore[previewDayIdx]?.pickupLoc : details.pickup;
      const effDropoff = isMultiDay ? details.multiDayStore[previewDayIdx]?.dropoffLoc : details.dropoff;
      const effStops = isMultiDay ? details.multiDayStore[previewDayIdx]?.stops : details.stops;

      return (
         <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative">
           {/* Top Actions */}
           <div className="p-4 bg-white border-b shrink-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button onClick={() => { setViewingTimeline(null); setIsCheckingOut(false); }} variant="ghost" size="icon" className="lg:hidden shrink-0">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </Button>
                <div>
                  <h2 className="text-base font-black text-slate-800">Itinerary Overview</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{viewingTimeline.id}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="font-bold border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 hidden sm:flex"
                   onClick={() => setShowEditWarning(true)}
                 >
                   ✏️ Edit
                 </Button>
                 <Button
                   size="sm"
                   className="font-bold bg-blue-600 hover:bg-blue-700 text-white px-5"
                   onClick={() => setIsCheckingOut(true)}
                 >
                   Book
                 </Button>
              </div>
           </div>

           {/* Preview Body - Scrollable Area */}
           <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
             
             {/* Map Card */}
             <div className="h-[220px] rounded-[18px] overflow-hidden relative bg-white shadow-sm border border-slate-200 shrink-0">
               <LiveMapWrapper 
                 pickup={effPickup} 
                 dropoff={effDropoff} 
                 stops={effStops || []} 
                 pinsLocked={true} 
               />
             </div>

             {/* Split Cards: Timeline + Vehicle */}
             <div className="flex flex-col xl:flex-row gap-4 shrink-0">
               
               <div className="flex-1 bg-white rounded-[18px] shadow-sm border border-slate-200 flex flex-col min-h-[400px] overflow-hidden">
                 <ItineraryTimelinePanel bookingDetails={details} activeDayIdx={previewDayIdx} onActiveDayChange={setPreviewDayIdx} />
               </div>

               <div className="xl:w-[320px] shrink-0 bg-white rounded-[18px] shadow-sm border border-slate-200 overflow-hidden relative animate-in fade-in slide-in-from-bottom-2">
                 {details.option ? (
                     <VehicleDetailsPanel option={details.option} amenities={details.selectedAmenities || []} adaRequired={details.adaRequired} adaVehicleCount={details.adaVehicleCount} />
                 ) : (
                     <div className="h-full bg-white flex flex-col items-center justify-center p-8 text-center">
                       <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
                       <p className="text-sm text-slate-500 font-bold">No explicit vehicle package selected during quotation.</p>
                     </div>
                 )}
               </div>
               
             </div>
           </div>

           {/* Edit Warning Modal overlay */}
           {showEditWarning && (
             <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 rounded-2xl">
               <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                 <div className="w-12 h-12 rounded-full bg-amber-100 border-4 border-amber-50 flex items-center justify-center mx-auto mb-4">
                   <AlertTriangle className="w-6 h-6 text-amber-600" />
                 </div>
                 <h3 className="text-xl font-black text-slate-900 text-center mb-2">Edit Itinerary</h3>
                 <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                   Modifying this route will discard your currently saved quotation parameters. The system will recalculate live rates.
                 </p>
                 <div className="flex gap-3">
                   <Button variant="outline" className="flex-1 font-bold rounded-xl" onClick={() => setShowEditWarning(false)}>
                     Cancel
                   </Button>
                   <Button className="flex-1 font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white" onClick={() => router.push(`/?quote=${viewingTimeline.db_id}`)}>
                     Proceed
                   </Button>
                 </div>
               </div>
             </div>
           )}

           {/* Local Payment Checkout Modal overlay */}
           {isCheckingOut && details.option && (
             <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200 rounded-2xl">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] h-full max-h-[640px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                 <PaymentPanel 
                   option={details.option} 
                   bookingDetails={{ ...details, quotation_db_id: viewingTimeline.db_id }} 
                   currency={viewingTimeline.currency}
                   onBack={() => setIsCheckingOut(false)} 
                   onConfirm={(id) => {
                     router.push(`/trips/${id || 'TRN-QUOTATION'}`)
                   }}
                 />
               </div>
             </div>
           )}
         </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-none w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[calc(100vh-72px)] relative">
      
      {/* LEFT PANE: List */}
      <div className={`flex flex-col shrink-0 transition-all duration-500 ease-in-out ${hasActivePanel ? 'w-full lg:w-[420px] xl:w-[480px] hidden lg:flex' : 'w-full max-w-7xl mx-auto'}`}>
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">My Quotations</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Review and confirm your pending trip quotes before they expire.
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-slate-400 font-medium">
            <RefreshCw className="w-5 h-5 mr-3 animate-spin text-slate-300" /> Loading quotes...
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-10">
            {/* Valid Quotes */}
            {valid.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Active Quotes ({valid.length})</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {valid.map((q) => (
                    <QuoteCard 
                      key={q.id} 
                      quote={q} 
                      isActive={q.id === viewingTimeline?.id || q.id === selectedQuote?.id}
                      isCompact={hasActivePanel}
                      onSelect={() => { setSelectedQuote(null); setViewingTimeline(q); setIsCheckingOut(true); }}
                      onViewDetails={() => { setSelectedQuote(null); setViewingTimeline(q); setIsCheckingOut(false); }} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Expired Quotes */}
            {expired.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Expired Quotes ({expired.length})</h2>
                </div>
                <div className="flex flex-col gap-3 opacity-75">
                  {expired.map((q) => (
                    <QuoteCard 
                      key={q.id} 
                      quote={q} 
                      isActive={q.id === viewingTimeline?.id || q.id === selectedQuote?.id}
                      isCompact={hasActivePanel}
                      onSelect={() => { setSelectedQuote(null); setViewingTimeline(q); setIsCheckingOut(true); }}
                      onViewDetails={() => { setSelectedQuote(null); setViewingTimeline(q); setIsCheckingOut(false); }} 
                    />
                  ))}
                </div>
              </section>
            )}

            {quotes.length === 0 && (
              <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl bg-white w-full max-w-2xl mx-auto">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="font-bold text-slate-900 text-lg">No quotations yet</p>
                <p className="text-sm text-slate-500 mt-2">Book a service from the home page to get started.</p>
                <Button onClick={() => router.push('/')} className="mt-8 font-bold px-8 py-6 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                  Book a Ride
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANE: Quick Preview (Desktop) */}
      {hasActivePanel && (
        <div className="hidden lg:flex flex-col flex-1 sticky top-6 h-[calc(100vh-48px)] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200 bg-white animate-in zoom-in-95 duration-500 ease-out z-10 origin-right">
           {renderActivePanel()}
        </div>
      )}

      {/* MOBILE FULLSCREEN OVERLAY for active panel */}
      {hasActivePanel && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-right-full duration-300">
          {renderActivePanel()}
        </div>
      )}

    </div>
  )
}

function QuoteCard({ quote, isActive, isCompact, onSelect, onViewDetails }: { quote: any, isActive?: boolean, isCompact?: boolean, onSelect?: () => void, onViewDetails?: () => void }) {
  const [routeDayIdx, setRouteDayIdx] = React.useState(0);
  
  const isExpired = quote.status === "expired"
  const details = quote.rawDetails || {}
  
  const tripDate = details.date || details.pickupDate || (details.multiDayStore ? details.multiDayStore[0]?.dateStr : null) || "Date pending"
  const tripTime = details.time || details.pickupTime || (details.multiDayStore ? details.multiDayStore[0]?.startTime : null) || ""
  const numDays = details.tripType === 'multi-day' && details.multiDayStore ? details.multiDayStore.length : 1;

  const isMultiDay = details.tripType === 'multi-day' && details.multiDayStore && details.multiDayStore.length > 1;
  const currentDay = isMultiDay ? details.multiDayStore[routeDayIdx] : details;

  const defaultFrom = isMultiDay ? (typeof currentDay?.pickupLoc === 'string' ? currentDay.pickupLoc : (currentDay?.pickupLoc?.name || currentDay?.pickupLoc?.address || 'Unknown Pickup')) : quote.from;
  const defaultTo = isMultiDay ? (typeof currentDay?.dropoffLoc === 'string' ? currentDay.dropoffLoc : (currentDay?.dropoffLoc?.name || currentDay?.dropoffLoc?.address || 'Unknown Dropoff')) : quote.to;
  
  const currentStops = isMultiDay ? (currentDay?.stops || []) : (details.stops || []);
  
  if (isCompact) {
    // COMPACT SIDEBAR MODE
    return (
      <div className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 relative overflow-hidden ${isActive ? 'bg-blue-50/30 border-blue-400 shadow-sm z-10' : 'bg-white hover:border-slate-300'} ${isExpired ? "grayscale opacity-80 pointer-events-none" : ""}`}>
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
        
        <div className="flex justify-between items-start gap-2">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <CarFront className="w-6 h-6 text-slate-700" />
              </div>
              <div className="min-w-0">
                 <div className="flex items-center gap-2 mb-0.5">
                   <p className="font-bold text-sm text-slate-900 truncate">{quote.vehicle}</p>
                   {details.isThirdParty && (
                     <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 rounded-md border border-amber-200">Agency</span>
                   )}
                 </div>
                 <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                   {quote.id} • {tripDate}{numDays > 1 ? ` • ${numDays} Days` : ''}
                 </p>
                 {details.isThirdParty && details.thirdPartyInfo && (
                    <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                      For: {details.thirdPartyInfo.firstName} {details.thirdPartyInfo.lastName} {details.thirdPartyInfo.company ? `(${details.thirdPartyInfo.company})` : ''}
                    </p>
                 )}
              </div>
           </div>
           <div className="text-right shrink-0">
              <p className="font-black text-lg text-slate-900 leading-none">{quote.price}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{quote.currency}</p>
           </div>
        </div>
        
        <div className="bg-slate-50/50 rounded-xl flex flex-col border border-slate-100/50 relative overflow-hidden">
           {isMultiDay && (
             <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100/50 bg-slate-100/40">
               <button 
                  disabled={routeDayIdx === 0} 
                  onClick={(e) => { e.stopPropagation(); setRouteDayIdx(Math.max(0, routeDayIdx - 1)) }}
                  className="p-1 hover:bg-white rounded shadow-sm text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:shadow-none transition-all"
               >
                  <ChevronLeft className="w-3 h-3" />
               </button>
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Day {routeDayIdx + 1} of {numDays}
               </span>
               <button 
                  disabled={routeDayIdx === numDays - 1} 
                  onClick={(e) => { e.stopPropagation(); setRouteDayIdx(Math.min(numDays - 1, routeDayIdx + 1)) }}
                  className="p-1 hover:bg-white rounded shadow-sm text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:shadow-none transition-all"
               >
                  <ChevronRight className="w-3 h-3" />
               </button>
             </div>
           )}
           <div className="p-3 flex flex-col gap-2 relative">
              <div className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0 mt-1" />
                 <p className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2">{defaultFrom}</p>
              </div>
              
              {currentStops.length > 0 && (
                <div className="flex items-center gap-2 pl-[3px]">
                   <div className="w-0.5 h-3 bg-slate-200" />
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{currentStops.length} stop{currentStops.length > 1 ? 's' : ''}</p>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                 <p className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2">{defaultTo}</p>
              </div>
           </div>
        </div>
        
        <div className="flex justify-between items-center pt-1">
           {isExpired ? (
             <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Expired</span>
           ) : (
             <span className="text-[11px] font-bold text-amber-600"><CountdownTimer expiresAt={quote.expiresAt} /></span>
           )}
           <div className="flex gap-2">
              {isExpired ? (
                 <Button size="sm" variant="outline" className="h-8 text-xs font-bold px-3" onClick={onViewDetails}>Reinstate</Button>
              ) : (
                 <>
                   {!isActive && <Button size="sm" variant="secondary" className="h-8 text-xs font-bold px-3 bg-slate-100 text-slate-700" onClick={onViewDetails}>Preview</Button>}
                   <Button size="sm" className="h-8 text-xs font-bold px-4 bg-slate-900 text-white" onClick={onSelect}>Book</Button>
                 </>
              )}
           </div>
        </div>
      </div>
    )
  }

  // FULL WIDTH HORIZONTAL MODE
  return (
    <div className={`rounded-xl border p-4 sm:px-6 flex flex-col xl:flex-row items-center gap-6 xl:gap-8 transition-all duration-300 relative overflow-hidden bg-white hover:border-slate-300 hover:shadow-md ${isExpired ? "grayscale opacity-75 pointer-events-none" : ""}`}>
      
      {/* Vehicle Block */}
      <div className="flex items-center gap-4 w-full xl:w-[320px] shrink-0">
         <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
            <CarFront className="w-6 h-6 text-slate-600" />
         </div>
         <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
               <p className="font-bold text-slate-900 truncate leading-tight text-base">{quote.vehicle}</p>
               {details.isThirdParty && (
                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 rounded-md border border-amber-200">Agency</span>
               )}
            </div>
            {details.isThirdParty && details.thirdPartyInfo && (
               <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                 For: {details.thirdPartyInfo.firstName} {details.thirdPartyInfo.lastName} {details.thirdPartyInfo.company ? `(${details.thirdPartyInfo.company})` : ''}
               </p>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs font-bold text-slate-400 mt-1">
               <span className="uppercase tracking-wider whitespace-nowrap">{quote.id}</span>
               <span className="text-slate-300">•</span>
               <span className="flex items-center gap-1 whitespace-nowrap"><Users className="w-3 h-3" /> {quote.seats}</span>
               {numDays > 1 && (
                 <>
                   <span className="text-slate-300">•</span>
                   <span className="flex items-center gap-1 whitespace-nowrap"><Calendar className="w-3 h-3 text-blue-500" /> <span className="text-blue-600">{numDays} Days</span></span>
                 </>
               )}
            </div>
         </div>
      </div>
      
      {/* Route Block */}
      <div className="flex-1 min-w-0 flex flex-col justify-center xl:border-l xl:border-r border-slate-100 xl:px-8 shrink-0 relative">
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
      
      {/* Meta Date Block */}
      <div className="w-full xl:w-[140px] shrink-0 hidden md:block">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Schedule</p>
         <p className="text-sm font-bold text-slate-900 truncate">{tripDate}</p>
         {tripTime && <p className="text-xs font-bold text-slate-500 truncate">{tripTime}</p>}
      </div>

      {/* Price Block */}
      <div className="w-full xl:w-[120px] shrink-0 xl:text-right hidden sm:block">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
         <div className="flex items-baseline xl:justify-end gap-1">
            <p className="text-2xl font-black text-slate-900 leading-none">{quote.price}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">{quote.currency}</p>
         </div>
         {!isExpired && <p className="text-[10px] font-bold text-amber-600 mt-1"><CountdownTimer expiresAt={quote.expiresAt} /></p>}
         {isExpired && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase">Expired</p>}
      </div>
      
      {/* Actions */}
      <div className="flex xl:flex-col gap-2 w-full xl:w-[140px] shrink-0">
         {isExpired ? (
            <Button size="sm" variant="outline" className="w-full font-bold h-10 rounded-xl" onClick={onViewDetails}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Reinstate
            </Button>
         ) : (
            <>
               <Button size="sm" className="w-full font-bold h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white" onClick={onSelect}>
                  Book Now
               </Button>
               <Button size="sm" variant="outline" className="w-full font-bold h-10 rounded-xl text-slate-600" onClick={onViewDetails}>
                  Preview Info
               </Button>
            </>
         )}
      </div>
    </div>
  )
}

