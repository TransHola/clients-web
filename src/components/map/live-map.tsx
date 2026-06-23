"use client"

import * as React from "react"
import { Layers, LocateFixed, RotateCcw, History } from "lucide-react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-routing-machine"

const MAP_LAYERS = {
  light: {
    name: "Clean Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    maxZoom: 21,
    attribution: "&copy; CARTO"
  },
  dark: {
    name: "Dark Mode",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    maxZoom: 21,
    attribution: "&copy; CARTO"
  },
  street: {
    name: "Google 3D Street",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    maxZoom: 22,
    attribution: "Map data © Google"
  },
  satellite: {
    name: "Google Satellite",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    maxZoom: 22,
    attribution: "Map data © Google"
  }
}

export interface PinLocation {
  address: string
  name?: string
  coordinate: { lat: number; lon: number }
  countryCode?: string
}

export interface StopLocation {
  id: string
  address: string
  loc: PinLocation | null
  stopDurationMin: number
}

// ─── Stored route snapshot for history ────────────────────────────────────────
interface RouteSnapshot {
  label: string
  waypoints: L.LatLng[]
}

// ─── Saved route record (for "Save Route" button) ─────────────────────────────
export interface SavedRoute {
  id: string
  label: string
  savedAt: string     // ISO timestamp
  durationSec: number
  distanceM: number
  smartScore: number  // 0–100 AI score (higher = smarter route)
  pickup: PinLocation
  dropoff: PinLocation
  stops: StopLocation[]
}

// ─── Custom Uber-style SVG markers ────────────────────────────────────────────
function makePin(type: "start" | "stop" | "end", label?: string | number) {
  let svg = ""
  if (type === "start") {
    svg = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24S32 27 32 16C32 7.163 24.837 0 16 0z" fill="#0f172a"/>
      <circle cx="16" cy="16" r="7" fill="white"/>
    </svg>`
  } else if (type === "end") {
    svg = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24S32 27 32 16C32 7.163 24.837 0 16 0z" fill="#2563eb"/>
      <rect x="10" y="10" width="12" height="12" rx="2" fill="white"/>
    </svg>`
  } else {
    // Numbered shuttle stop — amber/purple
    svg = `<svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.313 15 23 15 23S30 25.313 30 15C30 6.716 23.284 0 15 0z" fill="#7c3aed"/>
      <circle cx="15" cy="15" r="9" fill="white" fill-opacity="0.2"/>
      <text x="15" y="20" font-family="Arial" font-size="11" font-weight="900" text-anchor="middle" fill="white">${label}</text>
    </svg>`
  }
  return L.divIcon({
    className: "",
    html: svg,
    iconSize: type === "stop" ? [30, 38] : [32, 40],
    iconAnchor: type === "stop" ? [15, 38] : [16, 40],
    popupAnchor: [0, -44],
  })
}

// ─── Reverse geocode via Nominatim ─────────────────────────────────────────────
async function reverseGeocode(lat: number, lon: number): Promise<PinLocation> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    )
    const data = await res.json()
    const name =
      data.address?.amenity ||
      data.address?.building ||
      data.address?.road ||
      data.address?.neighbourhood ||
      data.address?.suburb ||
      ""
    return {
      address: data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      name: name || undefined,
      coordinate: { lat, lon },
      countryCode: data.address?.country_code?.toUpperCase(),
    }
  } catch {
    return {
      address: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      coordinate: { lat, lon },
    }
  }
}

