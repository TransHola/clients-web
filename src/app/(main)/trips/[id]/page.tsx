"use client"

import * as React from "react"
import { Check, CheckCircle2, MapPin, Users, Calendar, Clock, CreditCard, ChevronRight, FileText, Share, Download, Building2, CarFront, Contact, AlertTriangle, Banknote, MessageCircle, X, History, Scale, Activity, ChevronLeft, Sparkles } from "lucide-react"
import { LiveMapWrapper } from "@/components/map/live-map-wrapper"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export default function TripProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const router = useRouter();
  
  const [data, setData] = React.useState<any>(null);
  const [dispatchInfo, setDispatchInfo] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Chat State
  const [messages, setMessages] = React.useState<any[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [activeDayIdx, setActiveDayIdx] = React.useState(0);

  const hasUnread = messages.some(m => m.role !== 'client' && !m.read_at);

  React.useEffect(() => {
     if (isChatOpen && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
     }
     
     if (isChatOpen && hasUnread) {
        const unreadIds = messages.filter(m => m.role !== 'client' && !m.read_at).map(m => m.id);
        if (unreadIds.length > 0) {
            const supabase = createClient();
            supabase.from('booking_conversations')
              .update({ read: true, read_at: new Date().toISOString() })
              .in('id', unreadIds)
              .then(() => {});
        }
     }
  }, [messages, isChatOpen, hasUnread]);

  React.useEffect(() => {
    const fetchBooking = async () => {
      try {
        // Attempt to fetch from DB
        const supabase = createClient();
        const { data: dbBooking, error } = await supabase
           .from('bookings')
           .select('*')
           .eq('id', unwrappedParams.id)
           .maybeSingle();

        if (dbBooking && dbBooking.booking_details) {
           setData({
              bookingDetails: dbBooking.booking_details,
              option: dbBooking.booking_details.option || null,
              ref: unwrappedParams.id,
              booking_id: dbBooking.id
           });
           setIsLoading(false);
           return;
        }
      } catch (err) {
        console.warn("[Trip Profile] DB Fetch error, falling back locally:", err);
      }

      // Fallback to local storage if DB didn't work and we didn't return early
      try {
        const stored = localStorage.getItem("transhola_recent_booking");
        if (stored) {
          setData(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
      
      setIsLoading(false);
    };

    fetchBooking();
  }, [unwrappedParams.id]);

  React.useEffect(() => {
    if (!data?.booking_id) return;
    const supabase = createClient();
    
    // Initial fetch
    supabase.from("dispatch_assignments").select(`
      *,
      company:company_id ( company_name, support_contact, logo_url ),
      driver:driver_id ( first_name, last_name, phone ),
      vehicle:vehicle_id ( make, model, license_plate )
    `).eq("booking_id", data.booking_id).single().then(({ data: assignment, error }) => {
      if (assignment) setDispatchInfo(assignment);
      if (error && error.code !== "PGRST116") console.error("Initial Fetch error:", error);
    });

    // Realtime sub
    const channel = supabase.channel('realtime_dispatch')
      .on('postgres_changes', { 
         event: '*', 
         schema: 'public', 
         table: 'dispatch_assignments',
         filter: `booking_id=eq.${data.booking_id}` 
      }, async (payload) => {
         if (payload.new && (payload.new as any).id) {
           const { data: assignment } = await supabase.from("dispatch_assignments").select(`
              *,
              company:company_id ( company_name, support_contact, logo_url ),
              driver:driver_id ( first_name, last_name, phone ),
              vehicle:vehicle_id ( make, model, license_plate )
           `).eq("id", (payload.new as any).id).single();
           if (assignment) setDispatchInfo(assignment);
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.booking_id]);

  // Chat Effect
  React.useEffect(() => {
    if (!data?.booking_id) return;
    const supabase = createClient();
    
    supabase.from('booking_conversations').select('*').eq('booking_id', data.booking_id).order('created_at', { ascending: true })
       .then(({ data: msgs }) => { if (msgs) setMessages(msgs) });
       
    const chatChannel = supabase.channel(`client_chat_${data.booking_id}`)
      .on('postgres_changes', { 
         event: '*', 
         schema: 'public', 
         table: 'booking_conversations',
         filter: `booking_id=eq.${data.booking_id}` 
      }, (payload) => {
         if (payload.eventType === 'INSERT') {
             setMessages(prev => {
                if (prev.some(p => p.id === payload.new.id)) return prev;
                return [...prev, payload.new];
             });
         } else if (payload.eventType === 'UPDATE') {
             setMessages(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [data?.booking_id]);

  const sendMessage = async () => {
     if (!newMessage.trim() || !data?.booking_id) return;
     const text = newMessage;
     setNewMessage("");
     const supabase = createClient();
     
     await supabase.from('booking_conversations').insert({
         booking_id: data.booking_id,
         sender: "Client",
         role: "client",
         text: text,
         channel: "secure",
         read: false
     });
  };

  const rawId = data?.bookingDetails?.ref || data?.ref || data?.bookingDetails?.confirmation_id || data?.confirmation_id || unwrappedParams.id || data?.id || "PENDING";
  let confirmationNumber = rawId;
  if (confirmationNumber.length > 20) {
      // It's likely a UUID or T-UUID
      const pureId = confirmationNumber.replace(/^(BK-|T-)/, '');
      confirmationNumber = `T-${pureId.substring(0, 6).toUpperCase()}`;
  } else if (!confirmationNumber.startsWith('BK-') && !confirmationNumber.startsWith('T-')) {
      confirmationNumber = `T-${String(rawId).substring(0, 6).toUpperCase()}`;
  }
  
  const pName = data?.bookingDetails?.pickup?.name || data?.bookingDetails?.pickup?.address?.split(',')[0] || "Confirming Pickup Location...";
  const pAddr = data?.bookingDetails?.pickup?.address || "Address pending";
  
  const dName = data?.bookingDetails?.dropoff?.name || data?.bookingDetails?.dropoff?.address?.split(',')[0] || "Confirming Dropoff Location...";
  const dAddr = data?.bookingDetails?.dropoff?.address || "Address pending";

  const tDate = data?.bookingDetails?.tripType === 'multi-day' && data?.bookingDetails?.multiDayStore?.length > 1
    ? `Multiple Days (${data.bookingDetails.multiDayStore.length} Days)`
    : data?.bookingDetails?.startDate || "Date pending";
  const tTime = data?.bookingDetails?.tripType === 'multi-day' && data?.bookingDetails?.multiDayStore?.length > 1
    ? 'Varied per day'
    : data?.bookingDetails?.startTime || "Time pending";

  const vLabel = data?.option?.title || "Evaluating Fleet...";
  const vCount = data?.option?.vehicles?.reduce((acc: number, v: any) => acc + v.count, 0) || 1;
  const pCount = data?.bookingDetails?.passengers || 0;

  const distKm = data?.bookingDetails?.routeDistance ? Math.round(data.bookingDetails.routeDistance / 1000) : (data?.option?.routeDistanceKm || 0);
  const durMin = data?.bookingDetails?.routeDuration ? Math.round(data.bookingDetails.routeDuration / 60) : 0;

  const txnId = data?.transaction_id || data?.bookingDetails?.paymentIntentId || `TXN-${confirmationNumber.split('-')[1] || Math.floor(Math.random()*10000)}`;
  const paymentMethod = data?.payment_method || data?.bookingDetails?.paymentMethod || "Visa •••• 4242";
  const pmtConfId = data?.payment_confirmation_id || data?.bookingDetails?.receiptNumber || `PAY-${Math.floor(Math.random()*1000000)}`;

  if (isLoading) {
     return (
       <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Securing Trip Confirmation...</p>
         </div>
       </div>
     )
  }

  if (!data) {
     return (
       <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
         <div style={{ textAlign: 'center', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <div style={{ padding: '16px', background: '#ffe4e6', borderRadius: '50%', marginBottom: '24px' }}>
              <AlertTriangle style={{ width: '32px', height: '32px', color: '#e11d48' }} />
           </div>
           <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Trip Overview Unavailable</h2>
           <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>This session's detailed itinerary has expired or was accessed on another device. Your core reservation remains secured in our database.</p>
           <button onClick={() => window.location.href = '/dashboard'} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Return Home</button>
         </div>
       </div>
     )
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 py-10 px-6 flex justify-center">
      <div className="w-full max-w-[1200px] flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push("/trips")} className="h-10 w-10 shrink-0 rounded-full">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight">{confirmationNumber}</h1>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-black tracking-widest text-[10px] rounded-full px-2 py-0.5 outline-none">
                            {dispatchInfo?.status === 'completed' ? 'Completed' : 'Confirmed'}
                        </span>
                    </div>
                    <p className="text-muted-foreground font-medium mt-1">
                        {dispatchInfo?.status === 'assigned' && dispatchInfo?.company ? `Operated by ${dispatchInfo.company.company_name}` : 'Awaiting Fleet Assignment'} &bull; {data?.bookingDetails?.tripType === 'multi-day' ? 'Multi-Day Itinerary' : 'One Way'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Total Price</p>
                    <p className="text-2xl font-black text-foreground">
                        {data?.currency || data?.bookingDetails?.currency || "USD"} {data?.price || data?.total_amount || data?.bookingDetails?.option?.price || data?.bookingDetails?.option?.priceAED || '0.00'}
                    </p>
                </div>
            </div>
        </div>

        {/* Main Content Split: Tabs Layout */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={(val) => setIsChatOpen(val === "chat")}>
          <TabsList className="h-auto bg-transparent border-b w-full justify-start rounded-none p-0 gap-6 overflow-x-auto hide-scrollbar">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 font-bold text-sm">
                  <Sparkles className="h-4 w-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 font-bold text-sm">
                  <Activity className="h-4 w-4 mr-2" /> Activity
              </TabsTrigger>
              <TabsTrigger value="billing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 font-bold text-sm">
                  <Banknote className="h-4 w-4 mr-2" /> Billing
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 font-bold text-sm relative">
                  <Users className="h-4 w-4 mr-2" /> Client & Comm
                  {hasUnread && (
                      <span className="absolute top-2 right-0 w-2 h-2 rounded-full bg-red-500" />
                  )}
              </TabsTrigger>
              <TabsTrigger value="legal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 font-bold text-sm">
                  <Scale className="h-4 w-4 mr-2" /> Agreements
              </TabsTrigger>
              <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 font-bold text-sm">
                  <History className="h-4 w-4 mr-2" /> Logs
              </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6 items-start">
           
           {/* Left Column */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                 {(() => {
                    const multiDayArr = data?.bookingDetails?.tripType === 'multi-day' ? (data.bookingDetails.multiDayStore && data.bookingDetails.multiDayStore.length > 0 ? data.bookingDetails.multiDayStore : [
                          {
                              pickupValue: typeof data.bookingDetails.pickup === 'object' ? data.bookingDetails.pickup.address : (data.bookingDetails.pickup || data.pickup_location || "Day 1 Pickup"),
                              dropoffValue: typeof data.bookingDetails.dropoff === 'object' ? data.bookingDetails.dropoff.address : (data.bookingDetails.dropoff || data.dropoff_location || "Day 1 Dropoff"),
                              dateStr: tDate || "Start",
                              startTime: tTime
                          },
                          {
                              pickupValue: typeof data.bookingDetails.dropoff === 'object' ? data.bookingDetails.dropoff.address : (data.bookingDetails.dropoff || data.dropoff_location || "Day 2 Pickup"),
                              dropoffValue: typeof data.bookingDetails.pickup === 'object' ? data.bookingDetails.pickup.address : (data.bookingDetails.pickup || data.pickup_location || "Day 2 Dropoff"),
                              dateStr: data?.bookingDetails?.endDate || "Return",
                              endTime: tTime
                          }
                    ]) : null;
                    
                    const isMulti = !!multiDayArr;
                    const activeDay = isMulti ? multiDayArr[activeDayIdx] : null;
                    
                    let pLoc = data?.bookingDetails?.pickup;
                    let dLoc = data?.bookingDetails?.dropoff;
                    if (isMulti) {
                        pLoc = activeDay.pickupLoc || { address: activeDay.pickupValue };
                        dLoc = activeDay.dropoffLoc || { address: activeDay.dropoffValue };
                        // Fallback logic for coordinates if missing
                        if (!pLoc.lat && activeDayIdx === 0) pLoc = data?.bookingDetails?.pickup;
                        if (!dLoc.lat && activeDayIdx === 0) dLoc = data?.bookingDetails?.dropoff;
                        if (!pLoc.lat && activeDayIdx > 0) pLoc = data?.bookingDetails?.dropoff;
                        if (!dLoc.lat && activeDayIdx > 0) dLoc = data?.bookingDetails?.pickup;
                    }
                    
                    return (
                      <>
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                           <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <MapPin style={{ width: '18px', height: '18px', color: '#64748b' }} />
                             Route Details
                           </h3>
                           
                           {isMulti && (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px' }}>
                                 <button 
                                    onClick={() => setActiveDayIdx(p => Math.max(0, p - 1))} 
                                    disabled={activeDayIdx === 0}
                                    style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: activeDayIdx === 0 ? 'default' : 'pointer', opacity: activeDayIdx === 0 ? 0.3 : 1 }}
                                 >
                                     <ChevronLeft style={{ width: '16px', height: '16px', color: '#0f172a' }} />
                                 </button>
                                 <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', padding: '0 4px' }}>Day {activeDayIdx + 1} of {multiDayArr.length}</span>
                                 <button 
                                    onClick={() => setActiveDayIdx(p => Math.min(multiDayArr.length - 1, p + 1))} 
                                    disabled={activeDayIdx === multiDayArr.length - 1}
                                    style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: activeDayIdx === multiDayArr.length - 1 ? 'default' : 'pointer', opacity: activeDayIdx === multiDayArr.length - 1 ? 0.3 : 1 }}
                                 >
                                     <ChevronRight style={{ width: '16px', height: '16px', color: '#0f172a' }} />
                                 </button>
                             </div>
                           )}
                         </div>
                         
                         {/* Exact Real Map Route Preview (Static Mode) */}
                         <div style={{ width: '100%', height: '220px', background: '#f1f5f9', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '1px solid #e2e8f0', pointerEvents: 'none', marginBottom: '32px' }}>
                            {pLoc && dLoc ? (
                              <LiveMapWrapper 
                                pickup={pLoc} 
                                dropoff={dLoc} 
                                pinsLocked={true} 
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}>
                                <MapPin style={{ color: '#94a3b8', width: '32px', height: '32px' }} />
                              </div>
                            )}
              
                            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                              <div style={{ background: 'white', padding: '8px 16px', borderRadius: '99px', display: 'flex', gap: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Est. Time</span>
                                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{isMulti && activeDay.routeDuration ? Math.round(activeDay.routeDuration / 60) : durMin} mins</span>
                                </div>
                                <div style={{ width: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Distance</span>
                                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{isMulti && activeDay.routeDistance ? Math.round(activeDay.routeDistance / 1000) : distKm} km</span>
                                </div>
                              </div>
                            </div>
                         </div>
        
                         <div style={{ position: 'relative' }}>
                            {isMulti ? (() => {
                               const day = activeDay;
                               const pN = day.pickupLoc?.name || day.pickupLoc?.address?.split(',')[0] || day.pickupValue;
                               const pA = day.pickupLoc?.address || "";
                               const dN = day.dropoffLoc?.name || day.dropoffLoc?.address?.split(',')[0] || day.dropoffValue;
                               const dA = day.dropoffLoc?.address || "";
                                const ds = day.dateStr || "";
                                const displayDate = ds.replace(/^(Day \d+) • \1$/, "$1");
                                
                               return (
                                  <div>
                                     <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb', margin: '0 0 16px 0' }}>{displayDate}</h4>
                                     <div style={{ position: 'relative', paddingLeft: '24px' }}>
                                        <div style={{ position: 'absolute', top: '8px', bottom: '8px', left: '7px', width: '2px', background: '#e2e8f0' }} />
                                        <div style={{ position: 'relative', marginBottom: '24px' }}>
                                           <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '12px', height: '12px', borderRadius: '50%', background: '#0f172a', border: '3px solid white', boxShadow: '0 0 0 1px #0f172a' }} />
                                           <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Pickup • {day.startTime}</p>
                                           <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{pN || 'Pending'}</p>
                                           <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{pA}</p>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                           <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '12px', height: '12px', background: '#2563eb', border: '3px solid white', boxShadow: '0 0 0 1px #2563eb' }} />
                                           <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Dropoff • {day.endTime || 'Flexible'}</p>
                                           <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{dN || 'Pending'}</p>
                                           <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{dA}</p>
                                        </div>
                                     </div>
                                  </div>
                               )
                            })() : (
                               <div style={{ position: 'relative', paddingLeft: '24px' }}>
                                  <div style={{ position: 'absolute', top: '8px', bottom: '8px', left: '7px', width: '2px', background: '#e2e8f0' }} />
                          
                          <div style={{ position: 'relative', marginBottom: '24px' }}>
                             <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '12px', height: '12px', borderRadius: '50%', background: '#0f172a', border: '3px solid white', boxShadow: '0 0 0 1px #0f172a' }} />
                             <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Pickup</p>
                             <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{pName}</p>
                             <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{pAddr}</p>
                          </div>
                          
                          {data?.bookingDetails?.stops?.length > 0 && data.bookingDetails.stops.map((st: any, i: number) => (
                             <div key={st.id} style={{ position: 'relative', marginBottom: '24px' }}>
                                <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', border: '3px solid #64748b', boxShadow: '0 0 0 1px white' }} />
                                <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Stop {i+1} • {st.stopDurationMin} min</p>
                                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{st.loc?.name || st.loc?.address?.split(',')[0] || st.address || 'Pending'}</p>
                             </div>
                          ))}
                          
                          <div style={{ position: 'relative', marginBottom: data?.bookingDetails?.tripType === 'roundtrip' ? '32px' : '0' }}>
                             <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '12px', height: '12px', background: '#2563eb', border: '3px solid white', boxShadow: '0 0 0 1px #2563eb' }} />
                             <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Dropoff</p>
                             <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{dName}</p>
                             <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{dAddr}</p>
                          </div>
  
                          {data?.bookingDetails?.tripType === 'roundtrip' && (
                             <div style={{ position: 'relative' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#8b5cf6', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Return Leg • {data?.bookingDetails?.endDate}</h4>
                                <div style={{ position: 'relative', marginBottom: '24px' }}>
                                   <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '12px', height: '12px', borderRadius: '50%', background: '#0f172a', border: '3px solid white', boxShadow: '0 0 0 1px #0f172a' }} />
                                   <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Pickup • {data?.bookingDetails?.endTime}</p>
                                   <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{dName}</p>
                                   <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{dAddr}</p>
                                </div>
                                <div style={{ position: 'relative' }}>
                                   <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '12px', height: '12px', background: '#2563eb', border: '3px solid white', boxShadow: '0 0 0 1px #2563eb' }} />
                                   <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Dropoff</p>
                                   <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{pName}</p>
                                   <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{pAddr}</p>
                                </div>
                             </div>
                          )}
                        </div>
                    )}
                 </div>
               </>
               );
             })()}
             </div>
           </div>

           {/* Right Column */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                 <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <FileText style={{ width: '18px', height: '18px', color: '#64748b' }} />
                   Booking Overview
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                         <Calendar style={{ width: '16px', height: '16px' }} />
                         <span style={{ fontSize: '13px', fontWeight: 600 }}>Date</span>
                       </div>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{tDate}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                         <Clock style={{ width: '16px', height: '16px' }} />
                         <span style={{ fontSize: '13px', fontWeight: 600 }}>Pickup Time</span>
                       </div>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{tTime}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                         <CarFront style={{ width: '16px', height: '16px' }} />
                         <span style={{ fontSize: '13px', fontWeight: 600 }}>Vehicles</span>
                       </div>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{vCount}x {data?.option?.vehicles ? 'Mixed Fleet' : vLabel}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                         <Users style={{ width: '16px', height: '16px' }} />
                         <span style={{ fontSize: '13px', fontWeight: 600 }}>Passengers</span>
                       </div>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{pCount} Guests</span>
                    </div>
                 </div>
              </div>

              {/* Multiple Vehicles Breakdown */}
              {data?.option?.vehicles && data.option.vehicles.length > 0 && (
                <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CarFront style={{ width: '18px', height: '18px', color: '#64748b' }} />
                    Fleet Assignment
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {data.option.vehicles.map((v: any, idx: number) => (
                       <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                         <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'white', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                            <CarFront style={{ width: '28px', height: '28px', color: '#475569' }} />
                         </div>
                         <div style={{ flex: 1 }}>
                           <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>x{v.count} {v.title || v.name || v.type.toUpperCase() || vLabel}</p>
                           <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: 500 }}>Capacity: {v.seats || v.pax || pCount} Passengers</p>
                         </div>
                       </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Info Card */}
              <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                 <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Banknote style={{ width: '18px', height: '18px', color: '#64748b' }} />
                   Payment Details
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                       <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Confirmation ID</span>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{pmtConfId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                       <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Transaction ID</span>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{txnId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                       <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Payment Method</span>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CreditCard style={{ width: '14px', height: '14px', color: '#64748b' }} /> {paymentMethod}
                       </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Total Paid</span>
                       <span style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>
                          {data?.currency || data?.bookingDetails?.currency || "USD"} {data?.price || data?.total_amount || data?.bookingDetails?.option?.price || data?.bookingDetails?.option?.priceAED || '0.00'}
                       </span>
                    </div>
                 </div>
              </div>
               {/* Live Chat Support removed from here */}
            </div>
          </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="bg-white rounded-2xl p-8 border shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
               <Activity className="w-12 h-12 text-slate-300 mb-4" />
               <h3 className="text-xl font-bold text-slate-900 mb-2">Trip Activity</h3>
               <p className="text-slate-500 max-w-sm">No activity recorded yet. Detailed milestone tracking will appear here once the trip commences.</p>
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="bg-white rounded-2xl p-8 border shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
               <Banknote className="w-12 h-12 text-slate-300 mb-4" />
               <h3 className="text-xl font-bold text-slate-900 mb-2">Billing Details</h3>
               <p className="text-slate-500 max-w-sm">Detailed invoices, additional charges, and payment history will be available here.</p>
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <div className="bg-white rounded-2xl border shadow-sm h-[600px] flex flex-col overflow-hidden">
               <div className="p-4 bg-primary flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                     </div>
                     <div>
                        <h3 className="font-bold text-white leading-tight">Dedicated Support Chat</h3>
                        <p className="text-xs text-blue-100 font-medium">Chat with Fleet Operator & Transhola Admin</p>
                     </div>
                  </div>
               </div>
               <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-slate-50" id="tab-messages">
                  {messages.length === 0 && (
                     <div className="text-center text-slate-400 text-sm mt-8">
                        No messages yet. Say hello to your operator!
                     </div>
                  )}
                  {messages.map((m, i) => {
                      const isMe = m.role === 'client';
                      return (
                          <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                             <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">{m.sender}</span>
                             <div className={`p-3 text-sm rounded-2xl max-w-[85%] break-words ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white border text-slate-900 rounded-tl-sm'}`}>
                                {m.text}
                             </div>
                             <span className="text-[10px] text-slate-300 mt-1 px-1">
                                {new Date(m.created_at || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                          </div>
                      )
                  })}
               </div>
               <div className="p-4 border-t bg-white">
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your message..." 
                      className="flex-1 px-4 h-11 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <Button type="submit" disabled={!newMessage.trim()} className="h-11 w-11 rounded-xl p-0 shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </form>
               </div>
            </div>
          </TabsContent>

          <TabsContent value="legal">
            <div className="bg-white rounded-2xl p-8 border shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
               <Scale className="w-12 h-12 text-slate-300 mb-4" />
               <h3 className="text-xl font-bold text-slate-900 mb-2">Legal Agreements</h3>
               <p className="text-slate-500 max-w-sm mb-6">Service Agreement, Damage Waiver, and Credit Card Authorization documents.</p>
               <Button variant="outline" className="rounded-lg font-bold gap-2">
                  <FileText className="w-4 h-4" /> Review Documents
               </Button>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <div className="bg-white rounded-2xl p-8 border shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
               <History className="w-12 h-12 text-slate-300 mb-4" />
               <h3 className="text-xl font-bold text-slate-900 mb-2">Log History</h3>
               <p className="text-slate-500 max-w-sm">Complete audit trail of all changes made to this booking.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
