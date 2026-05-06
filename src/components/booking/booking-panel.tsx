"use client"

import * as React from "react"
import { MapPin, Users, Car, ChevronDown, Zap, CalendarDays, Navigation, Briefcase, LocateFixed, AlertTriangle, Clock, CheckCircle2, Settings2, Accessibility } from "lucide-react"
import { useRouter } from "next/navigation"

import { QuotationPanel } from "./quotation-panel"
import { StatusTimeline } from "./status-timeline"
import { LocationSearchInput, saveRecentLocation, getRecentLocations } from "./location-search"
import { GisClient } from "@/lib/gis-client"
import { CitySelectorModal, GeoContext } from "./city-selector-modal"
import { createClient } from "@/lib/supabase/client"

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

function addSecondsToDatetime(dateStr: string, timeStr: string, seconds: number): { date: string; time: string } {
  if (!dateStr || !timeStr) return { date: dateStr, time: timeStr }
  const base = new Date(`${dateStr}T${timeStr}`)
  const result = new Date(base.getTime() + seconds * 1000)

  const yyyy = result.getFullYear()
  const mm = String(result.getMonth() + 1).padStart(2, '0')
  const dd = String(result.getDate()).padStart(2, '0')
  const hh = String(result.getHours()).padStart(2, '0')
  const min = String(result.getMinutes()).padStart(2, '0')

  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` }
}

function isEndBeforeAta(endDate: string, endTime: string, ataDate: string, ataTime: string): boolean {
  if (!endDate || !endTime || !ataDate || !ataTime) return false
  return new Date(`${endDate}T${endTime}`) < new Date(`${ataDate}T${ataTime}`)
}

function formatTimeStr(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  if (!h || !m) return timeStr
  const hour = parseInt(h, 10)
  let displayH = hour % 12
  if (displayH === 0) displayH = 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${displayH}:${m} ${ampm}`
}

function formatDateStr(dateStr: string, todayStr: string): string {
  if (!dateStr) return ''
  if (dateStr === todayStr) return 'Today'
  try {
    const [y, m, d] = dateStr.split('-')
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    // Use the client's locale for natural date formatting
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
  } catch {
    return dateStr
  }
}

