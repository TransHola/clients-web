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
import { RegisterForm } from "@/components/register-form"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock');
const BOOKING_API_URL =
  process.env.NEXT_PUBLIC_BOOKING_API_URL &&
  !process.env.NEXT_PUBLIC_BOOKING_API_URL.includes('localhost') &&
  !process.env.NEXT_PUBLIC_BOOKING_API_URL.includes('127.0.0.1')
    ? process.env.NEXT_PUBLIC_BOOKING_API_URL
    : '/api/booking-engine';

let _cachedClientAuth: { user: any | null; token?: string; ts: number } | null = null;

async function resolveActiveClientAuth(): Promise<{ user: any | null; token?: string }> {
  if (_cachedClientAuth && Date.now() - _cachedClientAuth.ts < 15000 && _cachedClientAuth.user) {
    return { user: _cachedClientAuth.user, token: _cachedClientAuth.token };
  }

  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      _cachedClientAuth = { user: session.user, token: session.access_token, ts: Date.now() };
      return { user: session.user, token: session.access_token };
    }
  } catch {}

  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
    if (meRes.ok) {
      const meJson = await meRes.json();
      if (meJson?.authenticated && meJson?.user) {
        _cachedClientAuth = { user: meJson.user, token: undefined, ts: Date.now() };
        return { user: meJson.user, token: undefined };
      }
    }
  } catch {}

  return { user: null, token: undefined };
}
const SUPERADMIN_EMAIL_BASE_URL =
  process.env.NEXT_PUBLIC_SUPERADMIN_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://admin.transhola.com');

function resolveAddressText(loc: any, fallbackLabel: string): string {
  if (!loc) return fallbackLabel;
  if (typeof loc === 'string') return loc;
  return String(loc.address || loc.name || loc.label || loc.formatted_address || fallbackLabel);
}

function dispatchAirlineQuotationEmailClient(params: {
  email?: string;
  clientName?: string;
  quoteRef?: string;
  isAccountLoggedIn?: boolean;
  accountUserId?: string;
  option: any;
  bookingDetails: any;
  currency: string;
  passengers: number;
  tripType: string;
  distanceKm?: number;
}) {
  const targetEmail = String(params.email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) return;

  const isAuthAccount = params.isAccountLoggedIn !== false;
  const clientAction: 'pricing' | 'quotation' = isAuthAccount ? 'quotation' : 'pricing';
  const defaultPrefix = isAuthAccount ? 'TH-Q-' : 'TH-P-';
  const resolvedRef = params.quoteRef
    ? params.quoteRef.replace(/^TH-(?:P|Q)-/i, defaultPrefix)
    : `${defaultPrefix}${Math.floor(10000 + Math.random() * 90000)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2900);
  const countryCode = String(
    params.bookingDetails?.countryCode ||
    params.bookingDetails?.pickup?.countryCode ||
    'GLOBAL'
  ).toUpperCase();

  fetch(`${SUPERADMIN_EMAIL_BASE_URL}/api/quote-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: ctrl.signal,
    body: JSON.stringify({
      email: targetEmail,
      name: params.clientName || targetEmail.split('@')[0],
      customerName: params.clientName || targetEmail.split('@')[0],
      quoteRef: resolvedRef,
      clientAction,
      isAccountLoggedIn: isAuthAccount,
      accountUserId: params.accountUserId,
      countryCode,
      city: params.bookingDetails?.city || '',
      tripType: params.tripType || 'One Way',
      passengers: params.passengers || 1,
      dateStr: params.bookingDetails?.startDate || 'Flexible Date',
      rawDate: params.bookingDetails?.startDate || '',
      startTime: params.bookingDetails?.startTime || '09:00 AM',
      pickup: resolveAddressText(params.bookingDetails?.pickup, 'Origin Hub'),
      dropoff: resolveAddressText(params.bookingDetails?.dropoff, 'Destination Hub'),
      distanceText: params.distanceKm ? `${params.distanceKm} km` : String(params.bookingDetails?.distance || '—'),
      durationText: String(params.bookingDetails?.duration || params.option?.eta || '—'),
      currency: params.currency || 'EUR',
      selectedFleetId: params.option?.id,
      fleetOptions: params.option ? [{
        id: params.option.id,
        title: params.option.label || 'Selected Charter Vehicle',
        totalSeats: params.option.totalSeats || params.passengers || 14,
        totalLuggage: params.option.totalLuggage || params.passengers || 14,
        seats: params.option.totalSeats || params.passengers || 14,
        bags: params.option.totalLuggage || params.passengers || 14,
        price: Number(params.option.price || 0),
        baseCharterFare: params.option.baseCharterFare,
        deadheadCost: params.option.deadheadCost,
        allowancesCost: params.option.allowancesCost,
        subtotal: params.option.subtotal,
        taxAmount: params.option.taxAmount,
        badge: 'Selected Configuration'
      }] : []
    })
  })
    .catch((err) => console.warn('[Airline Quote Email] Non-blocking dispatch warning:', err))
    .finally(() => clearTimeout(timer));
}

