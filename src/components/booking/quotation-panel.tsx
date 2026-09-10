"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Users, Briefcase, Zap, ShieldCheck, CheckCircle2, ChevronDown, ChevronRight, Droplets, Wifi, Coffee, Baby, MapPin, Grid, Info, Clock, RefreshCw, BookmarkPlus, CreditCard, ArrowLeft, XCircle, Download, ArrowRight, Eye, X, AlertTriangle
} from "lucide-react"
import { createPortal } from "react-dom"
import { ReceiptModal } from "./receipt-modal"
import { CancellationModal } from "./cancellation-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { OptimizationSolver, OptimizationResult } from "@/lib/rate-engine/optimization-solver"
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { formatPhone } from "@/lib/formatPhone"
import { PhoneInput } from "@transhola/ui"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock');
const BOOKING_API_URL = process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://localhost:8000';

// ─── Vehicle SVG Icons (Uber-style silhouettes) ────────────────────────────────
function SedanIcon({ color = "#94a3b8", size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 60 33" fill="none">
      <path d="M10 22 L14 12 Q16 8 20 7 L38 7 Q43 7 46 12 L50 22 Z" fill={color} opacity={0.9} />
      <rect x="8" y="21" width="44" height="8" rx="4" fill={color} />
      <circle cx="17" cy="31" r="4" fill="#1e293b" /><circle cx="43" cy="31" r="4" fill="#1e293b" />
      <path d="M22 12 L20 20 L38 20 L38 12 Z" fill="white" opacity={0.25} />
    </svg>
  )
}
function SUVIcon({ color = "#94a3b8", size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 64 38" fill="none">
      <path d="M8 24 L12 10 Q14 6 18 6 L44 6 Q49 6 52 10 L56 24 Z" fill={color} opacity={0.9} />
      <rect x="6" y="22" width="52" height="10" rx="4" fill={color} />
      <circle cx="17" cy="34" r="4.5" fill="#1e293b" /><circle cx="47" cy="34" r="4.5" fill="#1e293b" />
      <path d="M20 10 L18 22 L44 22 L44 10 Z" fill="white" opacity={0.2} />
    </svg>
  )
}
function MPVIcon({ color = "#94a3b8", size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 68 42" fill="none">
      <path d="M6 28 L10 10 Q11 6 15 6 L50 6 Q55 7 57 11 L62 28 Z" fill={color} opacity={0.9} />
      <rect x="4" y="26" width="60" height="11" rx="4" fill={color} />
      <circle cx="16" cy="39" r="5" fill="#1e293b" /><circle cx="52" cy="39" r="5" fill="#1e293b" />
      <path d="M16 10 L14 26 L52 26 L52 10 Z" fill="white" opacity={0.18} />
    </svg>
  )
}
function VanIcon({ color = "#94a3b8", size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 72 50" fill="none">
      <rect x="4" y="12" width="60" height="28" rx="5" fill={color} opacity={0.9} />
      <rect x="4" y="30" width="64" height="14" rx="5" fill={color} />
      <path d="M4 12 L4 28 L36 28 L36 12 Z" fill="white" opacity={0.15} />
      <circle cx="18" cy="46" r="5" fill="#1e293b" /><circle cx="56" cy="46" r="5" fill="#1e293b" />
    </svg>
  )
}
function MinibusIcon({ color = "#94a3b8", size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 80 56" fill="none">
      <rect x="2" y="8" width="72" height="36" rx="6" fill={color} opacity={0.9} />
      <rect x="2" y="32" width="76" height="18" rx="6" fill={color} />
      <path d="M2 8 L2 32 L40 32 L40 8 Z" fill="white" opacity={0.13} />
      <circle cx="16" cy="51" r="5.5" fill="#1e293b" /><circle cx="64" cy="51" r="5.5" fill="#1e293b" />
      <rect x="10" y="14" width="14" height="10" rx="2" fill="white" opacity={0.3} />
      <rect x="30" y="14" width="14" height="10" rx="2" fill="white" opacity={0.3} />
      <rect x="50" y="14" width="14" height="10" rx="2" fill="white" opacity={0.3} />
    </svg>
  )
}
function CoachIcon({ color = "#94a3b8", size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 96 68" fill="none">
      <rect x="2" y="6" width="88" height="44" rx="8" fill={color} opacity={0.9} />
      <rect x="2" y="36" width="92" height="24" rx="8" fill={color} />
      <path d="M2 6 L2 36 L50 36 L50 6 Z" fill="white" opacity={0.12} />
      <circle cx="18" cy="62" r="6" fill="#1e293b" /><circle cx="78" cy="62" r="6" fill="#1e293b" />
      {[8, 20, 32, 44, 56, 68].map(x => (
        <rect key={x} x={x + 4} y="12" width="12" height="9" rx="2" fill="white" opacity={0.28} />
      ))}
    </svg>
  )
}

const VEHICLE_ICONS: Record<string, React.FC<{ color?: string; size?: number }>> = {
  sedan: SedanIcon, suv: SUVIcon, mpv: MPVIcon,
}

export interface VehicleOption {
  id: string; label: string
  vehicles: { count: number; type: string; seats: number; iconName?: string }[]
  totalSeats: number; price: number; eta: string
  isRecommended?: boolean; tag?: string
  serviceCategory?: string;
}

