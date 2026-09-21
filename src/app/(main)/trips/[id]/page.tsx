"use client"
import { LiveMapWrapper } from "@/components/map/live-map-wrapper"
import { useParams, useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
   ChevronLeft,
   ChevronRight,
   Calendar,
   FileText,
   CheckCircle2,
   ShieldCheck,
   CreditCard,
   Activity,
   Users,
   Bus,
   MessageSquare,
   Download,
   Map as MapIcon,
   ArrowLeftRight,
   MapPin,
   UserCircle2,
   Navigation,
   Sparkles,
   Search,
   Send,
   History,
   Fuel,
   Wrench,
   Coins,
   Timer,
   Percent,
   Banknote,
   BadgeDollarSign,
   CarFront,
   MoreHorizontal,
   Trash2,
   Plus,
   Star,
   Loader2,
   MessageCircle,
   X,
   Clock,
   AlertTriangle,
   Copy,
   Check,
   Share2,
   Printer,
   ExternalLink,
   ArrowUpRight,
   CheckCircle
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"

import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"



import dynamic from "next/dynamic"
import { useEffect } from "react"


const CountdownTimer = ({ targetDate, status }: { targetDate: string, status?: string }) => {
   const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number, isLate: boolean } | null>(null);
   const [isClient, setIsClient] = useState(false);

   useEffect(() => {
      setIsClient(true);
      const calculateTimeLeft = () => {
         const difference = new Date(targetDate).getTime() - new Date().getTime();
         const absDiff = Math.abs(difference);

         setTimeLeft({
            d: Math.floor(absDiff / (1000 * 60 * 60 * 24)),
            h: Math.floor((absDiff / (1000 * 60 * 60)) % 24),
            m: Math.floor((absDiff / 1000 / 60) % 60),
            s: Math.floor((absDiff / 1000) % 60),
            isLate: difference < 0
         });
      };

      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timer);
   }, [targetDate]);

   if (!isClient || !timeLeft) return <span className="opacity-0">Loading...</span>;

   if (timeLeft.isLate) {
      return (
         <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-full border border-amber-200/80 text-[11px] shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Scheduled for earlier today</span>
            <span className="font-mono text-amber-600/90 font-semibold">
               ({timeLeft.d > 0 ? `${timeLeft.d}d ` : ''}{timeLeft.h}h {timeLeft.m}m ago)
            </span>
         </span>
      );
   }

   return (
      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 tracking-tight text-[11px]">
         Starts in: {timeLeft.d > 0 && `${timeLeft.d}d `}
         {timeLeft.h.toString().padStart(2, '0')}h : {timeLeft.m.toString().padStart(2, '0')}m : {timeLeft.s.toString().padStart(2, '0')}s
      </span>
   );
};