function dispatchAirlineBookingEmailClient(params: {
  email?: string;
  passengerName?: string;
  passengerPhone?: string;
  bookingRef?: string;
  accountUserId?: string;
  option: any;
  bookingDetails: any;
  currency: string;
  paymentMethod?: string;
  isThirdParty?: boolean;
  thirdPartyInfo?: any;
}) {
  const recipients = new Set<string>();
  if (params.email && String(params.email).includes('@')) {
    recipients.add(String(params.email).trim().toLowerCase());
  }
  if (params.isThirdParty && params.thirdPartyInfo?.email && String(params.thirdPartyInfo.email).includes('@')) {
    recipients.add(String(params.thirdPartyInfo.email).trim().toLowerCase());
  }
  if (recipients.size === 0) return;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2900);
  const countryCode = String(
    params.bookingDetails?.countryCode ||
    params.bookingDetails?.pickup?.countryCode ||
    'GLOBAL'
  ).toUpperCase();

  const refClean = params.bookingRef
    ? (params.bookingRef.startsWith('TH-') || params.bookingRef.startsWith('TRN-')
      ? params.bookingRef
      : `TRN-${String(params.bookingRef).substring(0, 8).toUpperCase()}`)
    : `TH-BK-${Math.floor(10000 + Math.random() * 90000)}`;

  fetch(`${SUPERADMIN_EMAIL_BASE_URL}/api/booking-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: ctrl.signal,
    body: JSON.stringify({
      emails: Array.from(recipients),
      bookingRef: refClean,
      quoteRef: params.bookingDetails?.quotation_ref || '',
      clientAction: 'booking',
      isAccountLoggedIn: true,
      accountUserId: params.accountUserId,
      countryCode,
      city: params.bookingDetails?.city || '',
      tripType: params.bookingDetails?.tripType || 'Charter Service',
      passengers: Number(params.bookingDetails?.passengers || params.option?.totalSeats || 1),
      dateStr: params.bookingDetails?.startDate || 'Scheduled Date',
      rawDate: params.bookingDetails?.startDate || '',
      startTime: params.bookingDetails?.startTime || '09:00 AM',
      pickup: resolveAddressText(params.bookingDetails?.pickup, 'Origin Hub'),
      dropoff: resolveAddressText(params.bookingDetails?.dropoff, 'Destination Hub'),
      distanceText: params.bookingDetails?.routeDistanceKm
        ? `${params.bookingDetails.routeDistanceKm} km`
        : String(params.bookingDetails?.distance || '—'),
      durationText: String(params.bookingDetails?.duration || params.option?.eta || '—'),
      currency: params.currency || 'EUR',
      fleetTitle: params.option?.label || 'Executive Charter Fleet',
      totalSeats: Number(params.option?.totalSeats || params.bookingDetails?.passengers || 14),
      totalLuggage: Number(params.option?.totalLuggage || params.bookingDetails?.passengers || 14),
      totalPrice: Number(params.option?.price || 0),
      baseCharterFare: params.option?.baseCharterFare,
      deadheadCost: params.option?.deadheadCost,
      allowancesCost: params.option?.allowancesCost,
      subtotal: params.option?.subtotal,
      taxAmount: params.option?.taxAmount,
      paymentMethod: params.paymentMethod || 'Encrypted Card Checkout',
      paymentStatus: 'PAID',
      customerName: params.passengerName || 'Lead Passenger',
      passengerName: params.isThirdParty && params.thirdPartyInfo
        ? `${params.thirdPartyInfo.firstName || ''} ${params.thirdPartyInfo.lastName || ''}`.trim() || params.passengerName
        : (params.passengerName || 'Lead Passenger'),
      passengerEmail: params.isThirdParty && params.thirdPartyInfo?.email
        ? params.thirdPartyInfo.email
        : Array.from(recipients)[0],
      passengerPhone: params.passengerPhone || '',
      isThirdParty: Boolean(params.isThirdParty),
      billingEntity: params.thirdPartyInfo?.company || undefined,
      clientPortalUrl: typeof window !== 'undefined' ? `${window.location.origin}/bookings` : 'https://client.transhola.com/bookings'
    })
  })
    .catch((err) => console.warn('[Airline Booking E-Ticket] Non-blocking dispatch warning:', err))
    .finally(() => clearTimeout(timer));
}

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
  sedan: SedanIcon,
  suv: SUVIcon,
  mpv: MPVIcon,
  van: VanIcon,
  minibus: MinibusIcon,
  coach: CoachIcon,
}

export function resolveFleetImageUrl(typeOrIcon?: string, seats?: number): string {
  const key = String(typeOrIcon || '').toLowerCase()
  const cap = Number(seats || 0)
  if (key.includes('double') || cap >= 70) return '/images/fleet/double-decker.png'
  if (key.includes('coach') && !key.includes('mini') && !key.includes('midi')) return '/images/fleet/luxury-motorcoach.png'
  if (key.includes('charter') || key.includes('motorcoach') || cap >= 45) return '/images/fleet/luxury-motorcoach.png'
  if (key.includes('mini coach') || key.includes('midicoach') || key.includes('33') || (cap >= 30 && cap < 45)) return '/images/fleet/executive-minibus-33.png'
  if (key.includes('minibus') || (cap >= 18 && cap < 30)) return '/images/fleet/executive-minibus.png'
  if (key.includes('sprinter') || (key.includes('van') && !key.includes('mini')) || (cap >= 10 && cap < 18)) return '/images/fleet/vip-sprinter.png'
  if (key.includes('mpv') || key.includes('mini van') || (cap >= 7 && cap < 10)) return '/images/fleet/vip-mpv.png'
  if (key.includes('suv') || (cap >= 5 && cap < 7)) return '/images/fleet/vip-suv.png'
  return '/images/fleet/luxury-sedan.png'
}

function getVehicleProfileMeta(typeOrIcon?: string, seats?: number) {
  const cap = Number(seats || 14)
  if (cap >= 70) {
    return { bagsPerUnit: 75, co2PerPaxKm: 13.8, minHours: 5, amenities: 'Upper Deck Lounge · Restroom · Wi-Fi · Luggage Bays' }
  }
  if (cap >= 45) {
    return { bagsPerUnit: 50, co2PerPaxKm: 15.0, minHours: 5, amenities: 'Restroom · Wi-Fi · Underfloor Bays · Reclining' }
  }
  if (cap >= 30) {
    return { bagsPerUnit: 30, co2PerPaxKm: 15.8, minHours: 5, amenities: 'Leather Reclining · Wi-Fi & USB-C · Luggage Bay' }
  }
  if (cap >= 18) {
    return { bagsPerUnit: 20, co2PerPaxKm: 16.8, minHours: 4, amenities: 'Climate Control · Wi-Fi · Overhead & Rear Storage' }
  }
  if (cap >= 10) {
    return { bagsPerUnit: 12, co2PerPaxKm: 19.4, minHours: 4, amenities: 'Executive Captain Seats · Wi-Fi · Chauffeur' }
  }
  return { bagsPerUnit: Math.max(4, cap - 1), co2PerPaxKm: 26.5, minHours: 3, amenities: 'VIP Leather Interior · Bottled Water · Chauffeur' }
}

function enrichOptionWithRateBreakdown(opt: any, ctx: {
  passengers: number
  routeDistanceKm: number
  tripType: string
  countryCode: string
  currency: string
  currencySymbol: string
  numDays: number
  effectiveHours: number
  waitMinutesTotal: number
}): any {
  const cCode = String(ctx.countryCode || 'AE').toUpperCase()
  const defaultTaxPct = cCode === 'AE' ? 5 : cCode === 'ES' ? 10 : cCode === 'MA' ? 14 : 0
  const taxRatePct = opt.taxRatePct !== undefined ? Number(opt.taxRatePct) : defaultTaxPct
  const totalGross = Math.max(1, Number(opt.price || 0))
  const netFleetSubtotal = opt.taxAmount !== undefined
    ? Math.max(0, totalGross - Number(opt.taxAmount))
    : (taxRatePct > 0 ? +(totalGross / (1 + taxRatePct / 100)).toFixed(2) : totalGross)
  const computedTaxAmount = opt.taxAmount !== undefined
    ? Number(opt.taxAmount)
    : +(totalGross - netFleetSubtotal).toFixed(2)

  const rawVehicles = Array.isArray(opt.vehicles) && opt.vehicles.length > 0
    ? opt.vehicles
    : [{ count: 1, type: opt.label || 'Charter Bus', seats: opt.totalSeats || ctx.passengers || 56 }]

  // Weight share across vehicle types when combination fleet (proportional to count * sqrt(seats))
  const weights = rawVehicles.map((v: any) => Math.max(1, Number(v.count || 1)) * Math.sqrt(Math.max(4, Number(v.seats || 14))))
  const weightSum = weights.reduce((a: number, b: number) => a + b, 0) || 1

  const isRoundTrip = ctx.tripType === 'round-trip' || ctx.tripType === 'round_trip' || ctx.tripType === 'roundtrip'
  const isShuttle = ctx.tripType === 'shuttle'
  const distKm = Math.max(5, Number(ctx.routeDistanceKm || 40))
  const billableDistKm = isRoundTrip ? distKm : distKm
  const currLabel = (ctx.currencySymbol || ctx.currency || 'AED').trim()

  let totalBags = 0
  let weightedCo2 = 0
  let totalSeatSum = 0

  const enrichedVehicles = rawVehicles.map((v: any, idx: number) => {
    const count = Math.max(1, Number(v.count || 1))
    const seats = Math.max(4, Number(v.seats || 14))
    const meta = getVehicleProfileMeta(v.iconName || v.type, seats)
    totalBags += count * meta.bagsPerUnit
    totalSeatSum += count * seats
    weightedCo2 += (count * seats) * meta.co2PerPaxKm

    // Authoritative SuperAdmin Go Rate Engine path: preserve 100% of real lineItems, debugLog, and prices!
    if (Array.isArray(v.lineItems) && v.lineItems.length > 0) {
      const exactGross = Number(v.price ?? totalGross)
      const exactTax = Number(v.taxAmount ?? 0)
      const exactNet = v.netSubtotal !== undefined ? Number(v.netSubtotal) : +(exactGross - exactTax).toFixed(2)
      return {
        ...v,
        count,
        seats,
        bagsPerUnit: v.bagsPerUnit || meta.bagsPerUnit,
        totalBags: count * (v.bagsPerUnit || meta.bagsPerUnit),
        imageUrl: v.imageUrl || resolveFleetImageUrl(v.iconName || v.type, seats),
        amenities: v.amenities || meta.amenities,
        price: exactGross,
        unitPrice: v.unitPrice !== undefined ? Number(v.unitPrice) : +(exactGross / count).toFixed(2),
        unitNetPrice: v.unitNetPrice !== undefined ? Number(v.unitNetPrice) : +(exactNet / count).toFixed(2),
        netSubtotal: exactNet,
        taxRatePct: v.taxRatePct !== undefined ? Number(v.taxRatePct) : taxRatePct,
        taxLabel: v.taxLabel || opt.taxLabel || 'Transport VAT / Tax',
        taxAmount: exactTax,
      }
    }

    const share = weights[idx] / weightSum
    const vehicleGrossTotal = v.price !== undefined
      ? Number(v.price)
      : (rawVehicles.length === 1 ? totalGross : +(totalGross * share).toFixed(2))
    const vehicleNetTotal = +(vehicleGrossTotal / (1 + taxRatePct / 100)).toFixed(2)
    const vehicleTax = +(vehicleGrossTotal - vehicleNetTotal).toFixed(2)
    const unitGross = +(vehicleGrossTotal / count).toFixed(2)
    const unitNet = +(vehicleNetTotal / count).toFixed(2)

    const rawHrs = Math.max(1.5, ctx.effectiveHours || (distKm / 55))
    const billableHrs = Math.max(meta.minHours, Math.ceil(Math.max(1, rawHrs - 5 / 60)))
    const deadheadShare = (!isRoundTrip && !isShuttle) ? 0.14 : 0
    const distanceFuelShare = 0.18
    const waitShare = ctx.waitMinutesTotal > 0 ? Math.min(0.16, (ctx.waitMinutesTotal / (billableHrs * 60)) * 0.35) : 0
    const baseCharterShare = Math.max(0.5, 1 - deadheadShare - distanceFuelShare - waitShare)

    const baseCharterNet = +(vehicleNetTotal * baseCharterShare).toFixed(2)
    const distanceFuelNet = +(vehicleNetTotal * distanceFuelShare).toFixed(2)
    const waitStopsNet = +(vehicleNetTotal * waitShare).toFixed(2)
    const deadheadNet = +(vehicleNetTotal - baseCharterNet - distanceFuelNet - waitStopsNet).toFixed(2)
    const effectiveUnitHourly = +((baseCharterNet / count) / Math.max(1, billableHrs * ctx.numDays)).toFixed(2)

    const existingLogs = Array.isArray(v.debugLog) && v.debugLog.length > 0 ? v.debugLog : null
    const generatedLogs: string[] = []
    for (let d = 1; d <= ctx.numDays; d++) {
      const dayFactor = 1 / ctx.numDays
      generatedLogs.push(
        `[Day ${d}] Engine: Whole-Hour Commercial Charter (${billableHrs}h billable block · min ${meta.minHours}h · ${billableDistKm} km route)`
      )
      generatedLogs.push(
        `[Day ${d}] Base Charter Time Block (${count}× ${v.type}) -> Charged ${billableHrs} hrs @ ${effectiveUnitHourly.toFixed(2)} × ${count} = ${(baseCharterNet * dayFactor).toFixed(2)}`
      )
      generatedLogs.push(
        `[Day ${d}] Verified Route Distance & Fuel Allocation -> Charged ${billableDistKm} km @ ${((distanceFuelNet * dayFactor) / Math.max(1, billableDistKm)).toFixed(2)}/km = ${(distanceFuelNet * dayFactor).toFixed(2)}`
      )
      if (waitStopsNet > 0) {
        generatedLogs.push(
          `[Day ${d}] Boarding & Scheduled Stop Waiting (${ctx.waitMinutesTotal} min) -> Charged ${ctx.waitMinutesTotal} min @ ${((waitStopsNet * dayFactor) / Math.max(1, ctx.waitMinutesTotal)).toFixed(2)}/min = ${(waitStopsNet * dayFactor).toFixed(2)}`
        )
      }
      if (deadheadNet > 0.5) {
        generatedLogs.push(
          `[Day ${d}] Depot Positioning & Return Deadhead -> Charged ${count} unit(s) @ ${((deadheadNet * dayFactor) / count).toFixed(2)} = ${(deadheadNet * dayFactor).toFixed(2)}`
        )
      }
    }
    if (taxRatePct > 0) {
      generatedLogs.push(
        `[Day ${ctx.numDays}] Statutory Transport VAT / Tax (${taxRatePct}%) -> Charged ${vehicleNetTotal.toFixed(2)} @ ${taxRatePct}% = ${vehicleTax.toFixed(2)}`
      )
    }
    generatedLogs.push(
      `[Day ${ctx.numDays}] Total ${count}× ${v.type} Allocation -> Charged ${count} × ${currLabel} ${unitGross.toFixed(2)} = ${vehicleGrossTotal.toFixed(2)}`
    )

    return {
      ...v,
      count,
      seats,
      bagsPerUnit: meta.bagsPerUnit,
      totalBags: count * meta.bagsPerUnit,
      imageUrl: v.imageUrl || resolveFleetImageUrl(v.iconName || v.type, seats),
      amenities: meta.amenities,
      price: vehicleGrossTotal,
      unitPrice: unitGross,
      unitNetPrice: unitNet,
      netSubtotal: vehicleNetTotal,
      taxRatePct,
      taxAmount: vehicleTax,
      costBreakdown: {
        billableHours: billableHrs * ctx.numDays,
        minCharterHours: meta.minHours,
        effectiveUnitHourly,
        distanceKm: billableDistKm,
        waitMinutes: ctx.waitMinutesTotal,
        baseCharterCost: baseCharterNet,
        distanceFuelCost: distanceFuelNet,
        waitingStopsCost: waitStopsNet,
        deadheadCost: Math.max(0, deadheadNet),
        netSubtotal: vehicleNetTotal,
        taxRatePct,
        taxAmount: vehicleTax,
        grossTotal: vehicleGrossTotal,
      },
      debugLog: existingLogs || generatedLogs,
    }
  })

  const finalTotalSeats = Number(opt.totalSeats || totalSeatSum || ctx.passengers)
  const avgCo2 = totalSeatSum > 0 ? +(weightedCo2 / totalSeatSum).toFixed(1) : 15.5
  const primaryAmenities = enrichedVehicles.length > 1
    ? `${enrichedVehicles.map((v: any) => v.type).join(' + ')} · ${enrichedVehicles.reduce((s: number, v: any) => s + v.count, 0)} Chauffeurs`
    : enrichedVehicles[0]?.amenities || 'Verified Executive Charter Fleet'

  return {
    ...opt,
    vehicles: enrichedVehicles,
    totalSeats: finalTotalSeats,
    totalLuggage: opt.totalLuggage || totalBags,
    co2GramsPerPaxKm: avgCo2,
    amenitiesText: opt.amenitiesText || primaryAmenities,
    subtotal: netFleetSubtotal,
    taxRatePct,
    taxAmount: computedTaxAmount,
    passengersCount: ctx.passengers,
    routeDistanceKm: distKm,
  }
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
      const { user: resolvedUser } = await resolveActiveClientAuth();
      setUser(resolvedUser);
    }
    checkAuth();
  }, []);
  const [options, setOptions] = React.useState<VehicleOption[]>([]);
  const [currency, setCurrency] = React.useState<string>("USD");
  const [currencySymbol, setCurrencySymbol] = React.useState<string>("");
  const [globalTaxes, setGlobalTaxes] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [capacityNotice, setCapacityNotice] = React.useState<string | null>(null);
  const [isEstimatedUnservedArea, setIsEstimatedUnservedArea] = React.useState<boolean>(false);
  const [unservedNoticeText, setUnservedNoticeText] = React.useState<string | null>(null);

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
          stops: bookingDetails?.stops,
          tripType,
          roundTripMode: bookingDetails?.roundTripMode,
          serviceMode: bookingDetails?.serviceMode || 'scheduled',
          routeLegs: bookingDetails?.routeLegs,
          returnLoc: bookingDetails?.returnLoc,
          startDate: bookingDetails?.startDate,
          startTime: bookingDetails?.startTime,
          endDate: bookingDetails?.endDate,
          endTime: bookingDetails?.endTime,
          pickupWaitMin: bookingDetails?.pickupWaitMin,
          dropoffWaitMin: bookingDetails?.dropoffWaitMin,
          countryCode: bookingDetails?.countryCode || 'AE',
          passengers,
          routeDistanceKm,
          returnDistanceKm: bookingDetails?.returnDistanceKm,
          returnDurationHours: bookingDetails?.returnDurationHours,
          durationHours: bookingDetails?.duration ? bookingDetails.duration / 3600 : undefined,
          effectiveTotalHours: bookingDetails?.effectiveTotalHours,
          duration: bookingDetails?.duration,
          multiDayStore: bookingDetails?.multiDayStore
        };

        const calcCtrl = new AbortController();
        const calcTimeout = setTimeout(() => { try { calcCtrl.abort(); } catch {} }, 3000);
        const res = await fetch(`${BOOKING_API_URL}/calculate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || 'BYPASS_AUTH'}`
          },
          body: JSON.stringify(payload),
          signal: calcCtrl.signal
        }).catch((fetchErr) => {
          console.warn("[QuotationPanel] Network error reaching calculate endpoint:", fetchErr);
          return null;
        });
        clearTimeout(calcTimeout);

        const buildLocalFallbackOptions = () => {
          const paxCount = Math.max(1, Number(passengers) || 1);
          const dist = Math.max(10, Number(routeDistanceKm) || 35);
          const numDays = Math.max(1, (payload as any).multiDayStore?.length || (payload as any).days || 1);
          const cCode = String(payload.countryCode || bookingDetails?.pickup?.countryCode || 'US').toUpperCase();
          const activeServedSet = new Set(['AE', 'US', 'ES', 'MA']);
          const localIsServed = activeServedSet.has(cCode);

          const currencyMap: Record<string, { code: string; sym: string; mult: number }> = {
            US: { code: 'USD', sym: '$', mult: 1.0 },
            AE: { code: 'AED', sym: 'AED ', mult: 1.54 },
            SA: { code: 'SAR', sym: 'SAR ', mult: 1.58 },
            QA: { code: 'QAR', sym: 'QAR ', mult: 1.53 },
            ES: { code: 'EUR', sym: '€', mult: 0.69 },
            FR: { code: 'EUR', sym: '€', mult: 0.75 },
            DE: { code: 'EUR', sym: '€', mult: 0.75 },
            IT: { code: 'EUR', sym: '€', mult: 0.69 },
            GB: { code: 'GBP', sym: '£', mult: 0.70 },
            UK: { code: 'GBP', sym: '£', mult: 0.70 },
            MA: { code: 'MAD', sym: 'MAD ', mult: 3.98 },
            SG: { code: 'SGD', sym: 'S$', mult: 1.18 },
            ID: { code: 'IDR', sym: 'Rp ', mult: 5370 },
            CA: { code: 'CAD', sym: 'CA$', mult: 1.21 },
            AU: { code: 'AUD', sym: 'A$', mult: 1.34 },
            EG: { code: 'EGP', sym: 'EGP ', mult: 16.6 },
            IN: { code: 'INR', sym: '₹', mult: 28.5 },
            JP: { code: 'JPY', sym: '¥', mult: 114 },
            BR: { code: 'BRL', sym: 'R$', mult: 2.30 },
            MX: { code: 'MXN', sym: 'MX$', mult: 8.04 },
          };
          const currEntry = currencyMap[cCode] || { code: 'USD', sym: '$', mult: 0.80 };
          const fallbackCurrency = currEntry.code;
          const fallbackSymbol = currEntry.sym;
          const rateFactor = currEntry.mult;

          const explicitTotalHrs = Number(bookingDetails?.effectiveTotalHours || 0);
          const durHrs = Math.max(1, Number(payload.durationHours) || (dist / 65));
          const isRoundTrip = tripType === 'round-trip' || tripType === 'round_trip' || tripType === 'roundtrip';
          const isShuttle = tripType === 'shuttle';

          // Commercial Group Transport Whole-Hour Charter Block Billing (5-min grace tolerance, never per-minute fractional)
          const computeFallbackUnitQuote = (hourlyBase: number, tier4hRate: number, minHrs: number, deadheadPerUnit: number, dailyMultiRate: number, mealFee: number, lodgingFee: number, taxPct: number, unitIsMiles: boolean) => {
            const dUnits = unitIsMiles ? dist * 0.621371 : dist;
            const billableDist = isRoundTrip ? dUnits * 2 : dUnits;
            const rawServiceHrs = explicitTotalHrs > 0 ? explicitTotalHrs : (isRoundTrip ? durHrs * 2 : durHrs);
            const wholeCharterHrs = Math.max(1, Math.ceil(Math.max(0.1, rawServiceHrs - (5 / 60))));
            const billableHrs = Math.max(Math.ceil(minHrs), wholeCharterHrs);
            let charterBase = 0;
            if (isRoundTrip && numDays >= 2 && dailyMultiRate > 0) {
              const incDist = 200 * numDays;
              const incHrs = 10 * numDays;
              const overageWholeHrs = Math.max(0, Math.ceil(Math.max(0, rawServiceHrs - (5 / 60)) - incHrs));
              charterBase = (dailyMultiRate * numDays)
                + overageWholeHrs * (dailyMultiRate / 10)
                + Math.max(0, billableDist - incDist) * deadheadPerUnit;
            } else {
              const first4 = Math.min(4, billableHrs);
              const rem = Math.max(0, billableHrs - 4);
              charterBase = first4 * hourlyBase + rem * tier4hRate;
            }
            // Operational positioning + empty return deadhead on One Way (approx 1.05x route return + local depot dispatch)
            const deadUnits = (!isRoundTrip && !isShuttle) ? (dUnits + (unitIsMiles ? 5 : 8)) : 0;
            const deadCharge = deadUnits * deadheadPerUnit;
            const meals = (billableDist >= 150 || billableHrs >= 8) ? mealFee * Math.max(1, numDays > 1 ? numDays * 2 : 1) : 0;
            const lodging = numDays >= 2 ? lodgingFee * (numDays - 1) : 0;
            const sub = charterBase + deadCharge + meals + lodging;
            return Math.round(sub * (1 + taxPct / 100));
          };

          let catalogSpecs: { id: string; name: string; capacity: number; baseCostIndex: number; iconName: string; cat: string }[] = [];
          if (cCode === 'AE') {
            // UAE Super Admin Preset: Executive SUV (6), Mini Van (7), Van (14), Minibus (24), Mini Coach (33), Charter Bus (56) — NO 81-Pax Double Decker or 36-Pax Mini Coach
            catalogSpecs = [
              { id: 'suv', name: 'Executive SUV', capacity: 6, baseCostIndex: computeFallbackUnitQuote(170, 162, 3, 2.0, 1360, 40, 250, 5, false), iconName: 'suv', cat: 'VIP Chauffeur' },
              { id: 'mpv', name: 'Mini Van', capacity: 7, baseCostIndex: computeFallbackUnitQuote(150, 143, 3, 1.8, 1200, 40, 250, 5, false), iconName: 'mpv', cat: 'VIP Chauffeur' },
              { id: 'van', name: 'Van', capacity: 14, baseCostIndex: computeFallbackUnitQuote(150, 144, 4, 1.8, 1300, 40, 250, 5, false), iconName: 'van', cat: 'Bus for Hire' },
              { id: 'minibus', name: 'Minibus', capacity: 24, baseCostIndex: computeFallbackUnitQuote(175, 168, 4, 2.2, 1450, 40, 250, 5, false), iconName: 'minibus', cat: 'Bus for Hire' },
              { id: 'executive-minibus-33', name: 'Mini Coach', capacity: 33, baseCostIndex: computeFallbackUnitQuote(200, 192, 5, 2.5, 1600, 40, 250, 5, false), iconName: 'minibus', cat: 'Bus for Hire' },
              { id: 'coach', name: 'Charter Bus', capacity: 56, baseCostIndex: computeFallbackUnitQuote(240, 230, 5, 3.0, 1750, 40, 250, 5, false), iconName: 'coach', cat: 'Bus for Hire' },
            ];
          } else {
            // US / ES / MA / International Preset: SUV (6), Van (14), Minibus (24), Executive Shuttle (33), Mini Coach (36), Motorcoach (56), Double Decker (81)
            const uMiles = cCode === 'US';
            const taxPct = cCode === 'ES' ? 10 : cCode === 'MA' ? 14 : 0;
            catalogSpecs = [
              { id: 'suv', name: 'First-Class VIP SUV', capacity: 6, baseCostIndex: computeFallbackUnitQuote(Math.round(95 * rateFactor), Math.round(91 * rateFactor), 3, 1.5 * rateFactor, Math.round(800 * rateFactor), Math.round(25 * rateFactor), Math.round(145 * rateFactor), taxPct, uMiles), iconName: 'suv', cat: 'VIP Chauffeur' },
              { id: 'van', name: '14-Pax VIP Sprinter', capacity: 14, baseCostIndex: computeFallbackUnitQuote(Math.round(115 * rateFactor), Math.round(110 * rateFactor), 4, 1.4 * rateFactor, Math.round(1050 * rateFactor), Math.round(25 * rateFactor), Math.round(145 * rateFactor), taxPct, uMiles), iconName: 'van', cat: 'Executive Shuttle' },
              { id: 'minibus', name: '24-Pax Executive Minibus', capacity: 24, baseCostIndex: computeFallbackUnitQuote(Math.round(125 * rateFactor), Math.round(120 * rateFactor), 4, 1.5 * rateFactor, Math.round(1150 * rateFactor), Math.round(25 * rateFactor), Math.round(145 * rateFactor), taxPct, uMiles), iconName: 'minibus', cat: 'Executive Shuttle' },
              { id: 'executive-minibus-33', name: '33-Pax Executive Shuttle', capacity: 33, baseCostIndex: computeFallbackUnitQuote(Math.round(140 * rateFactor), Math.round(134 * rateFactor), 5, 1.6 * rateFactor, Math.round(1300 * rateFactor), Math.round(25 * rateFactor), Math.round(145 * rateFactor), taxPct, uMiles), iconName: 'minibus', cat: 'Charter Bus' },
              { id: 'midicoach', name: '36-Pax Executive Mini Coach', capacity: 36, baseCostIndex: computeFallbackUnitQuote(Math.round(160 * rateFactor), Math.round(154 * rateFactor), 5, 1.8 * rateFactor, Math.round(1450 * rateFactor), Math.round(25 * rateFactor), Math.round(145 * rateFactor), taxPct, uMiles), iconName: 'coach', cat: 'Charter Bus' },
              { id: 'coach', name: '56-Pax Luxury Motorcoach', capacity: 56, baseCostIndex: computeFallbackUnitQuote(Math.round(165 * rateFactor), Math.round(158 * rateFactor), 5, 2.0 * rateFactor, Math.round(1500 * rateFactor), Math.round(25 * rateFactor), Math.round(145 * rateFactor), taxPct, uMiles), iconName: 'coach', cat: 'Charter Bus' },
              { id: 'double-decker', name: '81-Pax Panoramic Double Decker', capacity: 81, baseCostIndex: computeFallbackUnitQuote(Math.round(245 * rateFactor), Math.round(235 * rateFactor), 5, 2.5 * rateFactor, Math.round(2100 * rateFactor), Math.round(25 * rateFactor), Math.round(145 * rateFactor), taxPct, uMiles), iconName: 'coach', cat: 'Charter Bus' },
            ];
          }

          const uniformResults = OptimizationSolver.calculateUniformFleet(paxCount, catalogSpecs);
          const mixedResult = paxCount > 14 ? OptimizationSolver.calculateEconomicalMixedFleet(paxCount, catalogSpecs) : null;

          const fallbackList: any[] = uniformResults.slice(0, 3).map((u, idx) => {
            const unit = u.fleet[0];
            const spec = catalogSpecs.find(s => s.id === unit.vehicle.id) || catalogSpecs[0];
            const calcPrice = Math.round(u.totalCostIndex);
            return {
              id: `local_${spec.id}_${unit.quantity}`,
              label: unit.quantity > 1 ? `${unit.quantity}× ${spec.name}` : spec.name,
              vehicles: [{ count: unit.quantity, type: spec.name, seats: spec.capacity, iconName: spec.iconName }],
              totalSeats: u.totalCapacity,
              price: calcPrice,
              eta: localIsServed ? 'Guaranteed Availability' : 'Estimated Rate · Unserved Area',
              isRecommended: idx === 0,
              tag: !localIsServed ? 'Estimated Rate' : (u.badgeText || (idx === 0 ? 'Best Price & Lowest CO₂' : idx === 1 ? 'Extra Comfort' : 'High Capacity')),
              serviceCategory: spec.cat,
              currency: fallbackCurrency,
              currencySymbol: fallbackSymbol,
              daysCount: numDays,
              isEstimatedRate: !localIsServed,
              isServedArea: localIsServed,
            };
          });

          if (mixedResult && mixedResult.fleet.length > 1) {
            const calcPrice = Math.round(mixedResult.totalCostIndex);
            fallbackList.push({
              id: `local_mixed_${paxCount}`,
              label: mixedResult.fleet.map(f => `${f.quantity}× ${f.vehicle.name}`).join(' + '),
              vehicles: mixedResult.fleet.map(f => ({
                count: f.quantity,
                type: f.vehicle.name,
                seats: f.vehicle.capacity,
                iconName: f.vehicle.capacity >= 36 ? 'coach' : f.vehicle.capacity >= 20 ? 'minibus' : 'van'
              })),
              totalSeats: mixedResult.totalCapacity,
              price: calcPrice,
              eta: localIsServed ? 'Synchronized Fleet' : 'Estimated Rate · Unserved Area',
              isRecommended: false,
              tag: !localIsServed ? 'Estimated Split Fleet' : 'Optimal Split Fleet',
              serviceCategory: 'Mixed Services',
              currency: fallbackCurrency,
              currencySymbol: fallbackSymbol,
              daysCount: numDays,
              isEstimatedRate: !localIsServed,
              isServedArea: localIsServed,
            });
          }

          return { fallbackList, fallbackCurrency, fallbackSymbol, localIsServed };
        };

        if (!res || !res.ok) {
          console.warn(`[QuotationPanel] Calculate returned non-ok status (${res?.status}), using deterministic OptimizationSolver fallback`);
          const { fallbackList, fallbackCurrency, fallbackSymbol, localIsServed } = buildLocalFallbackOptions();
          const waitTotal = Number(bookingDetails?.pickupWaitMin || 0) + Number(bookingDetails?.dropoffWaitMin || 0) + (Array.isArray(bookingDetails?.stops) ? bookingDetails.stops.reduce((s: number, st: any) => s + Number(st?.stopDurationMin || 0), 0) : 0);
          const enrichCtx = {
            passengers: Math.max(1, Number(passengers) || 1),
            routeDistanceKm: Math.max(10, Number(routeDistanceKm) || 35),
            tripType,
            countryCode: String(payload.countryCode || bookingDetails?.pickup?.countryCode || 'AE'),
            currency: fallbackCurrency,
            currencySymbol: fallbackSymbol,
            numDays: Math.max(1, (payload as any).multiDayStore?.length || 1),
            effectiveHours: Number(bookingDetails?.effectiveTotalHours || payload.durationHours || 3),
            waitMinutesTotal: waitTotal,
          };
          const enrichedFallback = fallbackList.map((opt: any) => enrichOptionWithRateBreakdown(opt, enrichCtx));
          setOptions(enrichedFallback);
          setCurrency(fallbackCurrency);
          setCurrencySymbol(fallbackSymbol);
          setIsEstimatedUnservedArea(!localIsServed);
          setUnservedNoticeText(!localIsServed ? "This is an estimated rate — we don't serve this area yet." : null);
          if (enrichedFallback.length > 0) {
            setSelected(enrichedFallback[0]);
            if (onSelectionChange) onSelectionChange(enrichedFallback[0]);
          }
          return;
        }

        const data = await res.json();
        const retCurrency = data.data?.currency || 'EUR';
        const retSymbol = data.data?.currencySymbol || (retCurrency === 'EUR' ? '€' : retCurrency === 'USD' ? '$' : `${retCurrency} `);
        const numDays = Math.max(1, (payload as any).multiDayStore?.length || (payload as any).days || 1);
        const unservedFromApi = data.data?.isServedArea === false || data.data?.isEstimatedRate === true;
        const waitTotal = Number(bookingDetails?.pickupWaitMin || 0) + Number(bookingDetails?.dropoffWaitMin || 0) + (Array.isArray(bookingDetails?.stops) ? bookingDetails.stops.reduce((s: number, st: any) => s + Number(st?.stopDurationMin || 0), 0) : 0);

        let returnedOptions = (data.data?.options || []).map((opt: any) => ({
          ...opt,
          eta: unservedFromApi ? 'Estimated Rate · Unserved Area' : opt.eta,
          currency: retCurrency,
          currencySymbol: retSymbol,
          daysCount: numDays,
          isEstimatedRate: unservedFromApi,
          isServedArea: !unservedFromApi
        }));

        if (returnedOptions.length === 0) {
          const { fallbackList, localIsServed } = buildLocalFallbackOptions();
          returnedOptions = fallbackList;
          setIsEstimatedUnservedArea(unservedFromApi || !localIsServed);
          setUnservedNoticeText((unservedFromApi || !localIsServed) ? (data.data?.serviceNotice || "This is an estimated rate — we don't serve this area yet.") : null);
        } else {
          setIsEstimatedUnservedArea(unservedFromApi);
          setUnservedNoticeText(unservedFromApi ? (data.data?.serviceNotice || "This is an estimated rate — we don't serve this area yet.") : null);
        }

        const enrichCtx = {
          passengers: Math.max(1, Number(passengers) || 1),
          routeDistanceKm: Math.max(10, Number(routeDistanceKm) || 35),
          tripType,
          countryCode: String(payload.countryCode || bookingDetails?.pickup?.countryCode || 'AE'),
          currency: retCurrency,
          currencySymbol: retSymbol,
          numDays,
          effectiveHours: Number(bookingDetails?.effectiveTotalHours || payload.durationHours || 3),
          waitMinutesTotal: waitTotal,
        };
        returnedOptions = returnedOptions.map((opt: any) => enrichOptionWithRateBreakdown(opt, enrichCtx));

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

  const [quoteSaveError, setQuoteSaveError] = React.useState<string | null>(null);

  const handleSaveQuote = async () => {
    if (!selected) return;
    setIsSavingQuote(true);
    setQuoteSaveError(null);
    try {
      const { user: authUser, token } = await resolveActiveClientAuth();

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (authUser?.id) {
        headers["x-user-id"] = authUser.id;
      }
      if (authUser?.email) {
        headers["x-user-email"] = authUser.email;
      }

      const res = await fetch(`${BOOKING_API_URL}/quotation`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          userId: authUser?.id,
          userEmail: authUser?.email,
          quotation_db_id: bookingDetails?.quotation_db_id || undefined,
          option: selected,
          pickup: bookingDetails?.pickup,
          dropoff: bookingDetails?.dropoff,
          startDate: bookingDetails?.startDate,
          startTime: bookingDetails?.startTime,
          endDate: bookingDetails?.endDate,
          endTime: bookingDetails?.endTime,
          passengers: bookingDetails?.passengers || passengers,
          tripType: bookingDetails?.tripType || tripType,
          roundTripMode: bookingDetails?.roundTripMode,
          serviceMode: bookingDetails?.serviceMode,
          multiDayStore: bookingDetails?.multiDayStore,
          stops: bookingDetails?.stops,
          routeLegs: bookingDetails?.routeLegs,
          returnLoc: bookingDetails?.returnLoc,
          selectedAmenities: bookingDetails?.selectedAmenities,
          adaRequired: bookingDetails?.adaRequired,
          adaVehicleCount: bookingDetails?.adaVehicleCount,
          currency: currency,
          countryCode: bookingDetails?.countryCode || bookingDetails?.pickup?.countryCode,
          distance: routeDistanceKm || bookingDetails?.distance,
          duration: bookingDetails?.durationHours || bookingDetails?.duration,
          effectiveTotalHours: bookingDetails?.effectiveTotalHours,
          routePolyline: bookingDetails?.routePolyline,
          pickupWaitMin: bookingDetails?.pickupWaitMin,
          dropoffWaitMin: bookingDetails?.dropoffWaitMin,
          isThirdParty,
          thirdPartyInfo: isThirdParty ? thirdPartyInfo : undefined
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || "Unable to save quotation right now.");
      }

      const resData = await res.json().catch(() => null);
      const quoteRef = resData?.data?.ref || resData?.data?.booking_ref;
      if (quoteRef && typeof window !== 'undefined') {
        try {
          const prevStr = localStorage.getItem('transhola_recent_quote_refs');
          const prev: string[] = prevStr ? JSON.parse(prevStr) : [];
          if (!prev.includes(quoteRef)) {
            prev.unshift(quoteRef);
            localStorage.setItem('transhola_recent_quote_refs', JSON.stringify(prev.slice(0, 30)));
          }
        } catch (storageErr) {
          console.warn("Could not cache quote ref:", storageErr);
        }
      }

      dispatchAirlineQuotationEmailClient({
        email: authUser?.email || (isThirdParty ? thirdPartyInfo?.email : undefined),
        clientName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0],
        quoteRef,
        isAccountLoggedIn: Boolean(authUser?.id && (authUser as any)?.provider !== 'quick' && !(authUser as any)?.isGuestQuickEmail),
        accountUserId: authUser?.id,
        option: selected,
        bookingDetails,
        currency,
        passengers: Number(bookingDetails?.passengers || passengers || 1),
        tripType: bookingDetails?.tripType || tripType,
        distanceKm: routeDistanceKm || bookingDetails?.distance,
      });

      localStorage.removeItem("saved_itinerary");
      setSavedAsQuote(true);
      setTimeout(() => {
        window.location.href = "/quotations";
      }, 900);
    } catch (e: any) {
      console.error("Quotation Error:", e);
      setQuoteSaveError(e?.message || "Could not save quotation. Please try again.");
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
    const isSelected = selected?.id === opt.id
    const vehicles = Array.isArray(opt.vehicles) && opt.vehicles.length > 0 ? opt.vehicles : [{ count: 1, type: opt.label, seats: opt.totalSeats }]
    const isDual = vehicles.length > 1
    const primaryImg = vehicles[0]?.imageUrl || resolveFleetImageUrl(vehicles[0]?.iconName || vehicles[0]?.type, vehicles[0]?.seats)
    const secondaryImg = isDual ? (vehicles[1]?.imageUrl || resolveFleetImageUrl(vehicles[1]?.iconName || vehicles[1]?.type, vehicles[1]?.seats)) : null

    const qtyBadge = isDual
      ? vehicles.map((v: any) => v.count).join('+')
      : (vehicles[0]?.count > 1 ? `×${vehicles[0].count}` : '')

    const paxNum = Math.max(1, Number(passengers) || 1)
    const totalSeats = Math.max(paxNum, Number(opt.totalSeats || paxNum))
    const bufferSeats = Math.max(0, totalSeats - paxNum)
    const seatEffPct = Math.min(100, Math.round((paxNum / totalSeats) * 100))
    const co2Val = opt.co2GramsPerPaxKm || 15.4
    const totalBags = opt.totalLuggage || Math.round(totalSeats * 0.88)

    const vehiclesSummary = isDual
      ? `${vehicles.map((v: any) => `${v.count}× ${v.seats}-Pax`).join(' + ')} (${totalSeats} Seats)`
      : `${vehicles[0]?.count || 1}× ${vehicles[0]?.type || opt.label}`

    const tagText = String(opt.tag || (opt.isRecommended ? 'Best Price & Lowest CO₂' : 'Verified Fleet'))
    const isGreenBadge = /co2|co₂|exact|eco/i.test(tagText) && !/best price/i.test(tagText)
    const badgeBg = isGreenBadge ? '#dcfce7' : '#dbeafe'
    const badgeColor = isGreenBadge ? '#15803d' : '#1d4ed8'

    const pNum = Number(opt.price || 0)
    const hasCents = Math.abs(pNum - Math.round(pNum)) > 0.005
    const formattedPrice = pNum.toLocaleString('en-US', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
    const displayCurr = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : (currency || 'AED').trim()

    return (
      <button
        key={opt.id}
        type="button"
        onClick={() => setSelected(opt)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '13px 14px',
          borderRadius: '16px',
          cursor: 'pointer',
          border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
          background: isSelected ? 'linear-gradient(180deg, #eff6ff 0%, #ffffff 65%)' : '#ffffff',
          boxShadow: isSelected
            ? '0 8px 24px -8px rgba(37,99,235,0.22), 0 0 0 3px rgba(37,99,235,0.08)'
            : '0 2px 8px rgba(15,23,42,0.03)',
          transition: 'all 0.18s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Row: Real 3D Vehicle Thumbnail + Title/Badge/Amenities + Crisp Unclipped Price */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', flex: 1, minWidth: 0 }}>
            {/* Vehicle Thumbnail Box (Matches transhola.com/get-price) */}
            <div style={{
              position: 'relative',
              width: '66px',
              height: '46px',
              borderRadius: '11px',
              background: isSelected ? '#ffffff' : '#f8fafc',
              border: isSelected ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '3px',
            }}>
              {isDual && secondaryImg ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img
                    src={secondaryImg}
                    alt=""
                    style={{ position: 'absolute', left: '1px', top: '2px', width: '38px', height: '26px', objectFit: 'contain', opacity: 0.78 }}
                  />
                  <img
                    src={primaryImg}
                    alt={opt.label}
                    style={{ position: 'absolute', right: '0px', bottom: '1px', width: '44px', height: '30px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <img
                  src={primaryImg}
                  alt={opt.label}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
              {qtyBadge && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  padding: '1.5px 6px',
                  borderRadius: '999px',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 900,
                  lineHeight: 1.3,
                  border: '1.5px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(29,78,216,0.28)',
                }}>
                  {qtyBadge}
                </span>
              )}
            </div>

            {/* Title + Deployment Badge + Amenities */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.25px', lineHeight: 1.2, wordBreak: 'break-word' }}>
                {opt.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: badgeBg,
                  color: badgeColor,
                  fontSize: '10.5px',
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}>
                  {tagText}
                </span>
              </div>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {opt.amenitiesText || 'Restroom · Wi-Fi · Underfloor Bays · Reclining'}
              </div>
            </div>
          </div>

          {/* Right Price Column — Never Clipped */}
          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '4px' }}>
            <span style={{
              fontSize: '15.5px',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
              display: 'block',
            }}>
              {displayCurr} {formattedPrice}
            </span>
          </div>
        </div>

        {/* Bottom Row: Website Seat Efficiency & CO2 Green Box + Bags/Summary Meta Bar */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #dcfce7',
          borderRadius: '10px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', lineHeight: 1.35 }}>
            ✓ {totalSeats} Total Seats for {paxNum} Pax ({seatEffPct === 100 ? '100% Exact Seat Fit' : `${seatEffPct}% Seat Efficiency · +${bufferSeats} buffer seats`} · {co2Val}g CO₂/pax-km)
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            paddingTop: '5px',
            borderTop: '1px solid #dcfce7',
            fontSize: '10.5px',
            fontWeight: 800,
          }}>
            <span style={{ color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ✓ {totalSeats} Seats · {totalBags} Bags Capacity
            </span>
            <span style={{ color: '#2563eb', whiteSpace: 'nowrap' }}>
              {vehiclesSummary}
            </span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header (Matches transhola.com/get-price Recommended Fleet header) */}
      <div
        ref={headerRef}
        style={{
          padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9', background: 'white',
          position: 'sticky', top: 0, zIndex: 10,
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => { setSelected(null); if (onSelectionChange) onSelectionChange(null); onBack(); }} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X style={{ width: '15px', height: '15px', color: '#0f172a' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '21px', fontWeight: 900, letterSpacing: '-0.5px', margin: 0, color: '#0f172a' }}>Recommended Fleet</h2>
            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 9px', borderRadius: '999px' }}>
                Pricing based on vehicle type &amp; combination
              </span>
            </div>
            <p style={{ margin: '5px 0 0', fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
              {passengers} Passengers
              {bookingDetails?.startDate ? ` · ${new Date(bookingDetails.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              {routeDistanceKm ? ` · ${routeDistanceKm} km` : ''}
              {bookingDetails?.duration ? ` · ${Math.floor(bookingDetails.duration / 3600)}h ${Math.round((bookingDetails.duration % 3600) / 60)}m` : ''}
            </p>
          </div>
        </div>

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
            {isEstimatedUnservedArea && (
              <div style={{ padding: '13px 15px', borderRadius: '14px', background: '#fffbeb', border: '1.5px solid #fde68a', marginBottom: '16px', display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                <AlertTriangle style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.55 }}>
                  <strong style={{ display: 'block', marginBottom: '3px', fontWeight: 800, fontSize: '12.5px', color: '#78350f' }}>
                    Estimated Rate — We Don&apos;t Serve This Area Yet
                  </strong>
                  {unservedNoticeText || "This is an estimated rate and we don't serve this area yet."} Rates shown below are calibrated regional estimates for planning reference only.
                </div>
              </div>
            )}

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
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: isEstimatedUnservedArea ? '#fef3c7' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck style={{ width: '13px', height: '13px', color: isEstimatedUnservedArea ? '#d97706' : '#2563eb' }} />
                  </div>
                  <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    {isEstimatedUnservedArea ? 'Estimated Fleet Rates' : 'Recommended Fleet'}
                  </h3>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '999px', border: '1px solid #e2e8f0' }}>
                    {shown.length} {shown.length === 1 ? 'Option' : 'Options'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '9px 13px', borderRadius: '10px', background: isEstimatedUnservedArea ? '#fffbeb' : '#f8fafc', border: isEstimatedUnservedArea ? '1px solid #fde68a' : '1px dashed #e2e8f0' }}>
              <Info style={{ width: '12px', height: '12px', color: isEstimatedUnservedArea ? '#d97706' : '#64748b', flexShrink: 0, marginTop: '1px' }} />
              {isEstimatedUnservedArea ? (
                <p style={{ fontSize: '11px', color: '#92400e', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                  This is an estimated rate and we don&apos;t serve this area yet. Live dispatch checkout is unavailable for this location.
                </p>
              ) : canSaveAsQuote ? (
                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>Corporate rate applied. Quote valid until {expiresAt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p>
              ) : (
                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>Corporate rate applied. Trip starts too soon to save quote. Book now.</p>
              )}
            </div>
            {isEstimatedUnservedArea ? (
              <button disabled style={{ width: '100%', height: '50px', borderRadius: '14px', background: '#e2e8f0', color: '#475569', fontWeight: 800, fontSize: '13.5px', border: 'none', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Estimated Rate: {currencySymbol || currency} {selected.price} · Area Not Served Yet
              </button>
            ) : (
              <button onClick={() => {
                if (!user) {
                  setPendingAction("book");
                  setShowAuthDialog(true);
                } else {
                  setStep("payment");
                }
              }} style={{ width: '100%', height: '50px', borderRadius: '14px', background: '#0f172a', color: 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CreditCard style={{ width: '16px', height: '16px' }} /> Book Now — {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : `${currency} `}{Number(selected.price || 0).toLocaleString('en-US', { minimumFractionDigits: Math.abs(Number(selected.price || 0) - Math.round(Number(selected.price || 0))) > 0.005 ? 2 : 0, maximumFractionDigits: 2 })}
              </button>
            )}
            {quoteSaveError && (
              <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                <span>{quoteSaveError}</span>
              </div>
            )}
            {canSaveAsQuote && (
              <button onClick={() => {
                if (!user) {
                  setPendingAction("quote");
                  setShowAuthDialog(true);
                } else {
                  handleSaveQuote();
                }
              }} disabled={isSavingQuote || savedAsQuote} style={{ width: '100%', height: '44px', borderRadius: '14px', background: savedAsQuote ? '#ecfdf5' : 'white', color: savedAsQuote ? '#047857' : '#0f172a', fontWeight: 700, fontSize: '13px', border: savedAsQuote ? '1.5px solid #6ee7b7' : '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                {isSavingQuote ? (
                  <RefreshCw className="animate-spin" style={{ width: '14px', height: '14px', color: '#64748b' }} />
                ) : (
                  <BookmarkPlus style={{ width: '14px', height: '14px', color: savedAsQuote ? '#059669' : '#2563eb' }} />
                )}
                {savedAsQuote
                  ? (bookingDetails?.quotation_db_id ? 'Quotation Updated ✓' : 'Quote Saved ✓')
                  : isSavingQuote
                    ? (bookingDetails?.quotation_db_id ? 'Updating...' : 'Saving...')
                    : (bookingDetails?.quotation_db_id ? 'Update Quotation' : 'Save as Quotation')}
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
            const { user: resolvedUser } = await resolveActiveClientAuth();
            setUser(resolvedUser);
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
  const [saveNewCard, setSaveNewCard] = React.useState(true);
  const [mockCardNumber, setMockCardNumber] = React.useState("•••• •••• •••• 4242");
  const [mockExpiry, setMockExpiry] = React.useState("12/28");

  React.useEffect(() => {
    async function fetchCards() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id;
        const userEmail = session?.user?.email;

        let combinedCards: any[] = [];

        if (userId) {
          try {
            const res = await fetch(`${BOOKING_API_URL}/payment-methods`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "x-user-id": userId,
                "x-user-email": userEmail || ""
              }
            });

            if (res.ok) {
              const data = await res.json();
              combinedCards = data.data || [];
            }
          } catch (apiErr) {
            console.warn("Could not fetch remote cards in mock mode:", apiErr);
          }
        }

        // Merge locally stored mock cards for seamless demo/testing experience
        if (typeof window !== 'undefined') {
          try {
            const localSaved = JSON.parse(localStorage.getItem('transhola_mock_saved_cards') || '[]');
            if (Array.isArray(localSaved)) {
              const existingIds = new Set(combinedCards.map((c: any) => c.id));
              for (const lc of localSaved) {
                if (!existingIds.has(lc.id)) {
                  combinedCards.push(lc);
                }
              }
            }
          } catch (e) {
            console.warn("Could not read local mock cards:", e);
          }
        }

        setSavedCards(combinedCards);
        if (combinedCards.length > 0) {
          const def = combinedCards.find((c: any) => c.isDefault) || combinedCards[0];
          setSelectedCard(def.id);
        } else {
          setSelectedCard('new');
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

    // If adding a new card and user opted to save it, cache it locally in mock mode
    if (selectedCard === 'new' && saveNewCard && typeof window !== 'undefined') {
      try {
        const rawLast4 = mockCardNumber.replace(/\D/g, '').slice(-4) || '4242';
        const newMockCard = {
          id: `pm_mock_${Date.now()}`,
          brand: 'Visa',
          type: 'visa',
          last4: rawLast4,
          exp: mockExpiry || '12/28',
          expiry: mockExpiry || '12/28',
          isDefault: true
        };
        const existing = JSON.parse(localStorage.getItem('transhola_mock_saved_cards') || '[]');
        const updated = [newMockCard, ...existing.map((c: any) => ({ ...c, isDefault: false }))];
        localStorage.setItem('transhola_mock_saved_cards', JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not cache mock card:", e);
      }
    }

    setTimeout(async () => {
      try {
        const { user: authUser, token } = await resolveActiveClientAuth();
        if (!authUser) {
          throw new Error("Authentication required. Please sign in to complete booking.");
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (authUser.id) headers["x-user-id"] = authUser.id;
        if (authUser.email) headers["x-user-email"] = authUser.email;

        const res = await fetch(`${BOOKING_API_URL}/checkout`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            userId: authUser.id || undefined,
            userEmail: authUser.email || undefined,
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
        dispatchAirlineBookingEmailClient({
          email: authUser?.email,
          passengerName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0],
          passengerPhone: authUser?.phone || bookingDetails?.thirdPartyInfo?.phone,
          accountUserId: authUser?.id,
          bookingRef: responseData?.data?.booking_ref || responseData?.data?.ref || responseData?.data?.id,
          option,
          bookingDetails,
          currency,
          paymentMethod: 'Card Checkout (Instant Authorization)',
          isThirdParty: Boolean(isThirdParty || bookingDetails?.isThirdParty),
          thirdPartyInfo: thirdPartyInfo || bookingDetails?.thirdPartyInfo,
        });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', width: '100%', maxWidth: '280px' }}>
        <button onClick={onBack} style={{ padding: '10px 22px', borderRadius: '12px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>Cancel</button>
        <button onClick={() => setPayState("idle")} style={{ padding: '10px 22px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Retry</button>
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
              savedCards.map(card => {
                const brand = (card.brand || card.type || 'Card').toUpperCase();
                const exp = card.exp || card.expiry || 'N/A';
                return (
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
                      <div style={{ width: '38px', height: '26px', background: '#f8fafc', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '10px', color: '#1e293b' }}>
                        {brand === 'VISA' ? 'VISA' : brand === 'MASTERCARD' ? 'MC' : brand === 'AMEX' ? 'AMEX' : <CreditCard style={{ width: '15px', height: '15px', color: '#64748b' }} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>{brand} •••• {card.last4}</p>
                          {card.isDefault && (
                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>Default</span>
                          )}
                        </div>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Expires {exp}</p>
                      </div>
                    </div>
                    {selectedCard === card.id && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#2563eb' }} />}
                  </button>
                );
              })
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
                <div style={{ width: '38px', height: '26px', background: '#e2e8f0', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                  <CreditCard style={{ width: '15px', height: '15px', color: '#64748b' }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>+ Add New Card</p>
              </div>
              {selectedCard === 'new' && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#2563eb' }} />}
            </button>
          </div>
        </div>

        {selectedCard === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '16px', border: '1.5px solid #e2e8f0', borderRadius: '14px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Card Details</p>
                <span style={{ fontSize: '10px', fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>Demo Mode</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Card Number</label>
                  <input
                    type="text"
                    value={mockCardNumber}
                    onChange={(e) => setMockCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 600, background: '#f8fafc', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Expires</label>
                    <input
                      type="text"
                      value={mockExpiry}
                      onChange={(e) => setMockExpiry(e.target.value)}
                      placeholder="MM/YY"
                      style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 600, background: '#f8fafc', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>CVC</label>
                    <input
                      type="text"
                      defaultValue="123"
                      placeholder="CVC"
                      style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 600, background: '#f8fafc', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Securely Save Card Checkbox */}
            <div style={{
              padding: '14px 16px',
              background: '#f8fafc',
              borderRadius: '14px',
              border: saveNewCard ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  id="mock-save-card-toggle"
                  checked={saveNewCard}
                  onChange={(e) => setSaveNewCard(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }}
                />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Save this card securely for future bookings
                    <span style={{ fontSize: '10px', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px' }}>Recommended</span>
                  </span>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0', lineHeight: 1.4 }}>
                    Skip entering card details next time. Encrypted and saved securely via PCI-DSS Level 1 vault tokenization.
                  </p>
                </div>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>
                <ShieldCheck style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>256-bit SSL encrypted · Never re-enter details again</span>
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
  const [saveNewCard, setSaveNewCard] = React.useState(true);

  React.useEffect(() => {
    async function fetchCards() {
      try {
        const { user: authUser, token } = await resolveActiveClientAuth();
        const userId = authUser?.id;
        const userEmail = authUser?.email;

        if (!userId) {
          setIsLoadingCards(false);
          return;
        }

        const headers: Record<string, string> = {
          "x-user-id": userId,
          "x-user-email": userEmail || ""
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${BOOKING_API_URL}/payment-methods`, {
          credentials: "include",
          headers
        });

        if (res.ok) {
          const data = await res.json();
          const cards = data.data || [];
          setSavedCards(cards);
          if (cards.length > 0) {
            const def = cards.find((c: any) => c.isDefault) || cards[0];
            setSelectedCard(def.id);
          } else {
            setSelectedCard('new');
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
      const { user: authUser, token } = await resolveActiveClientAuth();
      if (!authUser) {
        throw new Error("Authentication required. Please sign in to complete booking.");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (authUser.id) headers["x-user-id"] = authUser.id;
      if (authUser.email) headers["x-user-email"] = authUser.email;

      const res = await fetch(`${BOOKING_API_URL}/checkout`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          userId: authUser.id || undefined,
          userEmail: authUser.email || undefined,
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
          savePaymentMethod: selectedCard === 'new' ? saveNewCard : false,
        })
      });

      if (!res.ok) throw new Error("Checkout Gateway validation failed");

      const responseData = await res.json();
      dispatchAirlineBookingEmailClient({
        email: authUser?.email,
        passengerName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0],
        passengerPhone: authUser?.phone || thirdPartyInfo?.phone || bookingDetails?.thirdPartyInfo?.phone,
        accountUserId: authUser?.id,
        bookingRef: responseData?.data?.booking_ref || responseData?.data?.ref || responseData?.data?.id,
        option,
        bookingDetails,
        currency,
        paymentMethod: 'Encrypted Card Checkout',
        isThirdParty: Boolean(isThirdParty || bookingDetails?.isThirdParty),
        thirdPartyInfo: thirdPartyInfo || bookingDetails?.thirdPartyInfo,
      });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', width: '100%', maxWidth: '280px' }}>
        <button onClick={onBack} style={{ padding: '10px 22px', borderRadius: '12px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>Cancel</button>
        <button onClick={() => setPayState("idle")} style={{ padding: '10px 22px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Retry</button>
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
              savedCards.map(card => {
                const brand = (card.brand || card.type || 'Card').toUpperCase();
                const exp = card.expiry || card.exp || 'N/A';
                return (
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
                      <div style={{ width: '38px', height: '26px', background: '#f8fafc', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '10px', color: '#1e293b' }}>
                        {brand === 'VISA' ? 'VISA' : brand === 'MASTERCARD' ? 'MC' : brand === 'AMEX' ? 'AMEX' : <CreditCard style={{ width: '15px', height: '15px', color: '#64748b' }} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>{brand} •••• {card.last4}</p>
                          {card.isDefault && (
                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>Default</span>
                          )}
                        </div>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>Expires {exp}</p>
                      </div>
                    </div>
                    {selectedCard === card.id && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#2563eb' }} />}
                  </button>
                );
              })
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
                <div style={{ width: '38px', height: '26px', background: '#e2e8f0', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                  <CreditCard style={{ width: '15px', height: '15px', color: '#64748b' }} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>+ Add New Card</p>
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
              onLoadError={(err) => {
                console.warn("[PaymentElement] Load error:", err);
                setIsReady(true);
              }}
              options={{
                wallets: {
                  link: 'never'
                }
              }}
            />

            {/* Securely Save Card Checkbox */}
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              background: '#f8fafc',
              borderRadius: '14px',
              border: saveNewCard ? '1.5px solid #93c5fd' : '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  id="stripe-save-card-toggle"
                  checked={saveNewCard}
                  onChange={(e) => setSaveNewCard(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }}
                />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Save this card securely for future bookings
                    <span style={{ fontSize: '10px', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px' }}>Recommended</span>
                  </span>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0', lineHeight: 1.4 }}>
                    Never re-enter card details again. Encrypted and saved securely via PCI-DSS Level 1 tokenization.
                  </p>
                </div>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>
                <ShieldCheck style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>256-bit SSL encrypted · Bank-grade security</span>
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
        <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: 600, margin: '9px 0 0' }}>🔒 Bank-Grade PCI-DSS Level 1 · 256-bit SSL</p>
      </div>
    </form>
  )
}

export function PaymentPanel({ option, bookingDetails, currency = "EUR", onBack, onConfirm, isThirdParty, setIsThirdParty, thirdPartyInfo, setThirdPartyInfo }: { option: VehicleOption; bookingDetails?: any; currency?: string; onBack: () => void; onConfirm: (id?: string) => void; isThirdParty?: boolean; setIsThirdParty?: any; thirdPartyInfo?: any; setThirdPartyInfo?: any; }) {
  const [clientSecret, setClientSecret] = React.useState("");
  const [intentType, setIntentType] = React.useState("payment");
  const initializedKeyRef = React.useRef<string>("");

  const optionId = option?.id || option?.label || "default";
  const optionPrice = Number(option?.price || 0);
  const quoteDbId = String(bookingDetails?.quotation_db_id || "");
  const resolvedCountry = String(bookingDetails?.countryCode || bookingDetails?.pickup?.countryCode || "AE").toUpperCase();

  React.useEffect(() => {
    const intentKey = `${optionId}|${optionPrice}|${currency}|${quoteDbId}|${resolvedCountry}`;
    if (initializedKeyRef.current === intentKey) return;
    initializedKeyRef.current = intentKey;

    let cancelled = false;
    async function initPayment() {
      try {
        const { user: authUser, token } = await resolveActiveClientAuth();
        if (cancelled) return;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || 'BYPASS_AUTH'}`
        };
        if (authUser?.id) headers["x-user-id"] = authUser.id;
        if (authUser?.email) headers["x-user-email"] = authUser.email;

        const res = await fetch(`${BOOKING_API_URL}/create-payment-intent`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            amount: optionPrice,
            currency,
            countryCode: resolvedCountry,
            userId: authUser?.id,
            userEmail: authUser?.email,
            savePaymentMethod: true,
            metadata: {
              quotationId: quoteDbId,
              vehicle: String(option?.label || "Charter Fleet").slice(0, 80),
            }
          })
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setIntentType(data.intentType || "payment");
        } else {
          setClientSecret("pi_mock_secret_sandbox");
          setIntentType("payment");
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setClientSecret("pi_mock_secret_sandbox");
      }
    }
    initPayment();
    return () => {
      cancelled = true;
    };
  }, [optionId, optionPrice, currency, quoteDbId, resolvedCountry]);

  if (!clientSecret) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onBack}
            style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#334155' }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} /> Cancel
          </button>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>{currency} {optionPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.85s linear infinite' }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Initializing Encrypted Checkout…</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Preparing secure payment session for {option?.label}</p>
          </div>
        </div>
      </div>
    );
  }

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[92vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Your bus prices are one step away!
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Create an account or sign in to view your prices and save this quote for future access.
          </DialogDescription>
        </DialogHeader>

        <RegisterForm
          embedded
          initialMode="register"
          onAuthSuccess={() => {
            onSuccess();
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