function TimePickerSelect({ value, onChange, style, disabled, minTime }: { value: string, onChange: (val: string) => void, style?: React.CSSProperties, disabled?: boolean, minTime?: string }) {
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
    <div style={{ position: 'relative', width: '100%' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ ...style, appearance: 'none', paddingRight: '32px' }}
      >
        <option value="" disabled>Select time…</option>
        {options.map(t => <option key={t.val} value={t.val} disabled={minTime ? t.val < minTime : false}>{t.label}</option>)}
      </select>
      <Clock style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
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
}) {
  const router = useRouter()
  const [activeStep, setActiveStep] = React.useState<"search" | "quotation" | "timeline">("search")

  // Global Context
  const [clientGeoContext, setClientGeoContext] = React.useState<GeoContext>({
    city: "Abu Dhabi",
    country: "United Arab Emirates",
    lat: 24.4539,
    lon: 54.3773
  })
  const [isCityModalOpen, setIsCityModalOpen] = React.useState(false)
  const [editingQuoteRef, setEditingQuoteRef] = React.useState<string | null>(null)

  // Advanced Amenities
  const [showAmenities, setShowAmenities] = React.useState(false)
  const [adaRequired, setAdaRequired] = React.useState(false)
  const [adaVehicleCount, setAdaVehicleCount] = React.useState(1)
  const [selectedAmenities, setSelectedAmenities] = React.useState<string[]>([])

  // Notify parent whenever step changes so it can lock/unlock map pins
  const goToStep = React.useCallback((step: "search" | "quotation" | "timeline") => {
    setActiveStep(step)
    onStepChange?.(step)
  }, [onStepChange])
  const [serviceMode, setServiceMode] = React.useState<ServiceMode>("scheduled")
  const [passengers, setPassengers] = React.useState(1)
  const [passengerInput, setPassengerInput] = React.useState("1")
  const [pickupValue, setPickupValue] = React.useState("")
  const [dropoffValue, setDropoffValue] = React.useState("")
  const [pickupLoc, setPickupLoc] = React.useState<any>(null)
  const [dropoffLoc, setDropoffLoc] = React.useState<any>(null)

  const [showRestoreDialog, setShowRestoreDialog] = React.useState(false)
  const [savedItinerary, setSavedItinerary] = React.useState<any>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Track original typed addresses for reinstate
  const originalPickupRef = React.useRef<string>("")
  const originalDropoffRef = React.useRef<string>("")

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
        const { data, error } = await supabase.from('quotations').select('*').eq('id', quoteId).single();
        if (data && data.quotation_details) {
          const d = data.quotation_details;

          setEditingQuoteRef(data.ref || `Q-${data.id.substring(0, 8).toUpperCase()}`);

          setPassengers(d.passengers || 1);
          setPassengerInput(String(d.passengers || 1));

          if (d.pickup) {
            setPickupValue(d.pickup.address);
            setPickupLoc(d.pickup);
            if (onPickupChange) onPickupChange(d.pickup);
            originalPickupRef.current = d.pickup.address;
          }
          if (d.dropoff) {
            setDropoffValue(d.dropoff.address);
            setDropoffLoc(d.dropoff);
            if (onDropoffChange) onDropoffChange(d.dropoff);
            originalDropoffRef.current = d.dropoff.address;
          }

          if (d.startDate) setStartDate(d.startDate);
          if (d.startTime) setStartTime(d.startTime);

          if (d.tripType === "roundtrip") setShowReturn(true);
          if (d.stops?.length) setStops(d.stops);

          if (d.multiDayStore) {
            setMultiDayStore(d.multiDayStore);
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
      setPassengers(d.passengers);
      setPassengerInput(String(d.passengers));
    }
    if (d.pickup) {
      setPickupValue(d.pickup.address);
      setPickupLoc(d.pickup);
      if (onPickupChange) onPickupChange(d.pickup);
      originalPickupRef.current = d.pickup.address;
    } else if (d.pickupValue) {
      setPickupValue(d.pickupValue);
    }

    if (d.dropoff) {
      setDropoffValue(d.dropoff.address);
      setDropoffLoc(d.dropoff);
      if (onDropoffChange) onDropoffChange(d.dropoff);
      originalDropoffRef.current = d.dropoff.address;
    } else if (d.dropoffValue) {
      setDropoffValue(d.dropoffValue);
    }

    if (d.serviceMode) setServiceMode(d.serviceMode);
    if (d.startDate) setStartDate(d.startDate);
    if (d.startTime) setStartTime(d.startTime);
    if (d.endDate) setEndDate(d.endDate);
    if (d.endTime) setEndTime(d.endTime);
    if (d.tripType === "roundtrip") setShowReturn(true);
    if (d.tripType === "shuttle") setIsShuttle(true);
    if (d.stops?.length) setStops(d.stops);
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
  const [endDate, setEndDate] = React.useState("")
  const [endTime, setEndTime] = React.useState("")

  // ATA engine state
  const [routeDuration, setRouteDuration] = React.useState<number | null>(null) // seconds
  const [routeDistance, setRouteDistance] = React.useState<number | null>(null) // meters
  const [routePolyline, setRoutePolyline] = React.useState<any>(null) // geometry/polyline
  const [ataDate, setAtaDate] = React.useState("")
  const [ataTime, setAtaTime] = React.useState("")
  const [ataAutoFixed, setAtaAutoFixed] = React.useState(false)
  const [routeLoading, setRouteLoading] = React.useState(false)

  // ── Trip Type & Active Trip ────────────────────────────────────────────────
  type TripType = 'one-way' | 'roundtrip' | 'shuttle' | 'multi-day'
  // Shuttle-specific: pickup wait time + per-stop entries
  const [pickupWaitMin, setPickupWaitMin] = React.useState(5)
  type StopEntry = { id: string; address: string; loc: any; stopDurationMin: number }
  const [stops, setStops] = React.useState<StopEntry[]>([])
  const [shuttleTotalSec, setShuttleTotalSec] = React.useState<number | null>(null)
  const [shuttleLoading, setShuttleLoading] = React.useState(false)

  const [showReturn, setShowReturn] = React.useState(false)

  // ── Multi-Day Logic ────────────────────────────────────────────────────────
  type DailyData = { dateStr: string; startTime: string; endTime?: string; pickupValue: string; pickupLoc: any; dropoffValue: string; dropoffLoc: any; stops: StopEntry[]; routePolyline?: any }
  const [multiDayStore, setMultiDayStore] = React.useState<DailyData[]>([])
  const [activeDayIdx, setActiveDayIdx] = React.useState(0)
  const isSwappingRef = React.useRef(false)

  const [isShuttle, setIsShuttle] = React.useState(false)
  const [shuttleStaggered, setShuttleStaggered] = React.useState(true)

  const tripType = React.useMemo<TripType>(() => {
    if (multiDayStore.length > 1) return 'multi-day'
    if (stops.length > 0 || isShuttle) return 'shuttle'
    if (showReturn) return 'roundtrip'
    return 'one-way'
  }, [stops.length, showReturn, multiDayStore.length, isShuttle])

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
      startDate,
      startTime,
      endDate,
      endTime,
      tripType,
      serviceMode,
      countryCode: cCode,
      country: clientGeoContext.country,
      passengers,
      stops,
      multiDayStore,
      selectedAmenities,
      adaRequired,
      adaVehicleCount,
      distance: routeDistance ? Math.round((cCode === 'US' || cCode === 'GB') ? routeDistance * 0.000621371 : routeDistance / 1000) : 40,
      duration: routeDuration || 3600,
      routePolyline
    };

    if (pickupLoc || dropoffLoc || pickupValue || dropoffValue || startDate || startTime) {
      localStorage.setItem("saved_itinerary", JSON.stringify(payload));
    }
  }, [pickupValue, dropoffValue, pickupLoc, dropoffLoc, startDate, startTime, endDate, endTime, tripType, serviceMode, clientGeoContext, passengers, stops, multiDayStore, selectedAmenities, adaRequired, adaVehicleCount]);

  // Sync dates to store array
  React.useEffect(() => {
    if (!startDate) return
    const endStr = endDate || startDate
    const start = new Date(startDate)
    const end = new Date(endStr)
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    setMultiDayStore(prev => {
      if (prev.length === diffDays) {
        // Just update dates
        const updated = [...prev]
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
          updated[i].dateStr = d.toISOString().split('T')[0]
        }
        return updated
      }
      const newStore = [...prev]
      if (newStore.length < diffDays) {
        for (let i = newStore.length; i < diffDays; i++) {
          const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
          const prevDay = newStore[i - 1]
          newStore.push({
            dateStr: d.toISOString().split('T')[0],
            startTime: i === 0 ? startTime : prevDay?.startTime || '09:00',
            endTime: i === 0 ? endTime : prevDay?.endTime || '',
            pickupValue: prevDay?.dropoffValue || '', // Smart Autofill!
            pickupLoc: prevDay?.dropoffLoc || null,
            dropoffValue: '',
            dropoffLoc: null,
            stops: [],
            routePolyline: null
          })
        }
      } else {
        newStore.length = diffDays
      }
      return newStore
    })
  }, [startDate, endDate])

  // Save changes to active day
  React.useEffect(() => {
    if (isSwappingRef.current) return
    if (multiDayStore.length === 0) return
    setMultiDayStore(prev => {
      const nextStore = [...prev]
      const oldDropoff = nextStore[activeDayIdx].dropoffValue

      nextStore[activeDayIdx] = {
        ...nextStore[activeDayIdx],
        pickupValue, pickupLoc, dropoffValue, dropoffLoc, stops, startTime, endTime, routePolyline
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
  }, [pickupValue, pickupLoc, dropoffValue, dropoffLoc, stops, startTime, endTime, routePolyline, activeDayIdx])

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
      setStops(target.stops || [])
      setRoutePolyline(target.routePolyline || null)

      // Update map visually for this day
      if (onPickupChange && target.pickupLoc) onPickupChange(target.pickupLoc)
      if (onDropoffChange && target.dropoffLoc) onDropoffChange(target.dropoffLoc)
      if (onStopsChange) onStopsChange(target.stops || [])
    }
    setTimeout(() => { isSwappingRef.current = false }, 50)
  }

  const addStop = () => setStops(prev => [...prev, { id: Date.now().toString(), address: '', loc: null, stopDurationMin: 10 }])
  const removeStop = (id: string) => setStops(prev => prev.filter(s => s.id !== id))
  const updateStop = (id: string, patch: Partial<StopEntry>) => setStops(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

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

  // ── Validation ────────────────────────────────────────────────────────────
  const isFormValid = React.useMemo(() => {
    const hasLocations = !!pickupLoc && !!dropoffLoc
    if (!hasLocations) return false
    if (serviceMode === "scheduled") return !!startDate && !!startTime
    return true
  }, [pickupLoc, dropoffLoc, serviceMode, startDate, startTime, tripType])

  const missingFields = React.useMemo(() => {
    const missing: string[] = []
    if (!pickupLoc) missing.push("pickup")
    if (!dropoffLoc) missing.push("dropoff")
    if (serviceMode === "scheduled" && !startDate) missing.push("pickup date")
    if (serviceMode === "scheduled" && !startTime) missing.push("pickup time")
    return missing
  }, [pickupLoc, dropoffLoc, serviceMode, startDate, startTime, tripType])
  const detectLocation = React.useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          const data = await res.json()
          const address = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`
          const loc = { address, coordinate: { lat, lon } }
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

  React.useEffect(() => { detectLocation() }, [])

  // ── Smart ATA Engine (per trip type) ─────────────────────────────────────

  // 1. One Way & Roundtrip: route between pickup→dropoff
  React.useEffect(() => {
    if (!pickupLoc?.coordinate || !dropoffLoc?.coordinate) {
      setRouteDuration(null)
      setRouteDistance(null)
      return
    }
    const compute = async () => {
      setRouteLoading(true)
      try {
        const result = await GisClient.getRoute([pickupLoc.coordinate, dropoffLoc.coordinate], 'driving')
        const route = result?.routes?.[0] ?? result?.route ?? result
        setRouteDuration(route?.duration ?? route?.legs?.[0]?.duration ?? null)
        setRouteDistance(route?.distance ?? route?.legs?.[0]?.distance ?? null)
        setRoutePolyline(route?.geometry ?? route?.polyline ?? null)
      } catch {
        setRouteDuration(null)
        setRouteDistance(null)
        setRoutePolyline(null)
      } finally {
        setRouteLoading(false)
      }
    }
    compute()
  }, [pickupLoc, dropoffLoc])

  // 2. Shuttle: chain all waypoints (pickup → stops → dropoff) + wait times
  React.useEffect(() => {
    if (tripType !== 'shuttle') return
    const waypoints = [
      pickupLoc?.coordinate,
      ...stops.map(s => s.loc?.coordinate).filter(Boolean),
      dropoffLoc?.coordinate,
    ].filter(Boolean)
    if (waypoints.length < 2) { setShuttleTotalSec(null); return }

    const compute = async () => {
      setShuttleLoading(true)
      try {
        // Fetch each leg sequentially
        let totalSec = pickupWaitMin * 60
        for (let i = 0; i < waypoints.length - 1; i++) {
          const result = await GisClient.getRoute([waypoints[i], waypoints[i + 1]], 'driving')
          const route = result?.routes?.[0] ?? result?.route ?? result
          const legSec: number = route?.duration ?? route?.legs?.[0]?.duration ?? 0
          totalSec += Math.ceil(legSec * 1.15) // 15% traffic buffer per leg
          // Add stop wait time (not for the final destination)
          if (i < stops.length) {
            totalSec += (stops[i]?.stopDurationMin ?? 0) * 60
          }
        }
        setShuttleTotalSec(totalSec)
      } catch {
        setShuttleTotalSec(null)
      } finally {
        setShuttleLoading(false)
      }
    }
    compute()
  }, [tripType, pickupLoc, dropoffLoc, stops, pickupWaitMin])

  // 3. ATA date/time: for one-way = pure auto; for roundtrip = suggested (editable)
  React.useEffect(() => {
    if (tripType === 'shuttle') return // shuttle handles its own timing
    const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate
    if (!activeDate || !startTime || !routeDuration) {
      setAtaDate('')
      setAtaTime('')
      return
    }
    const smartDuration = Math.ceil(routeDuration * 1.15) // 15% traffic buffer

    // Physical Baseline: One-Way is just the duration. Roundtrip requires driving back!
    const baseTripSec = tripType === 'roundtrip' ? smartDuration * 2 : smartDuration;
    const ata = addSecondsToDatetime(activeDate, startTime, baseTripSec)

    // We store the ABSOLUTE physical driving minimum as ataDate/ataTime in state
    setAtaDate(ata.date)
    setAtaTime(ata.time)

    if (tripType === 'one-way') {
      // One Way: strictly fixed to destination arrival
      setEndDate(ata.date)
      setEndTime(ata.time)
      setAtaAutoFixed(false)
    } else if (tripType === 'roundtrip' || tripType === 'multi-day') {
      // If none set OR it breaks physics (less than active driving time), forcefully adjust
      // For multi-day, endDate is the overall trip end, but we use it and endTime to enforce bounds
      const targetDate = tripType === 'multi-day' ? activeDate : endDate
      if (!targetDate || !endTime || isEndBeforeAta(targetDate, endTime, ata.date, ata.time)) {
        const isInitial = !endTime;
        // Automatically inject an estimated 2-Hour (7200s) idle time at destination for default user convenience,
        // unless we are aggressively auto-correcting an invalid user input (where we just snap to minimum).
        const suggested = addSecondsToDatetime(ata.date, ata.time, isInitial ? 7200 : 0)

        if (tripType === 'roundtrip') setEndDate(suggested.date)
        setEndTime(suggested.time)
        setAtaAutoFixed(true) // Highlights the auto-adjustment warning banner
      } else {
        setAtaAutoFixed(false)
      }
    }
  }, [startDate, startTime, routeDuration, tripType, endDate, endTime])

  // 4. Initialize & enforce Shuttle minimum finish time boundary
  React.useEffect(() => {
    if (tripType !== 'shuttle' || !startDate || !startTime || !shuttleTotalSec) return
    const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate
    const minEnd = addSecondsToDatetime(activeDate, startTime, shuttleTotalSec)

    // Unconditionally ensure end bounds can never bypass the absolute shuttle physics minimum
    if (!endDate || !endTime || isEndBeforeAta(endDate, endTime, minEnd.date, minEnd.time)) {
      setEndDate(minEnd.date)
      setEndTime(minEnd.time)
    }
  }, [tripType, startDate, startTime, shuttleTotalSec, activeDayIdx, multiDayStore])

  const handleEndChange = (newDate: string, newTime: string) => {
    let finalDate = newDate || endDate
    let finalTime = newTime || endTime
    let forced = false

    if ((tripType === 'roundtrip' || tripType === 'multi-day') && ataDate && ataTime) {
      const targetDate = tripType === 'multi-day' ? (multiDayStore[activeDayIdx]?.dateStr || startDate) : finalDate;
      if (isEndBeforeAta(targetDate, finalTime, ataDate, ataTime)) {
        if (tripType !== 'multi-day') finalDate = ataDate;
        finalTime = ataTime
        forced = true
      }
    } else if (tripType === 'shuttle' && shuttleTotalSec && startDate && startTime) {
      const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate
      const minEnd = addSecondsToDatetime(activeDate, startTime, shuttleTotalSec)
      if (isEndBeforeAta(finalDate, finalTime, minEnd.date, minEnd.time)) {
        finalDate = minEnd.date
        finalTime = minEnd.time
        forced = true
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
        width: activeStep === 'quotation' ? '440px' : '100%', 
        flexShrink: 0, 
        position: 'relative', 
        overflowY: 'auto', 
        overflowX: 'hidden',
        transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' 
      }}>

      {showRestoreDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        </div>
      )}

      {/* ── Location context bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
        <MapPin style={{ width: '13px', height: '13px', color: '#2563eb', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
          {clientGeoContext.city}, {clientGeoContext.country === "United Arab Emirates" ? "AE" : clientGeoContext.country}
        </span>
        <span style={{ color: '#e2e8f0', margin: '0 4px' }}>·</span>
        <button onClick={() => setIsCityModalOpen(true)} style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Change city</button>
      </div>

      <div style={{ padding: '24px 24px 32px', boxSizing: 'border-box', width: '100%' }}>

        {/* ── Heading ── */}
        {editingQuoteRef ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Editing Quote</span>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.1, margin: 0, color: '#0f172a' }}>{editingQuoteRef}</h1>
            </div>
            <button onClick={() => router.push('/quotations')} style={{ padding: '8px 14px', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              Cancel Edit
            </button>
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

        {/* ── Multi-Day Trip Dates Engine ── */}
        {serviceMode === "scheduled" && (
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1.5px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '5px' }}>Start Date</label>
                <input type="date" value={startDate} min={today} onChange={(e) => {
                  const newDate = e.target.value;
                  setStartDate(newDate)

                  // Instantly apply current real-world time if they select today
                  if (newDate === today) {
                    const now = new Date();
                    const hh = now.getHours().toString().padStart(2, '0');
                    const mm = now.getMinutes().toString().padStart(2, '0');
                    setStartTime(`${hh}:${mm}`);
                  }

                  if (!endDate || new Date(endDate) < new Date(newDate)) setEndDate(newDate)
                }}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: `1.5px solid ${startDate ? '#2563eb' : '#cbd5e1'}`, fontSize: '13px', fontWeight: 700, background: 'white', boxSizing: 'border-box', color: '#0f172a', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '5px' }}>End Date (Optional)</label>
                <input type="date" value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: `1.5px solid ${endDate && endDate !== startDate ? '#2563eb' : '#cbd5e1'}`, fontSize: '13px', fontWeight: 700, background: 'white', boxSizing: 'border-box', color: '#0f172a', outline: 'none' }} />
              </div>
            </div>

            {/* Daily Tabs Row */}
            {multiDayStore.length > 1 && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '8px' }}>Itinerary Days ({multiDayStore.length})</p>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                  {multiDayStore.map((day, idx) => {
                    const isActive = activeDayIdx === idx;
                    const d = new Date(day.dateStr);
                    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <button key={idx} onClick={() => handleTabSwitch(idx)} style={{
                        padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap',
                        border: isActive ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                        background: isActive ? '#eff6ff' : 'white',
                        color: isActive ? '#1d4ed8' : '#64748b',
                        fontWeight: 800, fontSize: '12px', transition: 'all 0.2s', flexShrink: 0
                      }}>
                        Day {idx + 1} <span style={{ fontWeight: 500, opacity: 0.8 }}>· {formattedDate}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Location inputs (Active Tab) ── */}
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '16px', background: 'white', marginBottom: '16px', overflow: 'visible', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
          {multiDayStore.length > 1 && (
            <div style={{ position: 'absolute', top: '-11px', left: '20px', zIndex: 5, background: '#eff6ff', padding: '2px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>
              EDITING DAY {activeDayIdx + 1}
            </div>
          )}
          {/* Pickup */}
          <div style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px' }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#0f172a', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <LocationSearchInput
                  placeholder="Pickup location"
                  value={pickupValue}
                  showLocateMe
                  onLocateMe={detectLocation}
                  bias={{ lat: clientGeoContext.lat, lon: clientGeoContext.lon }}
                  onSelect={(loc) => {
                    setPickupValue(loc.address)
                    setPickupLoc(loc)
                    saveRecentLocation(loc)
                    if (onPickupChange) onPickupChange(loc)

                    // Update global Geo Context to match the selected pickup location
                    if (loc.coordinate) {
                      const parts = loc.address.split(',').map(s => s.trim())
                      const city = loc.name || parts[0]
                      const country = parts.length > 1 ? parts[parts.length - 1] : parts[0]
                      setClientGeoContext(prev => ({
                        ...prev,
                        city,
                        country,
                        countryCode: loc.countryCode || prev.countryCode,
                        lat: loc.coordinate!.lat,
                        lon: loc.coordinate!.lon
                      }))
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Intermediate stops (shuttle only / adds stops) */}
          {stops.map((stop, idx) => (
            <div key={stop.id}>
              <div style={{ padding: '0 21px' }}>
                <div style={{ width: '3px', height: '14px', background: '#e2e8f0', borderRadius: '2px', marginLeft: '2px' }} />
              </div>
              <div style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px' }}>
                  <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#7c3aed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '7px', color: 'white', fontWeight: 900 }}>{idx + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <LocationSearchInput
                      placeholder={`Stop ${idx + 1} location`}
                      value={stop.address}
                      bias={{ lat: clientGeoContext.lat, lon: clientGeoContext.lon }}
                      onSelect={(loc) => {
                        updateStop(stop.id, { address: loc.address, loc })
                        saveRecentLocation(loc)
                      }}
                    />
                  </div>
                  <button onClick={() => removeStop(stop.id)}
                    style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1.5px solid #fecaca', background: '#fff5f5', cursor: 'pointer', color: '#ef4444', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>

                {/* Stop duration — gated until location set */}
                <div style={{ padding: '6px 16px 10px', borderTop: '1px solid #f8fafc' }}>
                  {!stop.loc ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>🔒</span>
                      <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Enter location above to set stop duration</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Stop duration</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button
                          onClick={() => updateStop(stop.id, { stopDurationMin: Math.max(0, stop.stopDurationMin - 1) })}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >−</button>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number" min={0} max={180}
                            value={stop.stopDurationMin}
                            onChange={(e) => updateStop(stop.id, { stopDurationMin: Math.max(0, Math.min(180, Number(e.target.value) || 0)) })}
                            style={{ width: '44px', height: '26px', textAlign: 'center', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 700, color: '#0f172a', background: 'white', outline: 'none', padding: '0 2px', boxSizing: 'border-box' }}
                          />
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '3px', fontWeight: 600 }}>min</span>
                        </div>
                        <button
                          onClick={() => updateStop(stop.id, { stopDurationMin: stop.stopDurationMin + 1 })}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >+</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* ── Middle: Add Stop Button ── */}
          <div style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '21px' }}>
              <div style={{ width: '3px', height: '100%', background: '#e2e8f0', borderRadius: '2px', marginLeft: '2px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '10px', position: 'relative', zIndex: 1 }}>
              <button
                onClick={() => addStop()}
                title="Add an intermediate stop"
                style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  border: '1.5px solid #7c3aed', background: '#f5f3ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, color: '#7c3aed', fontSize: '16px', lineHeight: 1,
                  marginLeft: '-4.5px' // Center exactly over the dots
                }}>+</button>
              <button
                onClick={() => addStop()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#7c3aed', fontSize: '12px', fontWeight: 700, padding: 0
                }}
              >
                Add a stop
              </button>
            </div>
          </div>

          {/* Dropoff */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px' }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#2563eb', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <LocationSearchInput
                placeholder="Dropoff / Final destination"
                value={dropoffValue}
                bias={{ lat: clientGeoContext.lat, lon: clientGeoContext.lon }}
                onSelect={(loc) => {
                  setDropoffValue(loc.address)
                  setDropoffLoc(loc)
                  saveRecentLocation(loc)
                  if (onDropoffChange) onDropoffChange(loc)
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Pin drag indicators ── */}
        {pickupPinMoved && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px 8px', marginTop: '-16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📍</span> Pickup pin adjusted
            </span>
            <button
              onClick={() => { onReinstatePickup?.(); setPickupValue(''); setPickupLoc(null) }}
              style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              ↩ Reinstate original
            </button>
          </div>
        )}

        {dropoffPinMoved && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px 8px', marginTop: '-8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📍</span> Dropoff pin adjusted
            </span>
            <button
              onClick={() => { onReinstateDropoff?.(); setDropoffValue(''); setDropoffLoc(null) }}
              style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              ↩ Reinstate original
            </button>
          </div>
        )}


        {/* ── Return Options (One Way to Roundtrip Toggle) ── */}
        {dropoffLoc && tripType !== 'multi-day' && !showReturn && !isShuttle && stops.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => setShowReturn(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                borderRadius: '20px', background: '#f8fafc', border: '1.5px solid #e2e8f0',
                color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <span>⇄</span> Add Return Trip
            </button>
            <button
              onClick={() => setIsShuttle(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                borderRadius: '20px', background: '#f5f3ff', border: '1.5px solid #ddd6fe',
                color: '#6d28d9', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#c4b5fd')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ddd6fe')}
            >
              <span>↺</span> Convert to Shuttle
            </button>
          </div>
        )}

        {dropoffLoc && showReturn && !isShuttle && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <button
              onClick={() => setShowReturn(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                borderRadius: '20px', background: '#fef2f2', border: '1.5px solid #fecaca',
                color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              × Remove Return Trip
            </button>
          </div>
        )}

        {dropoffLoc && isShuttle && stops.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <button
              onClick={() => setIsShuttle(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                borderRadius: '20px', background: '#fef2f2', border: '1.5px solid #fecaca',
                color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              × Remove Shuttle Engine
            </button>
          </div>
        )}


        {/* ── Smart Schedule Block (only Scheduled mode) ── */}
        {serviceMode === "scheduled" && tripType && (
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '22px', border: '1.5px solid #e2e8f0' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: 0 }}>Active Day Timeline</p>
              {(pickupLoc && dropoffLoc) || multiDayStore.length > 1 ? (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#0f172a', color: 'white', animation: 'fadeIn 0.3s ease' }}>
                  {tripType === 'one-way' ? '→ Smart One-Way' : tripType === 'roundtrip' ? '⇄ Smart Roundtrip' : tripType === 'multi-day' ? '🗺️ Multi-Day Tour' : '↺ Shuttle Engine'}
                </span>
              ) : (
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1.5s infinite' }} />
                  Detecting routing...
                </span>
              )}
            </div>

            {/* ── Step 1: Start Time (Date is inherited from active tab) ── */}
            {startDate && (
              <div style={{ display: 'grid', gridTemplateColumns: tripType === 'multi-day' && endDate ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '12px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>Start Time</span>
                    {multiDayStore.length > 1 && <span style={{ color: '#2563eb' }}>for Day {activeDayIdx + 1}</span>}
                  </label>
                  {(() => {
                    const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate;
                    const _now = new Date();
                    const currentLocalTime = mounted ? `${String(_now.getHours()).padStart(2, '0')}:${String(_now.getMinutes()).padStart(2, '0')}` : undefined;
                    const minTimeBound = (activeDate === today && today !== '') ? currentLocalTime : undefined;
                    return (
                      <TimePickerSelect
                        value={startTime}
                        onChange={(val) => setStartTime(val)}
                        minTime={minTimeBound}
                        style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: `1.5px solid ${startTime ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: '#f8fafc', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }}
                      />
                    );
                  })()}
                </div>
                {tripType === 'multi-day' && endDate && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>Finish Time {ataTime && <span style={{ fontSize: '10px', color: '#16a34a', fontStyle: 'italic', fontWeight: 500 }}>suggested</span>}</span>
                    </label>
                    <TimePickerSelect value={endTime}
                      onChange={(val) => handleEndChange(endDate, val)}
                      minTime={ataTime}
                      style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: `1.5px solid ${ataAutoFixed ? '#f97316' : endTime ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: '#f8fafc', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }} />

                    {ataAutoFixed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', animation: 'fadeIn 0.2s ease' }}>
                        <AlertTriangle style={{ width: '12px', height: '12px', color: '#ea580c', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#9a3412' }}>Finish time auto-adjusted — entered time was before estimated arrival.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                {/* ── ONE WAY: estimated arrival (auto) ── */}
                {tripType === 'one-way' && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      Estimated Arrival
                      {ataTime && <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '1px 6px' }}>AUTO</span>}
                    </label>
                    {!dropoffLoc ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #e2e8f0', background: '#f8fafc' }}>
                        <span style={{ fontSize: '13px' }}>📍</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Enter dropoff location below — arrival time will auto-calculate</span>
                      </div>
                    ) : routeLoading ? (
                      <div style={{ height: '40px', borderRadius: '10px', border: '1.5px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' }}>
                        <Clock style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>GIS calculating route…</span>
                      </div>
                    ) : ataTime ? (
                      <div style={{ height: '40px', borderRadius: '10px', border: '1.5px solid #bbf7d0', background: '#f0fdf4', display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 style={{ width: '14px', height: '14px', color: '#16a34a' }} />
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#15803d' }}>
                            {formatDateStr(ataDate, today)} · {formatTimeStr(ataTime)}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {routeDuration && `${formatDuration(routeDuration)} · ${routeDistance ? (routeDistance / 1000).toFixed(1) + ' km' : ''}`}
                        </span>
                      </div>
                    ) : (
                      <div style={{ height: '40px', borderRadius: '10px', border: '1.5px solid #fef08a', background: '#fefce8', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' }}>
                        <AlertTriangle style={{ width: '13px', height: '13px', color: '#ca8a04' }} />
                        <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>GIS unavailable — arrival time cannot be calculated</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ROUNDTRIP: ATA bar + editable return date/time ── */}
                {tripType === 'roundtrip' && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    {/* ATA info bar (shown once dropoff is entered) */}
                    {dropoffLoc && (
                      <div style={{ marginBottom: '10px' }}>
                        {routeLoading ? (
                          <div style={{ height: '36px', borderRadius: '10px', border: '1.5px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' }}>
                            <Clock style={{ width: '13px', height: '13px', color: '#2563eb' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>Calculating route &amp; ATA…</span>
                          </div>
                        ) : ataTime ? (
                          <div style={{ height: '36px', borderRadius: '10px', border: '1px solid #bbf7d0', background: '#f0fdf4', display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle2 style={{ width: '13px', height: '13px', color: '#16a34a' }} />
                              <span style={{ fontSize: '14px', fontWeight: 800, color: '#15803d' }}>
                                {formatDateStr(ataDate, today)} · {formatTimeStr(ataTime)}
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>{routeDistance ? (routeDistance / 1000).toFixed(1) + ' km' : ''}</span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Return fields — unlock only after dropoff entered */}
                    {!dropoffLoc ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #e2e8f0', background: '#f8fafc' }}>
                        <span style={{ fontSize: '13px' }}>📍</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Enter dropoff location — return date/time will be suggested automatically</span>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: endDate ? '1fr 1fr' : '1fr', gap: '10px', transition: 'all 0.3s ease' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                            Return Date
                            {ataDate && <span style={{ fontSize: '10px', color: '#16a34a', fontStyle: 'italic', fontWeight: 500 }}>suggested</span>}
                          </label>
                          <input type="date" value={endDate} min={ataDate || startDate || today}
                            onChange={(e) => handleEndChange(e.target.value, endTime)}
                            style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: `1.5px solid ${ataAutoFixed ? '#f97316' : endDate ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: 'white', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }} />
                        </div>
                        {endDate && (
                          <div style={{ animation: 'fadeIn 0.2s ease' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                              Return Time
                              {ataTime && <span style={{ fontSize: '10px', color: '#16a34a', fontStyle: 'italic', fontWeight: 500 }}>suggested</span>}
                            </label>
                            <TimePickerSelect value={endTime}
                              minTime={endDate === ataDate ? ataTime : undefined}
                              onChange={(val) => handleEndChange(endDate, val)}
                              style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: `1.5px solid ${ataAutoFixed ? '#f97316' : endTime ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: '#f8fafc', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }} />
                          </div>
                        )}
                      </div>
                    )}
                    {ataAutoFixed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '8px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                        <AlertTriangle style={{ width: '12px', height: '12px', color: '#ea580c', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#9a3412' }}>Return auto-adjusted — entered time was before estimated arrival.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SHUTTLE: explicit finish time + frequency calculation ── */}
                {tripType === 'shuttle' && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    {/* Pickup wait time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'white', border: '1.5px solid #e2e8f0', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Pickup Wait Time</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Wait at start location before departing</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setPickupWaitMin(Math.max(0, pickupWaitMin - 5))}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', minWidth: '36px', textAlign: 'center' }}>{pickupWaitMin}m</span>
                        <button onClick={() => setPickupWaitMin(pickupWaitMin + 5)}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>

                    {/* Total route time — only visible after at least pickup + dropoff entered */}
                    {!pickupLoc || !dropoffLoc ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #e2e8f0', background: '#f8fafc' }}>
                        <span style={{ fontSize: '13px' }}>📍</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Add pickup &amp; dropoff locations — shuttle timing will unlock</span>
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          let minDateForShuttle = startDate || today;
                          let minTimeForShuttle = undefined;
                          if (shuttleTotalSec && startDate && startTime) {
                            const activeDate = multiDayStore[activeDayIdx]?.dateStr || startDate;
                            const bounded = addSecondsToDatetime(activeDate, startTime, shuttleTotalSec);
                            minDateForShuttle = bounded.date;
                            if (endDate === bounded.date) minTimeForShuttle = bounded.time;
                          }
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: endDate ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '10px', transition: 'all 0.3s ease' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                  Shuttle Finish Date
                                </label>
                                <input type="date" value={endDate} min={minDateForShuttle}
                                  onChange={(e) => handleEndChange(e.target.value, endTime)}
                                  style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: `1.5px solid ${ataAutoFixed ? '#f97316' : endDate ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: 'white', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }} />
                              </div>
                              {endDate && (
                                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                    Shuttle Finish Time
                                  </label>
                                  <TimePickerSelect value={endTime}
                                    minTime={minTimeForShuttle}
                                    onChange={(val) => handleEndChange(endDate, val)}
                                    style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: `1.5px solid ${ataAutoFixed ? '#f97316' : endTime ? '#2563eb' : '#e2e8f0'}`, fontSize: '13px', fontWeight: 600, background: '#f8fafc', boxSizing: 'border-box', color: '#0f172a', cursor: 'pointer' }} />
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Display shuttle wait frequency and fleet dispatch timeline */}
                        {shuttleTotalSec && passengers ? (
                          <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', animation: 'fadeIn 0.2s ease', marginTop: '10px' }}>
                            {passengers > 1 && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Fleet Dispatch Mode</span>
                                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
                                  <button
                                    onClick={() => setShuttleStaggered(true)}
                                    style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: 'none', background: shuttleStaggered ? 'white' : 'transparent', color: shuttleStaggered ? '#7c3aed' : '#64748b', cursor: 'pointer', boxShadow: shuttleStaggered ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
                                    Staggered
                                  </button>
                                  <button
                                    onClick={() => setShuttleStaggered(false)}
                                    style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: 'none', background: !shuttleStaggered ? 'white' : 'transparent', color: !shuttleStaggered ? '#7c3aed' : '#64748b', cursor: 'pointer', boxShadow: !shuttleStaggered ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
                                    Simultaneous
                                  </button>
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Clock style={{ width: '16px', height: '16px', color: '#7c3aed', flexShrink: 0 }} />
                              <div>
                                <p style={{ fontSize: '12px', margin: 0, fontWeight: 700, color: '#5b21b6' }}>
                                  {shuttleStaggered && passengers > 1
                                    ? <span>Expected shuttle arrival every <span style={{ fontWeight: 900 }}>{Math.ceil(shuttleTotalSec / 60 / passengers)} mins</span></span>
                                    : <span>Vehicles arrive every <span style={{ fontWeight: 900 }}>{Math.ceil(shuttleTotalSec / 60)} mins</span></span>
                                  }
                                </p>
                                <p style={{ fontSize: '10px', margin: '2px 0 0', color: '#7c3aed' }}>
                                  {shuttleStaggered && passengers > 1
                                    ? `(${Math.ceil(shuttleTotalSec / 60)} min loop duration ÷ ${passengers} staggered vehicles)`
                                    : `(${Math.ceil(shuttleTotalSec / 60)} min loop duration with ${passengers} simultaneous vehicles)`
                                  }
                                </p>
                              </div>
                            </div>

                            {shuttleStaggered && passengers > 1 && (
                              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {Array.from({ length: passengers }).map((_, i) => {
                                  const waitTimeSec = (shuttleTotalSec / passengers) * i;
                                  const vTime = addSecondsToDatetime(startDate || today, startTime, waitTimeSec).time;
                                  return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'white', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ede9fe' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>{i + 1}</span>
                                        <span style={{ fontWeight: 600, color: '#4c1d95' }}>Vehicle</span>
                                      </div>
                                      <span style={{ fontWeight: 800, color: '#7c3aed' }}>{formatTimeStr(vTime)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : shuttleLoading && (
                          <div style={{ height: '40px', borderRadius: '10px', border: '1.5px solid #bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' }}>
                            <Clock style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>Calculating all route legs…</span>
                          </div>
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


        {/* ── Passenger Counter OR Shuttle Vehicle Count ── */}
        {tripType === 'shuttle' ? (
          // Shuttle: ask for number of vehicles instead of passengers
          <div style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #ddd6fe', background: '#faf5ff', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Car style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Number of Vehicles</p>
                  <p style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600, margin: '2px 0 0' }}>Each vehicle runs the full route</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => { const n = Math.max(1, passengers - 1); setPassengers(n); setPassengerInput(String(n)) }}
                  style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #ddd6fe', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7c3aed', fontSize: '20px', lineHeight: 1, fontWeight: 300 }}
                >−</button>
                <input
                  type="number" min={1}
                  value={passengerInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPassengerInput(e.target.value)}
                  onBlur={(e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 1)
                    setPassengers(v); setPassengerInput(String(v))
                  }}
                  style={{ width: '52px', height: '34px', textAlign: 'center', borderRadius: '10px', border: '1.5px solid #ddd6fe', fontSize: '16px', fontWeight: 800, color: '#0f172a', background: 'white', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => { const n = Math.min(999, passengers + 1); setPassengers(n); setPassengerInput(String(n)) }}
                  style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #ddd6fe', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7c3aed', fontSize: '20px', lineHeight: 1, fontWeight: 300 }}
                >+</button>
              </div>
            </div>
            {/* Smart timing hint */}
            {shuttleTotalSec && passengers > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '8px', background: '#ede9fe', border: '1px solid #ddd6fe' }}>
                <span style={{ fontSize: '13px' }}>⚡</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#5b21b6' }}>
                  Tightest loop: ~{Math.ceil(shuttleTotalSec / 60)} min between pickups with {passengers} vehicle{passengers > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        ) : (
          // One-Way / Roundtrip: passenger count
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: 'white', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users style={{ width: '16px', height: '16px', color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Passengers</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: '2px 0 0' }}>Including yourself</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { const n = Math.max(1, passengers - 1); setPassengers(n); setPassengerInput(String(n)) }}
                style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '20px', lineHeight: 1, fontWeight: 300 }}
              >−</button>
              <input
                type="number" min={1}
                value={passengerInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPassengerInput(e.target.value)}
                onBlur={(e) => {
                  const v = Math.max(1, parseInt(e.target.value) || 1)
                  setPassengers(v); setPassengerInput(String(v))
                }}
                style={{ width: '52px', height: '34px', textAlign: 'center', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '16px', fontWeight: 800, color: '#0f172a', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => { const n = Math.min(999, passengers + 1); setPassengers(n); setPassengerInput(String(n)) }}
                style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '20px', lineHeight: 1, fontWeight: 300 }}
              >+</button>
            </div>
          </div>
        )}

        {/* ── Advanced Amenities ── */}
        {(pickupLoc && dropoffLoc) && (
          <div style={{ padding: '0 0 20px', animation: 'fadeIn 0.3s ease' }}>
            <button onClick={() => setShowAmenities(!showAmenities)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', padding: '14px 18px', borderRadius: '14px', cursor: 'pointer', border: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings2 style={{ width: '15px', height: '15px', color: '#475569' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Advanced Amenities</p>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', fontWeight: 600 }}>ADA Accessibility & Preferences</p>
                </div>
              </div>
              <ChevronDown style={{ width: '18px', height: '18px', color: '#94a3b8', transform: showAmenities ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showAmenities && (
              <div style={{ marginTop: '12px', padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', animation: 'slideDown 0.2s ease' }}>

                {/* Wheelchair Accessible (ADA) */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Accessibility style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                        Wheelchair Accessible (ADA)
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                        ADA-accessible vehicles are <strong style={{ color: '#2563eb' }}>strictly guaranteed</strong> when requested. We will exclusively match you with equipped vehicles.
                      </p>
                    </div>
                    <button onClick={() => setAdaRequired(!adaRequired)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: adaRequired ? '#2563eb' : '#cbd5e1', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: adaRequired ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                    </button>
                  </div>

                  {/* ADA Multi-Vehicle Selector */}
                  {adaRequired && ((tripType === 'shuttle' && passengers > 1) || passengers > 4) && (
                    <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeIn 0.2s ease' }}>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: '#1e40af', margin: 0 }}>How many ADA vehicles?</p>
                        <p style={{ fontSize: '10px', color: '#3b82f6', margin: '2px 0 0', fontWeight: 600 }}>Specify the exact count required</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setAdaVehicleCount(Math.max(1, adaVehicleCount - 1))} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', border: '1.5px solid #bfdbfe', color: '#1e40af', fontWeight: 800, cursor: 'pointer' }}>−</button>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#1e40af', width: '24px', textAlign: 'center' }}>{adaVehicleCount}</span>
                        <button onClick={() => setAdaVehicleCount(adaVehicleCount + 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', border: '1.5px solid #bfdbfe', color: '#1e40af', fontWeight: 800, cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: '#e2e8f0', margin: '0 0 16px' }} />

                {/* Amenities & Extras */}
                <div>
                  <h5 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: '0 0 10px' }}>Amenities &amp; Extras</h5>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4, padding: '8px 10px', background: '#f1f5f9', borderRadius: '8px', borderLeft: '3px solid #94a3b8' }}>
                    We prioritize accommodating these requests, but they are subject to fleet availability on the day of service.
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Standard Amenities</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['A/C', 'Heat', 'Restroom', 'WiFi', 'PA System', 'DVD', 'CD Player', 'Power Outlet', 'Satellite TV'].map(am => {
                        const isSelected = selectedAmenities.includes(am)
                        return (
                          <button key={am} onClick={() => setSelectedAmenities(prev => isSelected ? prev.filter(a => a !== am) : [...prev, am])} style={{ padding: '6px 12px', borderRadius: '20px', background: isSelected ? '#0f172a' : 'white', color: isSelected ? 'white' : '#475569', fontSize: '12px', fontWeight: 700, border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s' }}>
                            {isSelected && '✓ '} {am}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Special Extras</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['Child Seat', 'Booster Seat', 'Bottled Water', 'Extra Legroom', 'Professional VIP Driver', 'Quiet Ride'].map(am => {
                        const isSelected = selectedAmenities.includes(am)
                        return (
                          <button key={am} onClick={() => setSelectedAmenities(prev => isSelected ? prev.filter(a => a !== am) : [...prev, am])} style={{ padding: '6px 12px', borderRadius: '20px', background: isSelected ? '#0f172a' : 'white', color: isSelected ? 'white' : '#475569', fontSize: '12px', fontWeight: 700, border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s' }}>
                            {isSelected && '✓ '} {am}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── CTA ── */}
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
              const payload = {
                pickupValue,
                pickup: pickupLoc,
                dropoffValue,
                dropoff: dropoffLoc,
                startDate,
                startTime,
                endDate,
                endTime,
                tripType,
                serviceMode,
                countryCode: cCode,
                country: clientGeoContext.country,
                passengers,
                stops,
                multiDayStore,
                selectedAmenities,
                adaRequired,
                adaVehicleCount,
                distance: routeDistance ? Math.round((cCode === 'US' || cCode === 'GB') ? routeDistance * 0.000621371 : routeDistance / 1000) : 40,
                duration: routeDuration || 3600,
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
            width: '100%', height: '54px', borderRadius: '14px',
            background: isFormValid ? '#0f172a' : '#e2e8f0',
            color: isFormValid ? 'white' : '#94a3b8',
            fontWeight: 800, fontSize: '14px', letterSpacing: '-0.2px',
            border: 'none',
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
            marginBottom: '26px', boxSizing: 'border-box',
            transition: 'all 0.2s',
          }}
        >
          {routeLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Connecting to Backend...
            </span>
          ) : isFormValid ? (
            serviceMode === "asap"
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap style={{ width: '16px', height: '16px', color: '#fbbf24' }} /> Request Now — See Prices</span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarDays style={{ width: '16px', height: '16px' }} /> Schedule — See Prices</span>
          ) : (
            <>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Enter required fields to continue</span>
              <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.7 }}>
                Missing: {missingFields.join(', ')}
              </span>
            </>
          )}
        </button>

        {/* ── Divider + Suggestions ── */}
        {tripType && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ height: '1px', background: '#f1f5f9', marginBottom: '20px' }} />
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Suggestions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '24px' }}>
              {(() => {
                const recents = mounted ? getRecentLocations() : [];
                if (recents.length > 0) {
                  return recents.map((place, i) => (
                    <button key={i}
                      onClick={() => { setDropoffValue(place.address); if (onDropoffChange) onDropoffChange(place as any) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 8px', borderRadius: '12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock style={{ width: '17px', height: '17px', color: '#ca8a04' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name || place.address.split(',')[0]}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                      </div>
                    </button>
                  ))
                }
                
                return [
                  { name: "Corporate HQ", address: "123 Business Park, Silicon Valley", Icon: Briefcase },
                  { name: "JFK Airport", address: "Terminal 4 Arrivals", Icon: Navigation },
                  { name: "Home", address: "Add your home address", Icon: MapPin },
                ].map((place, i) => (
                  <button key={`static-${i}`}
                    onClick={() => { setDropoffValue(place.address); if (onDropoffChange) onDropoffChange({ address: place.address } as any) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 8px', borderRadius: '12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <place.Icon style={{ width: '17px', height: '17px', color: '#475569' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                    </div>
                  </button>
                ))
              })()}
            </div>
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
            passengers={passengers}
            routeDistanceKm={routeDistance ? Math.round((clientGeoContext.countryCode === 'US' || clientGeoContext.countryCode === 'GB') ? routeDistance * 0.000621371 : routeDistance / 1000) : 40}
            bookingDetails={{
              pickup: pickupLoc,
              dropoff: dropoffLoc,
              startDate,
              startTime,
              endDate,
              endTime,
              ataDate,
              ataTime,
              tripType,
              countryCode: (pickupLoc?.countryCode || clientGeoContext.countryCode || "US").toUpperCase(),
              passengers,
              stops,
              multiDayStore,
              selectedAmenities,
              adaRequired,
              adaVehicleCount,
              distance: routeDistance ? Math.round((clientGeoContext.countryCode === 'US' || clientGeoContext.countryCode === 'GB') ? routeDistance * 0.000621371 : routeDistance / 1000) : 40,
              duration: routeDuration || 3600,
              routePolyline: routePolyline
            }}
          />
        </div>
      )}
    </div>
  )
}