// ─── Draggable start/end marker ───────────────────────────────────────────────
function DraggableMarker({
  location,
  type,
  onMoved,
  locked,
}: {
  location: PinLocation
  type: "start" | "end"
  onMoved: (loc: PinLocation) => void
  locked?: boolean
}) {
  const markerRef = React.useRef<L.Marker>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const icon = makePin(type)

  const eventHandlers = React.useMemo(() => ({
    dragstart() { if (!locked) setIsDragging(true) },
    async dragend() {
      if (locked) return
      setIsDragging(false)
      const marker = markerRef.current
      if (!marker) return
      const { lat, lng } = marker.getLatLng()
      const newLoc = await reverseGeocode(lat, lng)
      onMoved(newLoc)
      marker.openPopup()
    },
  }), [onMoved, locked])

  return (
    <Marker
      draggable={!locked}
      ref={markerRef}
      position={[Number(location.coordinate.lat), Number(location.coordinate.lon)]}
      icon={icon}
      eventHandlers={eventHandlers}
      opacity={isDragging ? 0.7 : 1}
    >
      <Popup>
        <div style={{ minWidth: '180px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 3px', color: '#0f172a' }}>
            {location.name || location.address.split(",")[0]}
          </p>
          {location.name && (
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{location.address}</p>
          )}
          <p style={{ fontSize: '10px', color: locked ? '#ef4444' : '#cbd5e1', margin: '4px 0 0', fontStyle: 'italic' }}>
            {locked ? '🔒 Edit trip to adjust location' : 'Drag to adjust exact location'}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}

// ─── Draggable numbered stop marker ──────────────────────────────────────────
function DraggableStopMarker({
  stop,
  index,
  onMoved,
  locked,
}: {
  stop: StopLocation
  index: number
  onMoved: (id: string, loc: PinLocation) => void
  locked?: boolean
}) {
  const markerRef = React.useRef<L.Marker>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const icon = makePin("stop", index + 1)
  const loc = stop.loc!

  const eventHandlers = React.useMemo(() => ({
    dragstart() { if (!locked) setIsDragging(true) },
    async dragend() {
      if (locked) return
      setIsDragging(false)
      const marker = markerRef.current
      if (!marker) return
      const { lat, lng } = marker.getLatLng()
      const newLoc = await reverseGeocode(lat, lng)
      onMoved(stop.id, newLoc)
      marker.openPopup()
    },
  }), [onMoved, stop.id, locked])

  return (
    <Marker
      draggable={!locked}
      ref={markerRef}
      position={[Number(loc.coordinate.lat), Number(loc.coordinate.lon)]}
      icon={icon}
      eventHandlers={eventHandlers}
      opacity={isDragging ? 0.7 : 1}
    >
      <Popup>
        <div style={{ minWidth: '180px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stop {index + 1}</p>
          <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 3px', color: '#0f172a' }}>
            {loc.name || loc.address.split(",")[0]}
          </p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px' }}>Wait: {stop.stopDurationMin}m</p>
          <p style={{ fontSize: '10px', color: locked ? '#ef4444' : '#cbd5e1', margin: 0, fontStyle: 'italic' }}>
            {locked ? '🔒 Edit trip to adjust' : 'Drag to adjust'}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}

// ─── Auto-zoom controller ─────────────────────────────────────────────────────
function MapController({
  pickup,
  dropoff,
  stops,
  userLocation,
}: {
  pickup?: PinLocation | null
  dropoff?: PinLocation | null
  stops?: StopLocation[]
  userLocation?: { lat: number; lon: number } | null
}) {
  const map = useMap()

  React.useEffect(() => {
    const all: [number, number][] = []
    const isValidCoord = (c: any) => {
      if (!c) return false;
      const lat = typeof c.lat === 'string' ? parseFloat(c.lat) : Number(c.lat);
      const lon = typeof c.lon === 'string' ? parseFloat(c.lon) : Number(c.lon);
      return typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);
    };

    const addIfValid = (c: any) => {
      if (isValidCoord(c)) all.push([Number(c.lat), Number(c.lon)]);
    };

    if (isValidCoord(pickup?.coordinate)) addIfValid(pickup!.coordinate)
    stops?.forEach(s => { if (isValidCoord(s.loc?.coordinate)) addIfValid(s.loc!.coordinate) })
    if (isValidCoord(dropoff?.coordinate)) addIfValid(dropoff!.coordinate)

    const doCenter = (animate = true) => {
      try {
        map.invalidateSize()
        if (all.length >= 2) {
          const bounds = L.latLngBounds(all)
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15, animate, duration: animate ? 1.2 : 0 })
          }
        } else if (all.length === 1) {
          if (animate) map.flyTo(all[0], 15, { duration: 1.0 })
          else map.setView(all[0], 15, { animate: false })
        } else if (userLocation) {
          if (animate) map.flyTo([Number(userLocation.lat) || 20, Number(userLocation.lon) || 0], 13, { duration: 1.2 })
          else map.setView([Number(userLocation.lat) || 20, Number(userLocation.lon) || 0], 13, { animate: false })
        }
      } catch (e) {
        // ignore Leaflet unmount issues
      }
    }

    // Initial center/fly on coordinate change
    setTimeout(() => doCenter(true), 100)

    // Watch for dynamic page layout changes (e.g. side-panels opening)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => doCenter(false))
    })

    const container = map.getContainer()
    if (container) {
      resizeObserver.observe(container)
    }

    return () => resizeObserver.disconnect()
  }, [pickup, dropoff, stops, userLocation, map])

  return null
}