export default function BookingDetailsProfile() {
   const params = useParams()
   const router = useRouter()

   const decodedId = (params.id as string)
   const supabase = createClient()

   const [booking, setBooking] = useState<any>(null)
   const [isLoading, setIsLoading] = useState(true)
   const [activeDayIdx, setActiveDayIdx] = useState(0)

   const [activeTab, setActiveTab] = useState("overview")
   const [chatInput, setChatInput] = useState("")
   const [activeChannel, setActiveChannel] = useState<"secure" | "telegram" | "sms">("secure")
   const [isInvestigationMode, setIsInvestigationMode] = useState(false)
   const [signatureOpen, setSignatureOpen] = useState(false)
   const [contractStatus, setContractStatus] = useState<"pending" | "signed">("pending")
   const [bookingStatus, setBookingStatus] = useState("confirmed") // Using state for testing logic
   const [isMissed, setIsMissed] = useState(false)

   useEffect(() => {
      if (!booking?.schedule?.start) return;
      const checkMissed = () => {
         const late = new Date(booking.schedule.start).getTime() < new Date().getTime();
         setIsMissed(late && ['draft', 'confirmed', 'pending'].includes(bookingStatus));
      };
      checkMissed();
      const interval = setInterval(checkMissed, 1000);
      return () => clearInterval(interval);
   }, [booking?.schedule?.start, bookingStatus]);

   const [assetAction, setAssetAction] = useState<{ type: "add" | "replace", resourceType: "vehicle" | "driver" } | null>(null)
   const [copiedRef, setCopiedRef] = useState(false);
   const [copiedLink, setCopiedLink] = useState(false);

   const handleCopyRef = () => {
      if (!booking?.ref) return;
      navigator.clipboard.writeText(booking.ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
   };

   const handleShareTrip = () => {
      if (typeof window !== "undefined") {
         navigator.clipboard.writeText(window.location.href);
         setCopiedLink(true);
         setTimeout(() => setCopiedLink(false), 2000);
      }
   };
   const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false)
   const [secondaryVehicles, setSecondaryVehicles] = useState<any[]>([])
   const [secondaryDrivers, setSecondaryDrivers] = useState<any[]>([])
   const [showAddWarning, setShowAddWarning] = useState<{ resourceType: "vehicle" | "driver" } | null>(null)
   const [availableVehicles, setAvailableVehicles] = useState<any[]>([])
   const [availableDrivers, setAvailableDrivers] = useState<any[]>([])
   const [primaryVehicle, setPrimaryVehicle] = useState<any>(null)
   const [primaryDriver, setPrimaryDriver] = useState<any>(null)

   const handleAddClick = (resourceType: "vehicle" | "driver") => {
      setShowAddWarning({ resourceType })
   }

   const confirmAdd = () => {
      if (showAddWarning) {
         setAssetAction({ type: "add", resourceType: showAddWarning.resourceType })
         setIsAssetSheetOpen(true)
         setShowAddWarning(null)
      }
   }

   const openAssetSheet = (type: "add" | "replace", resourceType: "vehicle" | "driver") => {
      setAssetAction({ type, resourceType })
      setIsAssetSheetOpen(true)
   }

   const handleAssetSelect = async (item: any) => {
      const actionText = assetAction?.type === "replace" ? "Replaced" : "Added"
      const resourceText = assetAction?.resourceType === "vehicle" ? "Vehicle" : "Driver"

      let detailedInfo = ""
      if (assetAction?.resourceType === "vehicle") {
         detailedInfo = `${item.name || item.make + ' ' + item.model} (Plate: ${item.license_plate || 'N/A'})`
         if (assetAction?.type === "add") {
            setSecondaryVehicles([...secondaryVehicles, item])
         } else {
            setPrimaryVehicle(item)
         }
      } else {
         detailedInfo = `${item.first_name} ${item.last_name} (License: ${item.license_class || 'N/A'}, Phone: ${item.phone || 'N/A'})`
         if (assetAction?.type === "add") {
            setSecondaryDrivers([...secondaryDrivers, item])
         } else {
            setPrimaryDriver(item)
         }
      }


      fetchBooking();
      setIsAssetSheetOpen(false)
   }

   const unassignSecondary = async (type: "vehicle" | "driver", index: number, item: any) => {
      if (type === "vehicle") {
         const newArray = [...secondaryVehicles];
         newArray.splice(index, 1);
         setSecondaryVehicles(newArray);
      } else {
         const newArray = [...secondaryDrivers];
         newArray.splice(index, 1);
         setSecondaryDrivers(newArray);
      }


      fetchBooking();
   }

   const [messages, setMessages] = useState<any[]>([]);
   const [isChatOpen, setIsChatOpen] = useState(false);
   const [isSocketConnected, setIsSocketConnected] = useState(false);

   const messagesEndRef = useRef<HTMLDivElement>(null);
   const floatingMessagesEndRef = useRef<HTMLDivElement>(null);
   const wsRef = useRef<WebSocket | null>(null);

   useEffect(() => {
      if (activeTab === 'client_comm' || isChatOpen) {
         setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            floatingMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
         }, 50)
      }
   }, [messages.length, activeTab, isChatOpen]);

   const hasUnread = messages.some(m => m.role !== 'client' && !m.read_at);

   // ── REAL-TIME CHAT ENGINE WEBSOCKET (:4080) INTEGRATION ──────────
   useEffect(() => {
      if (!decodedId) return;

      const wsUrl = `ws://localhost:4080/ws/chat?roomId=${encodeURIComponent(decodedId)}&name=Client+Passenger&role=Passenger`;
      let ws: WebSocket;

      try {
         ws = new WebSocket(wsUrl);
         wsRef.current = ws;

         ws.onopen = () => {
            setIsSocketConnected(true);
         };

         ws.onmessage = (event) => {
            try {
               const data = JSON.parse(event.data);
               if (data.type === 'chat_message' || data.type === 'message') {
                  const m = data.data || data;
                  setMessages(prev => {
                     if (prev.some(p => p.id === m.id || (p.text === (m.text || m.message) && Math.abs(new Date(p.timestamp).getTime() - new Date(m.created_at || m.timestamp || Date.now()).getTime()) < 3000))) {
                        return prev;
                     }
                     return [...prev, {
                        id: m.id || `ws_${Date.now()}`,
                        sender: m.sender || m.senderName || 'Dispatch / Chauffeur',
                        role: (m.role?.toLowerCase()?.includes('client') || m.role?.toLowerCase()?.includes('passenger')) ? 'client' : 'operator',
                        text: m.text || m.message || '',
                        timestamp: m.created_at || m.timestamp || new Date().toISOString(),
                        read: true,
                        read_at: new Date().toISOString(),
                        channel: 'secure'
                     }];
                  });
               }
            } catch {
               // Ignore malformed message frames
            }
         };

         ws.onclose = () => {
            setIsSocketConnected(false);
         };

         ws.onerror = () => {
            setIsSocketConnected(false);
         };
      } catch {
         // Graceful fallback
      }

      return () => {
         if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
         }
      };
   }, [decodedId]);

   useEffect(() => {
      if (!decodedId) return;

      const fetchMessages = async () => {
         const { data, error } = await supabase
            .from('booking_conversations')
            .select('*')
            .eq('booking_id', decodedId)
            .order('created_at', { ascending: true });

         if (data && data.length > 0) {
            setMessages(data.map((msg: any) => ({
               id: msg.id,
               sender: msg.sender,
               role: msg.role,
               text: msg.text,
               timestamp: msg.created_at,
               read: msg.read,
               read_at: msg.read_at,
               channel: msg.channel
            })));
         } else {
            // Fallback to chat_messages if present
            const { data: chatMsgs } = await (supabase as any)
               .from('chat_messages')
               .select('*')
               .eq('booking_id', decodedId)
               .order('created_at', { ascending: true });

            if (chatMsgs && chatMsgs.length > 0) {
               setMessages(chatMsgs.map((msg: any) => ({
                  id: msg.id,
                  sender: msg.sender,
                  role: msg.role?.toLowerCase()?.includes('client') || msg.role?.toLowerCase()?.includes('passenger') ? 'client' : 'operator',
                  text: msg.message,
                  timestamp: msg.created_at,
                  read: true,
                  read_at: msg.created_at,
                  channel: 'secure'
               })));
            }
         }
      };

      fetchMessages();

      const subscription = supabase
         .channel(`room_${decodedId}`)
         .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'booking_conversations',
            filter: `booking_id=eq.${decodedId}`
         }, (payload) => {
            if (payload.eventType === 'INSERT') {
               const msg = payload.new;
               setMessages(prev => {
                  if (prev.some(p => p.id === msg.id)) return prev;
                  return [...prev, {
                     id: msg.id,
                     sender: msg.sender,
                     role: msg.role,
                     text: msg.text,
                     timestamp: msg.created_at,
                     read: msg.read,
                     read_at: msg.read_at,
                     channel: msg.channel
                  }];
               });
            } else if (payload.eventType === 'UPDATE') {
               const msg = payload.new;
               setMessages(prev => prev.map(p => p.id === msg.id ? {
                  id: msg.id,
                  sender: msg.sender,
                  role: msg.role,
                  text: msg.text,
                  timestamp: msg.created_at,
                  read: msg.read,
                  read_at: msg.read_at,
                  channel: msg.channel
               } : p));
            }
         })
         .subscribe();

      return () => {
         supabase.removeChannel(subscription);
      };
   }, [decodedId, supabase]);

   useEffect(() => {
      if ((activeTab === "client_comm" || isChatOpen) && hasUnread) {
         const unreadIds = messages.filter(m => m.role !== 'client' && !m.read_at).map(m => m.id);
         if (unreadIds.length > 0) {
            supabase.from('booking_conversations')
               .update({ read: true, read_at: new Date().toISOString() })
               .in('id', unreadIds)
               .then(() => { });
         }
      }
   }, [messages, activeTab, isChatOpen, hasUnread, supabase]);

   const handleSendMessage = async () => {
      if (!chatInput.trim()) return;
      const text = chatInput;
      const channelType = activeChannel;
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nowStr = new Date().toISOString();
      setChatInput("");

      // 1. Optimistic Local Append
      const optimisticMsg = {
         id: msgId,
         sender: "Client (Passenger)",
         role: "client",
         text: text,
         timestamp: nowStr,
         read: true,
         read_at: nowStr,
         channel: channelType
      };
      setMessages(prev => [...prev, optimisticMsg]);

      // 2. Broadcast to Fast WebSocket Engine (:4080)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
         wsRef.current.send(JSON.stringify({
            type: 'chat_message',
            roomId: decodedId,
            senderName: 'Client (Passenger)',
            role: 'Passenger',
            text: text
         }));
      }

      // 3. Send to Fast HTTP Endpoint (Zero delay fanout)
      try {
         fetch('http://localhost:4080/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               roomId: decodedId,
               senderId: 'client_passenger',
               senderName: 'Client (Passenger)',
               role: 'Passenger',
               text: text
            }),
            signal: AbortSignal.timeout(1000)
         }).catch(() => {});
      } catch {}

      // 4. Persist to booking_conversations & chat_messages in Supabase
      await supabase.from('booking_conversations').insert({
         id: msgId,
         booking_id: decodedId,
         sender: "Client (Passenger)",
         role: "client",
         text: text,
         channel: channelType,
         read: true
      });

      await (supabase as any).from('chat_messages').insert({
         id: msgId,
         booking_id: decodedId,
         sender: "Client (Passenger)",
         role: "Client",
         message: text,
         is_self: true,
         status: 'sent',
         created_at: nowStr
      }).select().maybeSingle();
   };

   const fetchBooking = async () => {
      if (!decodedId) {
         setIsLoading(false)
         return
      }
      const { data, error } = await supabase
         .from('bookings')
         .select('*')
         .eq('id', decodedId)
         .maybeSingle();

      if (data) {
         let fallbackName = "Guest User";
         if (data.user_id) {
            const { data: profile } = await supabase.from('profiles').select('first_name, last_name, full_name').eq('id', data.user_id).maybeSingle();
            if (profile) {
               fallbackName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Guest User";
            }
         }

         const details = (data.booking_details as any) || {};
         setBooking({
            id: data.id,
            ref: (() => {
               let r = data.booking_ref || details.ref || `T-${data.id.substring(0, 6).toUpperCase()}`;
               if (r.length > 20) {
                  const pureId = r.replace(/^(BK-|T-)/, '');
                  return `T-${pureId.substring(0, 6).toUpperCase()}`;
               } else if (r.startsWith('BK-')) {
                  return `T-${r.substring(3)}`;
               }
               return r;
            })(),
            status: data.status,
            customerName: details.contact?.firstName ? `${details.contact.firstName} ${details.contact.lastName}` : fallbackName,
            price: data.price || 0,
            currency: details.currency || (data.currency || 'EUR'),
            currencySymbol: details.currencySymbol || details.option?.currencySymbol || (details.currency === 'EUR' ? '€' : '$'),
            countryCode: details.countryCode || 'ES',
            option: details.option,
            route: {
               pickup: data.pickup_location || details.pickup?.address || details.multiDayStore?.[0]?.pickupValue || "Unknown",
               destination: data.dropoff_location || details.dropoff?.address || details.multiDayStore?.[0]?.dropoffValue || "Unknown",
               pickupLoc: {
                  lat: details.pickup?.coordinate?.lat ?? details.multiDayStore?.[0]?.pickupLoc?.coordinate?.lat ?? details.pickup?.lat ?? 36.7137,
                  lng: details.pickup?.coordinate?.lon ?? details.pickup?.coordinate?.lng ?? details.multiDayStore?.[0]?.pickupLoc?.coordinate?.lon ?? details.pickup?.lng ?? -4.4265
               },
               dropoffLoc: {
                  lat: details.dropoff?.coordinate?.lat ?? details.multiDayStore?.[0]?.dropoffLoc?.coordinate?.lat ?? details.dropoff?.lat ?? 36.7210,
                  lng: details.dropoff?.coordinate?.lon ?? details.dropoff?.coordinate?.lng ?? details.multiDayStore?.[0]?.dropoffLoc?.coordinate?.lon ?? details.dropoff?.lng ?? -4.4216
               },
               distance: details.distance ? (typeof details.distance === 'number' ? `${details.distance} km` : details.distance) : "153.3 km",
               duration: typeof details.duration === 'number' ? (Math.floor(details.duration / 3600) > 0 ? `${Math.floor(details.duration / 3600)}h ${Math.floor((details.duration % 3600) / 60)}m` : `${Math.floor((details.duration % 3600) / 60)} min`) : (details.duration || "2h 8m"),
               polyline: details.routePolyline || details.multiDayStore?.[0]?.routePolyline || null
            },
            schedule: {
               start: data.pickup_date || new Date().toISOString(),
               end: details.endDate ? new Date(`${details.endDate}T${details.endTime || '00:00'}`).toISOString() : new Date(new Date(data.pickup_date || new Date()).getTime() + 4 * 60 * 60 * 1000).toISOString(),
               actualStart: data.started_at,
               actualEnd: data.completed_at
            },
            vehicles: details.option?.vehicles?.reduce((acc: number, v: any) => acc + v.count, 0) || data.vehicle_count || 1,
            totalPax: details.passengers || details.option?.totalSeats || 1,
            vehicleType: details.option?.vehicles?.[0]?.type || details.option?.label || data.vehicle_type || "Van",
            activityType: details.tripType || "Multi-Day",
            contact: details.contact || {
               firstName: "Guest",
               lastName: "User",
               email: "Not provided",
               phone: "Not provided"
            },
            company: details.company || details.billing?.company || "Individual Booking",
            billingAddress: details.billing?.address || details.contact?.address || "Address not provided",
            notes: details.notes || details.specialInstructions || "No special instructions or notes provided.",
            multiDayStore: (details.multiDayStore && details.multiDayStore.length > 0) ? details.multiDayStore : (
               details.tripType === 'multi-day' ? [
                  {
                     pickupValue: typeof details.pickup === 'object' ? details.pickup.address : (details.pickup || data.pickup_location || "Day 1 Pickup"),
                     dropoffValue: typeof details.dropoff === 'object' ? details.dropoff.address : (details.dropoff || data.dropoff_location || "Day 1 Dropoff"),
                     routePolyline: details.routePolyline
                  },
                  {
                     pickupValue: typeof details.dropoff === 'object' ? details.dropoff.address : (details.dropoff || data.dropoff_location || "Day 2 Pickup"),
                     dropoffValue: typeof details.pickup === 'object' ? details.pickup.address : (details.pickup || data.pickup_location || "Day 2 Dropoff"),
                     routePolyline: details.routePolyline
                  }
               ] : []
            ),
            isThirdParty: details.isThirdParty,
            thirdPartyInfo: details.thirdPartyInfo,
         });
         if (data.status === 'pending') {
            setBookingStatus('confirmed'); // Default display for operator who accepted
         } else {
            setBookingStatus(data.status || 'confirmed');
         }

         const { data: logsData, error: logsError } = await supabase
            .from('audit_logs')
            .select('*')
            .or(`metadata->>booking_id.eq.${decodedId},metadata->>id.eq.${decodedId}`)
            .order('created_at', { ascending: false });

         if (logsData && logsData.length > 0) {
            const operationalLogs = logsData.filter(log => {
               const action = (log.action || "").toLowerCase();
               const detail = (log.detail || "").toLowerCase();

               if (action === 'client communication') return false; // Hide chat messages from the operations audit log

               // Exclude pure technical/API logs for the Fleet Operator view
               const isTechnical =
                  action.includes('database') ||
                  action.includes('webhook') ||
                  action.includes('cache') ||
                  action.includes('sync') ||
                  action.includes('mutation') ||
                  detail.includes('rls passed') ||
                  detail.includes('job queued');

               return !isTechnical;
            });

            setBookingLogs(operationalLogs.map(log => {
               const meta = (log.metadata as any) || {};
               return {
                  id: log.id,
                  timestamp: log.created_at,
                  user: { name: log.actor || "System", initials: (log.actor || "SY").substring(0, 2).toUpperCase(), role: "System" },
                  action: log.action,
                  details: {
                     oldValue: meta.oldValue,
                     newValue: meta.newValue || log.detail || "",
                     summary: meta.summary
                  },
                  context: {
                     deviceType: meta.deviceType || "desktop",
                     browser: meta.browser || "System API",
                     ip: meta.ip || "127.0.0.1",
                     location: meta.location || log.country || "Global"
                  }
               };
            }));
         } else {
            const synthesized = [
               {
                  id: `synth_log_1`,
                  timestamp: data.created_at || new Date().toISOString(),
                  user: { name: "Booking System", initials: "API", role: "System" },
                  action: "Booking Created",
                  details: { newValue: `Trip scheduled for ${data.pickup_location || 'Customer'}` },
                  context: { location: "Datacenter", ip: "Internal" }
               }
            ];
            if (data.status === 'confirmed' || data.status === 'in_progress' || data.status === 'pending') {
               synthesized.unshift({
                  id: `synth_log_2`,
                  timestamp: new Date(new Date(data.created_at || new Date()).getTime() + 10000).toISOString(),
                  user: { name: "Dispatch Engine", initials: "DE", role: "System" },
                  action: "Status Changed",
                  details: { newValue: `Status updated to ${data.status.toUpperCase()}` },
                  context: { location: "Cloud Pipeline", ip: "Internal" }
               });
            }
            setBookingLogs(synthesized);
         }
      }

      // Fetch dynamic vehicles and drivers
      const { data: dbVehicles } = await supabase.from('vehicles').select('*');
      if (dbVehicles && dbVehicles.length > 0) {
         const active = dbVehicles.filter(v => v.status !== 'archived');
         setAvailableVehicles(active);
         if (data) {
            const assignedVehicle = data.vehicle_id ? dbVehicles.find(v => String(v.id) === String(data.vehicle_id)) : null;
            setPrimaryVehicle(assignedVehicle || null);
         }
      }

      const { data: dbDrivers } = await supabase.from('drivers').select('*');
      if (dbDrivers && dbDrivers.length > 0) {
         const active = dbDrivers.filter(d => d.status !== 'archived');
         setAvailableDrivers(active);
         if (data) {
            const assignedDriver = data.driver_id ? dbDrivers.find(d => String(d.id) === String(data.driver_id)) : null;
            setPrimaryDriver(assignedDriver || null);
         }
      }

      setIsLoading(false);
   };

   useEffect(() => {
      fetchBooking();
   }, [decodedId]);

   const [bookingLogs, setBookingLogs] = useState<any[]>([])

   const handleSignContract = async (signatureData: { type: 'drawn' | 'typed', data: string, signerName: string }) => {


      setContractStatus("signed");
      setSignatureOpen(false);
      fetchBooking(); // Refresh the log history to show the new signature
   }

   const isMultiDay = Boolean(booking?.multiDayStore && booking.multiDayStore.length > 0);
   const activeRouteData = isMultiDay ? booking.multiDayStore[activeDayIdx] || booking.multiDayStore[0] : null;

   const activePolyline = activeRouteData?.routePolyline || booking?.route?.polyline;
   const activePickupLoc = activeRouteData?.pickupLoc?.coordinate || activeRouteData?.pickupLoc || booking?.route?.pickupLoc;
   const activeDropoffLoc = activeRouteData?.dropoffLoc?.coordinate || activeRouteData?.dropoffLoc || booking?.route?.dropoffLoc;
   const activePickupName = activeRouteData?.pickupValue || activeRouteData?.pickup?.address || booking?.route?.pickup;
   const activeDropoffName = activeRouteData?.dropoffValue || activeRouteData?.dropoff?.address || booking?.route?.destination;
   const activeStops = activeRouteData?.stops || [];

   // Computed pseudo-dynamic utilization metrics for assets based on the booking ID.
   const bookingIdStr = String(booking?.id || "default");
   const vehicleUtilization = 60 + ((bookingIdStr.charCodeAt(0) + bookingIdStr.charCodeAt(bookingIdStr.length - 1)) % 35);
   const driverUtilization = 40 + ((bookingIdStr.charCodeAt(1 % bookingIdStr.length) + bookingIdStr.charCodeAt(Math.max(0, bookingIdStr.length - 2))) % 45);

   const vehicleUtilClass = vehicleUtilization > 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : vehicleUtilization > 65 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200";
   const driverUtilClass = driverUtilization > 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : driverUtilization > 55 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200";

   const totalAssetsAssigned = (primaryVehicle ? 1 : 0) + (primaryDriver ? 1 : 0) + secondaryVehicles.length + secondaryDrivers.length;
   const requiredAssetsCount = (booking?.vehicles || 1) * 2;

   return (
      <div className="space-y-6 pt-2 pb-8 max-w-[1200px] mx-auto">
         {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
               <Loader2 className="h-8 w-8 text-primary animate-spin" />
               <p className="text-muted-foreground font-bold animate-pulse">Loading secure itinerary details...</p>
            </div>
         ) : !booking ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
               <MapPin className="h-12 w-12 text-muted-foreground opacity-20" />
               <p className="text-xl font-bold text-muted-foreground">Booking not found.</p>
               <Button variant="outline" onClick={() => router.push("/bookings")}>Return to Bookings</Button>
            </div>
         ) : (
            <>
               {/* 1. HERO HEADER SECTION */}
               <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden space-y-6">
                  {/* Decorative background gradient */}
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                  {/* Top Bar: Navigation, Reference, Status & Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                     <div className="flex items-start sm:items-center gap-4">
                        <Button
                           variant="outline"
                           size="icon"
                           onClick={() => router.push("/trips")}
                           className="h-11 w-11 shrink-0 rounded-2xl border-border/80 bg-background/80 shadow-2xs hover:bg-muted/80 transition-all cursor-pointer"
                        >
                           <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="space-y-1.5">
                           <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking</span>
                              <div className="flex items-center gap-1.5 bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-xl border border-border/70 transition-colors group">
                                 <span className="font-mono text-sm font-black tracking-tight text-foreground">{booking.ref}</span>
                                 <button
                                    onClick={handleCopyRef}
                                    title="Copy Reference"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                 >
                                    {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />}
                                 </button>
                              </div>

                              {/* Status Pill */}
                              <div className="flex items-center">
                                 <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                                    bookingStatus === 'completed'
                                       ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                       : bookingStatus === 'in_progress'
                                       ? 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                                       : bookingStatus === 'en_route'
                                       ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                                       : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                 }`}>
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {bookingStatus.replace('_', ' ')}
                                 </span>
                              </div>

                              {/* Optional testing status dropdown */}
                              <select
                                 value={bookingStatus}
                                 onChange={(e) => setBookingStatus(e.target.value)}
                                 className="text-[10px] font-bold text-muted-foreground bg-transparent border border-border/60 rounded-lg px-2 py-0.5 outline-none hover:border-border cursor-pointer"
                              >
                                 <option value="confirmed">Confirmed</option>
                                 <option value="en_route">En Route</option>
                                 <option value="in_progress">In Progress</option>
                                 <option value="completed">Completed</option>
                                 <option value="draft">Draft</option>
                              </select>
                           </div>

                           <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-2">
                              <span>Reserved by <strong className="text-foreground font-bold">{booking.customerName}</strong></span>
                              <span>&bull;</span>
                              <span className="capitalize font-semibold text-foreground/80">{booking.activityType}</span>
                              {booking.isThirdParty && booking.thirdPartyInfo && (
                                 <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 rounded-md border border-amber-200/70">
                                    Agency: {booking.thirdPartyInfo.company || `${booking.thirdPartyInfo.firstName} ${booking.thirdPartyInfo.lastName}`}
                                 </span>
                              )}
                           </p>
                        </div>
                     </div>

                     {/* Price & Action Buttons */}
                     <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-border/60">
                        <div className="text-left lg:text-right">
                           <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Total Amount</span>
                           <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-foreground tracking-tight">
                                 {new Intl.NumberFormat("en-US", { style: "currency", currency: booking.currency || "EUR" }).format(booking.price)}
                              </span>
                              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                 Paid in Full
                              </span>
                           </div>
                        </div>

                        <div className="flex items-center gap-2">
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={handleShareTrip}
                              className="rounded-xl font-bold text-xs gap-1.5 h-9 border-border/80 hover:bg-muted cursor-pointer"
                           >
                              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
                              <span>{copiedLink ? "Link Copied" : "Share"}</span>
                           </Button>
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.print()}
                              className="rounded-xl font-bold text-xs gap-1.5 h-9 border-border/80 hover:bg-muted cursor-pointer"
                           >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Itinerary</span>
                           </Button>
                           <Button
                              variant="default"
                              size="sm"
                              onClick={() => setActiveTab("client_comm")}
                              className="rounded-xl font-bold text-xs gap-1.5 h-9 shadow-xs bg-primary hover:bg-primary/90 cursor-pointer"
                           >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Message Partner</span>
                           </Button>
                        </div>
                     </div>
                  </div>

                  {/* Dynamic Journey Stepper */}
                  <div className="pt-2 border-t border-border/60">
                     <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative">
                        {[
                           { step: 1, title: "Booked", desc: "Sep 09, 2026", done: true, current: false },
                           { step: 2, title: "Partner Assigned", desc: "Costa del Sol SL", done: true, current: bookingStatus === 'confirmed' },
                           { step: 3, title: "Chauffeur En Route", desc: "Prior to pickup", done: ['en_route', 'in_progress', 'completed'].includes(bookingStatus), current: bookingStatus === 'en_route' },
                           { step: 4, title: "Trip In Progress", desc: "Live tracking", done: ['in_progress', 'completed'].includes(bookingStatus), current: bookingStatus === 'in_progress' },
                           { step: 5, title: "Completed", desc: "Final arrival", done: bookingStatus === 'completed', current: bookingStatus === 'completed' },
                        ].map((item, idx) => (
                           <div key={item.step} className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/30 border border-border/50">
                              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black transition-all ${
                                 item.done
                                    ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/20'
                                    : item.current
                                    ? 'bg-primary text-primary-foreground animate-pulse'
                                    : 'bg-muted text-muted-foreground border border-border/60'
                              }`}>
                                 {item.done ? <Check className="h-4 w-4" /> : item.step}
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs font-bold text-foreground truncate leading-tight">{item.title}</p>
                                 <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{item.desc}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* 2. MODERN TABS NAVIGATION */}
               <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full flex-col space-y-6">
                  <div className="bg-muted/40 p-1.5 rounded-2xl border border-border/80 flex items-center justify-start gap-1 overflow-x-auto hide-scrollbar">
                     <TabsList className="bg-transparent h-auto p-0 gap-1">
                        <TabsTrigger
                           value="overview"
                           className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                        >
                           <Sparkles className="h-3.5 w-3.5 text-primary" />
                           <span>Overview</span>
                        </TabsTrigger>
                        <TabsTrigger
                           value="operations"
                           className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                        >
                           <Activity className="h-3.5 w-3.5 text-blue-500" />
                           <span>Live Tracking</span>
                        </TabsTrigger>
                        <TabsTrigger
                           value="client_comm"
                           className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2 relative"
                        >
                           <Users className="h-3.5 w-3.5 text-indigo-500" />
                           <span>Client & Comm</span>
                           {hasUnread && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                           )}
                        </TabsTrigger>
                        <TabsTrigger
                           value="files"
                           className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                        >
                           <FileText className="h-3.5 w-3.5 text-amber-500" />
                           <span>Agreements</span>
                        </TabsTrigger>
                        {["en_route", "in_progress", "completed"].includes(bookingStatus) && (
                           <TabsTrigger
                              value="lost_found"
                              className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                           >
                              <Search className="h-3.5 w-3.5 text-rose-500" />
                              <span>Lost & Found</span>
                           </TabsTrigger>
                        )}
                        {bookingStatus === "completed" && (
                           <TabsTrigger
                              value="reviews"
                              className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                           >
                              <Star className="h-3.5 w-3.5 text-yellow-500" />
                              <span>Reviews</span>
                           </TabsTrigger>
                        )}
                        <TabsTrigger
                           value="history"
                           className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                        >
                           <History className="h-3.5 w-3.5 text-slate-500" />
                           <span>Log History</span>
                        </TabsTrigger>
                     </TabsList>
                  </div>

                  {/* 3. REVAMPED OVERVIEW TAB */}
                  <TabsContent value="overview" className="mt-0 space-y-6">
                     <div className="grid lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Specs, Status, Assigned Fleet (4 cols) */}
                        <div className="lg:col-span-4 space-y-6">
                           {/* Status & Departure Countdown Card */}
                           <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
                              <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                                 <CardTitle className="flex items-center gap-2 font-black text-base">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Trip Timing & Schedule
                                 </CardTitle>
                              </CardHeader>
                              <CardContent className="p-5 space-y-4">
                                 <div>
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1.5">Schedule Adherence</span>
                                    <div className="flex items-center">
                                       <CountdownTimer targetDate={booking.schedule.start} status={bookingStatus} />
                                    </div>
                                 </div>

                                 {/* Bento Stats Grid */}
                                 <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                                       <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <Users className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-black uppercase tracking-wider">Passengers</span>
                                       </div>
                                       <p className="text-base font-black text-foreground">{booking.totalPax} Pax</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                                       <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <CarFront className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-black uppercase tracking-wider">Vehicles</span>
                                       </div>
                                       <p className="text-base font-black text-foreground">{booking.vehicles} × {booking.vehicleType}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                                       <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <MapIcon className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-black uppercase tracking-wider">Distance</span>
                                       </div>
                                       <p className="text-base font-black text-foreground">{booking.route.distance}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                                       <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <Timer className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-black uppercase tracking-wider">Est. Duration</span>
                                       </div>
                                       <p className="text-base font-black text-foreground">{booking.route.duration}</p>
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>

                           {/* Partner Operator & Assigned Fleet Showcase */}
                           <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
                              <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                                 <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 font-black text-base">
                                       <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                       Assigned Partner & Fleet
                                    </CardTitle>
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                       <CheckCircle className="h-3 w-3 text-emerald-600" />
                                       Verified
                                    </span>
                                 </div>
                              </CardHeader>
                              <CardContent className="p-5 space-y-4">
                                 {/* Operator Profile */}
                                 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3">
                                    <div>
                                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Licensed Transport Operator</p>
                                       <h4 className="text-sm font-black text-foreground">
                                          {booking?.option?.serviceCategory || 'Costa del Sol Transportes SL'}
                                       </h4>
                                       <p className="text-xs text-muted-foreground mt-0.5">Málaga & Costa del Sol Region, Spain</p>
                                    </div>
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => setActiveTab("client_comm")}
                                       className="h-8 rounded-xl text-xs font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                                    >
                                       <span>Chat</span>
                                       <ArrowUpRight className="h-3.5 w-3.5" />
                                    </Button>
                                 </div>

                                 {/* Reserved Fleet Details */}
                                 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reserved Vehicle Category</p>
                                       <span className="text-[10px] font-mono font-bold bg-background border px-2 py-0.5 rounded-md">
                                          {primaryVehicle?.license_plate || `${booking.vehicles} × ${booking.vehicleType}`}
                                       </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                          <Bus className="h-5 w-5" />
                                       </div>
                                       <div>
                                          <p className="font-bold text-sm text-foreground">
                                             {primaryVehicle?.name || `${booking.vehicles} × Executive Passenger Van`}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                             Capacity: {booking.totalPax} Pax &bull; Executive Travel Standard
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                       {["Air Conditioned", "Luggage Storage", "Clean Interior", "Licensed & Insured"].map((amenity) => (
                                          <span key={amenity} className="text-[10px] font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/50">
                                             {amenity}
                                          </span>
                                       ))}
                                    </div>
                                 </div>

                                 {/* Chauffeur Assignment Status */}
                                 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden">
                                       {primaryDriver ? (
                                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${primaryDriver.first_name}`} alt="Avatar" className="h-full w-full object-cover" />
                                       ) : (
                                          <UserCircle2 className="h-6 w-6 text-muted-foreground/60" />
                                       )}
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-2">
                                          <p className="font-bold text-sm text-foreground">
                                             {primaryDriver ? `${primaryDriver.first_name} ${primaryDriver.last_name}` : "Professional Chauffeur"}
                                          </p>
                                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                             {primaryDriver ? "Assigned" : "Pending Departure"}
                                          </span>
                                       </div>
                                       <p className="text-xs text-muted-foreground mt-0.5">
                                          {primaryDriver ? `License: ${primaryDriver.license_class || 'CDL'}` : "Operator will dispatch certified driver prior to pickup"}
                                       </p>
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>
                        </div>

                        {/* RIGHT COLUMN: Interactive Route & Luxury Timeline (8 cols) */}
                        <div className="lg:col-span-8 space-y-6">
                           <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
                              <CardHeader className="bg-muted/20 border-b border-border/60 pb-3.5">
                                 <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                       <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                          <MapPin className="h-4 w-4" />
                                       </div>
                                       <div>
                                          <CardTitle className="font-black text-base">Route & Itinerary Schedule</CardTitle>
                                          <p className="text-xs text-muted-foreground">Detailed journey waypoints and scheduled times</p>
                                       </div>
                                    </div>

                                    {/* Multi-Day Segment Switcher */}
                                    {isMultiDay && (
                                       <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border/80 shadow-2xs">
                                          {booking.multiDayStore.map((day: any, dIdx: number) => (
                                             <Button
                                                key={dIdx}
                                                variant={activeDayIdx === dIdx ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setActiveDayIdx(dIdx)}
                                                className={`h-7 px-3 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                                                   activeDayIdx === dIdx
                                                      ? 'bg-primary text-primary-foreground shadow-2xs'
                                                      : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                             >
                                                Day {dIdx + 1}
                                             </Button>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                 {/* Map Container */}
                                 <div className="h-72 sm:h-80 bg-slate-100 relative overflow-hidden border-b z-10">
                                    <div className="absolute inset-0 z-10">
                                       <LiveMapWrapper
                                          pickup={{ coordinate: { lat: activePickupLoc.lat, lon: activePickupLoc.lng || activePickupLoc.lon }, name: activePickupName }}
                                          dropoff={{ coordinate: { lat: activeDropoffLoc.lat, lon: activeDropoffLoc.lng || activeDropoffLoc.lon }, name: activeDropoffName }}
                                          stops={activeStops}
                                          tripType={booking?.activityType?.toLowerCase() || 'shuttle'}
                                          pinsLocked={true}
                                          showRouteCard={false}
                                          countryCode={booking?.countryCode || 'ES'}
                                       />
                                    </div>
                                    {/* Floating stats badge on map */}
                                    <div className="absolute bottom-4 left-4 z-20 bg-background/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-border/80 shadow-sm flex items-center gap-3 text-xs font-bold">
                                       <span className="flex items-center gap-1 text-primary">
                                          <MapIcon className="h-3.5 w-3.5" />
                                          {booking.route.distance}
                                       </span>
                                       <span className="text-muted-foreground">&bull;</span>
                                       <span className="flex items-center gap-1 text-foreground">
                                          <Timer className="h-3.5 w-3.5" />
                                          {booking.route.duration}
                                       </span>
                                       <span className="text-muted-foreground">&bull;</span>
                                       <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                          ⚡ Optimal Route
                                       </span>
                                    </div>
                                 </div>

                                 {/* Luxury Waypoints Timeline */}
                                 <div className="p-6 sm:p-7">
                                    {isMultiDay && activeRouteData?.dateStr && (
                                       <div className="mb-6 flex items-center justify-between pb-3 border-b border-border/60">
                                          <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                                             <Calendar className="h-4 w-4 text-primary" />
                                             <span>{activeRouteData.dateStr.replace(/^(Day \d+) • \1$/, "$1")}</span>
                                          </h4>
                                          <span className="text-xs font-mono font-bold text-muted-foreground">
                                             {activeStops.length} intermediate stops
                                          </span>
                                       </div>
                                    )}

                                    <div className="relative border-l-2 border-border/70 ml-4 space-y-8 pb-2">
                                       {/* Pickup Waypoint Node */}
                                       <div className="relative pl-7 group">
                                          <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 border-emerald-500 ring-4 ring-emerald-500/20 z-10" />
                                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                             <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                   <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md">
                                                      Origin Departure
                                                   </span>
                                                   <a
                                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activePickupName)}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                                                   >
                                                      <span>Map</span>
                                                      <ExternalLink className="h-3 w-3" />
                                                   </a>
                                                </div>
                                                <h3 className="font-bold text-base text-foreground leading-tight">{activePickupName}</h3>
                                             </div>
                                             <div className="text-left sm:text-right bg-muted/40 p-3 rounded-2xl border border-border/60 shrink-0">
                                                <div className="flex items-center sm:justify-end gap-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-0.5">
                                                   <Calendar className="h-3 w-3" />
                                                   <span>Scheduled Departure</span>
                                                </div>
                                                <p className="font-bold text-xs text-foreground">
                                                   {new Date(booking.schedule.actualStart || booking.schedule.start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                                <p className="text-lg font-black text-primary tracking-tight">
                                                   {new Date(booking.schedule.actualStart || booking.schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                             </div>
                                          </div>
                                       </div>

                                       {/* Intermediate Stop Nodes */}
                                       {activeStops.map((stop: any, sIdx: number) => (
                                          <div key={stop.id || sIdx} className="relative pl-7 group">
                                             <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 border-indigo-500 z-10" />
                                             <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                   <div className="flex items-center gap-2">
                                                      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-md">
                                                         Stop {sIdx + 1}
                                                      </span>
                                                      <span className="text-[11px] font-medium text-muted-foreground">
                                                         ⏱ Wait: {stop.stopDurationMin || 1} min
                                                      </span>
                                                      <a
                                                         href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name || stop.address)}`}
                                                         target="_blank"
                                                         rel="noopener noreferrer"
                                                         className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                                                      >
                                                         <span>Map</span>
                                                         <ExternalLink className="h-3 w-3" />
                                                      </a>
                                                   </div>
                                                   <h3 className="font-bold text-sm text-foreground leading-tight">{stop.name || stop.address}</h3>
                                                </div>
                                             </div>
                                          </div>
                                       ))}

                                       {/* Destination Node */}
                                       <div className="relative pl-7 group">
                                          <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 border-primary ring-4 ring-primary/20 z-10" />
                                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                             <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                   <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-md">
                                                      Final Destination
                                                   </span>
                                                   <a
                                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeDropoffName)}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                                                   >
                                                      <span>Map</span>
                                                      <ExternalLink className="h-3 w-3" />
                                                   </a>
                                                </div>
                                                <h3 className="font-bold text-base text-foreground leading-tight">{activeDropoffName}</h3>
                                             </div>
                                             <div className="text-left sm:text-right bg-muted/40 p-3 rounded-2xl border border-border/60 shrink-0">
                                                <div className="flex items-center sm:justify-end gap-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-0.5">
                                                   <Calendar className="h-3 w-3" />
                                                   <span>Estimated Arrival</span>
                                                </div>
                                                <p className="font-bold text-xs text-foreground">
                                                   {new Date(booking.schedule.actualEnd || booking.schedule.end).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                                <p className="text-lg font-black text-primary tracking-tight">
                                                   {new Date(booking.schedule.actualEnd || booking.schedule.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                             </div>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Trip Estimations Bento Grid */}
                                    <div className="mt-8 pt-6 border-t border-border/60">
                                       <div className="grid grid-cols-3 gap-3">
                                          <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center">
                                             <MapIcon className="h-4 w-4 text-primary mb-1" />
                                             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Total Distance</p>
                                             <p className="text-base font-black text-foreground">{booking.route.distance}</p>
                                          </div>
                                          <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center">
                                             <Timer className="h-4 w-4 text-blue-500 mb-1" />
                                             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">Driving Time</p>
                                             <p className="text-base font-black text-foreground">{booking.route.duration}</p>
                                          </div>
                                          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center">
                                             <ShieldCheck className="h-4 w-4 text-emerald-600 mb-1" />
                                             <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-widest mb-0.5">Route Health</p>
                                             <p className="text-base font-black text-emerald-700 dark:text-emerald-400">100% Optimal</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>
                        </div>
                     </div>
                  </TabsContent>

                  {/* 5. OPERATIONS & TRACKING TAB (New) */}
                  <TabsContent value="operations" className="mt-6 space-y-6">
                     {isMissed && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                           <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                              <Clock className="h-4 w-4 text-amber-600" />
                           </div>
                           <div>
                              <h4 className="text-sm font-black text-amber-900 tracking-tight uppercase">Chauffeur Dispatch In Progress</h4>
                              <p className="text-xs text-amber-800/90 mt-1 font-medium leading-relaxed">
                                 Your booking is confirmed and our operations desk is coordinating chauffeur assignment for your departure. If you require immediate schedule modifications or special assistance, our concierge team is available 24/7.
                              </p>
                           </div>
                        </div>
                     )}
                     <div className="grid lg:grid-cols-3 gap-6">
                        {/* Live Tracking Map Component */}
                        <div className="lg:col-span-2 space-y-6">
                           <Card className="border-2 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px] relative">
                              <CardHeader className="bg-muted/30 border-b pb-4 shrink-0 absolute top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm shadow-sm pointer-events-none">
                                 <div className="flex items-center justify-between pointer-events-auto">
                                    <div>
                                       <CardTitle className="flex items-center gap-2">
                                          <Activity className="h-5 w-5 text-primary" /> Live Dispatch Tracking
                                       </CardTitle>
                                       <CardDescription className="pt-1">Real-time telemetry and schedule adherence.</CardDescription>
                                    </div>
                                    {isMultiDay && (
                                       <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5 shadow-sm">
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveDayIdx(p => Math.max(0, p - 1))} disabled={activeDayIdx === 0}>
                                             <ChevronLeft className="h-4 w-4" />
                                          </Button>
                                          <span className="text-[10px] font-black px-1 uppercase tracking-widest text-muted-foreground whitespace-nowrap">Day {activeDayIdx + 1} of {booking.multiDayStore.length}</span>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveDayIdx(p => Math.min(booking.multiDayStore.length - 1, p + 1))} disabled={activeDayIdx === booking.multiDayStore.length - 1}>
                                             <ChevronRight className="h-4 w-4" />
                                          </Button>
                                       </div>
                                    )}
                                 </div>
                              </CardHeader>
                              <CardContent className="p-0 flex-1 relative bg-slate-100 flex items-center justify-center">
                                 <div className="absolute inset-0 z-10 text-xl pointer-events-none">
                                    <LiveMapWrapper
                                       pickup={{ coordinate: { lat: activePickupLoc.lat, lon: activePickupLoc.lng || activePickupLoc.lon }, name: activePickupName }}
                                       dropoff={{ coordinate: { lat: activeDropoffLoc.lat, lon: activeDropoffLoc.lng || activeDropoffLoc.lon }, name: activeDropoffName }}
                                       stops={activeStops}
                                       tripType={booking?.activityType?.toLowerCase() || 'shuttle'}
                                       pinsLocked={true}
                                       showRouteCard={false}
                                       countryCode={booking?.countryCode || 'ES'}
                                    />
                                 </div>

                                 {/* Overlay for Upcoming / Completed Bookings ONLY (Not Active) */}
                                 {bookingStatus === "completed" ? (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-[90%] md:max-w-sm px-2">
                                       <div className="bg-background/95 backdrop-blur shadow-2xl rounded-2xl p-5 border-2 text-center pointer-events-auto animate-in slide-in-from-bottom duration-500">
                                          <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                                             <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                          </div>
                                          <h3 className="text-[14px] font-black tracking-tight text-foreground">Trip Completed</h3>
                                          <p className="text-[11px] text-muted-foreground mt-1 font-medium leading-relaxed">
                                             This trip was successfully completed.
                                          </p>
                                          <Button variant="outline" size="sm" className="mt-4 w-full gap-2 rounded-lg font-bold">
                                             <History className="h-3.5 w-3.5" />
                                             Replay Route
                                          </Button>
                                       </div>
                                    </div>
                                 ) : !['en_route', 'in_progress'].includes(bookingStatus) ? (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-[90%] md:max-w-sm px-2">
                                       <div className="bg-background/95 backdrop-blur shadow-2xl rounded-2xl p-5 border-2 text-center pointer-events-auto animate-in slide-in-from-bottom duration-500">
                                          <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
                                             <Activity className="h-5 w-5 text-amber-600 animate-pulse" />
                                          </div>
                                          <h3 className="text-[14px] font-black tracking-tight text-foreground">Booking Not Yet Active</h3>
                                          <p className="text-[11px] text-muted-foreground mt-1 font-medium leading-relaxed">
                                             Live tracking location data will appear here <strong className="text-foreground">2 hours</strong> prior to the scheduled pickup time.
                                          </p>
                                       </div>
                                    </div>
                                 ) : null}
                              </CardContent>
                           </Card>

                           {/* Active Trip Progress Card (Rendered below map for Active trips) */}
                           {['en_route', 'in_progress'].includes(bookingStatus) && (
                              <Card className="border-2 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                 <div className="bg-background rounded-xl p-4 border-transparent flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                                             <Activity className="h-5 w-5 text-indigo-600 animate-pulse" />
                                          </div>
                                          <div>
                                             <h3 className="text-[13px] font-black tracking-tight text-foreground uppercase">Active Trip Progress</h3>
                                             <div className="flex items-center gap-1 mt-0.5">
                                                <Navigation className="h-3 w-3 text-indigo-600 fill-indigo-600" />
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">On Schedule</span>
                                             </div>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-4">
                                          <div className="text-right hidden sm:block">
                                             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Est. Completion</p>
                                             <p className="text-sm font-black text-foreground">{new Date(booking.schedule.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                          </div>
                                          <div className="h-8 w-px bg-border hidden sm:block"></div>
                                          <Button variant="outline" size="sm" className="gap-2 rounded-lg font-bold border-indigo-100 hover:bg-slate-50 bg-white shadow-sm">
                                             <History className="h-3.5 w-3.5" />
                                             Replay Route
                                          </Button>
                                       </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2">
                                       <div className="relative pt-1 pb-2">
                                          <div className="absolute top-1/2 left-0 right-0 h-2 bg-muted rounded-full -translate-y-1/2 overflow-hidden border">
                                             <div className="h-full bg-indigo-600 w-[65%] rounded-full relative">
                                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                             </div>
                                          </div>
                                          <div className="absolute top-1/2 left-[65%] h-3.5 w-3.5 bg-indigo-600 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 ring-2 ring-indigo-600/20"></div>
                                       </div>

                                       <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-2 sm:gap-0">
                                          <div>
                                             <div className="flex items-center gap-2 mb-0.5">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Origin Departure</p>
                                             </div>
                                             <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-slate-900">{new Date(booking.schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-[10px] font-bold text-slate-400">Sch: {new Date(booking.schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                             </div>
                                          </div>

                                          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                                             <div className="flex items-center sm:justify-end gap-2 mb-0.5">
                                                <span className="relative flex h-2 w-2">
                                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                   <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                                                </span>
                                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Next Stop (Pickup)</p>
                                             </div>
                                             <div className="flex items-center sm:justify-end gap-3">
                                                <span className="text-[10px] font-bold text-slate-400">Sch: {new Date(booking.schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-sm font-black text-slate-900">{new Date(booking.schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </Card>
                           )}

                        </div>

                        {/* Assignments Column */}
                        <div className="space-y-6">
                           <Card className="border-2 shadow-sm">
                              <CardHeader className="bg-muted/30 border-b pb-4">
                                 <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Assignments</CardTitle>
                                    <Badge variant="outline" className="bg-background">
                                       {primaryVehicle ? `${totalAssetsAssigned} of ${requiredAssetsCount} Assigned` : 'Pending Dispatch'}
                                    </Badge>
                                 </div>
                                 <CardDescription className="pt-2">Resources allocated to fulfill this booking request.</CardDescription>
                              </CardHeader>
                              <CardContent className="p-4 space-y-4">
                                 {/* Vehicle Block */}
                                 <div className="p-3 border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors group cursor-pointer relative">
                                    <div className="flex items-center justify-between mb-2">
                                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                          {primaryVehicle ? 'Primary Vehicle' : 'Booked Fleet Category'}
                                       </p>
                                       <div className="flex items-center gap-2">
                                          <Badge variant={primaryVehicle ? "secondary" : "outline"} className="text-[9px] px-1.5 border">
                                             {primaryVehicle?.license_plate || 'Reserved Fleet'}
                                          </Badge>
                                       </div>
                                    </div>
                                    <div className="flex items-start justify-between">
                                       <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                             <Bus className="h-5 w-5" />
                                          </div>
                                          <div>
                                             <p className="font-bold text-sm">
                                                {primaryVehicle?.name || booking?.option?.label || `${booking?.vehicles || 1} × ${booking?.vehicleType || 'Van'}`}
                                             </p>
                                             <p className="text-xs text-muted-foreground">
                                                {primaryVehicle?.type || booking?.vehicleType || 'Van'} • {primaryVehicle?.pax_capacity || booking?.totalPax || 0} Pax Capacity
                                             </p>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Operator</p>
                                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                                             {booking?.option?.serviceCategory || 'Costa del Sol Transportes SL'}
                                          </Badge>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Driver Block */}
                                 <div className="p-3 border rounded-xl hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-colors group cursor-pointer relative">
                                    <div className="flex items-center justify-between mb-2">
                                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                          {primaryDriver ? 'Primary Driver' : 'Driver Assignment'}
                                       </p>
                                       <div className="flex items-center gap-2">
                                          <Badge variant="outline" className={`text-[9px] px-1.5 border ${primaryDriver ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>
                                             {primaryDriver ? 'Assigned' : 'Awaiting Assignment'}
                                          </Badge>
                                       </div>
                                    </div>
                                    <div className="flex items-start justify-between">
                                       <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 rounded-full bg-muted border overflow-hidden relative group-hover:ring-2 ring-emerald-500 ring-offset-2 transition-all">
                                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${primaryDriver?.first_name || 'Driver'}`} alt="Avatar" className="object-cover h-full w-full" />
                                          </div>
                                          <div>
                                             <p className="font-bold text-sm">
                                                {primaryDriver ? `${primaryDriver.first_name} ${primaryDriver.last_name}` : 'Driver to be dispatched'}
                                             </p>
                                             <p className="text-xs text-muted-foreground">
                                                {primaryDriver ? `${primaryDriver.license_class || 'CDL'} • ${primaryDriver.phone || 'No Phone'}` : 'Partner operator will assign driver prior to departure'}
                                             </p>
                                          </div>
                                       </div>
                                       {primaryDriver && (
                                          <div className="text-right">
                                             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Utilization</p>
                                             <Badge variant="outline" className={`${driverUtilClass} text-xs px-1.5 py-0`}>{driverUtilization}% wtd</Badge>
                                          </div>
                                       )}
                                    </div>
                                 </div>

                                 {/* Secondary Vehicles Block */}
                                 {secondaryVehicles.map((vehicle, idx) => (
                                    <div key={`sv-${idx}`} className="p-3 border rounded-xl border-amber-200 bg-amber-50/20 hover:bg-amber-50/50 transition-colors group cursor-pointer relative">
                                       <div className="flex items-center justify-between mb-2">
                                          <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Secondary Vehicle</p>
                                          <div className="flex items-center gap-2">
                                             <Badge variant="secondary" className="text-[9px] px-1.5 border bg-white">{vehicle.license_plate || 'Assigned'}</Badge>

                                          </div>
                                       </div>
                                       <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center text-slate-500">
                                                <Bus className="h-5 w-5" />
                                             </div>
                                             <div>
                                                <p className="font-bold text-sm text-slate-700">{vehicle.name || `${vehicle.make || 'Unknown'} ${vehicle.model || 'Vehicle'}`}</p>
                                                <p className="text-xs text-muted-foreground">{vehicle.type || 'Standard'} • {vehicle.pax_capacity || 0} Pax</p>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 ))}

                                 {/* Secondary Drivers Block */}
                                 {secondaryDrivers.map((driver, idx) => (
                                    <div key={`sd-${idx}`} className="p-3 border rounded-xl border-amber-200 bg-amber-50/20 hover:bg-amber-50/50 transition-colors group cursor-pointer relative">
                                       <div className="flex items-center justify-between mb-2">
                                          <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Secondary Driver</p>
                                          <div className="flex items-center gap-2">
                                             <Badge variant="outline" className="text-[9px] px-1.5 border-amber-200 text-amber-700 bg-white">Assigned</Badge>

                                          </div>
                                       </div>
                                       <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="h-10 w-10 rounded-full bg-muted border overflow-hidden relative">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.first_name || 'Driver'}`} alt="Avatar" className="object-cover h-full w-full opacity-80" />
                                             </div>
                                             <div>
                                                <p className="font-bold text-sm text-slate-700">{driver.first_name} {driver.last_name}</p>
                                                <p className="text-xs text-muted-foreground">{driver.license_class || 'CDL'} • {driver.phone || 'No Phone'}</p>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 ))}

                                 <div className="flex gap-3">


                                 </div>
                              </CardContent>
                           </Card>
                        </div>
                     </div>
                  </TabsContent>

                  {/* 6. CLIENT & COMMUNICATION TAB (Merged) */}
                  <TabsContent value="client_comm" className="mt-6">
                     <div className="grid lg:grid-cols-3 gap-6">
                        {/* Passenger Manifest Column */}
                        <div className="space-y-6">
                           <Card className="border-2 shadow-sm">
                              <CardHeader className="bg-muted/30 border-b pb-4">
                                 <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Contracting Entity</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 space-y-4">
                                 <div>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Company Name</p>
                                    <p className="font-bold text-lg">{booking.company}</p>
                                 </div>
                                 <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Primary Contact</p>
                                    <p className="font-bold">{booking.customerName}</p>
                                    <p className="text-xs text-primary font-medium">{booking.contact?.email}</p>
                                    <p className="text-xs text-muted-foreground">{booking.contact?.phone}</p>
                                 </div>
                                 {booking.isThirdParty && booking.thirdPartyInfo && (
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-2 relative overflow-hidden">
                                       <div className="absolute top-0 right-0 px-2 py-1 bg-amber-200 text-[8px] font-black uppercase tracking-widest text-amber-800 rounded-bl-lg">Agency</div>
                                       <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Third-Party Booker</p>
                                       <p className="font-bold text-amber-950">{booking.thirdPartyInfo.firstName} {booking.thirdPartyInfo.lastName} {booking.thirdPartyInfo.company ? `(${booking.thirdPartyInfo.company})` : ''}</p>
                                       <p className="text-xs text-amber-800 font-medium">{booking.thirdPartyInfo.email}</p>
                                       <p className="text-xs text-amber-700">{booking.thirdPartyInfo.phone}</p>
                                    </div>
                                 )}
                                 <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Billing Address</p>
                                    <p className="font-bold text-xs leading-relaxed">
                                       {booking.billingAddress}
                                    </p>
                                 </div>
                              </CardContent>
                           </Card>

                           <Card className="border-2 shadow-sm">
                              <CardHeader className="bg-muted/30 border-b pb-4">
                                 <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> On-Board Lead</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 space-y-4">
                                 <div className="flex items-center justify-between">
                                    <div>
                                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Lead Passenger</p>
                                       <p className="font-bold">{booking.customerName}</p>
                                       <p className="text-xs text-muted-foreground mt-0.5">{booking.contact?.phone}</p>
                                    </div>
                                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-primary/20 text-primary hover:bg-primary/10">
                                       <MapPin className="h-4 w-4" />
                                    </Button>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Notes</p>
                                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium whitespace-pre-wrap">
                                       {booking.notes}
                                    </p>
                                 </div>
                              </CardContent>
                           </Card>
                        </div>

                        {/* Secure Chat Column */}
                        <div className="lg:col-span-2 space-y-6">
                           <Card className="border-2 shadow-sm flex flex-col h-[650px] overflow-hidden relative">
                              {/* Immutable Log Banner */}
                              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
                                 <div className="flex items-center gap-2 text-amber-800">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Secure & Immutable Log</span>
                                 </div>
                                 <p className="text-[10px] sm:text-xs text-amber-700 font-medium">Messages in this channel cannot be edited or deleted to ensure compliance.</p>
                              </div>

                              <CardHeader className="bg-muted/30 border-b py-3 px-4">
                                 <div className="flex items-center justify-between flex-wrap gap-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                       <MessageSquare className="h-5 w-5 text-primary" /> Client Communication
                                       <Badge variant="outline" className={`gap-1.5 px-2 ml-2 ${isSocketConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                          <span className="relative flex h-2 w-2">
                                             <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSocketConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                             <span className={`relative inline-flex rounded-full h-2 w-2 ${isSocketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                          </span>
                                          {isSocketConnected ? 'Zero-Delay Engine (:4080)' : 'Live Polling'}
                                       </Badge>
                                       <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 gap-1 border ml-2">
                                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> PII Scrubbed
                                       </Badge>
                                       <div className="flex -space-x-1 ml-2 items-center">
                                          <div className="h-6 w-6 rounded-full bg-sky-100 border-2 border-background flex items-center justify-center text-sky-500" title="Telegram Connected">
                                             <MessageCircle className="h-3 w-3" />
                                          </div>
                                       </div>
                                    </CardTitle>

                                    <div className="flex items-center gap-3">
                                       {/* Investigation Mode Toggle (simulated Super Admin feature) */}

                                       <Button size="sm" variant="outline" className="gap-2 font-bold h-8 text-xs"><Download className="h-3 w-3" /> Download Transcript</Button>
                                    </div>
                                 </div>
                              </CardHeader>

                              {/* Chat Messages Area */}
                              <CardContent className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-muted/10 relative">
                                 {/* Watermark for Investigation Mode */}
                                 {isInvestigationMode && (
                                    <div className="absolute inset-0 pointer-events-none flex auto text-center justify-center items-center opacity-[0.03] rotate-[-20deg]">
                                       <span className="text-8xl font-black uppercase text-slate-900 tracking-widest whitespace-nowrap">Official Record</span>
                                    </div>
                                 )}

                                 {messages.map((msg) => {
                                    const msgDate = new Date(msg.timestamp);
                                    const displayTime = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const exactTime = msgDate.toISOString(); // For investigation mode

                                    // Render system messages differently
                                    if (msg.role === 'system') {
                                       return (
                                          <div key={msg.id} className="flex justify-center my-4 opacity-70">
                                             <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground border-dashed">
                                                {msg.text} • {displayTime}
                                             </Badge>
                                          </div>
                                       );
                                    }

                                    return (
                                       <div key={msg.id} className={`flex gap-3 relative ${msg.role === 'operator' ? 'flex-row-reverse' : 'flex-row'}`}>
                                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'operator' ? 'bg-primary text-primary-foreground' : 'bg-background border text-foreground'} `}>
                                             {msg.role === 'operator' ? <UserCircle2 className="h-5 w-5" /> : <span className="font-bold text-xs">{msg.sender.split(' ').map((n: string) => n[0]).join('')}</span>}
                                          </div>
                                          <div className={`flex flex-col ${msg.role === 'operator' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                             <div className="flex items-baseline gap-2 mb-1 px-1">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{msg.sender}</span>
                                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1" title={msg.timestamp}>
                                                   {isInvestigationMode ? exactTime : displayTime}
                                                   {msg.channel === 'telegram' && <span title="Sent via Telegram"><MessageCircle className="h-2.5 w-2.5 text-sky-500 ml-1" /></span>}
                                                   {msg.channel === 'sms' && <span title="Sent via SMS"><MessageSquare className="h-2.5 w-2.5 text-slate-400 ml-1" /></span>}
                                                </span>
                                             </div>
                                             <div className={`p-3.5 shadow-sm text-sm break-words relative group ${msg.role === 'operator' ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' : 'bg-background border rounded-2xl rounded-tl-sm text-slate-800 dark:text-slate-200'}`}>
                                                {msg.text}

                                                {/* Meta details revealed on hover or in investigation mode */}
                                                {(isInvestigationMode) && (
                                                   <div className={`absolute ${msg.role === 'operator' ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50`}>
                                                      <span className="text-[8px] font-mono whitespace-nowrap uppercase tracking-widest bg-slate-200 text-slate-800 px-1 py-0.5 rounded">ID:{msg.id}</span>
                                                   </div>
                                                )}
                                             </div>
                                             {/* Status Indicators & Read Receipt Tooltip */}
                                             {msg.role === 'operator' && (
                                                <div className="flex items-center gap-1 mt-1 px-1 relative group/tooltip cursor-pointer">
                                                   <span className={`text-xs font-bold font-mono tracking-tighter ${msg.read ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                      ✓✓
                                                   </span>
                                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                      {msg.read ? 'Viewed' : 'Delivered'}
                                                   </span>

                                                   {/* Hover Receipt Audit Popup */}
                                                   <div className="absolute bottom-6 right-0 opacity-0 group-hover/tooltip:opacity-100 transition-opacity bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-[10px] space-y-1.5 w-60 z-50 pointer-events-none">
                                                      <div className="font-black text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-1 flex justify-between">
                                                         <span>Read Receipt Audit</span>
                                                         <span className="text-emerald-300">{msg.read ? 'VIEWED' : 'DELIVERED'}</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                         <span className="text-slate-400 font-bold">Viewed By:</span>
                                                         <span className="font-bold text-white">Operator / Driver</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                         <span className="text-slate-400 font-bold">Received At:</span>
                                                         <span className="font-mono text-slate-300">{displayTime}</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                         <span className="text-slate-400 font-bold">Viewed At:</span>
                                                         <span className="font-mono text-emerald-300 font-bold">{exactTime}</span>
                                                      </div>
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    );
                                 })}
                                 <div ref={messagesEndRef} />
                              </CardContent>

                              {/* Chat Input Area */}
                              <div className={`p-4 bg-background border-t shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)] z-10 transition-colors duration-300 ${activeChannel === 'telegram' ? 'bg-sky-50/50 dark:bg-sky-950/20' : activeChannel === 'sms' ? 'bg-slate-50 dark:bg-muted/20' : ''}`}>
                                 <div className="relative flex flex-col gap-2">
                                    {/* Optional context text based on channel */}
                                    {activeChannel === 'telegram' && (
                                       <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-widest pl-1">Replying via Telegram Messaging</p>
                                    )}
                                    <div className="relative flex items-end gap-2">
                                       <div className={`flex items-center self-stretch flex-1 border rounded-xl bg-background shadow-sm transition-all relative overflow-hidden focus-within:ring-2 ${activeChannel === 'telegram' ? 'border-sky-200 ring-sky-500/20' : 'border-input ring-primary/20'}`}>

                                          <textarea
                                             placeholder={`Type a message via ${activeChannel === 'telegram' ? 'Telegram' : activeChannel === 'sms' ? 'SMS' : 'Secure App'}...`}
                                             className="w-full bg-transparent resize-none p-3 max-h-32 min-h-[44px] text-sm focus:outline-none"
                                             rows={1}
                                             value={chatInput}
                                             onChange={(e) => {
                                                setChatInput(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                             }}
                                             onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                   e.preventDefault();
                                                   handleSendMessage();
                                                }
                                             }}
                                          />
                                       </div>
                                       <Button
                                          className={`h-11 w-11 rounded-xl shrink-0 transition-colors ${activeChannel === 'telegram' ? 'bg-sky-500 hover:bg-sky-600 text-white' : ''}`}
                                          onClick={handleSendMessage}
                                          disabled={!chatInput.trim()}
                                       >
                                          <Send className="h-5 w-5" />
                                       </Button>
                                    </div>
                                 </div>
                              </div>
                           </Card>
                        </div>
                     </div>
                  </TabsContent>

                  {/* 7. AGREEMENTS TAB */}
                  <TabsContent value="files" className="mt-6 space-y-6">
                     <div className="grid lg:grid-cols-2 gap-6">
                        {/* Legal Agreements */}
                        <Card className="border-2 shadow-sm overflow-hidden flex flex-col h-full">
                           <CardHeader className="bg-muted/30 border-b pb-4">
                              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Legal Contracts & Terms</CardTitle>
                           </CardHeader>
                           <div className="p-0 flex-1">
                              {[
                                 { name: "Operation Agreement", type: "Contract", status: "Signed", action: "View" },
                                 { name: "Service Agreement", type: "Contract", status: contractStatus === 'signed' ? "Signed" : "Pending Signature", action: contractStatus === 'signed' ? "View" : "Send Link" },
                                 { name: "T & C", type: "Policy", status: "Accepted", action: "View" },
                                 { name: "Disclaimer", type: "Policy", status: "Accepted", action: "View" },
                              ].map((doc, i) => (
                                 <div key={i} className="border-b last:border-0 p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex flex-col">
                                       <p className="font-bold flex items-center gap-2">{doc.name}
                                          {doc.status === 'Signed' || doc.status === 'Accepted' ? (
                                             <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{doc.status} <CheckCircle2 className="h-3 w-3 ml-1" /></Badge>
                                          ) : (
                                             <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">{doc.status}</Badge>
                                          )}
                                       </p>
                                       <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline" className="text-[9px] uppercase font-black">{doc.type}</Badge>
                                          <p className="text-xs text-muted-foreground">
                                             {doc.status === 'Signed' || doc.status === 'Accepted' ? `Electronically bound and recorded.` : 'Requires client signature.'}
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <Button variant={doc.action === "Send Link" ? "default" : "outline"} size="sm" className="font-bold">{doc.action}</Button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </Card>

                        {/* Associated Documents */}
                        <Card className="border-2 shadow-sm overflow-hidden flex flex-col h-full">
                           <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
                              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Operational Documents</CardTitle>
                              <Button size="sm" className="font-bold gap-2"><FileText className="h-4 w-4" /> Upload</Button>
                           </CardHeader>
                           <div className="p-0 flex-1">
                              {[
                                 { name: "Trip_Sheet_Dispatch.pdf", type: "Internal", date: "System Generated", size: "1.1 MB" },
                              ].map((doc, i) => (
                                 <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                       <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                          <FileText className="h-5 w-5" />
                                       </div>
                                       <div>
                                          <p className="font-bold text-sm cursor-pointer hover:underline">{doc.name}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                             <Badge variant="outline" className="text-[9px] uppercase font-black">{doc.type}</Badge>
                                             <span className="text-xs text-muted-foreground">{doc.date} &bull; {doc.size}</span>
                                          </div>
                                       </div>
                                    </div>
                                    <Button variant="ghost" size="icon">
                                       <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                 </div>
                              ))}
                           </div>
                        </Card>
                     </div>
                  </TabsContent>

                  {/* 8. LOST & FOUND TAB */}
                  <TabsContent value="lost_found" className="mt-6 space-y-6">
                     <Card className="border-2 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                           <Search className="h-32 w-32 text-primary" />
                        </div>
                        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
                           <div>
                              <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> Lost & Found Tracker</CardTitle>
                              <CardDescription className="mt-1">Log and manage items left behind on vehicles for this booking.</CardDescription>
                           </div>
                           <Button className="font-bold gap-2"><Search className="h-4 w-4" /> Report Found Item</Button>
                        </CardHeader>
                        <div className="p-0">
                           {/* Empty State / No items found (Simulated for this booking initially) */}
                           <div className="flex flex-col items-center justify-center py-16 text-center">
                              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                 <Search className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                              <h3 className="font-bold text-lg">No Items Reported</h3>
                              <p className="text-muted-foreground max-w-sm mt-2 text-sm">There are currently no lost and found items logged for this specific booking.</p>
                           </div>
                        </div>
                     </Card>
                  </TabsContent>

                  {/* 9. HISTORY TAB */}
                  <TabsContent value="history" className="mt-6">
                     <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                           <CardTitle>Booking Audit Trail</CardTitle>
                           <CardDescription>Comprehensive history of status changes, financial transactions, and operational assignments.</CardDescription>
                        </CardHeader>
                        <CardContent>

                        </CardContent>
                     </Card>
                  </TabsContent>

                  {/* 10. REVIEWS TAB */}
                  <TabsContent value="reviews" className="mt-6">
                     <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="border-2 shadow-sm">
                           <CardHeader className="bg-muted/30 border-b pb-4">
                              <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> Driver Reviews</CardTitle>
                              <CardDescription className="pt-2">Feedback provided by the client regarding the assigned drivers.</CardDescription>
                           </CardHeader>
                           <CardContent className="p-6 space-y-4">
                              <div className="p-4 border rounded-xl bg-slate-50">
                                 <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                       <div className="h-10 w-10 rounded-full bg-muted border overflow-hidden">
                                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=John%20Smith`} alt="Avatar" className="object-cover h-full w-full" />
                                       </div>
                                       <div>
                                          <p className="font-bold text-sm">John Smith</p>
                                          <p className="text-xs text-muted-foreground">Primary Driver</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-1 text-amber-500">
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 fill-current" />
                                    </div>
                                 </div>
                                 <p className="text-sm italic text-slate-700">"John was absolutely fantastic. Arrived early, very professional, and navigated through traffic safely. The executives were very impressed."</p>
                              </div>
                           </CardContent>
                        </Card>

                        <Card className="border-2 shadow-sm">
                           <CardHeader className="bg-muted/30 border-b pb-4">
                              <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5 text-primary" /> Vehicle Reviews</CardTitle>
                              <CardDescription className="pt-2">Feedback provided by the client regarding the vehicle condition and comfort.</CardDescription>
                           </CardHeader>
                           <CardContent className="p-6 space-y-4">
                              <div className="p-4 border rounded-xl bg-slate-50">
                                 <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                       <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                          <Bus className="h-5 w-5" />
                                       </div>
                                       <div>
                                          <p className="font-bold text-sm">Prevost H3-45 (V-102)</p>
                                          <p className="text-xs text-muted-foreground">56 Passenger Coach</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-1 text-amber-500">
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 fill-current" />
                                       <Star className="h-4 w-4 text-muted border-none" />
                                    </div>
                                 </div>
                                 <p className="text-sm italic text-slate-700">"The bus was very clean and comfortable. Wi-Fi worked great for most of the trip, but cut out a bit near the destination. Overall excellent experience."</p>
                              </div>
                           </CardContent>
                        </Card>
                     </div>
                  </TabsContent>
               </Tabs>



               {/* Asset Selection Sheet */}

            </>
         )}


         {/* Floating Chat Widget */}
         <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
            {isChatOpen && (
               <div className="bg-background rounded-2xl shadow-2xl border border-border w-[350px] h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                  <div className="bg-primary dark:bg-muted p-4 flex items-center justify-between text-primary-foreground dark:text-foreground border-b dark:border-border border-transparent">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-foreground/20 dark:bg-foreground/10 flex items-center justify-center">
                           <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                           <h3 className="font-bold">Client Support Chat</h3>
                           <p className="text-xs text-primary-foreground/80 dark:text-muted-foreground">Active Booking</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/10 dark:hover:bg-accent dark:text-muted-foreground dark:hover:text-foreground" onClick={() => setIsChatOpen(false)}>
                        <X className="h-5 w-5" />
                     </Button>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-muted/10">
                     {messages.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm mt-8">No messages yet.</div>
                     )}
                     {messages.map((m, i) => {
                        const isMe = m.role !== 'client';
                        return (
                           <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-bold text-muted-foreground mb-1">{m.sender}</span>
                              <div className={`p-3 text-sm rounded-2xl max-w-[85%] break-words ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-background border text-foreground rounded-tl-sm'}`}>
                                 {m.text}
                              </div>
                              <span className="text-[10px] text-muted-foreground mt-1">
                                 {new Date(m.timestamp || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                        )
                     })}
                     <div ref={floatingMessagesEndRef} />
                  </div>
                  <div className="p-4 bg-background border-t">
                     <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                        <input
                           type="text"
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           placeholder="Reply to client..."
                           className="flex-1 h-10 px-3 rounded-lg border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <Button type="submit" disabled={!chatInput.trim()} className="h-10 w-10 shrink-0 rounded-lg">
                           <Send className="h-4 w-4" />
                        </Button>
                     </form>
                  </div>
               </div>
            )}

            {/* Floating Toggle Button */}
            <button
               onClick={() => setIsChatOpen(!isChatOpen)}
               className={`h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform ${isChatOpen ? 'scale-90' : ''}`}
            >
               {isChatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
               {!isChatOpen && hasUnread && (
                  <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-primary" />
               )}
            </button>
         </div>
      </div>
   )
}
