"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { MapPin, Users, Car, ChevronDown, Zap, CalendarDays, Navigation, Briefcase, LocateFixed, AlertTriangle, Clock, CheckCircle2, Settings2, Accessibility, ChevronLeft, ChevronRight, X, Info, AlertCircle, Timer, Repeat, RefreshCcw, Plus, Flag } from "lucide-react"
import { useRouter } from "next/navigation"

import { QuotationPanel } from "./quotation-panel"
import { StatusTimeline } from "./status-timeline"
import { LocationSearchInput, saveRecentLocation, getRecentLocations } from "./location-search"
import { GisClient } from "@/lib/gis-client"
import { CitySelectorModal, GeoContext } from "./city-selector-modal"
import { createClient } from "@/lib/supabase/client"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { format, parseISO } from "date-fns"

type ServiceMode = "scheduled" | "asap"

function getVehicleRecommendation(pax: number): { label: string; count: number; type: string } {
  if (pax <= 3) return { label: "Executive Sedan", count: 1, type: "sedan" }
  if (pax <= 6) return { label: "Premium SUV", count: 1, type: "suv" }
  if (pax <= 12) return { label: "Luxury Van", count: 1, type: "van" }
  const vans = Math.ceil(pax / 12)
  return { label: `${vans} × Luxury Vans`, count: vans, type: "van" }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function formatDistance(distanceMeters: number, distanceUnit?: string): string {
  if (distanceUnit === 'mi') {
    return `${(distanceMeters * 0.000621371).toFixed(1)} mi`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function addSecondsToDatetime(dateStr: string, timeStr: string, seconds: number): { date: string; time: string } {
  if (!dateStr || !timeStr) return { date: dateStr, time: timeStr }
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hr, min] = timeStr.split(':').map(Number);
  const base = new Date(y, m - 1, d, hr, min);
  const result = new Date(base.getTime() + seconds * 1000)

  const yyyy = result.getFullYear()
  const mm = String(result.getMonth() + 1).padStart(2, '0')
  const dd = String(result.getDate()).padStart(2, '0')
  const hh = String(result.getHours()).padStart(2, '0')
  const mins = String(result.getMinutes()).padStart(2, '0')

  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mins}` }
}

function isEndBeforeAta(endDate: string, endTime: string, ataDate: string, ataTime: string): boolean {
  if (!endDate || !endTime || !ataDate || !ataTime) return false
  return `${endDate}T${endTime}` < `${ataDate}T${ataTime}`;
}

function formatTimeStr(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  if (!h || !m) return timeStr
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

function formatDateStr(dateStr: string, todayStr: string): string {
  if (!dateStr) return ''
  if (dateStr === todayStr) return 'Today'
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    // Use the client's locale for natural date formatting
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
  } catch {
    return dateStr
  }
}

function getDayDifferenceStr(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '';
  if (startDateStr === endDateStr) return '';
  try {
    const [y1, m1, d1] = startDateStr.split('-').map(Number);
    const [y2, m2, d2] = endDateStr.split('-').map(Number);
    const start = new Date(Date.UTC(y1, m1 - 1, d1));
    const end = new Date(Date.UTC(y2, m2 - 1, d2));
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    if (diffDays === 1) return '(+1 day)';
    if (diffDays > 1) return `(+${diffDays} days)`;
    return '';
  } catch {
    return '';
  }
}

function TimePickerSelect({ value, onChange, style, disabled, minTime, prefix }: { value: string, onChange: (val: string) => void, style?: React.CSSProperties, disabled?: boolean, minTime?: string, prefix?: string }) {
  const options = React.useMemo(() => {
    const times = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

        let displayH = h % 12
        if (displayH === 0) displayH = 12
        const ampm = h < 12 ? 'AM' : 'PM'
        const label = `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`

        times.push({ val, label })
      }
    }
    return times
  }, [])

  return (
    <Select value={value} onValueChange={(val) => onChange(val || "")} disabled={disabled}>
      <SelectTrigger style={style}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Clock style={{ width: '16px', height: '16px', marginRight: '8px', color: value ? '#2563eb' : '#94a3b8', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {prefix && <span style={{ color: '#94a3b8', fontSize: '12px' }}>{prefix}</span>}
            {value ? formatTimeStr(value) : <SelectValue placeholder="Select time…" />}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.filter(t => !(minTime && t.val < minTime)).map(t => (
          <SelectItem key={t.val} value={t.val}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function BookingPanel({
  onPickupChange,
  onDropoffChange,
  onUserLocationDetected,
  pickupPinMoved,
  dropoffPinMoved,
  onReinstatePickup,
  onReinstateDropoff,
  onStepChange,
  onStopsChange,
  onQuoteSelected,
  onTripTypeChange,
  onShuttleVehiclesChange,
  onReturnChange,
  onCountryCodeChange,
  onDistanceUnitChange,
  onMultiDayStoreChange,
}: {
  onPickupChange?: (loc: any) => void
  onDropoffChange?: (loc: any) => void
  onUserLocationDetected?: (loc: { lat: number; lon: number }) => void
  pickupPinMoved?: { address: string; name?: string; coordinate: any } | null
  dropoffPinMoved?: { address: string; name?: string; coordinate: any } | null
  onReinstatePickup?: () => void
  onReinstateDropoff?: () => void
  onStepChange?: (step: "search" | "quotation" | "timeline") => void
  onStopsChange?: (stops: any[]) => void
  onQuoteSelected?: (quote: any | null) => void
  onTripTypeChange?: (tripType: "oneway" | "roundtrip" | "multi-day" | "shuttle") => void
  onShuttleVehiclesChange?: (vehicles: number) => void
  onReturnChange?: (loc: any) => void
  onCountryCodeChange?: (cc: string) => void
  onDistanceUnitChange?: (unit: string) => void
  onMultiDayStoreChange?: (store: any[]) => void
}) {
  const router = useRouter()
  const [activeStep, setActiveStep] = React.useState<"search" | "quotation" | "timeline">("search")

  // Global Context
  const [clientGeoContext, setClientGeoContext] = React.useState<GeoContext>({
    city: "Dubai", country: "United Arab Emirates", countryCode: "AE", lat: 25.2048, lon: 55.2708
  })

  React.useEffect(() => {
    if (onCountryCodeChange && clientGeoContext.countryCode) {
      onCountryCodeChange(clientGeoContext.countryCode)
    }

    const fetchUnit = async () => {
      if (!clientGeoContext.countryCode) return
      const supabase = createClient()
      const { data } = await supabase.from('country_configurations').select('distance_unit').eq('country_code', clientGeoContext.countryCode).single()
      
      const newUnit = data?.distance_unit === 'mi' ? 'mi' : 'km'
      setClientGeoContext(prev => ({
        ...prev,
        distanceUnit: newUnit
      }))
      if (onDistanceUnitChange) {
        onDistanceUnitChange(newUnit)
      }
    }
    fetchUnit()
  }, [clientGeoContext.countryCode])
  
  const [isCityModalOpen, setIsCityModalOpen] = React.useState(false)
  const [editingQuoteRef, setEditingQuoteRef] = React.useState<string | null>(null)
  const [quotationDbId, setQuotationDbId] = React.useState<string | null>(null)
  const [quotePrice, setQuotePrice] = React.useState<number | null>(null)
  const [quoteCurrency, setQuoteCurrency] = React.useState<string>("AED")
  const [hydratedOption, setHydratedOption] = React.useState<any>(null)

  // Advanced Amenities
  const [showAmenities, setShowAmenities] = React.useState(false)
  const [adaRequired, setAdaRequired] = React.useState(false)
  const [adaVehicleCount, setAdaVehicleCount] = React.useState(1)
  const [selectedAmenities, setSelectedAmenities] = React.useState<string[]>([])

  // Notify parent whenever step changes so it can lock/unlock map pins
  const goToStep = React.useCallback((step: "search" | "quotation" | "timeline") => {
    setActiveStep(step)
    onStepChange?.(step)
    if (step !== "quotation") {
      onQuoteSelected?.(null)
    }
  }, [onStepChange, onQuoteSelected])
  const [serviceMode, setServiceMode] = React.useState<ServiceMode>("scheduled")
  const [passengers, setPassengers] = React.useState(1)
  const [passengerInput, setPassengerInput] = React.useState("1")
  const [shuttleVehicles, setShuttleVehicles] = React.useState(1)
  const [shuttleVehicleInput, setShuttleVehicleInput] = React.useState("1")
  const [roundTripMode, setRoundTripMode] = React.useState<"transfer" | "continuous">("continuous")
  const [pickupValue, setPickupValue] = React.useState("")
  const [dropoffValue, setDropoffValue] = React.useState("")
  const [pickupLoc, setPickupLoc] = React.useState<any>(null)
  const [dropoffLoc, setDropoffLoc] = React.useState<any>(null)
  const [returnValue, setReturnValue] = React.useState("")
  const [returnLoc, setReturnLoc] = React.useState<any>(null)

  const [showRestoreDialog, setShowRestoreDialog] = React.useState(false)
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [savedItinerary, setSavedItinerary] = React.useState<any>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Track original typed addresses for reinstate
  const originalPickupRef = React.useRef<string>("")
  const originalDropoffRef = React.useRef<string>("")
  const tabsContainerRef = React.useRef<HTMLDivElement>(null)

  const scrollTabs = (dir: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: dir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  // Sync input AND internal location when pin is dragged on map
  React.useEffect(() => {
    if (pickupPinMoved) {
      const display = pickupPinMoved.name || pickupPinMoved.address.split(",")[0]
      setPickupValue(display)
      setPickupLoc(pickupPinMoved)  // keep routing/ATA in sync
      if (onPickupChange) onPickupChange(pickupPinMoved)
    }
  }, [pickupPinMoved])

  React.useEffect(() => {
    if (dropoffPinMoved) {
      const display = dropoffPinMoved.name || dropoffPinMoved.address.split(",")[0]
      setDropoffValue(display)
      setDropoffLoc(dropoffPinMoved)  // keep routing/ATA in sync
      if (onDropoffChange) onDropoffChange(dropoffPinMoved)
    }
  }, [dropoffPinMoved])

  // Quote Hydration on Mount (via Deep Linking)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const quoteId = urlParams.get("quote");
    if (quoteId) {
      async function hydrateQuote() {
        const supabase = createClient();
        const { data, error } = await supabase.from('bookings').select('*').eq('id', quoteId).single();
        if (data && (data.booking_details || data.quotation_details)) {
          const d = data.booking_details || data.quotation_details;

          setEditingQuoteRef(data.booking_ref || data.ref || `Q-${data.id.substring(0, 8).toUpperCase()}`);
          setQuotationDbId(data.id);
          if (data.price) setQuotePrice(data.price);
          if (data.currency) setQuoteCurrency(data.currency);
          if (d.option) setHydratedOption(d.option);

          if (d.tripType === "shuttle") {
            setShuttleVehicles(d.passengers || 1);
            setShuttleVehicleInput(String(d.passengers || 1));
          } else {
            setPassengers(d.passengers || 1);
            setPassengerInput(String(d.passengers || 1));
          }

          const activeDaySrc = (d.tripType === 'multi-day' && d.multiDayStore && d.multiDayStore.length > 0) ? d.multiDayStore[0] : d;

          const pLoc = activeDaySrc.pickup || activeDaySrc.pickupLoc;
          if (pLoc) {
            setPickupValue(pLoc.address || activeDaySrc.pickupValue || "");
            setPickupLoc(pLoc);
            if (onPickupChange) onPickupChange(pLoc);
            originalPickupRef.current = pLoc.address || activeDaySrc.pickupValue || "";
          } else if (activeDaySrc.pickupValue) {
            setPickupValue(activeDaySrc.pickupValue);
          }

          const dLoc = activeDaySrc.dropoff || activeDaySrc.dropoffLoc;
          if (dLoc) {
            setDropoffValue(dLoc.address || activeDaySrc.dropoffValue || "");
            setDropoffLoc(dLoc);
            if (onDropoffChange) onDropoffChange(dLoc);
            originalDropoffRef.current = dLoc.address || activeDaySrc.dropoffValue || "";
          } else if (activeDaySrc.dropoffValue) {
            setDropoffValue(activeDaySrc.dropoffValue);
          }
          if (d.returnLoc) {
            setReturnValue(d.returnLoc.address);
            setReturnLoc(d.returnLoc);
          }

          if (d.startDate) setStartDate(d.startDate);
          if (activeDaySrc.startTime) setStartTime(activeDaySrc.startTime);
          if (d.endDate) setEndDate(d.endDate);
          if (activeDaySrc.endTime) setEndTime(activeDaySrc.endTime);

          if (d.tripType === "roundtrip" || d.tripType === "multi-day") {
            setShowReturn(true);
            setIsShuttle(false);
          } else if (d.tripType === "shuttle") {
            setIsShuttle(true);
            setShowReturn(false);
          } else {
            setShowReturn(false);
            setIsShuttle(false);
          }
          if (activeDaySrc.stops?.length) setStops(activeDaySrc.stops);
          if (activeDaySrc.pickupWaitMin !== undefined) setPickupWaitMin(activeDaySrc.pickupWaitMin);
          if (activeDaySrc.dropoffWaitMin !== undefined) setDropoffWaitMin(activeDaySrc.dropoffWaitMin);

          if (d.multiDayStore) {
            setMultiDayStore(d.multiDayStore);
          }

          if (d.distance) {
            // Convert from the stored unit back to meters
            const isImperial = (d.countryCode === 'US' || d.countryCode === 'GB');
            setRouteDistance(isImperial ? (d.distance / 0.000621371) : (d.distance * 1000));
          }
          if (d.duration) {
            // Duration is stored in seconds
            setRouteDuration(d.duration);
          }
        }
      }
      hydrateQuote();
    }
  }, []);

  // Restore Itinerary from Local Storage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("saved_itinerary")
      const urlParams = new URLSearchParams(window.location.search);
      if (saved && !urlParams.get("quote")) {
        try {
          setSavedItinerary(JSON.parse(saved))
          setShowRestoreDialog(true)
        } catch (e) { }
      }
    }
  }, []);

  const handleRestoreItinerary = () => {
    const d = savedItinerary;
    if (!d) return;

    if (d.passengers) {
      if (d.tripType === "shuttle") {
        setShuttleVehicles(d.passengers);
        setShuttleVehicleInput(String(d.passengers));
      } else {
        setPassengers(d.passengers);
        setPassengerInput(String(d.passengers));
      }
    }
    const activeDaySrc = (d.tripType === 'multi-day' && d.multiDayStore && d.multiDayStore.length > 0) ? d.multiDayStore[0] : d;

    const pLoc2 = activeDaySrc.pickup || activeDaySrc.pickupLoc;
    if (pLoc2) {
      setPickupValue(pLoc2.address || activeDaySrc.pickupValue || "");
      setPickupLoc(pLoc2);
      if (onPickupChange) onPickupChange(pLoc2);
      originalPickupRef.current = pLoc2.address || activeDaySrc.pickupValue || "";
    } else if (activeDaySrc.pickupValue) {
      setPickupValue(activeDaySrc.pickupValue);
    }

    const dLoc2 = activeDaySrc.dropoff || activeDaySrc.dropoffLoc;
    if (dLoc2) {
      setDropoffValue(dLoc2.address || activeDaySrc.dropoffValue || "");
      setDropoffLoc(dLoc2);
      if (onDropoffChange) onDropoffChange(dLoc2);
      originalDropoffRef.current = dLoc2.address || activeDaySrc.dropoffValue || "";
    } else if (activeDaySrc.dropoffValue) {
      setDropoffValue(activeDaySrc.dropoffValue);
    }

    if (d.returnLoc) {
      setReturnValue(d.returnLoc.address);
      setReturnLoc(d.returnLoc);
    } else if (d.returnValue) {
      setReturnValue(d.returnValue);
    }

    if (d.serviceMode) setServiceMode(d.serviceMode);
    if (d.startDate) setStartDate(d.startDate);
    if (activeDaySrc.startTime) setStartTime(activeDaySrc.startTime);
    if (d.endDate) setEndDate(d.endDate);
    if (activeDaySrc.endTime) setEndTime(activeDaySrc.endTime);
    if (d.tripType === "roundtrip" || d.tripType === "multi-day") {
      setShowReturn(true);
      setIsShuttle(false);
    } else if (d.tripType === "shuttle") {
      setIsShuttle(true);
      setShowReturn(false);
    } else {
      setShowReturn(false);
      setIsShuttle(false);
    }
    if (activeDaySrc.stops?.length) setStops(activeDaySrc.stops);
    if (activeDaySrc.pickupWaitMin !== undefined) setPickupWaitMin(activeDaySrc.pickupWaitMin);
    if (activeDaySrc.dropoffWaitMin !== undefined) setDropoffWaitMin(activeDaySrc.dropoffWaitMin);
    if (d.multiDayStore) setMultiDayStore(d.multiDayStore);
    if (d.selectedAmenities) setSelectedAmenities(d.selectedAmenities);
    if (d.adaRequired) setAdaRequired(d.adaRequired);
    if (d.adaVehicleCount) setAdaVehicleCount(d.adaVehicleCount);

    setShowRestoreDialog(false);
  }

  const handleClearRestore = () => {
    localStorage.removeItem("saved_itinerary")
    setShowRestoreDialog(false)
  }

  // Scheduled fields
  const [startDate, setStartDate] = React.useState("")
  const [startTime, setStartTime] = React.useState("")
  const [pickupArrivalTime, setPickupArrivalTime] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [syncEndTime, setSyncEndTime] = React.useState(true)

  // ATA engine state
  const [routeDuration, setRouteDuration] = React.useState<number | null>(null) // seconds
  const [routeDistance, setRouteDistance] = React.useState<number | null>(null) // meters
  const [routePolyline, setRoutePolyline] = React.useState<any>(null) // geometry/polyline
  const [routeLegs, setRouteLegs] = React.useState<any[] | null>(null) // Array of legs for route calculation
  const [ataDate, setAtaDate] = React.useState("")
  const [ataTime, setAtaTime] = React.useState("")
  const [ataAutoFixed, setAtaAutoFixed] = React.useState(false)
  const [routeLoading, setRouteLoading] = React.useState(false)

  // ── Trip Type & Active Trip ────────────────────────────────────────────────
  type TripType = 'one-way' | 'roundtrip' | 'shuttle' | 'multi-day'
  // Shuttle-specific: pickup wait time + per-stop entries
  const [pickupWaitMin, setPickupWaitMin] = React.useState(5)
  const [pickupWaitUnit, setPickupWaitUnit] = React.useState<'min' | 'hr'>('min')
  const [dropoffWaitMin, setDropoffWaitMin] = React.useState(5)
  const [dropoffWaitUnit, setDropoffWaitUnit] = React.useState<'min' | 'hr'>('min')
  type StopEntry = { id: string; address: string; loc: any; stopDurationMin: number }
  const [stops, setStops] = React.useState<StopEntry[]>([])
  const [stopDurationUnit, setStopDurationUnit] = React.useState<Record<string, 'min' | 'hr'>>({}) // per-stop unit toggle
  const [shuttleTotalSec, setShuttleTotalSec] = React.useState<number | null>(null)
  const [shuttleLoading, setShuttleLoading] = React.useState(false)
  const [manualShuttleInterval, setManualShuttleInterval] = React.useState<number | null>(null)

  const [showReturn, setShowReturn] = React.useState(true)

  // ── Multi-Day Logic ────────────────────────────────────────────────────────
  type DailyData = { dateStr: string; startTime: string; endTime?: string; pickupValue: string; pickupLoc: any; dropoffValue: string; dropoffLoc: any; stops: StopEntry[]; routePolyline?: any; returnValue?: string; returnLoc?: any; pickupWaitMin?: number; dropoffWaitMin?: number; routeDistance?: number; routeDuration?: number }
  const [shuttleAutoStops, setShuttleAutoStops] = React.useState<boolean>(false)

  const [multiDayStore, setMultiDayStore] = React.useState<DailyData[]>([])
  const [activeDayIdx, setActiveDayIdx] = React.useState(0)
  const isSwappingRef = React.useRef(false)

  const [isShuttle, setIsShuttle] = React.useState(false)
  const [shuttleStaggered, setShuttleStaggered] = React.useState(true)
  const [shuttleVehicleOvertimes, setShuttleVehicleOvertimes] = React.useState<Record<number, boolean>>({})
  const [shuttleVehicleEndings, setShuttleVehicleEndings] = React.useState<Record<number, string>>({})
  const [shuttleWaypoints, setShuttleWaypoints] = React.useState<{ id: string, name: string, cumulativeSec: number }[]>([])
  const [shuttleReturnSec, setShuttleReturnSec] = React.useState<number | null>(null)

  const tripType = React.useMemo<TripType>(() => {
    if (isShuttle) return 'shuttle'
    if (multiDayStore.length > 1 && !(showReturn && roundTripMode === 'transfer')) return 'multi-day'
    if (showReturn) return 'roundtrip'
    return 'one-way'
  }, [showReturn, multiDayStore.length, isShuttle, roundTripMode])

  React.useEffect(() => {
    if (onTripTypeChange) {
      onTripTypeChange(tripType === 'one-way' ? 'oneway' : tripType);
    }
  }, [tripType, onTripTypeChange]);

  React.useEffect(() => {
    if (tripType === 'roundtrip' && pickupLoc && !dropoffLoc) {
      setDropoffValue(pickupLoc.address);
      setDropoffLoc(pickupLoc);
      if (onDropoffChange) onDropoffChange(pickupLoc);
    }
  }, [tripType, pickupLoc, dropoffLoc, onDropoffChange]);

  React.useEffect(() => {
    if (onShuttleVehiclesChange) {
      onShuttleVehiclesChange(shuttleVehicles);
    }
  }, [shuttleVehicles, onShuttleVehiclesChange]);

  // Auto-save itinerary draft
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let cCode = (pickupLoc?.countryCode || clientGeoContext.countryCode || "US").toUpperCase();
    if (!pickupLoc?.countryCode && clientGeoContext.country) {
      const c = clientGeoContext.country.toLowerCase();
      if (c.includes("united states") || c === "usa") cCode = "US";
      else if (c.includes("emirates") || c === "uae") cCode = "AE";
      else if (c.includes("saudi") || c === "ksa") cCode = "SA";
      else if (c.includes("kingdom") || c === "uk") cCode = "GB";
    }

    const payload = {
      pickupValue,
      pickup: pickupLoc,
      dropoffValue,
      dropoff: dropoffLoc,
      returnValue,
      returnLoc,
      startDate,
      startTime,
      endDate,
      endTime,
      tripType,
      roundTripMode: showReturn && !isShuttle ? roundTripMode : undefined,
      serviceMode,
      countryCode: cCode,
      country: clientGeoContext.country,
      distanceUnit: clientGeoContext.distanceUnit,
      passengers: tripType === 'shuttle' ? shuttleVehicles : passengers,
      stops,
      pickupWaitMin,
      dropoffWaitMin,
      multiDayStore,
      selectedAmenities,
      adaRequired,
      adaVehicleCount,
      distance: routeDistance ? Math.round(clientGeoContext.distanceUnit === 'mi' ? routeDistance * 0.000621371 : routeDistance / 1000) : 40,
      duration: routeDuration || 3600,
      routePolyline,
      shuttleVehicles,
      manualShuttleInterval,
      shuttleVehicleOvertimes,
      shuttleVehicleEndings
    };

    // Avoid saving if the only populated data is an auto-detected browser location
    const isOnlyAutoLocation = pickupLoc && (pickupLoc as any).isAutoDetected && pickupValue === pickupLoc.address && !dropoffLoc && !dropoffValue && !startDate && !startTime && stops.length === 0;

    if (!isOnlyAutoLocation && (pickupLoc || dropoffLoc || pickupValue || dropoffValue || startDate || startTime)) {
      localStorage.setItem("saved_itinerary", JSON.stringify(payload));
    }
  }, [pickupValue, dropoffValue, pickupLoc, dropoffLoc, returnValue, returnLoc, startDate, startTime, endDate, endTime, tripType, serviceMode, clientGeoContext, passengers, shuttleVehicles, stops, pickupWaitMin, dropoffWaitMin, multiDayStore, selectedAmenities, adaRequired, adaVehicleCount]);



  // Auto-generate Return Transfer when A->B is set in Transfer Mode
  React.useEffect(() => {
    if (showReturn && !isShuttle && roundTripMode === 'transfer') {
      if (multiDayStore.length <= 1 && pickupLoc && dropoffLoc && activeDayIdx === 0) {
        setMultiDayStore(prev => {
          if (prev.length > 1) return prev; // Already generated

          const t1 = {
            dateStr: startDate,
            startTime: startTime || '09:00',
            endTime: endTime || '',
            pickupValue,
            pickupLoc,
            dropoffValue,
            dropoffLoc,
            stops,
            routePolyline,
            returnValue,
            returnLoc,
            pickupWaitMin,
            dropoffWaitMin
          };

          const t2 = {
            dateStr: startDate,
            startTime: startTime || '09:00',
            endTime: '',
            pickupValue: dropoffValue,
            pickupLoc: dropoffLoc,
            dropoffValue: pickupValue,
            dropoffLoc: pickupLoc,
            stops: [],
            routePolyline: null,
            returnValue,
            returnLoc,
            pickupWaitMin,
            dropoffWaitMin
          };

          return [t1, t2];
        });
      }
    }
  }, [showReturn, isShuttle, roundTripMode, pickupLoc, dropoffLoc, activeDayIdx, multiDayStore.length]);

  // Save changes to active day
  React.useEffect(() => {
    if (isSwappingRef.current) return
    if (multiDayStore.length === 0) return
    setMultiDayStore(prev => {
      const nextStore = [...prev]
      const oldDropoff = nextStore[activeDayIdx].dropoffValue

      nextStore[activeDayIdx] = {
        ...nextStore[activeDayIdx],
        pickupValue, pickupLoc, dropoffValue, dropoffLoc, stops, startTime, endTime, routePolyline, pickupWaitMin, dropoffWaitMin, returnValue, returnLoc, routeDistance: routeDistance || undefined, routeDuration: routeDuration || undefined, routeLegs: routeLegs || undefined
      }

      // Auto-propagate dropoff to the next day's pickup
      if (activeDayIdx + 1 < nextStore.length) {
        const nextDay = nextStore[activeDayIdx + 1]
        // If next day's pickup is empty, or it exactly matches what our dropoff *used* to be, update it
        if (!nextDay.pickupValue || nextDay.pickupValue === oldDropoff) {
          nextStore[activeDayIdx + 1] = {
            ...nextDay,
            pickupValue: dropoffValue,
            pickupLoc: dropoffLoc
          }
        }
      }
      return nextStore
    })
  }, [pickupValue, pickupLoc, dropoffValue, dropoffLoc, stops, startTime, endTime, routePolyline, pickupWaitMin, dropoffWaitMin, returnValue, returnLoc, activeDayIdx, routeDistance, routeDuration, routeLegs])

  React.useEffect(() => {
    if (onMultiDayStoreChange) {
      onMultiDayStoreChange(multiDayStore)
    }
  }, [multiDayStore, onMultiDayStoreChange])

  const handleTabSwitch = (idx: number) => {
    isSwappingRef.current = true
    setActiveDayIdx(idx)
    const target = multiDayStore[idx]
    if (target) {
      setStartTime(target.startTime || '')
      setEndTime(target.endTime || '')
      setPickupValue(target.pickupValue || '')
      setPickupLoc(target.pickupLoc || null)
      setDropoffValue(target.dropoffValue || '')
      setDropoffLoc(target.dropoffLoc || null)
      if (target.pickupWaitMin !== undefined) setPickupWaitMin(target.pickupWaitMin)
      if (target.dropoffWaitMin !== undefined) setDropoffWaitMin(target.dropoffWaitMin)
      if (target.returnLoc !== undefined) {
        setReturnLoc(target.returnLoc)
        setReturnValue(target.returnValue || '')
      }
      setStops(target.stops || [])
      setRoutePolyline(target.routePolyline || null)
      setRouteLegs(target.routeLegs || null)

      // Update map visually for this day
      if (onPickupChange) onPickupChange(target.pickupLoc || null)
      if (onDropoffChange) onDropoffChange(target.dropoffLoc || null)
      if (onReturnChange) onReturnChange(target.returnLoc || null)
      if (onStopsChange) onStopsChange(target.stops || [])
    }
    setTimeout(() => { isSwappingRef.current = false }, 50)
  }

  const getLegEtaInfo = React.useCallback((index: number) => {
    if (!routeLegs) return null;
    let cumDistance = 0;
    let cumDuration = pickupWaitMin * 60; // Include pickup wait time
    for (let i = 0; i <= index; i++) {
      if (!routeLegs[i]) return null;
      cumDistance += routeLegs[i].distance || 0;
      cumDuration += routeLegs[i].duration || 0;
      if (i < index) {
        if (i < stops.length) {
          cumDuration += (stops[i]?.stopDurationMin || 0) * 60;
        } else if (i === stops.length && tripType !== 'one-way') {
          cumDuration += dropoffWaitMin * 60;
        }
      }
    }
    const smartDuration = Math.ceil(cumDuration * 1.15); // Add 15% traffic buffer

    const activeDate = tripType === 'multi-day' ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : startDate;
    let eta = null;
    let departEta = null;
    if (activeDate && startTime) {
      eta = addSecondsToDatetime(activeDate, startTime, smartDuration);

      let waitMin = 0;
      if (index < stops.length) waitMin = stops[index]?.stopDurationMin || 0;
      else if (index === stops.length && tripType !== 'one-way') waitMin = dropoffWaitMin || 0;

      if (waitMin > 0) departEta = addSecondsToDatetime(eta.date, eta.time, waitMin * 60);
      else departEta = eta;
    }

    return {
      distance: cumDistance,
      duration: smartDuration,
      eta,
      departEta
    };
  }, [routeLegs, startDate, startTime, stops, tripType, activeDayIdx, multiDayStore, pickupWaitMin, dropoffWaitMin]);

  const formatEtaStr = React.useCallback((etaObj: { date: string, time: string } | null) => {
    if (!etaObj) return null;
    const activeDate = tripType === 'multi-day' ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : startDate;
    let dayOffset = '';
    if (etaObj.date && activeDate && etaObj.date !== activeDate) {
      const diff = Math.round((new Date(etaObj.date).getTime() - new Date(activeDate).getTime()) / 86400000);
      if (diff > 0) dayOffset = `+${diff}d`;
    }
    return (
      <React.Fragment>
        {formatTimeStr(etaObj.time)}
        {dayOffset && <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, marginLeft: '4px' }}>{dayOffset}</span>}
      </React.Fragment>
    );
  }, [startDate, tripType, activeDayIdx, multiDayStore]);

  const addStop = () => setStops(prev => [...prev, { id: Date.now().toString(), address: '', loc: null, stopDurationMin: 1 }])
  const removeStop = (id: string) => setStops(prev => prev.filter(s => s.id !== id))
  const updateStop = (id: string, updates: any) => setStops(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))

  React.useEffect(() => {
    if (tripType === "roundtrip" && returnLoc === null && dropoffLoc !== null) {
      setReturnLoc(pickupLoc)
      setReturnValue(pickupValue)
    }
  }, [tripType])

  // ── Validation ────────────────────────────────────────────────────────────
  const isFormValid = React.useMemo(() => {
    const hasLocations = !!pickupLoc && !!dropoffLoc;
    if (!hasLocations) return false;
    if (serviceMode === "scheduled") {
      if (!startDate || !startTime) return false;
      if (tripType === 'shuttle') {
        if (!endTime) return false;
      }
      if (tripType === 'roundtrip' && roundTripMode === 'continuous') {
        if (!endDate || !endTime) return false;
      }
    }
    return true;
  }, [pickupLoc, dropoffLoc, serviceMode, startDate, startTime, tripType, endTime, roundTripMode, endDate])

  const missingFields = React.useMemo(() => {
    const missing: string[] = []
    if (!pickupLoc) missing.push("pickup")
    if (!dropoffLoc) missing.push("dropoff")
    if (serviceMode === "scheduled" && !startDate) missing.push("date")
    if (serviceMode === "scheduled" && !startTime) missing.push("start time")
    if (serviceMode === "scheduled" && tripType === 'shuttle' && !endTime) missing.push("finish time")
    if (serviceMode === "scheduled" && tripType === 'roundtrip' && roundTripMode === 'continuous') {
      if (!endDate) missing.push("return date")
      if (!endTime) missing.push("return time")
    }
    return missing
  }, [pickupLoc, dropoffLoc, serviceMode, startDate, startTime, tripType, endTime, roundTripMode, endDate])

  // Sync stops to parent (and to the map) whenever the list changes
  React.useEffect(() => { onStopsChange?.(stops) }, [stops])

  // Reset schedule/stops when trip type changes
  React.useEffect(() => {
    if (tripType !== 'shuttle') {
      // Don't arbitrarily clear stops here if they just changed to roundtrip to remove it
    }
    setShuttleTotalSec(null)
    setAtaDate('')
    setAtaTime('')
    if (tripType === 'one-way') {
      setEndDate('')
      setEndTime('')
    }
  }, [tripType])

  const detectLocation = React.useCallback((isManual = false) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`)
          const data = await res.json()
          const address = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`
          const loc = { address, coordinate: { lat, lon }, isAutoDetected: !isManual }
          setPickupValue(address)
          setPickupLoc(loc)

          if (data.address && (data.address.city || data.address.town || data.address.state) && data.address.country) {
            setClientGeoContext(prev => ({
              ...prev,
              city: data.address.city || data.address.town || data.address.state,
              country: data.address.country,
              countryCode: data.address.country_code ? data.address.country_code.toUpperCase() : prev.countryCode,
              lat, lon
            }))
          }

          if (onPickupChange) onPickupChange(loc)
        } catch {
          const address = `${lat.toFixed(5)}, ${lon.toFixed(5)}`
          const loc = { address, coordinate: { lat, lon } }
          setPickupValue(address)
          setPickupLoc(loc)
          if (onPickupChange) onPickupChange(loc)
        }
      },
      () => { },
      { timeout: 6000 }
    )
  }, [onPickupChange, onUserLocationDetected])

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.get("quote") && !localStorage.getItem("saved_itinerary")) {
        detectLocation();
      }
    }
  }, [])

  // ── Smart ATA Engine (per trip type) ─────────────────────────────────────

  // 1. One Way & Roundtrip: route between pickup→dropoff
  // Fetch per-leg so we can show ETA/distance under each intermediate stop
  React.useEffect(() => {
    const waypoints = [
      pickupLoc?.coordinate,
      ...stops.map(s => s.loc?.coordinate).filter(Boolean),
      dropoffLoc?.coordinate
    ].filter(Boolean)

    if ((tripType === 'roundtrip' || tripType === 'multi-day') && roundTripMode === 'continuous' && waypoints.length >= 2) {
      waypoints.push(pickupLoc?.coordinate)
    }

    if (waypoints.length < 2) {
      setRouteDuration(null)
      setRouteDistance(null)
      setRoutePolyline(null)
      setRouteLegs(null)
      return
    }

    const compute = async () => {
      setRouteLoading(true)
      try {
        if (waypoints.length === 2) {
          // Simple A→B: single fetch
          const result = await GisClient.getRoute(waypoints, 'driving')
          const route = result?.routes?.[0] ?? result?.route ?? result
          const duration = route?.duration ?? 0
          const distance = route?.distance ?? 0
          setRouteDuration(duration)
          setRouteDistance(distance)
          setRoutePolyline(route?.geometry ?? route?.polyline ?? null)
          // Synthesise a single-leg array so getLegEtaInfo always has data
          setRouteLegs([{ distance, duration }])
        } else {
          // Multi-waypoint: fetch each segment individually
          const legPromises: Promise<{ distance: number; duration: number }>[] = []
          for (let i = 0; i < waypoints.length - 1; i++) {
            legPromises.push(
              GisClient.getRoute([waypoints[i], waypoints[i + 1]], 'driving').then(res => {
                const r = res?.routes?.[0] ?? res?.route ?? res
                return { distance: r?.distance ?? 0, duration: r?.duration ?? 0 }
              }).catch(() => ({ distance: 0, duration: 0 }))
            )
          }
          const legs = await Promise.all(legPromises)
          const totalDuration = legs.reduce((s, l) => s + l.duration, 0)
          const totalDistance = legs.reduce((s, l) => s + l.distance, 0)
          setRouteDuration(totalDuration)
          setRouteDistance(totalDistance)
          setRouteLegs(legs)
          // Also fetch full route for the polyline
          try {
            const result = await GisClient.getRoute(waypoints, 'driving')
            const route = result?.routes?.[0] ?? result?.route ?? result
            setRoutePolyline(route?.geometry ?? route?.polyline ?? null)
          } catch { setRoutePolyline(null) }
        }
      } catch {
        setRouteDuration(null)
        setRouteDistance(null)
        setRoutePolyline(null)
        setRouteLegs(null)
      } finally {
        setRouteLoading(false)
      }
    }
    compute()
  }, [pickupLoc, dropoffLoc, stops, tripType, roundTripMode, returnLoc])

  // 2. Shuttle: chain all waypoints (pickup → stops → dropoff) + wait times
  React.useEffect(() => {
    if (tripType !== 'shuttle') return
    const waypoints = [
      pickupLoc?.coordinate,
      ...stops.map(s => s.loc?.coordinate).filter(Boolean),
      dropoffLoc?.coordinate,
    ].filter(Boolean)
    if (waypoints.length < 2) {
      setShuttleTotalSec(null);
      setShuttleReturnSec(null);
      return;
    }

    const compute = async () => {
      setShuttleLoading(true)
      try {
        let cumulativeWps = [];

        // Fetch each leg sequentially (Origin -> Stops -> Destination)
        let totalSec = pickupWaitMin * 60; // Initial wait at origin
        for (let i = 0; i < waypoints.length - 1; i++) {
          const result = await GisClient.getRoute([waypoints[i], waypoints[i + 1]], 'driving')
          const route = result?.routes?.[0] ?? result?.route ?? result
          const legSec: number = route?.duration ?? route?.legs?.[0]?.duration ?? 0
          totalSec += Math.ceil(legSec * 1.15) // 15% traffic buffer per leg

          if (i < stops.length) {
            totalSec += (stops[i]?.stopDurationMin ?? 0) * 60;
            const wpId = stops[i].id;
            const wpName = stops[i].loc?.address?.split(',')[0] || `Stop ${i + 1}`;
            cumulativeWps.push({ id: wpId, name: wpName, cumulativeSec: totalSec });
          }
        }
        setShuttleWaypoints(cumulativeWps);
        setShuttleTotalSec(totalSec)

        // Fetch Return Leg (Destination -> Origin)
        let returnSec = dropoffWaitMin * 60; // Wait at destination before returning
        const retResult = await GisClient.getRoute([waypoints[waypoints.length - 1], waypoints[0]], 'driving')
        const retRoute = retResult?.routes?.[0] ?? retResult?.route ?? retResult
        const retLegSec: number = retRoute?.duration ?? retRoute?.legs?.[0]?.duration ?? 0
        returnSec += Math.ceil(retLegSec * 1.15)
        setShuttleReturnSec(returnSec)

      } catch {
        setShuttleTotalSec(null)
        setShuttleReturnSec(null)
      } finally {
        setShuttleLoading(false)
      }
    }
    compute()
  }, [tripType, pickupLoc, dropoffLoc, stops, pickupWaitMin, dropoffWaitMin])

  // 3. ATA date/time: for one-way = pure auto; for roundtrip = suggested (editable)
  React.useEffect(() => {
    if (tripType === 'shuttle') return // shuttle handles its own timing
    const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate
    if (!activeDate || !startTime || !routeDuration) {
      setAtaDate('')
      setAtaTime('')
      return
    }

    // Calculate total duration including all wait times
    let totalWaitSec = pickupWaitMin * 60;
    for (const stop of stops) {
      totalWaitSec += (stop.stopDurationMin || 0) * 60;
    }

    let outboundDuration = routeDuration;
    if (tripType === 'roundtrip' && roundTripMode === 'continuous' && routeLegs?.length && routeLegs.length > 1) {
      outboundDuration = routeLegs.slice(0, -1).reduce((sum, l) => sum + l.duration, 0);
    }
    const smartDuration = Math.ceil(outboundDuration * 1.15) + totalWaitSec // 15% traffic buffer

    // Physical Baseline: Arrival time at destination is simply the drive duration + waits
    const baseTripSec = smartDuration;
    const ata = addSecondsToDatetime(activeDate, startTime, baseTripSec)

    // We store the ABSOLUTE physical driving minimum as ataDate/ataTime in state
    setAtaDate(ata.date)
    setAtaTime(ata.time)

    if (tripType === 'one-way') {
      // One Way: strictly fixed to destination arrival
      // We do not set endDate to ata.date because it would forcefully
      // override user input when they try to create a Multi-Day trip, and it 
      // falsely creates multi-day trips if the drive arrives past midnight.
      setAtaAutoFixed(false)
    } else if (tripType === 'roundtrip' || tripType === 'multi-day') {
      let returnTripSec = 0;
      if (tripType === 'roundtrip') {
        const returnDuration = (roundTripMode === 'continuous' && routeLegs?.length)
          ? routeLegs[routeLegs.length - 1].duration
          : routeDuration;
        returnTripSec = Math.ceil(returnDuration * 1.15);
      }

      // For roundtrip, minimum trip completion is Arrival + Dropoff Wait Time + Return Trip Sec
      const minReturn = tripType === 'roundtrip'
        ? addSecondsToDatetime(ata.date, ata.time, dropoffWaitMin * 60 + returnTripSec)
        : ata;

      const targetDate = tripType === 'multi-day' ? activeDate : endDate
      if (!targetDate || !endTime || isEndBeforeAta(targetDate, endTime, minReturn.date, minReturn.time)) {
        const isInitial = !endTime;
        if (tripType === 'roundtrip') {
          if (isInitial) {
            // Suggest default buffer (2 hours beyond arrival)
            const suggested = addSecondsToDatetime(ata.date, ata.time, 7200 + returnTripSec);
            // But if wait time > 2 hours, use minReturn
            const finalSuggested = isEndBeforeAta(suggested.date, suggested.time, minReturn.date, minReturn.time) ? minReturn : suggested;
            setEndDate(finalSuggested.date);
            setEndTime(finalSuggested.time);
          } else {
            // They changed wait time, violating bounds -> strict clamp to new minimum
            setEndDate(minReturn.date);
            setEndTime(minReturn.time);
          }
        } else if (tripType === 'multi-day') {
          const suggested = addSecondsToDatetime(ata.date, ata.time, isInitial ? 7200 : 0);
          setEndTime(suggested.time);
        }
        setAtaAutoFixed(true) // Highlights the auto-adjustment warning banner
      } else {
        setAtaAutoFixed(false)
      }
    }
  }, [startDate, startTime, routeDuration, tripType, endDate, endTime, stops, pickupWaitMin, dropoffWaitMin, activeDayIdx, multiDayStore, roundTripMode, routeLegs])

  // 4. Initialize & enforce Shuttle minimum finish time boundary
  React.useEffect(() => {
    if (tripType !== 'shuttle' || !startDate || !startTime || !shuttleTotalSec) return
    const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate

    let targetDate = activeDate;
    if (endTime && endTime < startTime) {
      const nextDay = parseISO(activeDate);
      nextDay.setDate(nextDay.getDate() + 1);
      targetDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
    }

    let fleetMinRequiredSec = shuttleTotalSec;
    if (shuttleVehicles > 1) {
      let oneWayMins = Math.ceil(shuttleTotalSec / 60);
      let returnMins = Math.ceil((shuttleReturnSec || shuttleTotalSec || 0) / 60);
      let roundTripMins = oneWayMins + returnMins;
      let staggerMins = manualShuttleInterval || (shuttleStaggered ? Math.ceil(roundTripMins / shuttleVehicles) : 0);
      fleetMinRequiredSec = shuttleTotalSec + ((shuttleVehicles - 1) * staggerMins * 60);
    }

    const minEnd = addSecondsToDatetime(activeDate, startTime, fleetMinRequiredSec)

    // Unconditionally ensure end bounds can never bypass the absolute shuttle physics minimum
    if (!endDate || !endTime || isEndBeforeAta(targetDate, endTime, minEnd.date, minEnd.time)) {
      setEndDate(minEnd.date)
      setEndTime(minEnd.time)
    } else if (endDate !== targetDate) {
      setEndDate(targetDate)
    }
  }, [tripType, startDate, startTime, endTime, shuttleTotalSec, activeDayIdx, multiDayStore, shuttleVehicles, shuttleStaggered, manualShuttleInterval, shuttleReturnSec])

  const handleEndChange = (newDate: string, newTime: string) => {
    let finalDate = newDate || endDate
    let finalTime = newTime || endTime
    let forced = false

    if ((tripType === 'roundtrip' || tripType === 'multi-day') && ataDate && ataTime) {
      let returnTripSec = 0;
      if (tripType === 'roundtrip') {
        const returnDuration = (roundTripMode === 'continuous' && routeLegs?.length)
          ? routeLegs[routeLegs.length - 1].duration
          : routeDuration;
        returnTripSec = Math.ceil(returnDuration * 1.15);
      }

      // Calculate the absolute minimum return boundary
      let minReturn;
      if (tripType === 'roundtrip') {
        if (stops && stops.length > 0) {
          const lastStop = stops[stops.length - 1];
          const lastStopWaitMin = lastStop.stopDurationMin || 0;
          minReturn = addSecondsToDatetime(ataDate, ataTime, -lastStopWaitMin * 60 + dropoffWaitMin * 60 + returnTripSec);
        } else {
          minReturn = addSecondsToDatetime(ataDate, ataTime, returnTripSec);
        }
      } else {
        minReturn = { date: ataDate || startDate || today, time: ataTime || '00:00' };
      }

      const targetDate = tripType === 'multi-day' ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : finalDate;
      if (isEndBeforeAta(targetDate, finalTime, minReturn.date, minReturn.time)) {
        if (tripType !== 'multi-day') {
          finalDate = minReturn.date;
          finalTime = minReturn.time;
          forced = true;
        } else {
          finalTime = minReturn.time;
          forced = true;
        }
      }

      // Sync wait time if they manually changed the Completion Date & Time
      if (tripType === 'roundtrip' && !forced && ataDate && ataTime) {
        try {
          const [y1, m1, d1] = ataDate.split('-').map(Number);
          const [hr1, min1] = ataTime.split(':').map(Number);
          const start = new Date(y1, m1 - 1, d1, hr1, min1);

          const [y2, m2, d2] = finalDate.split('-').map(Number);
          const [hr2, min2] = finalTime.split(':').map(Number);
          const end = new Date(y2, m2 - 1, d2, hr2, min2);

          let returnTripSec = 0;
          if (tripType === 'roundtrip') {
            const returnDuration = (roundTripMode === 'continuous' && routeLegs?.length)
              ? routeLegs[routeLegs.length - 1].duration
              : routeDuration;
            returnTripSec = Math.ceil(returnDuration * 1.15);
          }

          let diffMin = Math.round((end.getTime() - start.getTime() - (returnTripSec * 1000)) / 60000);
          if (diffMin >= 0) {
            if (stops && stops.length > 0) {
              const lastStop = stops[stops.length - 1];
              const lastStopWaitMin = lastStop.stopDurationMin || 0;
              const newLastStopWait = Math.max(0, diffMin + lastStopWaitMin - dropoffWaitMin);
              setStops(prev => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    stopDurationMin: newLastStopWait
                  };
                }
                return updated;
              });
            } else {
              setDropoffWaitMin(diffMin);
            }
          }
        } catch (e) { }
      }
    } else if (tripType === 'shuttle' && shuttleTotalSec && startDate && startTime) {
      const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate

      // Auto-calculate end date based on end time relative to start time
      if (finalTime < startTime) {
        const nextDay = parseISO(activeDate);
        nextDay.setDate(nextDay.getDate() + 1);
        finalDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
      } else {
        finalDate = activeDate;
      }

      const minEnd = addSecondsToDatetime(activeDate, startTime, shuttleTotalSec)
      if (isEndBeforeAta(finalDate, finalTime, minEnd.date, minEnd.time)) {
        finalDate = minEnd.date;
        finalTime = minEnd.time;
        forced = true;
      }
    }

    setEndDate(finalDate)
    setEndTime(finalTime)
    setAtaAutoFixed(forced)
  }

  const vehicle = getVehicleRecommendation(passengers)
  const _localD = new Date()
  const today = mounted ? `${_localD.getFullYear()}-${String(_localD.getMonth() + 1).padStart(2, '0')}-${String(_localD.getDate()).padStart(2, '0')}` : ''

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <div style={{
        width: activeStep === "search" ? '100%' : '60%',
        flexShrink: 0,
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}>

        {showRestoreDialog && mounted && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '24px', width: '320px', textAlign: 'center' }}>
              <CalendarDays style={{ width: '32px', height: '32px', color: '#2563eb', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 8px' }}>Saved Itinerary Found</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                Would you like to restore the draft you were working on earlier?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleClearRestore} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Start Over</button>
                <button onClick={handleRestoreItinerary} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Restore Draft</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {showCancelDialog && mounted && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '24px', width: '320px', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setShowCancelDialog(false)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X style={{ width: '16px', height: '16px' }} /></button>
              <AlertCircle style={{ width: '32px', height: '32px', color: '#ef4444', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 8px' }}>Cancel Booking?</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                Do you want to start over with a fresh booking or restore your last saved draft?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => {
                  localStorage.removeItem("saved_itinerary")
                  window.location.reload()
                }} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Start Over</button>
                {savedItinerary ? (
                  <button onClick={() => {
                    setShowCancelDialog(false)
                    handleRestoreItinerary()
                  }} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Restore Draft</button>
                ) : (
                  <button onClick={() => setShowCancelDialog(false)} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Continue Editing</button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {activeStep === 'search' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <MapPin style={{ width: '13px', height: '13px', color: '#2563eb', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              {clientGeoContext.city}, {clientGeoContext.country === "United Arab Emirates" ? "AE" : clientGeoContext.country}
            </span>
            <span style={{ color: '#e2e8f0', margin: '0 4px' }}>·</span>
            <button onClick={() => setIsCityModalOpen(true)} style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Change city</button>
          </div>
        )}

        {activeStep === 'quotation' && (
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#f8fafc', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => goToStep('search')} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }} onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateX(-2px)' }} onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateX(0)' }} title="Edit Configuration">
                <ChevronLeft style={{ width: '20px', height: '20px', color: '#0f172a' }} />
              </button>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.4)' }} />
                  PRICING READY
                </p>
                <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#0f172a' }}>
                  {tripType === 'one-way' && 'One Way Journey'}
                  {tripType === 'roundtrip' && `Round Trip ${roundTripMode === 'continuous' ? 'Continuous' : 'Transfer'}`}
                  {tripType === 'shuttle' && 'Shuttle Service'}
                  {tripType === 'multi-day' && 'Multi-Day Itinerary'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <Users style={{ width: '14px', height: '14px', color: '#8b5cf6' }} /> {passengers} Pax
                  </span>
                  {routeDuration !== null && (
                    <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Clock style={{ width: '14px', height: '14px', color: '#f59e0b' }} /> {formatDuration(routeDuration)}
                    </span>
                  )}
                  {routeDistance !== null && (
                    <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Navigation style={{ width: '14px', height: '14px', color: '#ec4899' }} /> {formatDistance(routeDistance, clientGeoContext.distanceUnit)}
                    </span>
                  )}
                  {tripType === 'shuttle' && (
                    <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Car style={{ width: '14px', height: '14px', color: '#10b981' }} /> {shuttleVehicles} Van{shuttleVehicles > 1 ? 's' : ''}
                    </span>
                  )}
                  {tripType !== 'multi-day' && startDate && (
                    <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <CalendarDays style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                      {format(parseISO(startDate), 'MMM d, yyyy')}
                      {startTime ? ` • ${(() => {
                        const fmt = (t?: string) => {
                          if (!t || t === 'TBD') return 'TBD';
                          const [h, m] = t.split(':');
                          if (!h || !m) return t;
                          const hNum = parseInt(h, 10);
                          const ampm = hNum >= 12 ? 'PM' : 'AM';
                          const h12 = hNum % 12 || 12;
                          return `${h12}:${m} ${ampm}`;
                        };
                        const startStr = fmt(startTime);
                        const endStr = endTime ? fmt(endTime) : '';
                        if (endTime && endDate && endDate !== startDate) {
                          return `${startStr} - ${format(parseISO(endDate), 'MMM d')} ${endStr}`;
                        }
                        if (endTime) {
                          return `${startStr} - ${endStr}`;
                        }
                        return startStr;
                      })()}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.04)' }}>
              {/* Route Timeline */}
              {tripType === 'multi-day' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {multiDayStore.map((day, idx) => (
                    <div key={idx} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Day {idx + 1} • {day.dateStr ? format(parseISO(day.dateStr), 'MMM d, yyyy') : 'TBD'}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: '16px' }}>
                          <div style={{ width: '2px', position: 'absolute', left: '4px', top: '16px', bottom: '0', background: '#e2e8f0', zIndex: 0 }} />
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '4px', zIndex: 1 }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pick-up</p>
                            <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{day.pickupValue || 'Not specified'}</p>
                            {day.startTime && (
                              <div style={{ marginTop: '4px', fontSize: '11px', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock style={{ width: '10px', height: '10px', color: '#f59e0b' }} /> {formatTimeStr(day.startTime)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stops for this day */}
                        {day.stops && day.stops.map((stop, sIdx) => (
                          <React.Fragment key={sIdx}>
                            {/* Distance & Duration for Leg to this Stop */}
                            {day.routeLegs && day.routeLegs[sIdx] && (
                              <div style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: '16px', marginLeft: '2px' }}>
                                <div style={{ width: '2px', position: 'absolute', left: '2px', top: '0', bottom: '0', background: '#e2e8f0', zIndex: 0 }} />
                                <div style={{ width: '12px', flexShrink: 0 }} />
                                <div>
                                  <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', gap: '16px', border: '1px dashed #cbd5e1' }}>
                                    <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                      <Navigation style={{ width: '13px', height: '13px', color: '#8b5cf6' }} />
                                      {(() => {
                                        const isMiles = clientGeoContext.distanceUnit === 'mi';
                                        const dist = Math.round(isMiles ? day.routeLegs[sIdx].distance * 0.000621371 : day.routeLegs[sIdx].distance / 1000);
                                        return `${dist} ${isMiles ? 'mi' : 'km'}`;
                                      })()}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                      <Timer style={{ width: '13px', height: '13px', color: '#10b981' }} />
                                      {(() => {
                                        const dur = Math.ceil(day.routeLegs[sIdx].duration * 1.15);
                                        const hrs = Math.floor(dur / 3600);
                                        const mins = Math.floor((dur % 3600) / 60);
                                        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: '16px', marginLeft: '2px' }}>
                              <div style={{ width: '2px', position: 'absolute', left: '2px', top: '0', bottom: '0', background: '#e2e8f0', zIndex: 0 }} />
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', border: '2px solid #8b5cf6', flexShrink: 0, marginTop: '6px', marginLeft: '-1px', zIndex: 1 }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stop {sIdx + 1}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{stop.address}</p>
                                {stop.stopDurationMin > 0 && (
                                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Timer style={{ width: '10px', height: '10px', color: '#f59e0b' }} /> Wait {stop.stopDurationMin}m
                                  </div>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        ))}

                        {/* Distance & Duration to Drop-off */}
                        {day.routeLegs && day.routeLegs[day.stops ? day.stops.length : 0] && (
                          <div style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: '16px', marginLeft: '2px' }}>
                            <div style={{ width: '2px', position: 'absolute', left: '2px', top: '0', bottom: '0', background: '#e2e8f0', zIndex: 0 }} />
                            <div style={{ width: '12px', flexShrink: 0 }} />
                            <div>
                              <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', gap: '16px', border: '1px dashed #cbd5e1' }}>
                                <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <Navigation style={{ width: '13px', height: '13px', color: '#8b5cf6' }} />
                                  {(() => {
                                    const isMiles = clientGeoContext.distanceUnit === 'mi';
                                    const legIdx = day.stops ? day.stops.length : 0;
                                    const dist = Math.round(isMiles ? day.routeLegs[legIdx].distance * 0.000621371 : day.routeLegs[legIdx].distance / 1000);
                                    return `${dist} ${isMiles ? 'mi' : 'km'}`;
                                  })()}
                                </span>
                                <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <Timer style={{ width: '13px', height: '13px', color: '#10b981' }} />
                                  {(() => {
                                    const legIdx = day.stops ? day.stops.length : 0;
                                    const dur = Math.ceil(day.routeLegs[legIdx].duration * 1.15);
                                    const hrs = Math.floor(dur / 3600);
                                    const mins = Math.floor((dur % 3600) / 60);
                                    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Drop-off */}
                        <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', flexShrink: 0, marginTop: '4px', zIndex: 1 }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Drop-off</p>
                            <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{day.dropoffValue || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Pick-up */}
                  <div style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: '24px' }}>
                    <div style={{ width: '2px', position: 'absolute', left: '5px', top: '16px', bottom: '0', background: '#e2e8f0', zIndex: 0 }} />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '4px', zIndex: 1 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Start Location</p>
                      <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{pickupValue || 'Not specified'}</p>
                      {(() => {
                        const activeDate = startDate;
                        const t = startTime || '00:00';
                        const arr = formatTimeStr(t);
                        const depObj = activeDate ? addSecondsToDatetime(activeDate, t, pickupWaitMin * 60) : { time: t, date: activeDate };
                        const dep = formatTimeStr(depObj.time);
                        let dayOffset = null;
                        if (depObj.date && activeDate && depObj.date !== activeDate) {
                          const diff = Math.round((new Date(depObj.date).getTime() - new Date(activeDate).getTime()) / 86400000);
                          if (diff > 0) dayOffset = `+${diff}d`;
                        }
                        return (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                              <Clock style={{ width: '12px', height: '12px', color: '#3b82f6' }} /> Arrival {arr}
                            </span>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                              <Timer style={{ width: '12px', height: '12px', color: '#f59e0b' }} /> Wait {pickupWaitMin}m
                            </span>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                              <Clock style={{ width: '12px', height: '12px', color: '#10b981' }} /> Depart {dep} {dayOffset && <span style={{ color: '#ef4444', fontSize: '10px' }}>{dayOffset}</span>}
                            </span>
                          </div>
                        );
                      })()}
                      {(() => {
                        if (!routeLegs || !routeLegs[0]) return null;
                        const isMiles = clientGeoContext.distanceUnit === 'mi';
                        const dist = routeLegs[0].distance ? Math.round(isMiles ? routeLegs[0].distance * 0.000621371 : routeLegs[0].distance / 1000) : 0;
                        const dur = Math.ceil((routeLegs[0].duration || 0) * 1.15);
                        const hrs = Math.floor(dur / 3600);
                        const mins = Math.floor((dur % 3600) / 60);
                        const durStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                        return (
                          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', gap: '12px', border: '1px dashed #cbd5e1' }}>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <Navigation style={{ width: '12px', height: '12px', color: '#8b5cf6' }} /> {dist} {isMiles ? 'mi' : 'km'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <Timer style={{ width: '12px', height: '12px', color: '#10b981' }} /> {durStr}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Stops */}
                  {stops.map((stop, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: '24px' }}>
                      <div style={{ width: '2px', position: 'absolute', left: '5px', top: '0', bottom: '0', background: '#e2e8f0', zIndex: 0 }} />
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', border: '2px solid #8b5cf6', flexShrink: 0, marginTop: '6px', marginLeft: '2px', zIndex: 1 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stop {i + 1}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{stop.address}</p>
                        {(() => {
                          const legInfo = getLegEtaInfo(i);
                          if (!legInfo || !legInfo.eta) return null;
                          const activeDate = startDate;
                          let dayOffsetArr = null;
                          if (legInfo.eta.date && activeDate && legInfo.eta.date !== activeDate) {
                            const diff = Math.round((new Date(legInfo.eta.date).getTime() - new Date(activeDate).getTime()) / 86400000);
                            if (diff > 0) dayOffsetArr = `+${diff}d`;
                          }
                          let dayOffsetDep = null;
                          if (legInfo.departEta && legInfo.departEta.date && activeDate && legInfo.departEta.date !== activeDate) {
                            const diff = Math.round((new Date(legInfo.departEta.date).getTime() - new Date(activeDate).getTime()) / 86400000);
                            if (diff > 0) dayOffsetDep = `+${diff}d`;
                          }
                          return (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                <Clock style={{ width: '12px', height: '12px', color: '#3b82f6' }} /> Arrival {formatTimeStr(legInfo.eta.time)} {dayOffsetArr && <span style={{ color: '#ef4444', fontSize: '10px' }}>{dayOffsetArr}</span>}
                              </span>
                              <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                <Timer style={{ width: '12px', height: '12px', color: '#f59e0b' }} /> Wait {stop.stopDurationMin || 0}m
                              </span>
                              <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                <Clock style={{ width: '12px', height: '12px', color: '#10b981' }} /> Depart {legInfo.departEta ? formatTimeStr(legInfo.departEta.time) : formatTimeStr(legInfo.eta.time)} {dayOffsetDep && <span style={{ color: '#ef4444', fontSize: '10px' }}>{dayOffsetDep}</span>}
                              </span>
                            </div>
                          );
                        })()}
                        {(() => {
                          if (!routeLegs || !routeLegs[i + 1]) return null;
                          const isMiles = clientGeoContext.distanceUnit === 'mi';
                          const dist = routeLegs[i + 1].distance ? Math.round(isMiles ? routeLegs[i + 1].distance * 0.000621371 : routeLegs[i + 1].distance / 1000) : 0;
                          const dur = Math.ceil((routeLegs[i + 1].duration || 0) * 1.15);
                          const hrs = Math.floor(dur / 3600);
                          const mins = Math.floor((dur % 3600) / 60);
                          const durStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                          return (
                            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', gap: '12px', border: '1px dashed #cbd5e1' }}>
                              <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <Navigation style={{ width: '12px', height: '12px', color: '#8b5cf6' }} /> {dist} {isMiles ? 'mi' : 'km'}
                              </span>
                              <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <Timer style={{ width: '12px', height: '12px', color: '#10b981' }} /> {durStr}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}

                  {/* Drop-off */}
                  <div style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: tripType === 'roundtrip' || tripType === 'shuttle' ? '24px' : '0' }}>
                    <div style={{ width: '2px', position: 'absolute', left: '5px', top: '0', height: tripType === 'roundtrip' || tripType === 'shuttle' ? '100%' : '4px', background: '#e2e8f0', zIndex: 0 }} />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', flexShrink: 0, marginTop: '4px', zIndex: 1 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>End Destination</p>
                      <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{dropoffValue || 'Not specified'}</p>
                      {(() => {
                        const legInfo = getLegEtaInfo(stops.length);
                        if (!legInfo || !legInfo.eta) return null;
                        const activeDate = startDate;
                        let dayOffsetArr = null;
                        if (legInfo.eta.date && activeDate && legInfo.eta.date !== activeDate) {
                          const diff = Math.round((new Date(legInfo.eta.date).getTime() - new Date(activeDate).getTime()) / 86400000);
                          if (diff > 0) dayOffsetArr = `+${diff}d`;
                        }
                        let dayOffsetDep = null;
                        if (legInfo.departEta && legInfo.departEta.date && activeDate && legInfo.departEta.date !== activeDate) {
                          const diff = Math.round((new Date(legInfo.departEta.date).getTime() - new Date(activeDate).getTime()) / 86400000);
                          if (diff > 0) dayOffsetDep = `+${diff}d`;
                        }
                        return (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                              <Clock style={{ width: '12px', height: '12px', color: '#3b82f6' }} /> Arrival {formatTimeStr(legInfo.eta.time)} {dayOffsetArr && <span style={{ color: '#ef4444', fontSize: '10px' }}>{dayOffsetArr}</span>}
                            </span>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                              <Timer style={{ width: '12px', height: '12px', color: '#f59e0b' }} /> Wait {dropoffWaitMin || 0}m
                            </span>
                            <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                              <Clock style={{ width: '12px', height: '12px', color: '#10b981' }} /> Finish {legInfo.departEta ? formatTimeStr(legInfo.departEta.time) : formatTimeStr(legInfo.eta.time)} {dayOffsetDep && <span style={{ color: '#ef4444', fontSize: '10px' }}>{dayOffsetDep}</span>}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>


                  {/* Shuttle Looping Info */}
                  {tripType === 'shuttle' && (
                    <>
                      <div style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: '24px' }}>
                        <div style={{ width: '2px', position: 'absolute', left: '5px', top: '0', bottom: '0', background: '#e2e8f0', zIndex: 0 }} />
                        <div style={{ width: '12px', flexShrink: 0 }} />
                        <div>
                          <div style={{ background: '#f5f3ff', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', gap: '8px', border: '1px dashed #c4b5fd' }}>
                            <span style={{ fontSize: '12px', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <RefreshCcw style={{ width: '13px', height: '13px' }} /> Continuous Shuttle Loop
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '4px', zIndex: 1 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Return To Pick-up</p>
                          <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{pickupValue || 'Not specified'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}


            </div>
          </div>
        )}

        <div style={{ padding: '24px 24px 32px', boxSizing: 'border-box', width: '100%' }}>

          {activeStep === 'search' && (
            <>
              {/* ── Heading ── */}
              {editingQuoteRef ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Editing Quote</span>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.1, margin: 0, color: '#0f172a' }}>{editingQuoteRef}</h1>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => {
                      setEditingQuoteRef(null);
                      setQuotationDbId(null);
                      setQuotePrice(null);
                      setHydratedOption(null);
                      setPickupValue("");
                      setPickupLoc(null);
                      if (onPickupChange) onPickupChange(null);
                      setDropoffValue("");
                      setDropoffLoc(null);
                      if (onDropoffChange) onDropoffChange(null);
                      setReturnValue("");
                      setReturnLoc(null);
                      setStartDate("");
                      setStartTime("");
                      setEndDate("");
                      setEndTime("");
                      setStops([]);
                      setMultiDayStore([]);
                      setRouteDistance(0);
                      setRouteDuration(0);
                      setRoutePolyline(null);
                      setShowReturn(false);
                      setIsShuttle(false);
                      localStorage.removeItem("saved_itinerary");
                      window.history.replaceState(null, '', window.location.pathname);
                    }} style={{ padding: '8px 14px', borderRadius: '10px', background: '#eff6ff', border: '1.5px solid #2563eb', color: '#1d4ed8', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                      Create New
                    </button>
                    <button onClick={() => router.push('/quotations')} style={{ padding: '8px 14px', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                      Cancel Edit
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1.1, margin: '0 0 6px', color: '#0f172a' }}>Where to?</h1>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, margin: '0 0 22px' }}>Book a ride or schedule a charter fleet.</p>
                </>
              )}

              {/* ── ASAP / Scheduled toggle ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '22px', background: '#f1f5f9', borderRadius: '14px', padding: '4px' }}>
                {(['scheduled', 'asap'] as const).map((mode) => (
                  <button key={mode} onClick={() => setServiceMode(mode)} style={{
                    height: '48px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                    background: serviceMode === mode ? 'white' : 'transparent',
                    boxShadow: serviceMode === mode ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontWeight: 700, fontSize: '13px',
                    color: serviceMode === mode ? '#0f172a' : '#64748b', transition: 'all 0.15s',
                  }}>
                    {mode === 'scheduled'
                      ? <><CalendarDays style={{ width: '15px', height: '15px', color: serviceMode === 'scheduled' ? '#2563eb' : '#94a3b8' }} /> Scheduled Planner</>
                      : <><Zap style={{ width: '15px', height: '15px', color: serviceMode === 'asap' ? '#f59e0b' : '#94a3b8' }} /> ASAP / Now</>
                    }
                  </button>
                ))}
              </div>

              {/* ── Trip Type Toggle (One Way / Round Trip / Shuttle) ── */}
              {tripType !== 'multi-day' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {/* One Way */}
                  <button
                    onClick={() => {
                      setShowReturn(false)
                      setIsShuttle(false)
                      setEndDate('')
                      setEndTime('')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                      borderRadius: '20px',
                      background: (!showReturn && !isShuttle) ? '#0f172a' : '#f8fafc',
                      border: `1.5px solid ${(!showReturn && !isShuttle) ? '#0f172a' : '#e2e8f0'}`,
                      color: (!showReturn && !isShuttle) ? 'white' : '#475569',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span>⇀</span> One Way
                  </button>

                  {/* Round Trip */}
                  <button
                    onClick={() => {
                      setShowReturn(true)
                      setIsShuttle(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                      borderRadius: '20px',
                      background: (showReturn && !isShuttle) ? '#0f172a' : '#f8fafc',
                      border: `1.5px solid ${(showReturn && !isShuttle) ? '#0f172a' : '#e2e8f0'}`,
                      color: (showReturn && !isShuttle) ? 'white' : '#475569',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span>⇄</span> Round Trip
                  </button>

                  {/* Shuttle */}
                  <button
                    onClick={() => {
                      setIsShuttle(true)
                      setShowReturn(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                      borderRadius: '20px',
                      background: isShuttle ? '#0f172a' : '#f5f3ff',
                      border: `1.5px solid ${isShuttle ? '#0f172a' : '#ddd6fe'}`,
                      color: isShuttle ? 'white' : '#6d28d9',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span>↺</span> Shuttle
                  </button>

                  {/* Sub-toggles for Round Trip */}
                  {showReturn && !isShuttle && (
                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px', animation: 'fadeInDown 0.2s ease-out' }}>
                      <button
                        onClick={() => setRoundTripMode('continuous')}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: '12px',
                          background: roundTripMode === 'continuous' ? '#eff6ff' : 'white',
                          border: `1.5px solid ${roundTripMode === 'continuous' ? '#3b82f6' : '#e2e8f0'}`,
                          color: roundTripMode === 'continuous' ? '#1e40af' : '#64748b',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '14px' }}>∞</span> Continuous
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 500, color: roundTripMode === 'continuous' ? '#3b82f6' : '#94a3b8' }}>Vehicle stays with you</span>
                      </button>
                      <button
                        onClick={() => setRoundTripMode('transfer')}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: '12px',
                          background: roundTripMode === 'transfer' ? '#eff6ff' : 'white',
                          border: `1.5px solid ${roundTripMode === 'transfer' ? '#3b82f6' : '#e2e8f0'}`,
                          color: roundTripMode === 'transfer' ? '#1e40af' : '#64748b',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '14px' }}>A→B</span> Transfer
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 500, color: roundTripMode === 'transfer' ? '#3b82f6' : '#94a3b8' }}>Point-to-point drops</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px 16px', background: '#eff6ff', borderRadius: '14px', border: '1.5px dashed #bfdbfe', animation: 'fadeIn 0.2s ease' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>Multi-Day Itinerary</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>Multiple dates selected</p>
                  </div>
                  <button
                    onClick={() => {
                      setMultiDayStore([]);
                      setAtaAutoFixed(false);
                      setShowReturn(false);
                      setIsShuttle(false);
                      setEndDate('');
                      setEndTime('');
                    }}
                    style={{
                      background: 'white', border: '1.5px solid #bfdbfe', borderRadius: '8px', padding: '6px 12px',
                      color: '#2563eb', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    Reset Trip Type
                  </button>
                </div>
              )}


              {/* ── Multi-Day Trip Dates Engine ── */}
              {serviceMode === "scheduled" && (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px' }}>

                  <div style={{ display: 'grid', gridTemplateColumns: tripType === 'one-way' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px' }}>
                    {/* ── Redesigned Passenger / Shuttle Vehicles Field ── */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '5px' }}>
                        {tripType === 'shuttle' ? 'Vehicles' : 'Passengers'}
                      </label>
                      <div style={{
                        width: '100%', height: '42px', padding: '0 6px 0 12px', borderRadius: '10px',
                        border: '1.5px solid #cbd5e1', background: 'white', boxSizing: 'border-box',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                          {tripType === 'shuttle' ? (
                            <Car style={{ width: '14px', height: '14px', color: '#64748b', marginRight: '6px', flexShrink: 0 }} />
                          ) : (
                            <Users style={{ width: '14px', height: '14px', color: '#64748b', marginRight: '6px', flexShrink: 0 }} />
                          )}
                          <input className="no-spinner"
                            type="number" min={1}
                            value={tripType === 'shuttle' ? shuttleVehicleInput : passengerInput}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              let val = e.target.value.replace(/^0+/, '');
                              if (tripType === 'shuttle') {
                                setShuttleVehicleInput(val);
                                const v = parseInt(val);
                                if (!isNaN(v) && v > 0) setShuttleVehicles(v);
                              } else {
                                setPassengerInput(val);
                                const v = parseInt(val);
                                if (!isNaN(v) && v > 0) setPassengers(v);
                              }
                            }}
                            onBlur={(e) => {
                              const v = Math.max(1, parseInt(e.target.value) || 1);
                              if (tripType === 'shuttle') {
                                setShuttleVehicles(v); setShuttleVehicleInput(String(v));
                              } else {
                                setPassengers(v); setPassengerInput(String(v));
                              }
                            }}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 700, color: '#0f172a', background: 'transparent' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            onClick={() => {
                              if (tripType === 'shuttle') {
                                const n = Math.max(1, shuttleVehicles - 1); setShuttleVehicles(n); setShuttleVehicleInput(String(n));
                              } else {
                                const n = Math.max(1, passengers - 1); setPassengers(n); setPassengerInput(String(n));
                              }
                            }}
                            style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '16px', lineHeight: 1, fontWeight: 400 }}
                          >−</button>
                          <button
                            onClick={() => {
                              if (tripType === 'shuttle') {
                                const n = Math.min(999, shuttleVehicles + 1); setShuttleVehicles(n); setShuttleVehicleInput(String(n));
                              } else {
                                const n = Math.min(999, passengers + 1); setPassengers(n); setPassengerInput(String(n));
                              }
                            }}
                            style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '16px', lineHeight: 1, fontWeight: 400 }}
                          >+</button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '5px' }}>
                        {tripType === 'one-way' ? 'Start Date' : 'Dates (Select all that apply)'}
                      </label>
                      <Popover>
                        <PopoverTrigger
                          style={{
                            width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px',
                            border: missingFields.includes('date') ? '1.5px solid #ef4444' : `1.5px solid ${startDate ? '#2563eb' : '#cbd5e1'}`, fontSize: '13px',
                            fontWeight: 700, background: 'white', boxSizing: 'border-box', color: startDate ? '#0f172a' : '#94a3b8',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer', outline: 'none',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                          }}
                        >
                          <CalendarDays style={{ width: '16px', height: '16px', marginRight: '8px', color: startDate ? '#2563eb' : '#94a3b8', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tripType === 'one-way'
                              ? (startDate ? format(parseISO(startDate), 'PPP') : <span>Pick a date</span>)
                              : (multiDayStore.length > 0 ? `${multiDayStore.length} day(s) selected` : <span>Pick dates</span>)}
                          </span>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 99999 }}>
                          {tripType === 'one-way' ? (
                            <Calendar
                              mode="single"
                              selected={startDate ? parseISO(startDate) : undefined}
                              onSelect={(date) => {
                                if (!date) return;
                                const newDate = format(date, 'yyyy-MM-dd');
                                setStartDate(newDate)

                                let finalTime = startTime;
                                if (newDate === today) {
                                  const now = new Date();
                                  const hh = now.getHours().toString().padStart(2, '0');
                                  const mm = now.getMinutes().toString().padStart(2, '0');
                                  finalTime = `${hh}:${mm}`;
                                  setStartTime(finalTime);
                                  setPickupArrivalTime(finalTime);
                                }

                                setEndDate(newDate);
                                setMultiDayStore([{
                                  dateStr: newDate,
                                  startTime: finalTime || '09:00',
                                  endTime: endTime || '',
                                  pickupValue,
                                  pickupLoc,
                                  dropoffValue,
                                  dropoffLoc,
                                  stops,
                                  routePolyline
                                }]);
                              }}
                              disabled={(date) => {
                                const todayDate = new Date();
                                todayDate.setHours(0, 0, 0, 0);
                                return date < todayDate;
                              }}
                            />
                          ) : (
                            <Calendar
                              mode="multiple"
                              numberOfMonths={2}
                              selected={multiDayStore.map(d => parseISO(d.dateStr))}
                              onSelect={(dates) => {
                                if (!dates || dates.length === 0) {
                                  setStartDate('');
                                  setEndDate('');
                                  setMultiDayStore([]);
                                  return;
                                }

                                let finalDates = [...dates];
                                // If user had exactly 1 day and picked a 2nd day, auto-fill the range
                                if (multiDayStore.length === 1 && dates.length === 2) {
                                  const d1 = dates[0];
                                  const d2 = dates[1];
                                  const min = d1 < d2 ? d1 : d2;
                                  const max = d1 > d2 ? d1 : d2;
                                  const diffDays = Math.round((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));

                                  finalDates = [];
                                  for (let i = 0; i <= diffDays; i++) {
                                    finalDates.push(new Date(min.getTime() + i * 24 * 60 * 60 * 1000));
                                  }
                                }

                                const sortedDates = [...finalDates].sort((a, b) => a.getTime() - b.getTime());
                                const newStart = format(sortedDates[0], 'yyyy-MM-dd');
                                const newEnd = format(sortedDates[sortedDates.length - 1], 'yyyy-MM-dd');

                                setStartDate(newStart);
                                setEndDate(newEnd);

                                setMultiDayStore(prev => {
                                  return sortedDates.map((d, i) => {
                                    const dateStr = format(d, 'yyyy-MM-dd');
                                    const existing = prev.find(p => p.dateStr === dateStr);
                                    if (existing) return existing;

                                    const prevDay = prev.length > 0 ? prev[prev.length - 1] : null;
                                    return {
                                      dateStr,
                                      startTime: i === 0 ? (startTime || '09:00') : (prevDay?.startTime || '09:00'),
                                      endTime: i === 0 ? (endTime || '') : '',
                                      pickupValue: prevDay?.dropoffValue || '',
                                      pickupLoc: prevDay?.dropoffLoc || null,
                                      dropoffValue: '',
                                      dropoffLoc: null,
                                      stops: [],
                                      routePolyline: null
                                    };
                                  });
                                });
                              }}
                              disabled={(date) => {
                                const todayDate = new Date();
                                todayDate.setHours(0, 0, 0, 0);
                                return date < todayDate;
                              }}
                            />
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                    {tripType === 'one-way' && (
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span>Start Time</span>
                        </label>
                        {(() => {
                          const _now = new Date();
                          const currentLocalTime = mounted ? `${String(_now.getHours()).padStart(2, '0')}:${String(_now.getMinutes()).padStart(2, '0')}` : undefined;
                          const minTimeBound = (startDate === today && today !== '') ? currentLocalTime : undefined;
                          return (
                            <TimePickerSelect
                              prefix="Start"
                              value={startTime}
                              onChange={(val) => {
                                setStartTime(val);
                                setPickupArrivalTime(val);
                              }}
                              minTime={minTimeBound}
                              disabled={!startDate}
                              style={{ width: '100%', height: '42px', padding: '0 10px', borderRadius: '10px', border: missingFields.includes('start time') ? '1.5px solid #ef4444' : `1.5px solid ${startTime ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: startDate ? 'white' : '#f8fafc', boxSizing: 'border-box', color: '#0f172a', cursor: startDate ? 'pointer' : 'not-allowed', opacity: startDate ? 1 : 0.5 }}
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {tripType === 'shuttle' && shuttleTotalSec && shuttleVehicles > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '8px', background: '#f5f3ff', border: '1px solid #ddd6fe', marginTop: '12px' }}>
                      <span style={{ fontSize: '13px' }}>⚡</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#5b21b6' }}>
                        Tightest loop: ~{Math.ceil(shuttleTotalSec / 60)} min between pickups with {shuttleVehicles} vehicle{shuttleVehicles > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Daily Tabs Row */}
                  {(multiDayStore.length > 1 || (showReturn && !isShuttle && startDate)) && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: 0 }}>
                          {showReturn && !isShuttle && roundTripMode === 'transfer' ? `Transfers (${Math.max(1, multiDayStore.length)})` : `Itinerary Days (${Math.max(1, multiDayStore.length)})`}
                        </p>
                        {showReturn && !isShuttle && (
                          <button
                            disabled={!startDate}
                            onClick={() => {
                              setMultiDayStore(prev => {
                                const newStore = [...prev];
                                const currentLast = newStore.length > 0 ? newStore[newStore.length - 1] : { dateStr: startDate };
                                let nextDateStr = startDate;
                                if (currentLast?.dateStr) {
                                  const d = new Date(`${currentLast.dateStr}T12:00:00`);
                                  d.setDate(d.getDate() + 1);
                                  nextDateStr = d.toISOString().split('T')[0];
                                }

                                setTimeout(() => {
                                  if (nextDateStr) setEndDate(nextDateStr);
                                }, 0);

                                if (newStore.length === 0) {
                                  newStore.push({
                                    dateStr: startDate,
                                    startTime: startTime || '09:00',
                                    endTime: endTime || '',
                                    pickupValue,
                                    pickupLoc,
                                    dropoffValue,
                                    dropoffLoc,
                                    stops,
                                    routePolyline
                                  });
                                }
                                const last = newStore[newStore.length - 1];
                                newStore.push({
                                  dateStr: nextDateStr,
                                  startTime: last?.startTime || '09:00',
                                  endTime: '',
                                  pickupValue: returnValue || last?.dropoffValue || '',
                                  pickupLoc: returnLoc || last?.dropoffLoc || null,
                                  dropoffValue: '',
                                  dropoffLoc: null,
                                  stops: [],
                                  routePolyline: null
                                });
                                return newStore;
                              });
                              setTimeout(() => handleTabSwitch(Math.max(1, multiDayStore.length)), 0);
                            }}
                            style={{ fontSize: '11px', fontWeight: 700, color: !startDate ? '#94a3b8' : '#3b82f6', background: !startDate ? '#f1f5f9' : '#eff6ff', borderRadius: '6px', padding: '4px 8px', border: `1px solid ${!startDate ? '#e2e8f0' : '#bfdbfe'}`, cursor: !startDate ? 'not-allowed' : 'pointer' }}
                          >
                            + Add {roundTripMode === 'transfer' ? 'Transfer' : 'Day'}
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        {multiDayStore.length > 3 && (
                          <button onClick={() => scrollTabs('left')} style={{ position: 'absolute', left: '-12px', zIndex: 2, width: '28px', height: '28px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                            <ChevronLeft style={{ width: '16px', height: '16px', marginRight: '2px' }} />
                          </button>
                        )}
                        <div ref={tabsContainerRef} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', paddingLeft: multiDayStore.length > 3 ? '16px' : '0', paddingRight: multiDayStore.length > 3 ? '16px' : '0', scrollbarWidth: 'none', flex: 1, width: '100%', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
                          {showReturn && !isShuttle && multiDayStore.length === 0 ? (
                            <button onClick={() => handleTabSwitch(0)} style={{
                              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap',
                              border: '1.5px solid #2563eb', background: '#eff6ff', color: '#1d4ed8',
                              fontWeight: 800, fontSize: '12px', transition: 'all 0.2s', flexShrink: 0
                            }}>
                              {roundTripMode === 'transfer' ? 'Transfer 1' : 'Day 1'} <span style={{ fontWeight: 500, opacity: 0.8 }}>· {startDate ? format(parseISO(startDate), 'MMM d') : ''}</span>
                            </button>
                          ) : multiDayStore.map((day, idx) => {
                            const isActive = activeDayIdx === idx;
                            const d = day.dateStr ? new Date(day.dateStr) : null;
                            const formattedDate = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                            return (
                              <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <button onClick={() => handleTabSwitch(idx)} style={{
                                  padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap',
                                  border: isActive ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                                  background: isActive ? '#eff6ff' : 'white',
                                  color: isActive ? '#1d4ed8' : '#64748b',
                                  fontWeight: 800, fontSize: '12px', transition: 'all 0.2s', flexShrink: 0,
                                  paddingRight: multiDayStore.length > 1 ? '32px' : '14px'
                                }}>
                                  {showReturn && !isShuttle && roundTripMode === 'transfer' ? `Transfer ${idx + 1}` : `Day ${idx + 1}`} <span style={{ fontWeight: 500, opacity: 0.8 }}>{formattedDate ? `· ${formattedDate}` : ''}</span>
                                </button>
                                {multiDayStore.length > 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMultiDayStore(prev => {
                                        const newStore = [...prev];
                                        newStore.splice(idx, 1);

                                        setTimeout(() => {
                                          if (newStore.length > 0) {
                                            const sortedDates = [...newStore].map(d => d.dateStr ? parseISO(d.dateStr) : new Date(0)).sort((a, b) => a.getTime() - b.getTime());
                                            if (sortedDates[0].getTime() !== 0) {
                                              setStartDate(format(sortedDates[0], 'yyyy-MM-dd'));
                                              setEndDate(format(sortedDates[sortedDates.length - 1], 'yyyy-MM-dd'));
                                            }
                                          } else {
                                            setStartDate('');
                                            setEndDate('');
                                          }
                                        }, 0);

                                        return newStore;
                                      });
                                      if (activeDayIdx >= multiDayStore.length - 1) {
                                        handleTabSwitch(Math.max(0, multiDayStore.length - 2));
                                      } else if (activeDayIdx > idx) {
                                        handleTabSwitch(activeDayIdx - 1);
                                      }
                                    }}
                                    style={{
                                      position: 'absolute',
                                      right: '6px',
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: isActive ? '#dbeafe' : '#f1f5f9',
                                      color: isActive ? '#1e3a8a' : '#94a3b8',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <X style={{ width: '12px', height: '12px' }} />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {multiDayStore.length > 3 && (
                          <button onClick={() => scrollTabs('right')} style={{ position: 'absolute', right: '-12px', zIndex: 2, width: '28px', height: '28px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                            <ChevronRight style={{ width: '16px', height: '16px', marginLeft: '2px' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Start Time Block (Moved to sit under Tabs) ── */}
              {serviceMode === "scheduled" && tripType && tripType !== 'one-way' && startDate && (
                <div style={{ padding: '16px', paddingBottom: '24px', background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span>Date & Time</span>
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>
                          {showReturn && !isShuttle && roundTripMode === 'transfer' ? `Transfer ${activeDayIdx + 1}` : `Day ${activeDayIdx + 1}`} &nbsp;&middot;&nbsp; {multiDayStore[activeDayIdx]?.dateStr ? format(parseISO(multiDayStore[activeDayIdx].dateStr), 'MMM d, yyyy') : 'Pick Date Above'}
                        </span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: ((showReturn && !isShuttle && roundTripMode === 'continuous') || tripType === 'shuttle' || tripType === 'multi-day') ? '1fr 1fr' : '1fr', gap: '8px' }}>

                        {(() => {
                          const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate;
                          const _now = new Date();
                          const currentLocalTime = mounted ? `${String(_now.getHours()).padStart(2, '0')}:${String(_now.getMinutes()).padStart(2, '0')}` : undefined;
                          const minTimeBound = (activeDate === today && today !== '') ? currentLocalTime : undefined;
                          return (
                            <TimePickerSelect
                              prefix="Start"
                              value={startTime}
                              onChange={(val) => setStartTime(val)}
                              minTime={minTimeBound}
                              style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: missingFields.includes('start time') ? '1.5px solid #ef4444' : `1.5px solid ${startTime ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: 'white', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }}
                            />
                          );
                        })()}

                        {((showReturn && !isShuttle && roundTripMode === 'continuous') || tripType === 'shuttle' || tripType === 'multi-day') && (
                          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <TimePickerSelect
                              prefix="End"
                              value={endTime}
                              onChange={(val) => handleEndChange(endDate || startDate, val)}
                              minTime={startTime}
                              style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: missingFields.includes('return time') && !missingFields.includes('finish time') ? '1.5px solid #ef4444' : missingFields.includes('finish time') ? '1.5px solid #ef4444' : `1.5px solid ${ataAutoFixed ? '#f97316' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: 'white', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }}
                            />
                            {((tripType === 'roundtrip' && roundTripMode === 'continuous') || tripType === 'multi-day') && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'absolute', bottom: '-22px', right: '4px', cursor: 'pointer', animation: 'fadeIn 0.2s ease' }}>
                                <input type="checkbox" checked={syncEndTime} onChange={(e) => setSyncEndTime(e.target.checked)} style={{ width: '11px', height: '11px', cursor: 'pointer', accentColor: '#2563eb' }} />
                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>Sync with Route Activity timing</span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ── Location Card (Redesigned) ── */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <style>{`
              @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
              @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
              .loc-card { border: 1.5px solid #e2e8f0; border-radius: 20px; background: white; overflow: visible; width: 100%; box-sizing: border-box; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
              .loc-card:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.07); }
              .loc-row { display: flex; align-items: center; padding: 0 16px; gap: 12px; min-height: 54px; }
              .loc-row-sep { height: 1px; background: #f1f5f9; margin: 0 16px; }
              .loc-dot-pickup { width:12px; height:12px; border-radius:50%; background:#0f172a; flex-shrink:0; box-shadow: 0 0 0 3px rgba(15,23,42,0.08); }
              .loc-dot-stop { width:10px; height:10px; border-radius:3px; background:#7c3aed; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
              .loc-dot-dropoff { width:12px; height:12px; border-radius:3px; background:#2563eb; flex-shrink:0; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
              .loc-dot-return { width:12px; height:12px; border-radius:50%; background:#10b981; flex-shrink:0; }
              .loc-connector { width:2px; height:22px; background:linear-gradient(to bottom, #e2e8f0, #e2e8f0); border-radius:2px; margin-left:21px; flex-shrink:0; }
              .loc-leg-badge { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; color:#64748b; background:#f8fafc; border:1px solid #e2e8f0; border-radius:20px; padding:3px 10px; white-space:nowrap; animation:fadeIn 0.3s ease; }
              .loc-leg-badge.has-eta { color:#2563eb; background:#eff6ff; border-color:#bfdbfe; }
              .abbr-label { font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; cursor:help; border-bottom:1px dashed #cbd5e1; }
              .timing-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
              @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
              .no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
              .no-spinner { -moz-appearance: textfield; }
            `}</style>

                {multiDayStore.length > 1 && (
                  <div style={{ position: 'absolute', top: '-12px', left: '20px', zIndex: 5, background: '#eff6ff', padding: '2px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>
                    EDITING DAY {activeDayIdx + 1}
                  </div>
                )}

                <div className="loc-card">
                  {/* ── PICKUP ROW ── */}
                  <div style={{ padding: '6px 0 0' }}>
                    <div className="loc-row" style={{ borderBottom: missingFields.includes('pickup') ? '1.5px solid #ef4444' : undefined }}>
                      <div className="loc-dot-pickup" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <LocationSearchInput
                          key={`pickup-${activeDayIdx}`}
                          hasError={missingFields.includes('pickup')}
                          placeholder="Start Location"
                          value={pickupValue}
                          showLocateMe
                          onLocateMe={() => detectLocation(true)}
                          bias={{ lat: clientGeoContext.lat, lon: clientGeoContext.lon }}
                          onSelect={(loc) => {
                            setPickupValue(loc.address)
                            setPickupLoc(loc)
                            saveRecentLocation(loc)
                            if (onPickupChange) onPickupChange(loc)
                            if (loc.coordinate) {
                              const parts = loc.address.split(',').map((s: string) => s.trim())
                              const city = loc.name || parts[0]
                              const country = parts.length > 1 ? parts[parts.length - 1] : parts[0]
                              setClientGeoContext((prev: any) => ({ ...prev, city, country, countryCode: loc.countryCode || prev.countryCode, lat: loc.coordinate!.lat, lon: loc.coordinate!.lon }))
                            }
                          }}
                        />
                      </div>

                      {/* Pickup Wait Time Controls inline */}
                      {tripType !== 'shuttle' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '8px' }}>
                          {(() => {
                            const isHr = pickupWaitUnit === 'hr';
                            const displayVal = isHr ? parseFloat((pickupWaitMin / 60).toFixed(2)) : pickupWaitMin;
                            const step = isHr ? 0.5 : 5;
                            const toMin = (v: number) => isHr ? Math.round(v * 60) : Math.round(v);

                            const handleWaitChange = (newMin: number) => {
                              const validNewMin = Math.max(0, newMin);
                              const deltaMin = validNewMin - pickupWaitMin;
                              setPickupWaitMin(validNewMin);

                              const activeDate = tripType === 'multi-day' ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : (endDate || startDate);
                              if (syncEndTime && (tripType === 'roundtrip' || tripType === 'multi-day') && activeDate && endTime) {
                                const shifted = addSecondsToDatetime(activeDate, endTime, deltaMin * 60);
                                if (tripType !== 'multi-day') setEndDate(shifted.date);
                                setEndTime(shifted.time);
                              }
                            };

                            return (
                              <div style={{
                                height: '28px', padding: '0 4px 0 8px', borderRadius: '8px',
                                border: '1px solid #ddd6fe', background: 'white', boxSizing: 'border-box',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '130px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                  <input className="no-spinner" type="number" value={displayVal} min={0} step={step} onChange={(e) => handleWaitChange(toMin(parseFloat(e.target.value) || 0))} style={{ width: '46px', border: 'none', outline: 'none', fontSize: '12px', fontWeight: 800, color: '#0f172a', background: 'transparent', textAlign: 'center' }} />
                                  <Tooltip>
                                    <TooltipTrigger onClick={() => setPickupWaitUnit(isHr ? 'min' : 'hr')} style={{ padding: '0 4px', fontSize: '10px', fontWeight: 800, border: 'none', cursor: 'pointer', background: 'transparent', color: '#7c3aed', display: 'flex', alignItems: 'center', height: '100%' }}>
                                      {isHr ? 'hr' : 'min'}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Switch to hour or minute</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <button onClick={() => handleWaitChange(toMin(displayVal - step))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ede9fe', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b21b6', fontSize: '14px', lineHeight: 1, fontWeight: 500 }}>−</button>
                                  <button onClick={() => handleWaitChange(toMin(displayVal + step))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ede9fe', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b21b6', fontSize: '14px', lineHeight: 1, fontWeight: 500 }}>+</button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Pickup Depart Message */}
                    {pickupLoc && (
                      <div style={{ padding: '4px 14px 8px 36px', animation: 'slideDown 0.2s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {(() => {
                            const activeDateStr = (tripType === 'multi-day' || tripType === 'roundtrip') ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : startDate;
                            const activeTimeStr = (tripType === 'multi-day' || tripType === 'roundtrip') ? (multiDayStore[activeDayIdx]?.startTime || startTime) : startTime;
                            if (activeDateStr && activeTimeStr) {
                              const result = addSecondsToDatetime(activeDateStr, activeTimeStr, pickupWaitMin * 60);
                              let daySuffix = '';
                              if (result.date !== activeDateStr) {
                                const origDate = new Date(`${activeDateStr}T00:00:00`);
                                const newDate = new Date(`${result.date}T00:00:00`);
                                const diffDays = Math.round((newDate.getTime() - origDate.getTime()) / (1000 * 3600 * 24));
                                if (diffDays === 1) daySuffix = ' (Next day)';
                                else if (diffDays > 1) daySuffix = ` (+${diffDays} days)`;
                              }
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>
                                    Arrive {formatTimeStr(activeTimeStr)}
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 600 }}>
                                    Depart at {formatTimeStr(result.time)}{daySuffix}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── CONNECTOR (pickup → first stop or dropoff) ── */}
                  {/* {(pickupLoc && (stops.length > 0 || dropoffLoc)) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', marginLeft: '2px' }}>
                      <div style={{ width: '2px', height: '20px', background: 'linear-gradient(to bottom, #e2e8f0 50%, transparent)', marginLeft: '4px', flexShrink: 0 }} />
                    </div>
                  )} */}


                  <React.Fragment>
                      {/* ── INTERMEDIATE STOPS ── */}
                      {stops.map((stop, idx) => {
                        const legInfo = getLegEtaInfo(idx);
                        return (
                          <div key={stop.id} style={{ animation: 'slideDown 0.2s ease' }}>
                            <div className="loc-row-sep" />
                            <div className="loc-row" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
                              <div className="loc-dot-stop">
                                <span style={{ fontSize: '7px', color: 'white', fontWeight: 900 }}>{idx + 1}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <LocationSearchInput
                                  placeholder={`Stop ${idx + 1}`}
                                  value={stop.address}
                                  bias={{ lat: clientGeoContext.lat, lon: clientGeoContext.lon }}
                                  onSelect={(loc) => { updateStop(stop.id, { address: loc.address, loc }); saveRecentLocation(loc); }}
                                />
                              </div>
                              {/* Wait Time Controls inline */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '4px' }}>
                                {(() => {
                                  const unit = stopDurationUnit[stop.id] || 'min';
                                  const isHr = unit === 'hr';
                                  const displayVal = isHr ? parseFloat((stop.stopDurationMin / 60).toFixed(2)) : stop.stopDurationMin;
                                  const step = isHr ? 0.5 : 1;
                                  const toMin = (v: number) => isHr ? Math.round(v * 60) : Math.round(v);

                                  const handleWaitChange = (newMin: number) => {
                                    const validNewMin = Math.max(0, newMin);
                                    const deltaMin = validNewMin - stop.stopDurationMin;
                                    updateStop(stop.id, { stopDurationMin: validNewMin });

                                    const activeDate = tripType === 'multi-day' ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : (endDate || startDate);
                                    if (syncEndTime && (tripType === 'roundtrip' || tripType === 'multi-day') && activeDate && endTime) {
                                      const shifted = addSecondsToDatetime(activeDate, endTime, deltaMin * 60);
                                      if (tripType !== 'multi-day') setEndDate(shifted.date);
                                      setEndTime(shifted.time);
                                    }
                                  };

                                  return (
                                    <div style={{
                                      height: '28px', padding: '0 4px 0 8px', borderRadius: '8px',
                                      border: '1px solid #ddd6fe', background: 'white', boxSizing: 'border-box',
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '130px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                        <input className="no-spinner" type="number" value={displayVal} min={0} step={step} onChange={(e) => handleWaitChange(toMin(parseFloat(e.target.value) || 0))} style={{ width: '46px', border: 'none', outline: 'none', fontSize: '12px', fontWeight: 800, color: '#0f172a', background: 'transparent', textAlign: 'center' }} />
                                        <Tooltip>
                                          <TooltipTrigger onClick={() => setStopDurationUnit((prev: any) => ({ ...prev, [stop.id]: isHr ? 'min' : 'hr' }))} style={{ padding: '0 4px', fontSize: '10px', fontWeight: 800, border: 'none', cursor: 'pointer', background: 'transparent', color: '#7c3aed', display: 'flex', alignItems: 'center', height: '100%' }}>
                                            {isHr ? 'hr' : 'min'}
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Switch to hour or minute</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={() => handleWaitChange(toMin(displayVal - step))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ede9fe', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b21b6', fontSize: '14px', lineHeight: 1, fontWeight: 500 }}>−</button>
                                        <button onClick={() => handleWaitChange(toMin(displayVal + step))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ede9fe', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b21b6', fontSize: '14px', lineHeight: 1, fontWeight: 500 }}>+</button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              <button onClick={() => removeStop(stop.id)} title="Remove stop" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid #fecaca', background: '#fff5f5', cursor: 'pointer', color: '#ef4444', fontSize: '15px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            </div>

                            {/* Stop leg info */}
                            {stop.loc && legInfo && (
                              <div style={{ padding: '0 14px 8px 36px', animation: 'slideDown 0.2s ease' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                  {legInfo.eta && (
                                    <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>
                                      Arrive {formatEtaStr(legInfo.eta)} · {formatDistance(legInfo.distance, clientGeoContext.distanceUnit)}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 600 }}>
                                    {legInfo.departEta ? <>Depart at {formatEtaStr(legInfo.departEta)}</> : 'Depart time...'}
                                  </span>

                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* ── ADD STOP BUTTON ── */}
                      <div className="loc-row-sep" />
                      {(() => {
                        const canAddStop = stops.length === 0 || stops[stops.length - 1].loc !== null;
                        return (
                          <div className="loc-row" style={{ alignItems: 'center', background: '#fafafa', paddingTop: '8px', paddingBottom: '8px', opacity: canAddStop ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                            <div style={{ width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <button disabled={!canAddStop} onClick={() => addStop()} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px dashed #7c3aed', background: '#f5f3ff', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canAddStop ? 'pointer' : 'not-allowed', flexShrink: 0, padding: 0 }}
                                onMouseEnter={e => { if (canAddStop) (e.currentTarget as HTMLElement).style.background = '#ede9fe'; }}
                                onMouseLeave={e => { if (canAddStop) (e.currentTarget as HTMLElement).style.background = '#f5f3ff'; }}>
                                <Plus size={14} strokeWidth={3} />
                              </button>
                            </div>
                            <div className="loc-input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                              <span onClick={() => canAddStop && addStop()} style={{ color: '#6d28d9', fontSize: '13px', fontWeight: 700, cursor: canAddStop ? 'pointer' : 'not-allowed', padding: '4px' }}>
                                Destination Stop
                              </span>
                          {routeDistance && routeDuration && pickupLoc && dropoffLoc && !(showReturn && !isShuttle && roundTripMode === 'continuous') && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginLeft: 'auto' }}>
                              {formatDistance(routeDistance, clientGeoContext.distanceUnit)} total · {formatDuration(routeDuration)}
                            </span>
                          )}
                        </div>
                      </div>
                      );
                    })()}

                    </React.Fragment>
                  {/* ── DROPOFF ROW ── */}
                  <div className="loc-row-sep" />
                  <div className="loc-row" style={{ paddingTop: '6px', paddingBottom: '6px', borderBottom: missingFields.includes('dropoff') ? '1.5px solid #ef4444' : undefined, alignItems: 'center' }}>
                    <div className="loc-dot-dropoff" style={{ borderRadius: '3px', background: '#2563eb' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <LocationSearchInput
                        key={`dropoff-${activeDayIdx}`}
                        hasError={missingFields.includes('dropoff')}
                        placeholder="End Location"
                        value={dropoffValue}
                        bias={{ lat: clientGeoContext.lat, lon: clientGeoContext.lon }}
                        onSelect={(loc) => {
                          setDropoffValue(loc.address);
                          setDropoffLoc(loc);
                          saveRecentLocation(loc);
                          if (onDropoffChange) onDropoffChange(loc);
                        }}
                      />
                    </div>

                    {/* Destination Wait Time Controls inline */}
                    {(tripType !== 'one-way') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '4px' }}>
                        {(() => {
                          const isHr = dropoffWaitUnit === 'hr';
                          const displayVal = isHr ? parseFloat((dropoffWaitMin / 60).toFixed(2)) : dropoffWaitMin;
                          const step = isHr ? 0.5 : 5;
                          const toMin = (v: number) => isHr ? Math.round(v * 60) : Math.round(v);

                          const handleWaitChange = (newMin: number) => {
                            const validNewMin = Math.max(0, newMin);
                            const deltaMin = validNewMin - dropoffWaitMin;
                            setDropoffWaitMin(validNewMin);

                            const activeDate = tripType === 'multi-day' ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : (endDate || startDate);
                            if (syncEndTime && (tripType === 'roundtrip' || tripType === 'multi-day') && activeDate && endTime) {
                              const shifted = addSecondsToDatetime(activeDate, endTime, deltaMin * 60);
                              if (tripType !== 'multi-day') setEndDate(shifted.date);
                              setEndTime(shifted.time);
                            }
                          };

                          return (
                            <div style={{
                              height: '28px', padding: '0 4px 0 8px', borderRadius: '8px',
                              border: '1px solid #ddd6fe', background: 'white', boxSizing: 'border-box',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '130px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <input className="no-spinner" type="number" value={displayVal} min={0} step={step} onChange={(e) => handleWaitChange(toMin(parseFloat(e.target.value) || 0))} style={{ width: '46px', border: 'none', outline: 'none', fontSize: '12px', fontWeight: 800, color: '#0f172a', background: 'transparent', textAlign: 'center' }} />
                                <Tooltip>
                                  <TooltipTrigger onClick={() => setDropoffWaitUnit(isHr ? 'min' : 'hr')} style={{ padding: '0 4px', fontSize: '10px', fontWeight: 800, border: 'none', cursor: 'pointer', background: 'transparent', color: '#7c3aed', display: 'flex', alignItems: 'center', height: '100%' }}>
                                    {isHr ? 'hr' : 'min'}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Switch to hour or minute</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <button onClick={() => handleWaitChange(toMin(displayVal - step))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ede9fe', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b21b6', fontSize: '14px', lineHeight: 1, fontWeight: 500 }}>−</button>
                                <button onClick={() => handleWaitChange(toMin(displayVal + step))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ede9fe', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5b21b6', fontSize: '14px', lineHeight: 1, fontWeight: 500 }}>+</button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Dropoff Arrival / Depart Message */}
                  {dropoffLoc && (() => {
                    const legInfo = getLegEtaInfo(stops.length);
                    if (!legInfo) return null;
                    const hasWait = tripType !== 'one-way' && dropoffWaitMin > 0;
                    return (
                      <div style={{ padding: '0 14px 8px 36px', animation: 'slideDown 0.2s ease' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                          {legInfo.eta && (
                            <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Flag size={12} color="#16a34a" /> Arrive {formatEtaStr(legInfo.eta)}
                            </span>
                          )}
                          {(endTime || legInfo.eta) && (
                            <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 600 }}>
                              Finish at {endTime ? formatEtaStr({ date: endDate || startDate, time: endTime }) : formatEtaStr(legInfo.eta)}
                            </span>
                          )}

                        </div>
                      </div>
                    );
                  })()}




                  {/* ── DROPOFF ENDS HERE ── */}
                </div>

                {/* ── Pin drag indicators ── */}
                {pickupPinMoved && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 4px', marginTop: '6px', animation: 'fadeIn 0.2s ease' }}>
                    <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📍</span> Pickup pin adjusted
                    </span>
                    <button onClick={() => { onReinstatePickup?.(); setPickupValue(''); setPickupLoc(null); }} style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>↩ Reinstate</button>
                  </div>
                )}
                {dropoffPinMoved && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 4px', marginTop: '4px', animation: 'fadeIn 0.2s ease' }}>
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📍</span> Dropoff pin adjusted
                    </span>
                    <button onClick={() => { onReinstateDropoff?.(); setDropoffValue(''); setDropoffLoc(null); }} style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>↩ Reinstate</button>
                  </div>
                )}
              </div>






              {/* ── Smart Schedule Block (only Scheduled mode) ── */}
              {serviceMode === "scheduled" && tripType && tripType !== 'one-way' && (
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '22px', border: '1.5px solid #e2e8f0' }}>

                  {/* ── Header ── */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: 0 }}>Active Day Timeline</p>
                    {(pickupLoc && dropoffLoc) || multiDayStore.length > 1 ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#0f172a', color: 'white', animation: 'fadeIn 0.3s ease' }}>
                        {tripType === 'roundtrip' ? '⇄ Smart Roundtrip' : tripType === 'multi-day' ? '🗺️ Multi-Day Tour' : '↺ Shuttle Service'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1.5s infinite' }} />
                        Detecting routing...
                      </span>
                    )}
                  </div>
                  {/* Step 1 completion note */}
                  {(!startDate || !startTime) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', marginBottom: '10px', animation: 'fadeIn 0.2s ease' }}>
                      <span style={{ fontSize: '13px' }}>💡</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                        {!startDate ? "Select a start date to unlock time scheduling" : "Select a start time to unlock route planning"}
                      </span>
                    </div>
                  )}
                  {/* ── Step 2 onwards: only show when start date+time are filled ── */}
                  {startDate && startTime && (
                    <>

                      {/* ── ROUNDTRIP: ATA bar + editable return date/time ── */}
                      {tripType === 'roundtrip' && roundTripMode !== 'transfer' && (
                        <div style={{ animation: 'fadeIn 0.2s ease', display: 'none' }}>


                          {/* Return fields summary / editor */}
                          {!(dropoffLoc || stops.some(s => !!s.loc)) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #e2e8f0', background: '#f8fafc' }}>
                              <span style={{ fontSize: '13px' }}>📍</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Enter dropoff location — return date/time will be calculated automatically</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'white', borderRadius: '12px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Clock style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Completion Date &amp; Time</h4>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {(() => {
                                  let returnTripSec = 0;
                                  if (tripType === 'roundtrip') {
                                    const returnDuration = (roundTripMode === 'continuous' && routeLegs?.length)
                                      ? routeLegs[routeLegs.length - 1].duration
                                      : routeDuration;
                                    returnTripSec = Math.ceil(returnDuration * 1.15);
                                  }

                                  let minReturn;
                                  if (tripType === 'roundtrip' && ataDate && ataTime) {
                                    if (stops && stops.length > 0) {
                                      const lastStop = stops[stops.length - 1];
                                      const lastStopWaitMin = lastStop.stopDurationMin || 0;
                                      minReturn = addSecondsToDatetime(ataDate, ataTime, -lastStopWaitMin * 60 + dropoffWaitMin * 60 + returnTripSec);
                                    } else {
                                      minReturn = addSecondsToDatetime(ataDate, ataTime, returnTripSec);
                                    }
                                  } else {
                                    minReturn = { date: ataDate || startDate || today, time: ataTime || '00:00' };
                                  }

                                  return (
                                    <>
                                      <Popover>
                                        <PopoverTrigger style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: missingFields.includes('return date') ? '1.5px solid #ef4444' : '1px solid #e2e8f0', cursor: 'pointer', outline: 'none', width: '100%', textAlign: 'left', transition: 'all 0.2s ease' }}>
                                          <CalendarDays style={{ width: '16px', height: '16px', color: '#64748b', flexShrink: 0 }} />
                                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Date</span>
                                            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDateStr(endDate || minReturn.date, today)}</span>
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" style={{ zIndex: 99999 }}>
                                          <Calendar
                                            mode="single"
                                            selected={endDate ? parseISO(endDate) : undefined}
                                            onSelect={(date) => {
                                              if (!date) return;
                                              handleEndChange(format(date, 'yyyy-MM-dd'), endTime);
                                            }}
                                            disabled={(date) => {
                                              const minDateObj = parseISO(minReturn.date);
                                              minDateObj.setHours(0, 0, 0, 0);
                                              return date < minDateObj;
                                            }}
                                          />
                                        </PopoverContent>
                                      </Popover>

                                      <TimePickerSelect value={endTime}
                                        prefix="End"
                                        onChange={(val) => handleEndChange(endDate, val)}
                                        minTime={endDate === minReturn.date ? minReturn.time : undefined}
                                        style={{ width: '100%', height: '100%', minHeight: '44px', padding: '0 12px', borderRadius: '10px', border: missingFields.includes('return time') ? '1.5px solid #ef4444' : `1px solid ${ataAutoFixed ? '#f97316' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 700, background: '#f8fafc', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }}
                                      />
                                    </>
                                  );
                                })()}
                              </div>

                              {ataAutoFixed && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', animation: 'fadeIn 0.2s ease' }}>
                                  <AlertTriangle style={{ width: '12px', height: '12px', color: '#ea580c', flexShrink: 0 }} />
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#9a3412' }}>Return time auto-adjusted based on driving duration and wait time</span>
                                </div>
                              )}

                              {(() => {
                                if (!endDate || !endTime || !routeDuration) return null;
                                const finalArrival = { date: endDate, time: endTime };
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', animation: 'fadeIn 0.2s ease', width: '100%', marginTop: '4px' }}>
                                    <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16a34a', flexShrink: 0 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                      <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Trip Completion</span>
                                      <span style={{ fontSize: '13px', color: '#14532d', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {formatDateStr(finalArrival.date, today)} at {formatTimeStr(finalArrival.time)}
                                        {getDayDifferenceStr(multiDayStore[activeDayIdx]?.dateStr || startDate, finalArrival.date) && (
                                          <span style={{ fontSize: '11px', color: '#16a34a', marginLeft: '6px' }}>{getDayDifferenceStr(multiDayStore[activeDayIdx]?.dateStr || startDate, finalArrival.date)}</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── SHUTTLE: explicit finish time + frequency calculation ── */}
                      {tripType === 'shuttle' && (
                        <div style={{ animation: 'fadeIn 0.2s ease' }}>


                          {/* Total route time — only visible after at least pickup + dropoff entered */}
                          {!pickupLoc || !dropoffLoc ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #e2e8f0', background: '#f8fafc' }}>
                              <span style={{ fontSize: '13px' }}>📍</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Add pickup &amp; dropoff locations — shuttle timing will unlock</span>
                            </div>
                          ) : (
                            <div>
                              {/* Display shuttle wait frequency and fleet dispatch timeline */}
                              {shuttleTotalSec && shuttleVehicles ? (() => {
                                const actDate = multiDayStore[activeDayIdx]?.dateStr || startDate;
                                let simDurMins = 0;
                                let oneWayMins = Math.ceil(shuttleTotalSec / 60);
                                let returnMins = Math.ceil((shuttleReturnSec || shuttleTotalSec || 0) / 60);
                                let roundTripMins = oneWayMins + returnMins;
                                let staggerMins = manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(roundTripMins / shuttleVehicles) : 0);

                                if (actDate && startTime && endDate && endTime) {
                                  const [y1, m1, d1] = actDate.split('-').map(Number);
                                  const [hr1, min1] = startTime.split(':').map(Number);
                                  const sDt = new Date(y1, m1 - 1, d1, hr1, min1);

                                  const [y2, m2, d2] = endDate.split('-').map(Number);
                                  const [hr2, min2] = endTime.split(':').map(Number);
                                  const eDt = new Date(y2, m2 - 1, d2, hr2, min2);
                                  const durSec = Math.max(0, (eDt.getTime() - sDt.getTime()) / 1000);
                                  simDurMins = Math.floor(durSec / 60);
                                }

                                let totalCompletedLegs = 0;
                                let maxLateReturnMins = 0;
                                let simulatedVehicleFinishMins = [];
                                let simulatedVehicleLegs = [];

                                // Simulate trips for each vehicle
                                for (let v = 0; v < shuttleVehicles; v++) {
                                  let vTime = v * staggerMins;
                                  let vLegs = 0;
                                  const endingId = shuttleVehicleEndings[v] || 'origin';

                                  let stopCumulativeMins = 0;
                                  if (endingId !== 'origin' && endingId !== 'destination') {
                                    const wp = shuttleWaypoints.find(w => w.id === endingId);
                                    if (wp) stopCumulativeMins = Math.ceil(wp.cumulativeSec / 60);
                                  }

                                  while (vTime < simDurMins) {
                                    const isReturnLeg = (vLegs % 2) === 1;
                                    const legDuration = isReturnLeg ? returnMins : oneWayMins;
                                    const isLateReturnAllowed = shuttleVehicleOvertimes[v] ?? true;

                                    if (!isLateReturnAllowed) {
                                      if (endingId === 'origin' && !isReturnLeg) {
                                        if (vTime + oneWayMins + returnMins > simDurMins) break;
                                      } else if (endingId === 'destination' && isReturnLeg) {
                                        if (vTime + returnMins + oneWayMins > simDurMins) break;
                                      } else if (endingId !== 'origin' && endingId !== 'destination') {
                                        if (!isReturnLeg) {
                                          if (vTime + oneWayMins + returnMins + stopCumulativeMins > simDurMins) {
                                            if (vTime + stopCumulativeMins <= simDurMins) {
                                              vTime += stopCumulativeMins;
                                            }
                                            break;
                                          }
                                        } else {
                                          if (vTime + returnMins + stopCumulativeMins > simDurMins) break;
                                        }
                                      }
                                    }

                                    if (endingId !== 'origin' && endingId !== 'destination' && !isReturnLeg && vTime + stopCumulativeMins > simDurMins) {
                                      if (isLateReturnAllowed) {
                                        vTime += stopCumulativeMins;
                                      }
                                      break;
                                    }

                                    if (vTime + legDuration <= simDurMins) {
                                      vTime += legDuration;
                                      vLegs++;
                                    } else {
                                      if (endingId === 'origin') {
                                        if (isReturnLeg) {
                                          vTime += legDuration;
                                          vLegs++;
                                        } else if (isLateReturnAllowed) {
                                          vTime += legDuration + returnMins;
                                          vLegs += 2;
                                        }
                                      } else if (endingId === 'destination') {
                                        if (!isReturnLeg) {
                                          vTime += legDuration;
                                          vLegs++;
                                        } else if (isLateReturnAllowed) {
                                          vTime += legDuration + oneWayMins;
                                          vLegs += 2;
                                        }
                                      } else {
                                        if (isReturnLeg && isLateReturnAllowed) {
                                          vTime += legDuration + stopCumulativeMins;
                                          vLegs += 1;
                                        }
                                      }
                                      break;
                                    }
                                  }
                                  maxLateReturnMins = Math.max(maxLateReturnMins, Math.max(0, vTime - simDurMins));
                                  simulatedVehicleFinishMins.push(vTime);
                                  simulatedVehicleLegs.push(vLegs || (simDurMins > 0 ? 1 : 0));
                                  totalCompletedLegs += vLegs;
                                }

                                let tripsPerBus = Math.floor(totalCompletedLegs / shuttleVehicles);
                                if (tripsPerBus === 0 && simDurMins > 0) tripsPerBus = 1;

                                return (
                                  <>
                                    <div style={{ marginBottom: '10px', transition: 'all 0.3s ease' }}>
                                      <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                        {/* Shuttle Finish Time moved to top */}
                                        {maxLateReturnMins > 0 && (
                                          <div style={{ marginTop: '8px', padding: '8px 10px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5', animation: 'fadeIn 0.3s ease' }}>
                                            <p style={{ margin: 0, fontSize: '11px', color: '#9a3412', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.4' }}>
                                              <AlertCircle style={{ width: '14px', height: '14px', marginTop: '1px', flexShrink: 0, color: '#f97316' }} />
                                              <span>
                                                <strong>Notice:</strong> One or more buses will run past the scheduled finish time to complete their trips. To reduce this, you can disable <strong>Late Return</strong> or adjust their ending locations.
                                              </span>
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', animation: 'fadeIn 0.2s ease' }}>
                                      {/* ── CARD 1: Vehicle Dispatch ── */}
                                      <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span>🚌</span> {shuttleVehicles > 1 ? 'Vehicles Dispatch' : 'Vehicle Dispatch'}
                                        </h4>

                                        {shuttleVehicles > 1 && (
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                  Fleet Dispatch Mode
                                                  <Info className="w-3 h-3 text-slate-400" />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Choose how vehicles should start their trips</p>
                                              </TooltipContent>
                                            </Tooltip>
                                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <button
                                                    onClick={() => setShuttleStaggered(true)}
                                                    style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: 'none', background: shuttleStaggered ? 'white' : 'transparent', color: shuttleStaggered ? '#7c3aed' : '#64748b', cursor: 'pointer', boxShadow: shuttleStaggered ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Interval Start (One by one)
                                                    {shuttleStaggered && <Info className="w-3 h-3" />}
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Vehicles will start one by one to reduce wait time for passengers</p>
                                                </TooltipContent>
                                              </Tooltip>
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <button
                                                    onClick={() => setShuttleStaggered(false)}
                                                    style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: 'none', background: !shuttleStaggered ? 'white' : 'transparent', color: !shuttleStaggered ? '#7c3aed' : '#64748b', cursor: 'pointer', boxShadow: !shuttleStaggered ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    Start Together (All at once)
                                                    {!shuttleStaggered && <Info className="w-3 h-3" />}
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>All vehicles will start at the exact same time</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </div>
                                          </div>
                                        )}

                                        {/* Manual Override Input */}
                                        {shuttleVehicles > 1 && (
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                    Pickup Interval Settings
                                                    <Info className="w-3 h-3 text-slate-400" />
                                                  </p>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>How many minutes between each vehicle arriving at the pickup location</p>
                                                </TooltipContent>
                                              </Tooltip>
                                              <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>{manualShuttleInterval ? "Using your manual override" : "Using automated AI estimated ETA"}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <input className="no-spinner"
                                                type="number"
                                                min={1}
                                                value={manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(shuttleTotalSec / 60 / shuttleVehicles) : Math.ceil(shuttleTotalSec / 60))}
                                                onChange={(e) => setManualShuttleInterval(Number(e.target.value) || null)}
                                                style={{ width: '50px', height: '30px', textAlign: 'center', borderRadius: '6px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                                              />
                                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>min</span>
                                              {manualShuttleInterval && (
                                                <button
                                                  onClick={() => setManualShuttleInterval(null)}
                                                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '9px', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: '4px 6px', marginLeft: '4px' }}
                                                >
                                                  Reset to AI
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {Array.from({ length: shuttleVehicles }).map((_, i) => {
                                            const currentEndingId = shuttleVehicleEndings[i] || 'origin';
                                            const vFinishObj = addSecondsToDatetime(startDate || today, startTime, simulatedVehicleFinishMins[i] * 60);
                                            const vFinishTime = vFinishObj.time;
                                            const vFinishDayDiff = getDayDifferenceStr(startDate || today, vFinishObj.date);
                                            return (
                                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'white', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ede9fe', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>{i + 1}</span>
                                                  <span style={{ fontWeight: 600, color: '#4c1d95' }}>Vehicle</span>
                                                </div>

                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                  <Tooltip>
                                                    <TooltipTrigger>
                                                      <select
                                                        value={currentEndingId}
                                                        onChange={(e) => setShuttleVehicleEndings(prev => ({ ...prev, [i]: e.target.value }))}
                                                        style={{ fontSize: '10px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', outline: 'none', cursor: 'pointer', maxWidth: '140px' }}
                                                      >
                                                        <option value="origin">End at Origin Start</option>
                                                        {shuttleWaypoints.filter(wp => wp.id !== 'origin' && wp.id !== 'destination').map(wp => (
                                                          <option key={wp.id} value={wp.id}>End at {wp.name}</option>
                                                        ))}
                                                        <option value="destination">End at Destination</option>
                                                      </select>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>Where the bus should be when its shift time is over</p>
                                                    </TooltipContent>
                                                  </Tooltip>

                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Tooltip>
                                                      <TooltipTrigger>
                                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'help' }}>
                                                          Late Return
                                                          <Info className="w-3 h-3 text-slate-400" />
                                                        </span>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <p>Permit the bus to finish its last trip even if it goes past the scheduled finish time. If No, the bus finishes earlier than the scheduled time to avoid overtime.</p>
                                                      </TooltipContent>
                                                    </Tooltip>

                                                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '4px', padding: '2px', border: '1px solid #e2e8f0' }}>
                                                      <button
                                                        onClick={() => setShuttleVehicleOvertimes(prev => ({ ...prev, [i]: true }))}
                                                        style={{
                                                          padding: '2px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '3px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                                                          background: (shuttleVehicleOvertimes[i] ?? true) ? '#fff' : 'transparent',
                                                          color: (shuttleVehicleOvertimes[i] ?? true) ? '#7c3aed' : '#94a3b8',
                                                          boxShadow: (shuttleVehicleOvertimes[i] ?? true) ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                                        }}>
                                                        Yes
                                                      </button>
                                                      <button
                                                        onClick={() => setShuttleVehicleOvertimes(prev => ({ ...prev, [i]: false }))}
                                                        style={{
                                                          padding: '2px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '3px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                                                          background: !(shuttleVehicleOvertimes[i] ?? true) ? '#fff' : 'transparent',
                                                          color: !(shuttleVehicleOvertimes[i] ?? true) ? '#ea580c' : '#94a3b8',
                                                          boxShadow: !(shuttleVehicleOvertimes[i] ?? true) ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                                        }}>
                                                        No
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>

                                                <span style={{ fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>Est. Finish: {formatTimeStr(vFinishTime)} {vFinishDayDiff && <span style={{ fontSize: '9px', color: '#8b5cf6' }}>{vFinishDayDiff}</span>}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* ── CARD 2: Vehicle Activity ── */}
                                      <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span>⏱️</span> {shuttleVehicles > 1 ? 'Vehicles Activity' : 'Vehicle Activity'}
                                        </h4>

                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                          <Clock style={{ width: '16px', height: '16px', color: '#7c3aed', flexShrink: 0 }} />
                                          <div style={{ flex: 1 }}>
                                            {(() => {
                                              const oneWayMins = Math.ceil((shuttleTotalSec || 0) / 60);
                                              const returnMins = Math.ceil((shuttleReturnSec || shuttleTotalSec || 0) / 60);
                                              const roundTripMins = oneWayMins + returnMins;
                                              const staggerMins = manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(roundTripMins / shuttleVehicles) : roundTripMins);

                                              return (
                                                <>
                                                  <Tooltip>
                                                    <TooltipTrigger>
                                                      <p style={{ fontSize: '12px', margin: 0, fontWeight: 700, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                        {shuttleVehicles > 1 ? (
                                                          <>
                                                            Pickup Frequency: ~<span style={{ fontWeight: 900 }}>{staggerMins} min</span> between each bus
                                                          </>
                                                        ) : (
                                                          <>
                                                            Full Loop Duration: ~<span style={{ fontWeight: 900 }}>{roundTripMins} min</span> (Start to End and back)
                                                          </>
                                                        )}
                                                        <Info className="w-3 h-3 text-violet-400" />
                                                      </p>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>{shuttleVehicles > 1 ? 'Expected waiting time between buses arriving at the pickup location' : 'Expected time for the vehicle to complete a full round trip'}</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                  {shuttleVehicles > 1 && (
                                                    <p style={{ fontSize: '10px', margin: '2px 0 0', color: '#7c3aed' }}>
                                                      {shuttleStaggered
                                                        ? `(${roundTripMins} min for full loop ÷ ${shuttleVehicles} vehicles starting one by one)`
                                                        : `(${roundTripMins} min for full loop with ${shuttleVehicles} vehicles starting together)`
                                                      }
                                                    </p>
                                                  )}
                                                </>
                                              );
                                            })()}

                                            {/* Calculated Total Trips */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                              {(() => {
                                                const legsMap = new Map<number, number[]>();
                                                simulatedVehicleLegs.forEach((legs, idx) => {
                                                  if (!legsMap.has(legs)) legsMap.set(legs, []);
                                                  legsMap.get(legs)!.push(idx + 1);
                                                });

                                                if (legsMap.size === 1) {
                                                  const legs = Array.from(legsMap.keys())[0];
                                                  return (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f3e8ff', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#5b21b6' }}>Total Estimated Trips:</span>
                                                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#7c3aed' }}>{legs} one-way trips{shuttleVehicles === 1 ? '' : ' per bus'}</span>
                                                    </div>
                                                  );
                                                }

                                                return Array.from(legsMap.entries()).map(([legs, vehicles]) => (
                                                  <div key={legs} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f3e8ff', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#5b21b6' }}>
                                                      Vehicle{vehicles.length > 1 ? 's' : ''} {vehicles.join(', ')}:
                                                    </span>
                                                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#7c3aed' }}>{legs} one-way trips</span>
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>



                                    </div>
                                  </>
                                );
                              })() : (
                                <>
                                  <div style={{ marginBottom: '10px', transition: 'all 0.3s ease' }}>
                                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                      {/* Shuttle Finish Time moved to top */}
                                    </div>
                                  </div>
                                  {shuttleLoading && (
                                    <div style={{ height: '40px', borderRadius: '10px', border: '1.5px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', marginTop: '10px' }}>
                                      <Clock style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>Calculating all route legs…</span>
                                    </div>
                                  )}
                                </>
                              )}

                              {ataAutoFixed && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                                  <AlertTriangle style={{ width: '12px', height: '12px', color: '#ea580c', flexShrink: 0 }} />
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#9a3412' }}>Finish time auto-adjusted to ensure at least 1 full loop.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}



              {/* ── Advanced Preferences Toggle ── */}
              {(pickupLoc && dropoffLoc) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.3s ease', marginBottom: '16px' }}>
                  <button
                    onClick={() => setShowAmenities(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9',
                      padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', border: 'none',
                      color: '#475569', fontSize: '12px', fontWeight: 700, transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    <Settings2 style={{ width: '14px', height: '14px' }} />
                    Advanced Preferences
                  </button>
                </div>
              )}

              {/* ── SlideOver for Advanced Preferences ── */}
              {showAmenities && mounted && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'flex-end' }}>
                  {/* Backdrop */}
                  <div
                    style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', animation: 'fadeIn 0.3s ease' }}
                    onClick={() => setShowAmenities(false)}
                  />

                  {/* Side Panel */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: '420px', background: 'white', height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0', animation: 'slideInRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', willChange: 'transform' }}>
                    {/* Header */}
                    <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#f8fafc' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Advanced Preferences</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Configure amenities and ADA accessibility.</p>
                      </div>
                      <button onClick={() => setShowAmenities(false)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                        <X style={{ width: '18px', height: '18px' }} />
                      </button>
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                      {/* Wheelchair Accessible (ADA) */}
                      <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Accessibility style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                              Wheelchair Accessible (ADA)
                            </p>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                              ADA-accessible vehicles are <strong style={{ color: '#2563eb' }}>strictly guaranteed</strong> when requested. We exclusively match you with equipped vehicles.
                            </p>
                          </div>
                          <button onClick={() => setAdaRequired(!adaRequired)} style={{ width: '48px', height: '26px', borderRadius: '13px', background: adaRequired ? '#2563eb' : '#cbd5e1', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: adaRequired ? '24px' : '2px', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
                          </button>
                        </div>

                        {/* ADA Multi-Vehicle Selector */}
                        {adaRequired && ((tripType === 'shuttle' && shuttleVehicles > 1) || passengers > 4) && (
                          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeIn 0.2s ease' }}>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af', margin: 0 }}>How many ADA vehicles?</p>
                              <p style={{ fontSize: '12px', color: '#3b82f6', margin: '2px 0 0', fontWeight: 600 }}>Specify the exact count required</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button onClick={() => setAdaVehicleCount(Math.max(1, adaVehicleCount - 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1.5px solid #bfdbfe', color: '#1e40af', fontWeight: 800, cursor: 'pointer' }}>−</button>
                              <span style={{ fontSize: '16px', fontWeight: 900, color: '#1e40af', width: '28px', textAlign: 'center' }}>{adaVehicleCount}</span>
                              <button onClick={() => setAdaVehicleCount(adaVehicleCount + 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1.5px solid #bfdbfe', color: '#1e40af', fontWeight: 800, cursor: 'pointer' }}>+</button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ height: '1px', background: '#e2e8f0', margin: '0 0 24px' }} />

                      {/* Chargeable Extras */}
                      <div style={{ marginBottom: '24px' }}>
                        <h5 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: '0 0 12px' }}>Event &amp; Custom Options</h5>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                          These premium services incur additional charges.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                          {/* Vehicle Branding */}
                          <button onClick={() => setSelectedAmenities(prev => prev.includes('Vehicle Branding (wrapping)') ? prev.filter(a => a !== 'Vehicle Branding (wrapping)') : [...prev, 'Vehicle Branding (wrapping)'])} style={{ padding: '12px 16px', borderRadius: '12px', background: selectedAmenities.includes('Vehicle Branding (wrapping)') ? '#0f172a' : '#f8fafc', color: selectedAmenities.includes('Vehicle Branding (wrapping)') ? 'white' : '#0f172a', fontSize: '14px', fontWeight: 700, border: selectedAmenities.includes('Vehicle Branding (wrapping)') ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Vehicle Branding (wrapping)</span>
                            {selectedAmenities.includes('Vehicle Branding (wrapping)') && <span>✓</span>}
                          </button>

                          {/* On-board Coordinator */}
                          <button onClick={() => setSelectedAmenities(prev => prev.includes('On-board Coordinator') ? prev.filter(a => a !== 'On-board Coordinator') : [...prev, 'On-board Coordinator'])} style={{ padding: '12px 16px', borderRadius: '12px', background: selectedAmenities.includes('On-board Coordinator') ? '#0f172a' : '#f8fafc', color: selectedAmenities.includes('On-board Coordinator') ? 'white' : '#0f172a', fontSize: '14px', fontWeight: 700, border: selectedAmenities.includes('On-board Coordinator') ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span>On-board Coordinator</span>
                              {selectedAmenities.includes('On-board Coordinator') && <span>✓</span>}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: selectedAmenities.includes('On-board Coordinator') ? '#94a3b8' : '#64748b' }}>(One for each vehicle)</span>
                          </button>

                          {/* Outside Coordinator */}
                          {(() => {
                            const amName = 'Outside Coordinator';
                            const currentVal = selectedAmenities.find(a => a.startsWith(amName));
                            const isSelected = !!currentVal;
                            const count = currentVal ? parseInt(currentVal.split(' x')[1] || '1', 10) : 1;

                            return (
                              <div style={{ border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', borderRadius: '12px', padding: '12px 16px', background: isSelected ? '#f8fafc' : '#f8fafc', transition: 'all 0.15s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => {
                                  if (isSelected) setSelectedAmenities(prev => prev.filter(a => !a.startsWith(amName)));
                                  else setSelectedAmenities(prev => [...prev, `${amName} x1`]);
                                }}>
                                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Outside Coordinator</span>
                                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? '5px solid #0f172a' : '2px solid #cbd5e1', transition: 'all 0.15s' }} />
                                </div>
                                {isSelected && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', animation: 'fadeIn 0.2s ease' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>How many coordinators?</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button onClick={() => setSelectedAmenities(prev => [...prev.filter(a => !a.startsWith(amName)), `${amName} x${Math.max(1, count - 1)}`])} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>−</button>
                                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', width: '24px', textAlign: 'center' }}>{count}</span>
                                      <button onClick={() => setSelectedAmenities(prev => [...prev.filter(a => !a.startsWith(amName)), `${amName} x${count + 1}`])} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>+</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* Meet & Greet Service */}
                          {(() => {
                            const amName = 'Meet & Greet Service';
                            const currentVal = selectedAmenities.find(a => a.startsWith(amName));
                            const isSelected = !!currentVal;
                            const count = currentVal ? parseInt(currentVal.split(' x')[1] || '1', 10) : 1;

                            return (
                              <div style={{ border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', borderRadius: '12px', padding: '12px 16px', background: isSelected ? '#f8fafc' : '#f8fafc', transition: 'all 0.15s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => {
                                  if (isSelected) setSelectedAmenities(prev => prev.filter(a => !a.startsWith(amName)));
                                  else setSelectedAmenities(prev => [...prev, `${amName} x1`]);
                                }}>
                                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Meet & Greet Service</span>
                                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? '5px solid #0f172a' : '2px solid #cbd5e1', transition: 'all 0.15s' }} />
                                </div>
                                {isSelected && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', animation: 'fadeIn 0.2s ease' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>How many greeters?</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button onClick={() => setSelectedAmenities(prev => [...prev.filter(a => !a.startsWith(amName)), `${amName} x${Math.max(1, count - 1)}`])} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>−</button>
                                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', width: '24px', textAlign: 'center' }}>{count}</span>
                                      <button onClick={() => setSelectedAmenities(prev => [...prev.filter(a => !a.startsWith(amName)), `${amName} x${count + 1}`])} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>+</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>

                      <div style={{ height: '1px', background: '#e2e8f0', margin: '0 0 24px' }} />

                      {/* Amenities & Extras */}
                      <div>
                        <h5 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: '0 0 12px' }}>Amenities &amp; Features</h5>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5, padding: '12px 14px', background: '#f1f5f9', borderRadius: '10px', borderLeft: '4px solid #94a3b8' }}>
                          Provided at no extra cost, subject to fleet availability on the day of service.
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Standard Amenities</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['A/C', 'Heat', 'Restroom', 'WiFi', 'PA System', 'DVD', 'CD Player', 'Power Outlet', 'Satellite TV'].map(am => {
                              const isSelected = selectedAmenities.includes(am)
                              return (
                                <button key={am} onClick={() => setSelectedAmenities(prev => isSelected ? prev.filter(a => a !== am) : [...prev, am])} style={{ padding: '8px 14px', borderRadius: '20px', background: isSelected ? '#0f172a' : 'white', color: isSelected ? 'white' : '#475569', fontSize: '13px', fontWeight: 700, border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s' }}>
                                  {isSelected && '✓ '} {am}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Special Extras</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['Child Seat', 'Booster Seat'].map(am => {
                              const isSelected = selectedAmenities.includes(am)
                              return (
                                <button key={am} onClick={() => setSelectedAmenities(prev => isSelected ? prev.filter(a => a !== am) : [...prev, am])} style={{ padding: '8px 14px', borderRadius: '20px', background: isSelected ? '#0f172a' : 'white', color: isSelected ? 'white' : '#475569', fontSize: '13px', fontWeight: 700, border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s' }}>
                                  {isSelected && '✓ '} {am}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Footer */}
                    <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                      <button onClick={() => setShowAmenities(false)} style={{ width: '100%', height: '54px', borderRadius: '14px', background: '#0f172a', color: 'white', fontSize: '15px', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                        Apply Preferences
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}

            </>
          )}

          {/* ── Sticky CTA ── */}
          {activeStep !== "quotation" && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.98)',
              paddingTop: '16px',
              paddingBottom: '24px',
              marginTop: 'auto',
              zIndex: 50,
              borderTop: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              gap: '10px'
            }}>
              <button
                onClick={() => setShowCancelDialog(true)}
                style={{
                  width: '64px', height: '54px', borderRadius: '14px',
                  background: '#f8fafc', color: '#475569',
                  border: '1.5px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxSizing: 'border-box', flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                title="Cancel"
              >
                <X style={{ width: '24px', height: '24px' }} />
              </button>
              <button
                onClick={async () => {
                  if (!isFormValid) return;
                  setRouteLoading(true);
                  try {
                    let cCode = (pickupLoc?.countryCode || clientGeoContext.countryCode || "AE").toUpperCase();
                    if (!pickupLoc?.countryCode && clientGeoContext.country) {
                      const c = clientGeoContext.country.toLowerCase();
                      if (c.includes("united states") || c === "usa") cCode = "US";
                      else if (c.includes("emirates") || c === "uae") cCode = "AE";
                      else if (c.includes("saudi") || c === "ksa") cCode = "SA";
                      else if (c.includes("kingdom") || c === "uk") cCode = "GB";
                    }

                    // Save the itinerary to local storage as a draft
                    let finalDropoffValue = dropoffValue;
                    let finalDropoffLoc = dropoffLoc;
                    let finalStops = [...stops];

                    if (!finalDropoffLoc && finalStops.some(s => !!s.loc)) {
                      const validStops = finalStops.filter(s => !!s.loc);
                      const lastStop = validStops[validStops.length - 1];
                      finalDropoffValue = lastStop.address;
                      finalDropoffLoc = lastStop.loc;
                      finalStops = finalStops.filter(s => s.id !== lastStop.id);
                    }

                    const payload = {
                      pickupValue,
                      pickup: pickupLoc,
                      dropoffValue: finalDropoffValue,
                      dropoff: finalDropoffLoc,
                      returnValue: showReturn && roundTripMode === 'continuous' ? returnValue : undefined,
                      returnLoc: showReturn && roundTripMode === 'continuous' ? returnLoc : undefined,
                      startDate,
                      startTime,
                      endDate,
                      endTime,
                      tripType,
                      serviceMode,
                      countryCode: cCode,
                      country: clientGeoContext.country,
                      passengers: tripType === 'shuttle' ? shuttleVehicles : passengers,
                      stops: finalStops,
                      multiDayStore,
                      selectedAmenities,
                      adaRequired,
                      adaVehicleCount,
                      distance: routeDistance ? Math.round(clientGeoContext.distanceUnit === 'mi' ? routeDistance * 0.000621371 : routeDistance / 1000) : 40,
                      duration: routeDuration || 3600,
                      quotation_db_id: quotationDbId,
                      routePolyline
                    };

                    localStorage.setItem("saved_itinerary", JSON.stringify(payload));

                    // Navigate to the Quotation view
                    goToStep("quotation");
                  } catch (e) {
                    console.error("Failed to push itinerary to local storage", e);
                    goToStep("quotation");
                  } finally {
                    setRouteLoading(false);
                  }
                }}
                disabled={!isFormValid || routeLoading}
                style={{
                  flex: 1, height: '54px', borderRadius: '14px',
                  background: isFormValid ? '#0f172a' : '#e2e8f0',
                  color: isFormValid ? 'white' : '#94a3b8',
                  fontWeight: 800, fontSize: '14px', letterSpacing: '-0.2px',
                  border: 'none',
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
              >
                {routeLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Connecting to Backend...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap style={{ width: '16px', height: '16px', color: isFormValid ? '#fbbf24' : '#94a3b8' }} />
                    {editingQuoteRef ? `UPDATE BOOKING ${quotePrice ? '— ' + quoteCurrency + ' ' + quotePrice : ''}` : 'REQUEST PRICE'}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
        {isCityModalOpen && (
          <CitySelectorModal
            isOpen={isCityModalOpen}
            onClose={() => setIsCityModalOpen(false)}
            currentContext={clientGeoContext}
            onCitySelected={(ctx) => setClientGeoContext(prev => ({ ...prev, ...ctx }))}
          />
        )}
      </div>

      {activeStep === "quotation" && (
        <div style={{
          flex: 1,
          minWidth: 0,
          borderLeft: '1px solid #e2e8f0',
          background: '#f8fafc',
          overflowY: 'auto',
          overflowX: 'hidden',
          animation: 'fadeInSlideLeft 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
          <QuotationPanel
            onBack={() => goToStep("search")}
            onSelect={(id?: string) => {
              const ref = id || ('T-' + Math.random().toString(36).substring(2, 8).toUpperCase())
              router.push(`/trips/${ref}`)
            }}
            onSelectionChange={onQuoteSelected}
            tripType={tripType}
            passengers={tripType === 'shuttle' ? shuttleVehicles : passengers}
            routeDistanceKm={routeDistance ? Math.round(clientGeoContext.distanceUnit === 'mi' ? routeDistance * 0.000621371 : routeDistance / 1000) : 40}
            bookingDetails={{
              pickup: pickupLoc,
              dropoff: dropoffLoc,
              returnLoc: returnLoc,
              startDate,
              startTime,
              endDate,
              endTime,
              ataDate,
              ataTime,
              pickupWaitMin,
              dropoffWaitMin,
              tripType,
              shuttleVehicleOvertimes,
              shuttleVehicleEndings,
              countryCode: (pickupLoc?.countryCode || clientGeoContext.countryCode || "US").toUpperCase(),
              passengers: tripType === 'shuttle' ? shuttleVehicles : passengers,
              stops,
              multiDayStore,
              selectedAmenities,
              adaRequired,
              adaVehicleCount,
              distance: routeDistance ? Math.round(clientGeoContext.distanceUnit === 'mi' ? routeDistance * 0.000621371 : routeDistance / 1000) : 40,
              duration: routeDuration || 3600,
              quotation_db_id: quotationDbId,
              option: hydratedOption,
              routePolyline: routePolyline
            }}
          />
        </div>
      )}
    </div>
  )
}