// ─── Multi-waypoint routing machine with route history ─────────────────────────
function RoutingMachine({
  pickup,
  dropoff,
  stops,
  tripType,
  roundTripMode,
  multiDayStore,
  onHistoryChange,
  onRouteFound,
  onAutoSaveTrigger,
}: {
  pickup: PinLocation
  dropoff: PinLocation
  stops?: StopLocation[]
  tripType?: string
  roundTripMode?: string
  multiDayStore?: any[]
  onHistoryChange?: (histLen: number, reinstatePrev: () => void, reinstateInitial: () => void) => void
  onRouteFound?: (durationSec: number, distanceM: number, oneWayDur?: number, oneWayDist?: number) => void
  onAutoSaveTrigger?: () => void
}) {
  const map = useMap()
  const controlRef = React.useRef<any>(null)
  // Route snapshot history: index 0 = initial
  const historyRef = React.useRef<RouteSnapshot[]>([])
  const isFirstRoute = React.useRef(true)

  const tripTypeRef = React.useRef(tripType)
  React.useEffect(() => {
    tripTypeRef.current = tripType
  }, [tripType])

  const safeRemove = (ctrl: any) => {
    try {
      if (ctrl) {
        // Prevent 'Cannot read properties of null (reading removeLayer)' on unmount
        if (ctrl.getPlan) {
          ctrl.getPlan().setWaypoints([]);
        }
        if (ctrl._map) {
          ctrl._map.removeControl(ctrl);
        }
      }
    } catch (e) {
      console.warn("Leaflet cleanup warning:", e);
    }
  }

  const buildWaypoints = React.useCallback(() => {
    const wps: L.LatLng[] = []
    const isValidCoord = (c: any) => {
      if (!c) return false;
      const lat = typeof c.lat === 'string' ? parseFloat(c.lat) : Number(c.lat);
      const lon = typeof c.lon === 'string' ? parseFloat(c.lon) : Number(c.lon);
      return typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);
    };

    const addIfValid = (c: any) => {
      if (isValidCoord(c)) wps.push(L.latLng(Number(c.lat), Number(c.lon)));
    };

    if (tripType === 'multi-day' && multiDayStore && multiDayStore.length > 0) {
      multiDayStore.forEach(day => {
        if (isValidCoord(day.pickupLoc?.coordinate)) addIfValid(day.pickupLoc!.coordinate)
        day.stops?.forEach((s: any) => { if (isValidCoord(s.loc?.coordinate)) addIfValid(s.loc!.coordinate) })
        if (isValidCoord(day.dropoffLoc?.coordinate)) addIfValid(day.dropoffLoc!.coordinate)
      })
      return wps
    }

    if (isValidCoord(pickup?.coordinate)) addIfValid(pickup!.coordinate)
    
    // For all trip types, we now follow the sequential form layout:
    // Pickup -> Stops -> Dropoff (End Location)
    stops?.forEach(s => { if (isValidCoord(s.loc?.coordinate)) addIfValid(s.loc!.coordinate) })
    if (isValidCoord(dropoff?.coordinate)) addIfValid(dropoff!.coordinate)

    if (tripType === 'roundtrip' && roundTripMode === 'continuous') {
      if (isValidCoord(pickup?.coordinate)) addIfValid(pickup!.coordinate)
    }

    return wps
  }, [pickup, dropoff, stops, tripType, roundTripMode])

  // Apply a specific set of waypoints (for reinstate)
  const applyWaypoints = React.useCallback((wps: L.LatLng[], label: string) => {
    if (!controlRef.current) return
    // Push current state to history before applying
    const currentWps = controlRef.current.getWaypoints().map((wp: any) => wp.latLng).filter(Boolean)
    if (currentWps.length >= 2) {
      historyRef.current.push({ label: 'Before reinstate', waypoints: currentWps })
    }
    controlRef.current.setWaypoints(wps)
    onHistoryChange?.(historyRef.current.length, reinstateHandlers.prev, reinstateHandlers.initial)
  }, [])

  // Reinstate handlers (stable refs updated via effect)
  const reinstateHandlers = React.useMemo(() => ({
    prev: () => {
      const hist = historyRef.current
      if (hist.length === 0 || !controlRef.current) return
      const snap = hist.pop()!
      controlRef.current.setWaypoints(snap.waypoints)
      onHistoryChange?.(hist.length, reinstateHandlers.prev, reinstateHandlers.initial)
    },
    initial: () => {
      const hist = historyRef.current
      if (hist.length === 0 || !controlRef.current) return
      const snap = hist[0]
      // Keep all history, just apply initial
      controlRef.current.setWaypoints(snap.waypoints)
      onHistoryChange?.(hist.length, reinstateHandlers.prev, reinstateHandlers.initial)
    },
  }), [onHistoryChange])

  // 1. Initialize control once
  React.useEffect(() => {
    if (!map) return

    const control = L.Routing.control({
      waypoints: [], // Start empty, will be set in the next effect
      lineOptions: {
        styles: [{ color: "#0ea5e9", weight: 5, opacity: 0.8, className: "animated-polyline" }],
        extendToWaypoints: true,
        missingRouteTolerance: 10,
      },
      routeLine: function (route: any, options: any) {
        const type = tripTypeRef.current;
        if ((type === 'shuttle' || type === 'roundtrip' || type === 'multi-day') && route.waypointIndices && route.waypointIndices.length >= 2) {
          const splitIdx = route.waypointIndices[route.waypointIndices.length - 2];
          const forwardCoords = route.coordinates.slice(0, splitIdx + 1);
          const returnCoords = route.coordinates.slice(splitIdx);

          const forwardTrack = L.polyline(forwardCoords, { color: "#0ea5e9", weight: 5, opacity: 0.2 });
          const returnTrack = L.polyline(returnCoords, { color: type === 'shuttle' ? "#7c3aed" : "#f59e0b", weight: 5, opacity: 0.2 });

          const forwardLine = L.polyline(forwardCoords, { color: "#0ea5e9", weight: 5, opacity: 0.9, className: "snake-forward" });
          forwardLine.on('add', () => {
            const el = forwardLine.getElement() as SVGPathElement;
            if (el && el.getTotalLength) {
              el.style.setProperty('--path-length', el.getTotalLength().toString());
            }
          });

          const returnLine = L.polyline(returnCoords, { color: type === 'shuttle' ? "#7c3aed" : "#f59e0b", weight: 5, opacity: 0.9, className: "snake-return" });
          returnLine.on('add', () => {
            const el = returnLine.getElement() as SVGPathElement;
            if (el && el.getTotalLength) {
              el.style.setProperty('--path-length', el.getTotalLength().toString());
            }
          });

          return L.layerGroup([forwardTrack, returnTrack, forwardLine, returnLine]);
        }
        
        // One-way or standard multi-stop
        const track = L.polyline(route.coordinates, { color: "#0ea5e9", weight: 5, opacity: 0.2 });
        const line = L.polyline(route.coordinates, { color: "#0ea5e9", weight: 5, opacity: 0.9, className: "snake-oneway" });
        line.on('add', () => {
          const el = line.getElement() as SVGPathElement;
          if (el && el.getTotalLength) {
            el.style.setProperty('--path-length', el.getTotalLength().toString());
          }
        });
        
        return L.layerGroup([track, line]);
      },
      createMarker: (() => null) as any,
      router: L.Routing.osrmv1({
        serviceUrl: (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/gis/osrm/route/v1",
        profile: "driving",
      }),
      show: false,
      fitSelectedRoutes: false,
      addWaypoints: false,
      draggableWaypoints: false,
    } as any).addTo(map)

    control.on("routesfound", (e: any) => {
      const container = control.getContainer()
      if (container) container.style.display = "none"

      const route = e.routes?.[0]
      if (route && onRouteFound) {
        let oneWayTime = 0;
        let oneWayDistance = 0;
        const type = tripTypeRef.current;
        if ((type === 'shuttle' || type === 'roundtrip' || type === 'multi-day') && route.waypointIndices && route.waypointIndices.length >= 2) {
          const splitIdx = route.waypointIndices[route.waypointIndices.length - 2];
          if (route.instructions) {
            for (const inst of route.instructions) {
              if (inst.index < splitIdx) {
                oneWayTime += (inst.time || 0);
                oneWayDistance += (inst.distance || 0);
              }
            }
          }
        }
        onRouteFound(
          route.summary?.totalTime ?? 0,
          route.summary?.totalDistance ?? 0,
          oneWayTime || undefined,
          oneWayDistance || undefined
        )
        // Trigger auto-save request to parent after route is resolved
        if (onAutoSaveTrigger) onAutoSaveTrigger()
      }
    })

    controlRef.current = control

    return () => {
      safeRemove(control)
      controlRef.current = null
    }
  }, [map]) // Run only on map init

  // 2. Update waypoints (and history) when pickup/dropoff/stops change
  React.useEffect(() => {
    if (!controlRef.current) return

    if (!pickup?.coordinate || !dropoff?.coordinate) {
      const currentWps = controlRef.current.getWaypoints().map((wp: any) => wp.latLng).filter(Boolean)
      if (currentWps.length > 0) {
        controlRef.current.setWaypoints([])
        if (onRouteFound) onRouteFound(0, 0, undefined, undefined)
      }
      return
    }

    const waypoints = buildWaypoints()
    const currentWps = controlRef.current.getWaypoints().map((wp: any) => wp.latLng).filter(Boolean)

    // Check if waypoints actually changed
    const wpsChanged = JSON.stringify(waypoints) !== JSON.stringify(currentWps)

    if (wpsChanged) {
      if (isFirstRoute.current) {
        historyRef.current = []
        isFirstRoute.current = false
      } else if (currentWps.length >= 2) {
        // Push current prior state to history before changing
        historyRef.current.push({ label: `Adjustment ${historyRef.current.length + 1}`, waypoints: [...currentWps] })
        onHistoryChange?.(historyRef.current.length, reinstateHandlers.prev, reinstateHandlers.initial)
      }
      
      // Clear route metrics immediately while the new route is fetching
      if (onRouteFound) onRouteFound(0, 0, undefined, undefined)
      
      controlRef.current.setWaypoints(waypoints)
    }

  }, [pickup, dropoff, stops, buildWaypoints, onHistoryChange, reinstateHandlers])

  return null
}