function useCountdown(expiresAt: Date) {
  const [r, setR] = React.useState("")
  React.useEffect(() => {
    const tick = () => { const d = expiresAt.getTime() - Date.now(); if (d <= 0) { setR("Expired"); return }; setR(`${Math.floor(d / 3_600_000)}h ${Math.floor((d % 3_600_000) / 60_000)}m ${Math.floor((d % 60_000) / 1_000)}s`) }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [expiresAt])
  return r
}


export function QuotationPanel({ onBack, onSelect, onSelectionChange, passengers = 1, routeDistanceKm = 40, tripType = "one-way", pickupLabel = "Pickup", dropoffLabel = "Dropoff", bookingDetails, expirationHours = 18 }: {
  onBack: () => void; onSelect: (id?: string) => void; onSelectionChange?: (option: any | null) => void; passengers?: number; routeDistanceKm?: number; tripType?: string; pickupLabel?: string; dropoffLabel?: string; bookingDetails?: any; expirationHours?: number;
}) {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<"book" | "quote" | null>(null);

  React.useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    checkAuth();
  }, []);
  const [options, setOptions] = React.useState<VehicleOption[]>([]);
  const [currency, setCurrency] = React.useState<string>("USD");
  const [currencySymbol, setCurrencySymbol] = React.useState<string>("");
  const [globalTaxes, setGlobalTaxes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [capacityNotice, setCapacityNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchCalculations() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        const payload = {
          userId: session?.user?.id || null,
          pickup: bookingDetails?.pickup,
          dropoff: bookingDetails?.dropoff,
          tripType,
          roundTripMode: bookingDetails?.roundTripMode,
          routeLegs: bookingDetails?.routeLegs,
          returnLoc: bookingDetails?.returnLoc,
          startDate: bookingDetails?.startDate,
          startTime: bookingDetails?.startTime,
          endDate: bookingDetails?.endDate,
          endTime: bookingDetails?.endTime,
          countryCode: bookingDetails?.countryCode || 'US',
          passengers,
          routeDistanceKm,
          returnDistanceKm: bookingDetails?.returnDistanceKm,
          returnDurationHours: bookingDetails?.returnDurationHours,
          durationHours: bookingDetails?.duration ? bookingDetails.duration / 3600 : undefined,
          multiDayStore: bookingDetails?.multiDayStore
        };

        const res = await fetch(`${BOOKING_API_URL}/calculate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || 'BYPASS_AUTH'}`
          },
          body: JSON.stringify(payload)
        }).catch((fetchErr) => {
          console.warn("[QuotationPanel] Network error reaching calculate endpoint:", fetchErr);
          return null;
        });

        if (!res || !res.ok) {
          console.warn(`[QuotationPanel] Calculate returned non-ok status: ${res?.status}`);
          return;
        }

        const data = await res.json();
        const retCurrency = data.data?.currency || 'EUR';
        const retSymbol = data.data?.currencySymbol || (retCurrency === 'EUR' ? '€' : '$');
        const numDays = Math.max(1, (payload as any).multiDayStore?.length || (payload as any).days || 1);

        const returnedOptions = (data.data?.options || []).map((opt: any) => ({
          ...opt,
          currency: retCurrency,
          currencySymbol: retSymbol,
          daysCount: numDays
        }));

        setOptions(returnedOptions);
        setCurrency(retCurrency);
        setCurrencySymbol(retSymbol);
        if (data.data?.taxes) setGlobalTaxes(data.data.taxes);

        if (data.data?.capacityExceeded && data.data?.message) {
          setCapacityNotice(data.data.message);
        } else {
          setCapacityNotice(null);
        }

        if (bookingDetails?.option) {
          const match = returnedOptions.find((o: any) => o.id === bookingDetails.option.id || o.label === bookingDetails.option.label);
          if (match) {
            setSelected(match);
            if (onSelectionChange) onSelectionChange(match);
          } else {
            setSelected(bookingDetails.option);
            if (onSelectionChange) onSelectionChange(bookingDetails.option);
          }
        } else if (returnedOptions.length > 0) {
          const rec = returnedOptions.find((o: any) => o.isRecommended) || returnedOptions[0];
          setSelected(rec);
          if (onSelectionChange) onSelectionChange(rec);
        }
      } catch (err) {
        console.error("Calculate Error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCalculations();
    // Stable primitives from bookingDetails to avoid re-fetch on every parent render
  }, [passengers, routeDistanceKm, tripType,
    bookingDetails?.pickup?.address, bookingDetails?.dropoff?.address,
    bookingDetails?.countryCode, bookingDetails?.duration]);

  const [selected, setSelected] = React.useState<VehicleOption | null>(null)
  const [step, setStep] = React.useState<"select" | "payment" | "confirmed">("select")
  const [bookingId, setBookingId] = React.useState<string | undefined>(undefined)
  const [savedAsQuote, setSavedAsQuote] = React.useState(false)
  const [isSavingQuote, setIsSavingQuote] = React.useState(false)
  const [showCancel, setShowCancel] = React.useState(false)

  // Third party booking states
  const [isThirdParty, setIsThirdParty] = React.useState(false);
  const [thirdPartyInfo, setThirdPartyInfo] = React.useState({ firstName: "", lastName: "", email: "", phone: "", company: "" });

  const { expiresAt, canSaveAsQuote } = React.useMemo(() => {
    let _expiresAt = new Date(Date.now() + expirationHours * 3_600_000);

    if (bookingDetails?.startDate && bookingDetails?.startTime) {
      try {
        const [year, month, day] = bookingDetails.startDate.split('-');
        const [hour, minute] = bookingDetails.startTime.split(':');
        const startDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

        if (startDateTime.getTime() < _expiresAt.getTime()) {
          // Trip starts sooner than standard expiration, set expiration to trip start time
          _expiresAt = startDateTime;
        }
      } catch (e) {
        console.error("Error parsing start date/time", e);
      }
    }

    // Always allow saving as quote, just adjust the expiration
    return { expiresAt: _expiresAt, canSaveAsQuote: true };
  }, [expirationHours, bookingDetails?.startDate, bookingDetails?.startTime]);

  const countdown = useCountdown(expiresAt);
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [showMixed, setShowMixed] = React.useState(false)

  // Smart scrolling header state
  const headerRef = React.useRef<HTMLDivElement>(null)
  const lastScrollY = React.useRef(0)
  const [headerVisible, setHeaderVisible] = React.useState(true)
  const [headerHeight, setHeaderHeight] = React.useState(150)

  const handleSaveQuote = async () => {
    if (!selected) return;
    setIsSavingQuote(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "BYPASS_AUTH";

      const res = await fetch(`${BOOKING_API_URL}/quotation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: session?.user?.id || "7cf68383-439b-4971-980d-f29e646a2d34", // Explicit payload testing ID fallback
          option: selected,
          pickup: bookingDetails?.pickup,
          dropoff: bookingDetails?.dropoff,
          startDate: bookingDetails?.startDate,
          startTime: bookingDetails?.startTime,
          passengers: bookingDetails?.passengers || passengers,
          tripType: bookingDetails?.tripType || tripType,
          multiDayStore: bookingDetails?.multiDayStore,
          stops: bookingDetails?.stops,
          returnLoc: bookingDetails?.returnLoc,
          selectedAmenities: bookingDetails?.selectedAmenities,
          adaRequired: bookingDetails?.adaRequired,
          adaVehicleCount: bookingDetails?.adaVehicleCount,
          currency: currency,
          distance: routeDistanceKm || bookingDetails?.distance,
          duration: bookingDetails?.durationHours || bookingDetails?.duration,
          routePolyline: bookingDetails?.routePolyline,
          pickupWaitMin: bookingDetails?.pickupWaitMin,
          isThirdParty,
          thirdPartyInfo: isThirdParty ? thirdPartyInfo : undefined
        })
      });

      if (!res.ok) throw new Error("Failed to save quotation");

      localStorage.removeItem("saved_itinerary");
      setSavedAsQuote(true);
      setTimeout(() => {
        window.location.href = "/quotations";
      }, 1500);
    } catch (e) {
      console.error("Quotation Error:", e);
    } finally {
      setIsSavingQuote(false);
    }
  };

  // Bubble selection to parent for 3-pane layout
  React.useEffect(() => {
    if (onSelectionChange) {
      if (selected) {
        const daysCount = tripType === 'multi-day' ? Math.max(1, bookingDetails?.multiDayStore?.length || 1) : 1;
        onSelectionChange({ ...selected, daysCount, bookingDetails, globalTaxes });
      } else {
        onSelectionChange(null);
      }
    }
  }, [selected, tripType, bookingDetails?.multiDayStore?.length, onSelectionChange, globalTaxes])

  // Measure header height so the sticky selected item can sit neatly below it
  React.useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight)
  }, [tripType, options.length, passengers])

  React.useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document
      // Only react if the scrolling element is the one containing our header
      if (target === document || (target instanceof HTMLElement && target.contains?.(headerRef.current))) {
        const currentY = target === document ? window.scrollY : (target as HTMLElement).scrollTop
        const diff = currentY - lastScrollY.current

        if (currentY <= 10) {
          setHeaderVisible(true) // always show at very top
        } else if (diff > 10) {
          setHeaderVisible(false) // scrolling down
        } else if (diff < -10) {
          setHeaderVisible(true) // scrolling up
        }

        if (Math.abs(diff) > 10 || currentY <= 10) {
          lastScrollY.current = currentY
        }
      }
    }
    // Using capture phase to reliably intercept scroll events from any scrollable container
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [])

  // Split options by mixed service vs single service
  const singleServiceOptions = options.filter((o: any) => !o.isMixedService);
  const mixedServiceOptions = options.filter((o: any) => o.isMixedService);

  // Show the top 4 AI-ranked single-service choices directly on the main feed
  const shown = singleServiceOptions.slice(0, 4)

  // Place any additional single-service choices into the Advanced Combinations drawer
  const advancedOptions = singleServiceOptions.slice(4)

  if (step === "payment" && selected) {
    return <PaymentPanel option={selected} bookingDetails={{ ...bookingDetails, isThirdParty, thirdPartyInfo: isThirdParty ? thirdPartyInfo : undefined }} currency={currency} onBack={() => setStep("select")} onConfirm={(id?: string) => { if(id) setBookingId(id); router.replace(`/booking-success/${id || bookingDetails?.ref || 'TRN-PENDING'}`) }} isThirdParty={isThirdParty} setIsThirdParty={setIsThirdParty} thirdPartyInfo={thirdPartyInfo} setThirdPartyInfo={setThirdPartyInfo} />
  }

  // The confirmation step is now handled by the dedicated /booking-success page.
  if (step === "confirmed" && selected) return null;

  const renderOption = (opt: any) => {
    const Icon = VEHICLE_ICONS[opt.vehicles[0]?.iconName || opt.vehicles[0]?.type] || VEHICLE_ICONS.sedan
    const isSelected = selected?.id === opt.id
    const tagColors: Record<string, { bg: string; text: string }> = {
      "CO2 Efficient": { bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', text: 'white' },
      "Best Price": { bg: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', text: 'white' },
      "Fastest ETA": { bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', text: 'white' },
      "Balanced": { bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', text: 'white' },
    }
    const tc = opt.tag ? tagColors[opt.tag] || { bg: '#475569', text: 'white' } : null

    return (
      <button key={opt.id} onClick={() => setSelected(opt)} style={{
        width: '100%', textAlign: 'left', padding: '24px 16px 16px', borderRadius: '16px', cursor: 'pointer',
        border: isSelected ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
        background: isSelected ? 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)' : '#ffffff',
        boxShadow: isSelected ? '0 12px 30px -10px rgba(37,99,235,0.2), 0 0 0 4px rgba(59,130,246,0.08)' : '0 2px 10px rgba(0,0,0,0.02)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: isSelected ? 'sticky' : 'relative',
        top: isSelected ? (headerVisible ? `${headerHeight + 12}px` : '12px') : 'auto',
        zIndex: isSelected ? 5 : 1,
        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
        display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden'
      }}>
        {/* Service Category Corner Badge */}
        <div style={{ position: 'absolute', top: 0, left: 0, padding: '4px 10px', background: isSelected ? '#3b82f6' : '#f1f5f9', color: isSelected ? 'white' : '#64748b', borderRadius: '0 0 10px 0', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', zIndex: 2 }}>
          {opt.serviceCategory || (opt.isMixedService ? "Mixed Fleet" : "Standard Fleet")}
        </div>

        {/* Icon Container */}
        <div style={{ position: 'relative', width: '70px', height: '48px', borderRadius: '12px', background: isSelected ? '#dbeafe' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: isSelected ? '1px solid #bfdbfe' : '1px solid #f1f5f9', marginTop: '8px' }}>
          {opt.vehicles.length > 1 ? (
            <div style={{ position: 'relative', width: '54px', height: '36px' }}>
              <div style={{ position: 'absolute', top: '-4px', left: '-4px', opacity: 0.5, transform: 'scale(0.85)' }}>
                {React.createElement(VEHICLE_ICONS[opt.vehicles[1]?.iconName || opt.vehicles[1]?.type] || VEHICLE_ICONS.sedan, { color: isSelected ? '#93c5fd' : '#cbd5e1', size: 32 })}
              </div>
              <div style={{ position: 'absolute', bottom: '-4px', right: '-4px' }}>
                {React.createElement(VEHICLE_ICONS[opt.vehicles[0]?.iconName || opt.vehicles[0]?.type] || VEHICLE_ICONS.sedan, { color: isSelected ? '#2563eb' : '#475569', size: 40 })}
              </div>
            </div>
          ) : (
            <>
              <Icon color={isSelected ? '#2563eb' : '#64748b'} size={42} />
              {opt.vehicles[0]?.count > 1 && (
                <div style={{ position: 'absolute', top: '-6px', right: '-6px', padding: '2px 6px', borderRadius: '10px', background: isSelected ? '#1d4ed8' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '2px solid white' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>×{opt.vehicles[0].count}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Core Info & Price */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {opt.vehicles.length > 1 ? (
                opt.vehicles.map((v: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                      {v.count}× {v.label || v.type}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{opt.label}</span>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <p style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>{currencySymbol || currency} {opt.price}</p>
              {opt.tag && tc && (
                <span style={{ fontSize: '10px', fontWeight: 800, background: tc.bg, color: tc.text, padding: '3px 8px', borderRadius: '999px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>{opt.tag}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Users style={{ width: '11px', height: '11px', color: '#94a3b8' }} /> {opt.totalSeats} seats
              </span>
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div
        ref={headerRef}
        style={{
          padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9', background: 'white',
          position: 'sticky', top: 0, zIndex: 10,
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <button onClick={() => { setSelected(null); if (onSelectionChange) onSelectionChange(null); onBack(); }} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '12px' }}>
          <X style={{ width: '15px', height: '15px' }} />
        </button>
        <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>Recommended Fleet</h2>

        {/* Shuttle route direction display */}
        {tripType === 'shuttle' && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f172a' }} />
              <span>{pickupLabel}</span>
              <ArrowRight style={{ width: '10px', height: '10px', color: '#94a3b8' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: '#2563eb' }} />
              <span style={{ color: '#2563eb' }}>{dropoffLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: '#2563eb' }} />
              <span>{dropoffLabel}</span>
              <ArrowRight style={{ width: '10px', height: '10px', color: '#cbd5e1' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f172a' }} />
              <span style={{ color: '#0f172a' }}>{pickupLabel}</span>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>return leg</span>
            </div>
          </div>
        )}

        {/* Tabs removed in favor of unified feed with Advanced Combinations */}
      </div>

      {/* Options */}
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <style>{`
          @keyframes skeleton-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                width: '100%', borderRadius: '20px', padding: '16px 18px',
                border: '1.5px solid #e2e8f0', background: '#ffffff',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{
                    width: '80px', height: '56px', borderRadius: '14px', flexShrink: 0,
                    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                    backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite linear'
                  }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      width: '60%', height: '14px', borderRadius: '8px',
                      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                      backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite linear'
                    }} />
                    <div style={{
                      width: '80%', height: '12px', borderRadius: '6px',
                      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                      backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite linear'
                    }} />
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{
                      width: '60px', height: '18px', borderRadius: '8px',
                      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                      backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite linear'
                    }} />
                    <div style={{
                      width: '40px', height: '10px', borderRadius: '4px',
                      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                      backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite linear'
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '2px' }}>
                  <div style={{
                    width: '80px', height: '12px', borderRadius: '6px',
                    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                    backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite linear'
                  }} />
                  <div style={{
                    width: '50px', height: '22px', borderRadius: '8px',
                    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                    backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite linear'
                  }} />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {capacityNotice && (
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#fffbeb', border: '1.5px solid #fef3c7', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', marginBottom: '2px', fontWeight: 800 }}>Fleet Capacity Notice</strong>
                  {capacityNotice}
                </div>
              </div>
            )}

            {shown.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 6px', color: '#0f172a' }}>No Available Vehicles</p>
                <p style={{ fontSize: '12px', margin: 0 }}>No partner operators currently service this area with active vehicles.</p>
              </div>
            )}

            {shown.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Recommended Fleet</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {shown.map(opt => renderOption(opt))}
                </div>
              </div>
            )}

            {mixedServiceOptions.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <button onClick={() => setShowMixed(!showMixed)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginBottom: showMixed ? '14px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw style={{ width: '12px', height: '12px', color: '#64748b' }} />
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Mixed Services</h3>
                  </div>
                  <ChevronDown style={{ width: '18px', height: '18px', color: '#94a3b8', transform: showMixed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                </button>
                {showMixed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                    {mixedServiceOptions.map(opt => renderOption(opt))}
                  </div>
                )}
              </div>
            )}

            {advancedOptions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginBottom: showAdvanced ? '14px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Grid style={{ width: '12px', height: '12px', color: '#64748b' }} />
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Advanced Combinations</h3>
                  </div>
                  <ChevronDown style={{ width: '18px', height: '18px', color: '#94a3b8', transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                </button>
                {showAdvanced && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                    {advancedOptions.map(opt => renderOption(opt))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>



      {/* Footer */}
      {selected && (
        <FooterPortal>
          <div style={{ padding: '14px 22px 24px', borderTop: '1px solid #f1f5f9', background: 'white', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', bottom: 0, zIndex: 10 }}>
            {savedAsQuote && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', borderRadius: '10px', background: '#fefce8', border: '1px solid #fef08a' }}>
                <Clock style={{ width: '13px', height: '13px', color: '#ca8a04' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>Quote saved — expires <span style={{ color: '#dc2626' }}>{countdown}</span></span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '9px 13px', borderRadius: '10px', background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
              <Info style={{ width: '12px', height: '12px', color: '#64748b', flexShrink: 0, marginTop: '1px' }} />
              {canSaveAsQuote ? (
                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>Corporate rate applied. Quote valid until {expiresAt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p>
              ) : (
                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>Corporate rate applied. Trip starts too soon to save quote. Book now.</p>
              )}
            </div>
            <button onClick={() => {
              if (!user) {
                setPendingAction("book");
                setShowAuthDialog(true);
              } else {
                setStep("payment");
              }
            }} style={{ width: '100%', height: '50px', borderRadius: '14px', background: '#0f172a', color: 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CreditCard style={{ width: '16px', height: '16px' }} /> Book Now — {currencySymbol || currency} {selected.price}
            </button>
            {canSaveAsQuote && (
              <button onClick={() => {
                if (!user) {
                  setPendingAction("quote");
                  setShowAuthDialog(true);
                } else {
                  handleSaveQuote();
                }
              }} disabled={isSavingQuote || savedAsQuote} style={{ width: '100%', height: '44px', borderRadius: '14px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                {isSavingQuote ? (
                  <RefreshCw className="animate-spin" style={{ width: '14px', height: '14px', color: '#64748b' }} />
                ) : (
                  <BookmarkPlus style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                )}
                {savedAsQuote ? 'Quote Saved ✓' : isSavingQuote ? 'Saving...' : 'Save as Quotation'}
              </button>
            )}
          </div>
        </FooterPortal>
      )}

      {showAuthDialog && (
        <QuotationAuthDialog 
          isOpen={showAuthDialog} 
          onClose={() => { setShowAuthDialog(false); setPendingAction(null); }} 
          onSuccess={async () => {
            const supabase = createClient();
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
            setShowAuthDialog(false);
            if (pendingAction === "book") setStep("payment");
            if (pendingAction === "quote") handleSaveQuote();
            setPendingAction(null);
          }} 
        />
      )}
    </div>
  )
}

function FooterPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkTarget = () => {
      const el = document.getElementById('vehicle-details-footer-portal');
      if (el) {
        setTarget(el);
        if (interval) clearInterval(interval);
      }
    };
    checkTarget();
    interval = setInterval(checkTarget, 200);
    return () => clearInterval(interval);
  }, []);

  if (target) {
    return createPortal(children, target);
  }

  // Fallback to inline rendering if side panel isn't open
  return <>{children}</>;
}

// ─── Payment State Machine ─────────────────────────────────────────────────────
type PayState = "idle" | "loading" | "success" | "declined" | "error" | "timeout"
const SAVED_CARDS: any[] = []

function MockCheckoutForm({ option, bookingDetails, currency = "EUR", onBack, onConfirm, isThirdParty, setIsThirdParty, thirdPartyInfo, setThirdPartyInfo, intentType }: any) {
  const [payState, setPayState] = React.useState<PayState>("idle");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [savedCards, setSavedCards] = React.useState<any[]>([]);
  const [isLoadingCards, setIsLoadingCards] = React.useState(true);
  const [selectedCard, setSelectedCard] = React.useState<string>('new');
  const [saveNewCard, setSaveNewCard] = React.useState(false);

  React.useEffect(() => {
    async function fetchCards() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id;
        const userEmail = session?.user?.email;

        if (!userId) {
          setIsLoadingCards(false);
          return;
        }

        const res = await fetch(`${BOOKING_API_URL}/payment-methods`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-user-id": userId,
            "x-user-email": userEmail || ""
          }
        });

        if (res.ok) {
          const data = await res.json();
          setSavedCards(data.data || []);
          if (data.data?.length > 0) {
            setSelectedCard(data.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch cards", err);
      } finally {
        setIsLoadingCards(false);
      }
    }
    fetchCards();
  }, []);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayState("loading");

    setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          throw new Error("Authentication required. Please sign in to complete booking.");
        }

        const res = await fetch(`${BOOKING_API_URL}/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: session?.user?.id || undefined,
            option,
            pickup: bookingDetails?.pickup,
            dropoff: bookingDetails?.dropoff,
            startDate: bookingDetails?.startDate,
            startTime: bookingDetails?.startTime,
            passengers: bookingDetails?.passengers,
            tripType: bookingDetails?.tripType,
            multiDayStore: bookingDetails?.multiDayStore,
            currency: currency,
            distance: bookingDetails?.routeDistanceKm || bookingDetails?.distance,
            duration: bookingDetails?.durationHours || bookingDetails?.duration,
            quotation_db_id: bookingDetails?.quotation_db_id,
            routePolyline: bookingDetails?.routePolyline,
            pickupWaitMin: bookingDetails?.pickupWaitMin,
            isThirdParty: bookingDetails?.isThirdParty,
            thirdPartyInfo: bookingDetails?.thirdPartyInfo,
            paymentIntentId: "pi_mock_intent_success",
            savedCardId: selectedCard !== 'new' ? selectedCard : undefined,
            savePaymentMethod: selectedCard === 'new' ? saveNewCard : false,
          })
        });

        if (!res.ok) throw new Error("Checkout Gateway validation failed");

        const responseData = await res.json();
        localStorage.removeItem("saved_itinerary");
        setPayState("success");
        setTimeout(() => onConfirm(responseData?.data?.id), 1200);
      } catch (err) {
        console.error("[Gateway] Checkout Error:", err);
        setPayState("error");
        setErrorMessage("Payment succeeded but booking creation failed.");
        setTimeout(() => setPayState("success"), 2000);
        setTimeout(() => onConfirm(), 3200);
      }
    }, 1500);
  }

  if (payState === "loading") return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '18px', padding: '40px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.9s linear infinite' }} />
      <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Processing payment…</p>
      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Please do not close this window</p>
    </div>
  )
  if (payState === "success") return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', padding: '40px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'successPulse 0.4s ease' }}>
        <CheckCircle2 style={{ width: '32px', height: '32px', color: '#16a34a' }} />
      </div>
      <p style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Payment Approved!</p>
      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Redirecting to confirmation…</p>
    </div>
  )
  if (payState === "error") return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle style={{ width: '32px', height: '32px', color: '#d97706' }} />
      </div>
      <p style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Payment Error</p>
      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{errorMessage || "Something went wrong on our end."}</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setPayState("idle")} style={{ padding: '10px 22px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Retry</button>
        <button onClick={onBack} style={{ padding: '10px 22px', borderRadius: '12px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <button type="button" onClick={onBack} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '12px' }}>
          <ArrowLeft style={{ width: '15px', height: '15px' }} />
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.4px', margin: '0 0 3px' }}>Payment (Demo)</h2>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{option.label} · {currency} {option.price}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '13px 15px', marginBottom: '18px', border: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{option.label}</p><p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{option.totalSeats} seats · {option.eta}</p></div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '19px', fontWeight: 900, margin: 0 }}>{currency} {option.price}</p>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', margin: '2px 0 0' }}>due today</p>
          </div>
        </div>

        {/* Third Party Booking Toggle */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: isThirdParty ? '16px' : '0' }}>
              <input
                type="checkbox"
                checked={isThirdParty}
                onChange={(e) => setIsThirdParty(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f172a' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>I am booking on behalf of another person / agency</span>
            </label>

            {isThirdParty && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={thirdPartyInfo.firstName}
                      onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, firstName: e.target.value })}
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={thirdPartyInfo.lastName}
                      onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, lastName: e.target.value })}
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="passenger@example.com"
                    value={thirdPartyInfo.email}
                    onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, email: e.target.value })}
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Mobile Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <PhoneInput
                    placeholder="Enter mobile phone number"
                    defaultCountry={(bookingDetails?.countryCode || bookingDetails?.pickup?.countryCode || 'ES').toUpperCase() as any}
                    value={thirdPartyInfo.phone}
                    onChange={(val: any) => setThirdPartyInfo({ ...thirdPartyInfo, phone: val || "" })}
                    className="rounded-[10px] text-[13px] bg-white"
                    style={{ width: '100%', height: '42px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Company / Agency Name <span style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Travel Agency / Corporate Client"
                    value={thirdPartyInfo.company}
                    onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, company: e.target.value })}
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px', color: '#0f172a' }}>Payment Method</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isLoadingCards ? (
              <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '13px' }}>
                Loading saved cards...
              </div>
            ) : (
              savedCards.map(card => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCard(card.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '12px',
                    border: selectedCard === card.id ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    background: selectedCard === card.id ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '24px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                      <CreditCard style={{ width: '14px', height: '14px', color: '#64748b' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>{card.brand} •••• {card.last4}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Expires {card.exp}</p>
                    </div>
                  </div>
                  {selectedCard === card.id && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#2563eb' }} />}
                </button>
              ))
            )}

            <button
              type="button"
              onClick={() => setSelectedCard('new')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '12px',
                border: selectedCard === 'new' ? '2px solid #2563eb' : '1.5px dashed #cbd5e1',
                background: selectedCard === 'new' ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '24px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                  <CreditCard style={{ width: '14px', height: '14px', color: '#64748b' }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Add New Card</p>
              </div>
              {selectedCard === 'new' && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#2563eb' }} />}
            </button>
          </div>
        </div>

        {selectedCard === 'new' && (
          <div style={{ padding: '20px', textAlign: 'center', border: '1.5px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>Demo Environment</p>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Stripe API keys are not configured. Click confirm below to simulate a successful payment.</p>

            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Info style={{ width: '16px', height: '16px', color: '#64748b', marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                  <strong>Securely stored for your convenience.</strong> We save your card details securely with Stripe to enable seamless processing of this trip, overages, or future bookings.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 22px 22px', borderTop: '1px solid #f1f5f9' }}>
        <button type="submit" style={{ width: '100%', height: '52px', borderRadius: '14px', background: '#16a34a', color: 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)' }}>
          <CheckCircle2 style={{ width: '17px', height: '17px' }} /> Confirm & Pay {currency} {option.price}
        </button>
        <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: 600, margin: '9px 0 0' }}>🔒 Simulated Payment</p>
      </div>
    </form>
  )
}

function CheckoutForm({ option, bookingDetails, currency = "EUR", onBack, onConfirm, isThirdParty, setIsThirdParty, thirdPartyInfo, setThirdPartyInfo, intentType }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [payState, setPayState] = React.useState<PayState>("idle");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isReady, setIsReady] = React.useState(false);
  const [savedCards, setSavedCards] = React.useState<any[]>([]);
  const [isLoadingCards, setIsLoadingCards] = React.useState(true);
  const [selectedCard, setSelectedCard] = React.useState<string>('new');
  const [saveNewCard, setSaveNewCard] = React.useState(false);

  React.useEffect(() => {
    async function fetchCards() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id;
        const userEmail = session?.user?.email;

        if (!userId) {
          setIsLoadingCards(false);
          return;
        }

        const res = await fetch(`${BOOKING_API_URL}/payment-methods`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-user-id": userId,
            "x-user-email": userEmail || ""
          }
        });

        if (res.ok) {
          const data = await res.json();
          setSavedCards(data.data || []);
          if (data.data?.length > 0) {
            setSelectedCard(data.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch cards", err);
      } finally {
        setIsLoadingCards(false);
      }
    }
    fetchCards();
  }, []);


  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    setPayState("loading");

    let finalPaymentIntentId = undefined;

    if (selectedCard === 'new') {
      if (!stripe || !elements || !isReady) return;

      let error, paymentIntent, setupIntent;

      if (intentType === 'setup') {
        const result = await stripe.confirmSetup({
          elements,
          confirmParams: {},
          redirect: 'if_required',
        });
        error = result.error;
        setupIntent = result.setupIntent;
      } else {
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {},
          redirect: 'if_required',
        });
        error = result.error;
        paymentIntent = result.paymentIntent;
      }

      if (error) {
        setErrorMessage(error.message || "Payment failed");
        setPayState("error");
        return;
      }

      if (intentType === 'setup' && setupIntent && setupIntent.status === 'succeeded') {
        finalPaymentIntentId = undefined;
      } else if (intentType !== 'setup' && paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')) {
        finalPaymentIntentId = paymentIntent.id;
      } else {
        setErrorMessage("Payment was not successful.");
        setPayState("error");
        return;
      }
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication required. Please sign in to submit quotation.");
      }

      const res = await fetch(`${BOOKING_API_URL}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: session?.user?.id || undefined,
          userEmail: session?.user?.email || undefined,
          option,
          pickup: bookingDetails?.pickup,
          dropoff: bookingDetails?.dropoff,
          startDate: bookingDetails?.startDate,
          startTime: bookingDetails?.startTime,
          passengers: bookingDetails?.passengers,
          tripType: bookingDetails?.tripType,
          multiDayStore: bookingDetails?.multiDayStore,
          currency: currency,
          distance: bookingDetails?.routeDistanceKm || bookingDetails?.distance,
          duration: bookingDetails?.durationHours || bookingDetails?.duration,
          quotation_db_id: bookingDetails?.quotation_db_id,
          routePolyline: bookingDetails?.routePolyline,
          pickupWaitMin: bookingDetails?.pickupWaitMin,
          paymentIntentId: finalPaymentIntentId,
          savedCardId: selectedCard !== 'new' ? selectedCard : undefined,
          savePaymentMethod: selectedCard === 'new' ? true : false,
        })
      });

      if (!res.ok) throw new Error("Checkout Gateway validation failed");

      const responseData = await res.json();
      localStorage.removeItem("saved_itinerary");
      setPayState("success");
      setTimeout(() => onConfirm(responseData?.data?.id), 200);
    } catch (err) {
      console.error("[Gateway] Checkout Error:", err);
      setPayState("error");
      setErrorMessage("Payment succeeded but booking creation failed.");
      setTimeout(() => setPayState("success"), 200);
      setTimeout(() => onConfirm(), 200);
    }
  }

  if (payState === "success") return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', padding: '40px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'successPulse 0.4s ease' }}>
        <CheckCircle2 style={{ width: '32px', height: '32px', color: '#16a34a' }} />
      </div>
      <p style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Payment Approved!</p>
      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Redirecting to confirmation…</p>
    </div>
  )
  if (payState === "error") return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle style={{ width: '32px', height: '32px', color: '#d97706' }} />
      </div>
      <p style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Payment Error</p>
      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{errorMessage || "Something went wrong on our end."}</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setPayState("idle")} style={{ padding: '10px 22px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Retry</button>
        <button onClick={onBack} style={{ padding: '10px 22px', borderRadius: '12px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {payState === "loading" && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '40px', backdropFilter: 'blur(2px)', borderRadius: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Processing payment…</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Please do not close this window</p>
        </div>
      )}
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <button type="button" onClick={onBack} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '12px' }}>
          <ArrowLeft style={{ width: '15px', height: '15px' }} />
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.4px', margin: '0 0 3px' }}>Payment</h2>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{option.label} · {currency} {option.price}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '13px 15px', marginBottom: '18px', border: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{option.label}</p><p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>{option.totalSeats} seats · {option.eta}</p></div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '19px', fontWeight: 900, margin: 0 }}>{currency} {option.price}</p>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', margin: '2px 0 0' }}>due today</p>
          </div>
        </div>

        {/* Third Party Booking Toggle */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: isThirdParty ? '16px' : '0' }}>
              <input
                type="checkbox"
                checked={isThirdParty}
                onChange={(e) => setIsThirdParty && setIsThirdParty(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f172a' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>I am booking on behalf of another person / agency</span>
            </label>

            {isThirdParty && setThirdPartyInfo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={thirdPartyInfo?.firstName || ""}
                      onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, firstName: e.target.value })}
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={thirdPartyInfo?.lastName || ""}
                      onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, lastName: e.target.value })}
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="passenger@example.com"
                    value={thirdPartyInfo?.email || ""}
                    onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, email: e.target.value })}
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Mobile Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <PhoneInput
                    placeholder="Enter mobile phone number"
                    defaultCountry={(bookingDetails?.countryCode || bookingDetails?.pickup?.countryCode || 'ES').toUpperCase() as any}
                    value={thirdPartyInfo?.phone || ""}
                    onChange={(val: any) => setThirdPartyInfo({ ...thirdPartyInfo, phone: val || "" })}
                    className="rounded-[10px] text-[13px] bg-white"
                    style={{ width: '100%', height: '42px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Company / Agency Name <span style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Travel Agency / Corporate Client"
                    value={thirdPartyInfo?.company || ""}
                    onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, company: e.target.value })}
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px', color: '#0f172a' }}>Payment Method</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isLoadingCards ? (
              <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '13px' }}>
                Loading saved cards...
              </div>
            ) : (
              savedCards.map(card => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCard(card.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '12px',
                    border: selectedCard === card.id ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    background: selectedCard === card.id ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '24px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                      <CreditCard style={{ width: '14px', height: '14px', color: '#64748b' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>{card.brand} •••• {card.last4}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Expires {card.exp}</p>
                    </div>
                  </div>
                  {selectedCard === card.id && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#2563eb' }} />}
                </button>
              ))
            )}

            <button
              type="button"
              onClick={() => setSelectedCard('new')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '12px',
                border: selectedCard === 'new' ? '2px solid #2563eb' : '1.5px dashed #cbd5e1',
                background: selectedCard === 'new' ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '24px', background: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                  <CreditCard style={{ width: '14px', height: '14px', color: '#64748b' }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Add New Card</p>
              </div>
              {selectedCard === 'new' && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#2563eb' }} />}
            </button>
          </div>
        </div>

        {selectedCard === 'new' && (
          <div style={{ position: 'relative', minHeight: '150px' }}>
            {!isReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', zIndex: 10 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '3px solid #f1f5f9', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
              </div>
            )}
            <PaymentElement
              onReady={() => setIsReady(true)}
              options={{
                wallets: {
                  link: 'never'
                }
              }}
            />

            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Info style={{ width: '16px', height: '16px', color: '#64748b', marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                  <strong>Securely stored for your convenience.</strong> We save your card details securely with Stripe to enable seamless processing of this trip, overages, or future bookings.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
      <div style={{ padding: '14px 22px 22px', borderTop: '1px solid #f1f5f9' }}>
        <button type="submit" disabled={(selectedCard === 'new' && (!stripe || !elements || !isReady)) || payState === "loading"} style={{ width: '100%', height: '52px', borderRadius: '14px', background: ((selectedCard === 'new' && (!stripe || !elements || !isReady)) || payState === "loading") ? '#e2e8f0' : '#16a34a', color: ((selectedCard === 'new' && (!stripe || !elements || !isReady)) || payState === "loading") ? '#94a3b8' : 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: ((selectedCard === 'new' && (!stripe || !elements || !isReady)) || payState === "loading") ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', boxShadow: ((selectedCard === 'new' && (!stripe || !elements || !isReady)) || payState === "loading") ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.2)' }}>
          {payState === "loading" ? (
            <>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(148, 163, 184, 0.3)', borderTopColor: '#94a3b8', animation: 'spin 1s linear infinite' }} />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 style={{ width: '17px', height: '17px' }} /> Confirm & Pay {currency} {option.price}
            </>
          )}
        </button>
        <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: 600, margin: '9px 0 0' }}>🔒 Secured by Stripe · 256-bit SSL</p>
      </div>
    </form>
  )
}

export function PaymentPanel({ option, bookingDetails, currency = "EUR", onBack, onConfirm, isThirdParty, setIsThirdParty, thirdPartyInfo, setThirdPartyInfo }: { option: VehicleOption; bookingDetails?: any; currency?: string; onBack: () => void; onConfirm: (id?: string) => void; isThirdParty?: boolean; setIsThirdParty?: any; thirdPartyInfo?: any; setThirdPartyInfo?: any; }) {
  const [clientSecret, setClientSecret] = React.useState("");
  const [intentType, setIntentType] = React.useState("payment");

  React.useEffect(() => {
    async function initPayment() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || 'BYPASS_AUTH';

        const res = await fetch(`${BOOKING_API_URL}/create-payment-intent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: option.price,
            currency,
            bookingDetails,
            countryCode: bookingDetails?.countryCode || bookingDetails?.pickup?.countryCode || 'GLOBAL',
            userId: session?.user?.id,
            userEmail: session?.user?.email
          })
        });
        const data = await res.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setIntentType(data.intentType || "payment");
        } else {
          console.error("Missing clientSecret in response", data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    initPayment();
  }, [option, currency, bookingDetails]);

  if (!clientSecret) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading secure payment...</div>;

  if (clientSecret.includes('mock')) {
    return <MockCheckoutForm option={option} bookingDetails={bookingDetails} currency={currency} onBack={onBack} onConfirm={onConfirm} isThirdParty={isThirdParty} setIsThirdParty={setIsThirdParty} thirdPartyInfo={thirdPartyInfo} setThirdPartyInfo={setThirdPartyInfo} />
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm option={option} bookingDetails={bookingDetails} currency={currency} onBack={onBack} onConfirm={onConfirm} isThirdParty={isThirdParty} setIsThirdParty={setIsThirdParty} thirdPartyInfo={thirdPartyInfo} setThirdPartyInfo={setThirdPartyInfo} intentType={intentType} />
    </Elements>
  );
}

// ─── Confirmation Panel ────────────────────────────────────────────────────────
function ConfirmationPanel({ bookingId, option, bookingDetails, currency = "EUR", onDone, onCancel }: { bookingId?: string; option: VehicleOption; bookingDetails?: any; currency?: string; onDone: (id?: string) => void; onCancel: () => void }) {
  const ref = React.useMemo(() => bookingId ? `TRN-${bookingId.substring(0, 8).toUpperCase()}` : `TH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, [bookingId])
  const [showReceipt, setShowReceipt] = React.useState(false)

  const tripDateTime = React.useMemo(() => {
    if (bookingDetails?.startDate && bookingDetails?.startTime) {
      return new Date(`${bookingDetails.startDate}T${bookingDetails.startTime}`);
    }
    return new Date(); // fallback to immediate
  }, [bookingDetails]);

  const timeDiffMs = tripDateTime.getTime() - Date.now();
  const isFuture = timeDiffMs > 2 * 60 * 60 * 1000; // > 2 hours away
  
  // Realism: use a small timeout to "activate" the steps so it animates in
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { 
    setMounted(true);
    if (typeof window !== 'undefined' && ref) {
      try {
        const savedRefsStr = localStorage.getItem('transhola_recent_booking_refs');
        const savedRefs: string[] = savedRefsStr ? JSON.parse(savedRefsStr) : [];
        if (!savedRefs.includes(ref)) {
          savedRefs.unshift(ref);
          localStorage.setItem('transhola_recent_booking_refs', JSON.stringify(savedRefs.slice(0, 15)));
        }
      } catch (e) {
        console.warn("Failed to cache booking ref:", e);
      }
    }
  }, [ref]);

  const steps = React.useMemo(() => {
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
  }, [isFuture]);

  const pickupLabel = isFuture ? 'SCHEDULED FOR' : 'PICKUP ETA';
  const pickupValue = isFuture 
    ? tripDateTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : (option.eta || '10-20 min');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '0', background: '#f8fafc', animation: 'fadeIn 0.5s ease-out' }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          @keyframes successPulse { 
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 
            70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); } 
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } 
          }
          .glass-panel {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05);
          }
        `}
      </style>

      {/* Premium Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', 
        padding: '50px 24px 40px', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
        position: 'relative', overflow: 'hidden',
        animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px', animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', animation: mounted ? 'successPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }} />
          <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 style={{ width: '40px', height: '40px', color: 'white' }} />
          </div>
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', color: 'white', margin: '0 0 12px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Booking Confirmed</h2>
        <p style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: 500, margin: 0, lineHeight: 1.6, maxWidth: '280px', opacity: 0.9 }}>
          Your vehicle is securely reserved. Confirmation sent to your email.
        </p>
      </div>

      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', marginTop: '-30px', position: 'relative', zIndex: 10 }}>
        
        {/* Dynamic Timeline */}
        <div className="glass-panel" style={{ padding: '28px 20px', marginBottom: '20px', animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '4px', background: '#f1f5f9', zIndex: 0, borderRadius: '2px' }} />
            <div style={{ position: 'absolute', top: '16px', left: '10%', width: mounted ? '40%' : '0%', height: '4px', background: 'linear-gradient(90deg, #10b981, #3b82f6)', zIndex: 0, borderRadius: '2px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1) 0.5s' }} />
            
            {steps.map((s, i) => {
              const Step = s.icon;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minWidth: '76px', position: 'relative', zIndex: 1, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(15px)', transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${(i * 0.15) + 0.3}s` }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', 
                    background: s.status === 'done' ? '#10b981' : s.status === 'active' ? '#3b82f6' : 'white', 
                    border: `4px solid ${s.status === 'done' ? '#10b981' : s.status === 'active' ? '#3b82f6' : '#e2e8f0'}`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    boxShadow: s.status !== 'pending' ? `0 4px 12px ${s.status === 'done' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}` : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s ease'
                  }}>
                    <Step style={{ width: '16px', height: '16px', color: s.status !== 'pending' ? 'white' : '#cbd5e1' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: s.status !== 'pending' ? '#0f172a' : '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>{s.label}</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>{s.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail Glassmorphism Card */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
          {[
            { label: 'BOOKING REF', value: ref, color: '#0f172a' }, 
            { label: 'FLEET', value: option.label, color: '#0f172a' }, 
            { label: 'AMOUNT', value: `${currency} ${option.price}`, color: '#10b981' }, 
            { label: pickupLabel, value: pickupValue, color: '#3b82f6' }
          ].map(({ label, value, color }, index, arr) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: index !== arr.length - 1 ? '16px' : '0', marginBottom: index !== arr.length - 1 ? '16px' : '0', borderBottom: index !== arr.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto', animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both' }}>
          <button onClick={() => onDone(bookingId)} style={{ 
            width: '100%', height: '56px', borderRadius: '16px', 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            color: 'white', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer', 
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)', transition: 'transform 0.1s, box-shadow 0.2s' 
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Track My Ride
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowReceipt(true)} style={{ 
              flex: 1, height: '48px', borderRadius: '16px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '14px', 
              border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'white'}
            >
              <Eye style={{ width: '18px', height: '18px', color: '#64748b' }} /> Receipt
            </button>
            <button onClick={onCancel} style={{ 
              flex: 1, height: '48px', borderRadius: '16px', background: '#fff1f2', color: '#e11d48', fontWeight: 700, fontSize: '14px', 
              border: '1.5px solid #ffe4e6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#ffe4e6'}
            onMouseOut={e => e.currentTarget.style.background = '#fff1f2'}
            >
              <XCircle style={{ width: '18px', height: '18px' }} /> Cancel
            </button>
          </div>
        </div>

      </div>

      <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} bookingDetails={{ ...bookingDetails, option, ref }} />
    </div>
  )
}

export function QuotationAuthDialog({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: firstName, last_name: lastName, is_company: false }
        }
      });
      if (error) {
        setError(error.message);
      } else {
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email,
            full_name: `${firstName} ${lastName}`.trim(),
            first_name: firstName || null,
            last_name: lastName || null,
            role: 'client',
            status: 'Active',
            preferences: { clientType: 'Individual' }
          });
        }
        onSuccess();
      }
    }
    setLoading(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{isLogin ? 'Login to continue' : 'Create an account'}</DialogTitle>
          <DialogDescription>
            {isLogin ? 'Enter your email and password to proceed with your booking.' : 'Sign up to manage your bookings and quotations.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          
          {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
          
          <Button type="submit" className="w-full h-11 text-white bg-slate-900 rounded-xl hover:bg-slate-800" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
          </Button>
          
          <div className="text-center mt-2">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 hover:underline bg-transparent border-none cursor-pointer">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
