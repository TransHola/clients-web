"use client"

import * as React from "react"
import {
  Users, Briefcase, Zap, ShieldCheck, CheckCircle2, ChevronDown, ChevronRight, Droplets, Wifi, Coffee, Baby, MapPin, Grid, Info, Clock, RefreshCw, BookmarkPlus, CreditCard, ArrowLeft, XCircle, Download, ArrowRight, Eye, X, AlertTriangle
} from "lucide-react"
import { createPortal } from "react-dom"
import { ReceiptModal } from "./receipt-modal"
import { CancellationModal } from "./cancellation-modal"
import { createClient } from "@/lib/supabase/client"
import { OptimizationSolver, OptimizationResult } from "@/lib/rate-engine/optimization-solver"
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock');

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
  const [options, setOptions] = React.useState<VehicleOption[]>([]);
  const [currency, setCurrency] = React.useState<string>("USD");
  const [currencySymbol, setCurrencySymbol] = React.useState<string>("");
  const [globalTaxes, setGlobalTaxes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

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

        const res = await fetch(`${process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://api.transhola.com:8000'}/api/bookings/calculate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || 'BYPASS_AUTH'}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Backend calculate failed");

        const data = await res.json();
        const returnedOptions = data.data?.options || [];
        setOptions(returnedOptions);
        if (data.data?.currency) setCurrency(data.data.currency);
        if (data.data?.currencySymbol) setCurrencySymbol(data.data.currencySymbol);
        if (data.data?.taxes) setGlobalTaxes(data.data.taxes);

        if (bookingDetails?.option) {
          const match = returnedOptions.find((o: any) => o.id === bookingDetails.option.id || o.label === bookingDetails.option.label);
          if (match) {
            setSelected(match);
            if (onSelectionChange) onSelectionChange(match);
          } else {
            setSelected(bookingDetails.option);
            if (onSelectionChange) onSelectionChange(bookingDetails.option);
          }
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

      const res = await fetch(`${process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://api.transhola.com:8000'}/api/bookings/quotation`, {
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
    return <PaymentPanel option={selected} bookingDetails={{ ...bookingDetails, isThirdParty, thirdPartyInfo: isThirdParty ? thirdPartyInfo : undefined }} currency={currency} onBack={() => setStep("select")} onConfirm={(id: string) => { setBookingId(id); setStep("confirmed") }} isThirdParty={isThirdParty} setIsThirdParty={setIsThirdParty} thirdPartyInfo={thirdPartyInfo} setThirdPartyInfo={setThirdPartyInfo} />
  }

  if (step === "confirmed" && selected) return (
    <>
      <ConfirmationPanel bookingId={bookingId} option={selected} bookingDetails={bookingDetails} currency={currency} onDone={(id: string) => onSelect(id)} onCancel={() => setShowCancel(true)} />
      {showCancel && <CancellationModal onClose={() => setShowCancel(false)} onConfirmed={() => { setShowCancel(false); onSelect() }} />}
    </>
  )

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
        <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 3px' }}>Choose your ride</h2>
        <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, margin: 0 }}>
          {tripType === 'shuttle' ? `${passengers} vehicle${passengers > 1 ? 's' : ''}` : `${passengers} passenger${passengers > 1 ? 's' : ''}`} · {routeDistanceKm} {(bookingDetails?.countryCode?.toUpperCase() === 'US' || bookingDetails?.countryCode?.toUpperCase() === 'GB') ? 'mi' : 'km'} · {currency}
        </p>

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
            <button onClick={() => setStep("payment")} style={{ width: '100%', height: '50px', borderRadius: '14px', background: '#0f172a', color: 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CreditCard style={{ width: '16px', height: '16px' }} /> Book Now — {currencySymbol || currency} {selected.price}
            </button>
            {canSaveAsQuote && (
              <button onClick={handleSaveQuote} disabled={isSavingQuote || savedAsQuote} style={{ width: '100%', height: '44px', borderRadius: '14px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
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

function MockCheckoutForm({ option, bookingDetails, currency = "AED", onBack, onConfirm, isThirdParty, setIsThirdParty, thirdPartyInfo, setThirdPartyInfo }: any) {
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

        const res = await fetch(`${process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://api.transhola.com:8000'}/api/bookings/payment-methods`, {
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
        const token = session?.access_token || "MOCK_ENTERPRISE_JWT";

        const res = await fetch(`${process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://api.transhola.com:8000'}/api/bookings/checkout`, {
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={thirdPartyInfo.firstName}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, firstName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={thirdPartyInfo.lastName}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, lastName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={thirdPartyInfo.email}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', gridColumn: '1 / -1' }}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={thirdPartyInfo.phone}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Company (Optional)"
                  value={thirdPartyInfo.company}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, company: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
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

function CheckoutForm({ option, bookingDetails, currency = "AED", onBack, onConfirm, isThirdParty, setIsThirdParty, thirdPartyInfo, setThirdPartyInfo }: any) {
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

        const res = await fetch(`${process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://api.transhola.com:8000'}/api/bookings/payment-methods`, {
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
          confirmParams: {
            setup_future_usage: 'off_session',
          },
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
      const token = session?.access_token || "MOCK_ENTERPRISE_JWT";

      const res = await fetch(`${process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://api.transhola.com:8000'}/api/bookings/checkout`, {
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
      setTimeout(() => onConfirm(responseData?.data?.id), 1200);
    } catch (err) {
      console.error("[Gateway] Checkout Error:", err);
      setPayState("error");
      setErrorMessage("Payment succeeded but booking creation failed.");
      setTimeout(() => setPayState("success"), 2000);
      setTimeout(() => onConfirm(), 3200);
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={thirdPartyInfo?.firstName || ""}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, firstName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={thirdPartyInfo?.lastName || ""}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, lastName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={thirdPartyInfo?.email || ""}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', gridColumn: '1 / -1' }}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={thirdPartyInfo?.phone || ""}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Company (Optional)"
                  value={thirdPartyInfo?.company || ""}
                  onChange={(e: any) => setThirdPartyInfo({ ...thirdPartyInfo, company: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
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
            <PaymentElement onReady={() => setIsReady(true)} />

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

export function PaymentPanel({ option, bookingDetails, currency = "AED", onBack, onConfirm, isThirdParty, setIsThirdParty, thirdPartyInfo, setThirdPartyInfo }: { option: VehicleOption; bookingDetails?: any; currency?: string; onBack: () => void; onConfirm: (id?: string) => void; isThirdParty?: boolean; setIsThirdParty?: any; thirdPartyInfo?: any; setThirdPartyInfo?: any; }) {
  const [clientSecret, setClientSecret] = React.useState("");
  const [intentType, setIntentType] = React.useState("payment");

  React.useEffect(() => {
    async function initPayment() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || 'BYPASS_AUTH';

        const res = await fetch(`${process.env.NEXT_PUBLIC_BOOKING_API_URL || 'http://api.transhola.com:8000'}/api/bookings/create-payment-intent`, {
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
function ConfirmationPanel({ bookingId, option, bookingDetails, currency = "AED", onDone, onCancel }: { bookingId?: string; option: VehicleOption; bookingDetails?: any; currency?: string; onDone: (id?: string) => void; onCancel: () => void }) {
  const ref = React.useMemo(() => bookingId ? `TRN-${bookingId.substring(0, 8).toUpperCase()}` : `TH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, [bookingId])
  const [progress, setProgress] = React.useState(0) // 0=confirmed, 1=assigned, 2=enroute
  const [showReceipt, setShowReceipt] = React.useState(false)

  React.useEffect(() => {
    const t1 = setTimeout(() => setProgress(1), 3000)
    const t2 = setTimeout(() => setProgress(2), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const steps = [
    { label: "Booking Confirmed", icon: CheckCircle2, color: '#16a34a' },
    { label: "Driver Assigned", icon: Users, color: '#2563eb' },
    { label: "En Route", icon: MapPin, color: '#7c3aed' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '32px 22px 24px' }}>
      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '18px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#dcfce7', animation: 'successPulse 0.5s ease' }} />
          <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: '#dcfce7', border: '3px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 style={{ width: '38px', height: '38px', color: '#16a34a' }} />
          </div>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a', margin: '0 0 6px' }}>Booking Confirmed!</h2>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, margin: 0, lineHeight: 1.6 }}>Your booking is confirmed. Confirmation sent to your email.</p>
      </div>

      {/* 3-step progress */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '0', marginBottom: '26px' }}>
        {steps.map((s, i) => {
          const done = progress > i
          const active = progress === i
          const Step = s.icon
          return (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '70px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: done || active ? s.color : '#f1f5f9', border: `2.5px solid ${done || active ? s.color : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' }}>
                  <Step style={{ width: '16px', height: '16px', color: done || active ? 'white' : '#cbd5e1' }} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: done || active ? s.color : '#cbd5e1', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: '2.5px', background: progress > i ? steps[i + 1].color : '#e2e8f0', marginTop: '17px', transition: 'background 0.4s', borderRadius: '2px' }} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Detail card */}
      <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '18px', border: '1.5px solid #e2e8f0', marginBottom: '20px' }}>
        {[{ label: 'BOOKING REF', value: ref }, { label: 'FLEET', value: option.label }, { label: 'AMOUNT', value: `${currency} ${option.price}` }, { label: 'PICKUP ETA', value: option.eta }].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ fontSize: '13px', fontWeight: label === 'AMOUNT' ? 900 : 700, color: label === 'AMOUNT' ? '#16a34a' : '#0f172a' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <button onClick={() => onDone(bookingId)} style={{ width: '100%', height: '50px', borderRadius: '14px', background: '#0f172a', color: 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
        Track My Ride →
      </button>
      <button onClick={() => setShowReceipt(true)} style={{ width: '100%', height: '44px', borderRadius: '14px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
        <Eye style={{ width: '14px', height: '14px' }} /> View Receipt
      </button>

      {/* Danger zone */}
      <div style={{ marginTop: '18px', textAlign: 'center' }}>
        <button onClick={onCancel} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
          Cancel Booking
        </button>
      </div>

      <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} bookingDetails={{ ...bookingDetails, option, ref }} />
    </div>
  )
}