// ─── Main map component ───────────────────────────────────────────────────────
export function LiveMap({
  pickup,
  dropoff,
  stops,
  tripType,
  roundTripMode,
  shuttleVehicles = 1,
  multiDayStore,
  userLocation,
  onPickupMoved,
  onDropoffMoved,
  onStopMoved,
  onRestoreRoute,
  pinsLocked,
  isStaticPreview = false,
  countryCode,
  distanceUnit = 'km',
}: {
  pickup?: any
  dropoff?: any
  stops?: StopLocation[]
  tripType?: string
  roundTripMode?: string
  shuttleVehicles?: number
  multiDayStore?: any[]
  userLocation?: { lat: number; lon: number } | null
  onPickupMoved?: (loc: PinLocation) => void
  onDropoffMoved?: (loc: PinLocation) => void
  onStopMoved?: (id: string, loc: PinLocation) => void
  onRestoreRoute?: (pickup: PinLocation, dropoff: PinLocation, stops: StopLocation[]) => void
  pinsLocked?: boolean
  isStaticPreview?: boolean
  countryCode?: string
  distanceUnit?: string
}) {
  const defaultCenter: [number, number] = userLocation
    ? [Number(userLocation.lat) || 20, Number(userLocation.lon) || 0]
    : [20, 0]

  const formatDistance = (distanceMeters: number) => {
    if (distanceUnit === 'mi') {
      return `${(distanceMeters * 0.000621371).toFixed(1)} mi`;
    }
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  // Route history UI state
  const [histLen, setHistLen] = React.useState(0)
  const reinstateRef = React.useRef<{ prev: () => void; initial: () => void }>({
    prev: () => { },
    initial: () => { },
  })

  // Live route metrics from RoutingMachine
  const [liveRouteDuration, setLiveRouteDuration] = React.useState<number | null>(null)
  const [liveRouteDistance, setLiveRouteDistance] = React.useState<number | null>(null)
  const [liveOneWayDuration, setLiveOneWayDuration] = React.useState<number | null>(null)
  const [liveOneWayDistance, setLiveOneWayDistance] = React.useState<number | null>(null)
  const [savedRoutes, setSavedRoutes] = React.useState<SavedRoute[]>([])
  const [showSaved, setShowSaved] = React.useState(false)
  const [mapLayer, setMapLayer] = React.useState<keyof typeof MAP_LAYERS>("light")
  const [showLayerMenu, setShowLayerMenu] = React.useState(false)

  // AI Smart Score: 0–100. Uses time/km efficiency relative to a naive average speed baseline.
  const computeSmartScore = (durationSec: number, distanceM: number): number => {
    if (!durationSec || !distanceM) return 0
    // Baseline: average urban speed 30 km/h = 8.33 m/s, add 20% overhead
    const baselineSec = (distanceM / 8.33) * 1.2
    // Efficiency ratio: how much better than baseline (capped at 1.5x for 100)
    const ratio = Math.min(baselineSec / durationSec, 1.5)
    // Map 0.5–1.5 ratio to 0–100 score
    const score = Math.round(((ratio - 0.5) / 1.0) * 100)
    return Math.max(0, Math.min(100, score))
  }

  const smartScore = liveRouteDuration && liveRouteDistance
    ? computeSmartScore(liveRouteDuration, liveRouteDistance)
    : null

  const handleRouteFound = React.useCallback((durationSec: number, distanceM: number, oneWayDur?: number, oneWayDist?: number) => {
    setLiveRouteDuration(durationSec)
    setLiveRouteDistance(distanceM)
    setLiveOneWayDuration(oneWayDur || null)
    setLiveOneWayDistance(oneWayDist || null)
  }, [])

  const autoSaveRoute = React.useCallback(() => {
    if (!liveRouteDuration || !liveRouteDistance || !pickup?.coordinate || !dropoff?.coordinate) return

    // Determine uniqueness by combined distance + duration hash
    const hash = `${Math.round(liveRouteDistance)}|${Math.round(liveRouteDuration)}`

    setSavedRoutes(prev => {
      // Don't save if we already have this exact route profile
      if (prev.some(r => `${Math.round(r.distanceM)}|${Math.round(r.durationSec)}` === hash)) {
        return prev
      }

      const score = computeSmartScore(liveRouteDuration, liveRouteDistance)
      const r: SavedRoute = {
        id: Date.now().toString(),
        label: `Route ${prev.length + 1}`,
        savedAt: new Date().toISOString(),
        durationSec: liveRouteDuration,
        distanceM: liveRouteDistance,
        smartScore: score,
        pickup,
        dropoff,
        stops: stops || [],
      }
      return [r, ...prev].sort((a, b) => b.smartScore - a.smartScore)
    })
  }, [liveRouteDuration, liveRouteDistance, pickup, dropoff, stops])

  const formatDur = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const handleHistoryChange = React.useCallback((len: number, prev: () => void, initial: () => void) => {
    setHistLen(len)
    reinstateRef.current = { prev, initial }
  }, [])
  const isValidCoord = (c: any) => {
    if (!c) return false;
    const lat = typeof c.lat === 'string' ? parseFloat(c.lat) : Number(c.lat);
    const lon = typeof c.lon === 'string' ? parseFloat(c.lon) : Number(c.lon);
    return typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);
  };
  const activeStops = stops?.filter(s => s.loc?.coordinate && isValidCoord(s.loc.coordinate)) ?? []
  const hasRoute = isValidCoord(pickup?.coordinate) && isValidCoord(dropoff?.coordinate)

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <style jsx global>{`
        .animated-polyline {
            stroke-dasharray: 20, 20;
            animation: dashAnimation 1s linear infinite;
        }
        @keyframes dashAnimation {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
        }
        .snake-oneway {
            stroke-dasharray: var(--path-length);
            stroke-dashoffset: var(--path-length);
            animation: snakeOnewayAnim 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            stroke-linecap: round;
        }
        @keyframes snakeOnewayAnim {
            0% { stroke-dashoffset: var(--path-length); opacity: 1; }
            80% { stroke-dashoffset: 0; opacity: 1; }
            90% { stroke-dashoffset: 0; opacity: 0; }
            100% { stroke-dashoffset: 0; opacity: 0; }
        }
        .snake-forward {
            stroke-dasharray: var(--path-length);
            stroke-dashoffset: var(--path-length);
            animation: snakeForwardAnim 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            stroke-linecap: round;
        }
        .snake-return {
            stroke-dasharray: var(--path-length);
            stroke-dashoffset: var(--path-length);
            animation: snakeReturnAnim 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            stroke-linecap: round;
        }
        @keyframes snakeForwardAnim {
            0% { stroke-dashoffset: var(--path-length); opacity: 1; }
            45% { stroke-dashoffset: 0; opacity: 1; }
            50% { stroke-dashoffset: 0; opacity: 0; }
            100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes snakeReturnAnim {
            0% { stroke-dashoffset: var(--path-length); opacity: 0; }
            50% { stroke-dashoffset: var(--path-length); opacity: 1; }
            95% { stroke-dashoffset: 0; opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={userLocation ? 13 : 2}
        maxZoom={22}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        {!isStaticPreview && <ZoomControl position="bottomright" />}
        <TileLayer
          attribution={MAP_LAYERS[mapLayer].attribution}
          url={MAP_LAYERS[mapLayer].url}
          maxZoom={MAP_LAYERS[mapLayer].maxZoom}
        />

        {/* Auto-zoom */}
        <MapController pickup={pickup} dropoff={dropoff} stops={stops} userLocation={userLocation} />

        {/* Start pin */}
        {isValidCoord(pickup?.coordinate) && (
          <DraggableMarker
            location={pickup}
            type="start"
            locked={pinsLocked}
            onMoved={(loc) => onPickupMoved?.(loc)}
          />
        )}

        {/* Numbered shuttle stop markers */}
        {activeStops.map((stop, idx) => (
          <DraggableStopMarker
            key={stop.id}
            stop={stop}
            index={idx}
            locked={pinsLocked}
            onMoved={(id, loc) => onStopMoved?.(id, loc)}
          />
        ))}

        {/* Dropoff pin */}
        {isValidCoord(dropoff?.coordinate) && (
          <DraggableMarker
            location={dropoff}
            type="end"
            locked={pinsLocked}
            onMoved={(loc) => onDropoffMoved?.(loc)}
          />
        )}

        {/* User Location Dot */}
        {userLocation && (
          <Marker
            position={[Number(userLocation.lat), Number(userLocation.lon)]}
            icon={L.divIcon({
              className: "",
              html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3);"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })}
          >
            <Popup>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Current Location</div>
            </Popup>
          </Marker>
        )}

        {/* Route polyline (multi-waypoint) */}
        {hasRoute && (
          <RoutingMachine
            pickup={pickup}
            dropoff={dropoff}
            stops={stops}
            tripType={tripType}
            roundTripMode={roundTripMode}
            onHistoryChange={handleHistoryChange}
            onRouteFound={handleRouteFound}
            onAutoSaveTrigger={autoSaveRoute}
          />
        )}

        {/* TileLayer overlay (Esri bounds were locked to 16, replaced entirely by Carto/Google complete tiles) */}
      </MapContainer>

      {/* Floating controls (top-right) */}
      {!isStaticPreview && (
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 400,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: "white", border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
              <Layers style={{ width: "18px", height: "18px", color: showLayerMenu ? "#2563eb" : "#64748b" }} />
            </button>

            {showLayerMenu && (
              <div style={{
                position: "absolute", top: 0, right: "48px",
                background: "white", borderRadius: "12px", padding: "8px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "4px",
                minWidth: "150px", animation: "fadeIn 0.2s ease"
              }}>
                {(Object.keys(MAP_LAYERS) as Array<keyof typeof MAP_LAYERS>).map(key => (
                  <button
                    key={key}
                    onClick={() => { setMapLayer(key); setShowLayerMenu(false); }}
                    style={{
                      padding: "8px 12px", borderRadius: "8px", border: "none",
                      background: mapLayer === key ? "#eff6ff" : "transparent",
                      color: mapLayer === key ? "#2563eb" : "#475569",
                      fontWeight: mapLayer === key ? 700 : 600,
                      fontSize: "12px", textAlign: "left", cursor: "pointer",
                      transition: "background 0.2s"
                    }}>
                    {MAP_LAYERS[key].name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "white", border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <LocateFixed style={{ width: "18px", height: "18px", color: "#64748b" }} />
          </button>
        </div>)}

      {/* ── Smart Route Card (top-left, appears when route is calculated) ── */}
      {!isStaticPreview && hasRoute && liveRouteDuration && liveRouteDistance && (
        <div style={{
          position: "absolute", top: 16, left: 16, zIndex: 400,
          display: "flex", flexDirection: "column", gap: "6px",
          minWidth: "220px",
        }}>
          {/* Live route card */}
          <div style={{
            background: "white", borderRadius: "14px", padding: "12px 16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.14)", border: "1px solid #e2e8f0",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>Best Route</span>
              {smartScore !== null && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "3px",
                  background: smartScore >= 70 ? "#f0fdf4" : smartScore >= 40 ? "#fefce8" : "#fff5f5",
                  border: `1px solid ${smartScore >= 70 ? "#bbf7d0" : smartScore >= 40 ? "#fef08a" : "#fecaca"}`,
                  borderRadius: "8px", padding: "2px 7px",
                }}>
                  <span style={{ fontSize: "11px" }}>
                    {smartScore >= 70 ? "⚡" : smartScore >= 40 ? "🔶" : "⚠️"}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: smartScore >= 70 ? "#15803d" : smartScore >= 40 ? "#92400e" : "#b91c1c" }}>
                    {smartScore}/100
                  </span>
                </div>
              )}
            </div>

            {tripType === 'shuttle' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a" }}>{formatDur(liveRouteDuration)}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>{formatDistance(liveRouteDistance || 0)}</span>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#7c3aed", background: "#ede9fe", padding: "2px 6px", borderRadius: "4px" }}>Round Trip Loop</span>
                </div>
                {liveOneWayDuration !== null && liveOneWayDistance !== null && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#475569" }}>{formatDur(liveOneWayDuration)}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>{formatDistance(liveOneWayDistance || 0)}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#ea580c", background: "#ffedd5", padding: "2px 6px", borderRadius: "4px" }}>One Way Trip</span>
                  </div>
                )}

                {shuttleVehicles > 1 && (
                  <details style={{ background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "8px" }}>
                    <summary style={{ fontSize: "11px", fontWeight: 700, color: "#475569", listStyle: "none", outline: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>🚌 View {shuttleVehicles} Vehicles</span>
                      <span style={{ fontSize: "9px" }}>▼</span>
                    </summary>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
                      {Array.from({ length: shuttleVehicles }).map((_, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>Vehicle {i + 1}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>{formatDur(liveRouteDuration)}</span>
                            <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8" }}>{formatDistance(liveRouteDistance || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : tripType === 'multi-day' && multiDayStore && multiDayStore.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a" }}>{formatDur(multiDayStore.reduce((acc, day) => acc + (day.routeDuration || 0), 0))}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>{formatDistance(multiDayStore.reduce((acc, day) => acc + (day.routeDistance || 0), 0))}</span>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>Multi-Day Itinerary</span>
                </div>
                {multiDayStore.length > 1 && (
                  <details style={{ background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "8px" }}>
                    <summary style={{ fontSize: "11px", fontWeight: 700, color: "#475569", listStyle: "none", outline: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>📅 View {multiDayStore.length} Days Breakdown</span>
                      <span style={{ fontSize: "9px" }}>▼</span>
                    </summary>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
                      {multiDayStore.map((day, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>Day {i + 1}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>{formatDur(day.routeDuration || 0)}</span>
                            <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8" }}>{formatDistance(day.routeDistance || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "10px" }}>
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a" }}>{formatDur(liveRouteDuration)}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>{formatDistance(liveRouteDistance || 0)}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: "6px" }}>
              {savedRoutes.length > 0 && (
                <button
                  onClick={() => setShowSaved(v => !v)}
                  style={{
                    flex: 1, height: "32px", borderRadius: "8px",
                    background: showSaved ? "#f1f5f9" : "#0f172a",
                    color: showSaved ? "#0f172a" : "white", border: "none",
                    fontSize: "12px", fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                >
                  {showSaved ? 'Hide Automatic Saves' : `View ${savedRoutes.length} Auto-Saved ${savedRoutes.length === 1 ? 'Route' : 'Routes'}`}
                </button>
              )}
            </div>
          </div>

          {/* Saved routes panel */}
          {showSaved && savedRoutes.length > 0 && (
            <div style={{
              background: "white", borderRadius: "14px", padding: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.14)", border: "1px solid #e2e8f0",
              maxHeight: "260px", overflowY: "auto",
            }}>
              <p style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 8px" }}>
                Saved Routes (best first)
              </p>
              {savedRoutes.map((r, idx) => {
                // Determine if this is the currently active route based on distance/duration
                const isActive = Math.round(liveRouteDistance || 0) === Math.round(r.distanceM) &&
                  Math.round(liveRouteDuration || 0) === Math.round(r.durationSec)

                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (!isActive && onRestoreRoute) {
                        onRestoreRoute(r.pickup, r.dropoff, r.stops)
                        setShowSaved(false)
                      }
                    }}
                    style={{
                      width: "100%", textAlign: "left",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px", borderRadius: "10px",
                      background: isActive ? "#eff6ff" : "transparent",
                      border: isActive ? "1px solid #bfdbfe" : "1px solid transparent",
                      borderBottom: !isActive && idx < savedRoutes.length - 1 ? "1px solid #f1f5f9" : isActive ? "1px solid #bfdbfe" : "1px solid transparent",
                      cursor: isActive ? "default" : "pointer",
                      marginBottom: "2px",
                      opacity: isActive ? 1 : 0.85,
                      transition: "all 0.1s"
                    }}
                  >
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: isActive ? "#2563eb" : "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                        {idx === 0 && <span>👑</span>}{r.label}
                        {isActive && <span style={{ fontSize: "10px", fontWeight: 700, color: "white", background: "#2563eb", padding: "1px 5px", borderRadius: "4px", marginLeft: "4px" }}>Active</span>}
                      </p>
                      <p style={{ fontSize: "11px", color: isActive ? "#3b82f6" : "#64748b", margin: "2px 0 0" }}>
                        {formatDur(r.durationSec)} · {formatDistance(r.distanceM)}
                      </p>
                    </div>
                    <div style={{
                      fontSize: "11px", fontWeight: 800,
                      color: r.smartScore >= 70 ? "#15803d" : r.smartScore >= 40 ? "#92400e" : "#b91c1c",
                      background: r.smartScore >= 70 ? "#f0fdf4" : r.smartScore >= 40 ? "#fefce8" : "#fff5f5",
                      padding: "2px 6px", borderRadius: "6px",
                    }}>
                      {r.smartScore}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Route History toolbar — appears only when there is history ── */}
      {!isStaticPreview && !pinsLocked && histLen > 0 && (
        <div style={{
          position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)",
          zIndex: 400, display: "flex", alignItems: "center", gap: "6px",
          background: "white", borderRadius: "999px", padding: "6px 14px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)", border: "1px solid #e2e8f0",
        }}>
          <History style={{ width: "13px", height: "13px", color: "#64748b" }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{histLen} change{histLen !== 1 ? 's' : ''}</span>
          <div style={{ width: "1px", height: "14px", background: "#e2e8f0", margin: "0 2px" }} />
          <button
            onClick={() => reinstateRef.current.prev()}
            style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "6px" }}
          >
            ↩ Previous
          </button>
          <button
            onClick={() => reinstateRef.current.initial()}
            style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", background: "#f1f5f9", border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: "6px" }}
          >
            ⟳ Initial
          </button>
        </div>
      )}

      {/* Drag hint / lock tooltip */}
      {!isStaticPreview && !pinsLocked && (pickup?.coordinate || dropoff?.coordinate) && (
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.82)",
          color: "white",
          padding: "6px 14px", borderRadius: "999px",
          fontSize: "11px", fontWeight: 600, zIndex: 400,
          pointerEvents: "none", whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
        }}>
          Drag pins to adjust exact location
        </div>
      )}
    </div>
  )
}
