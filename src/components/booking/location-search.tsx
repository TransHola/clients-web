"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { GisClient } from "@/lib/gis-client"
import { MapPin, Loader2, LocateFixed, Clock, Briefcase, Navigation } from "lucide-react"

export interface LocationResult {
  address: string
  name?: string
  coordinate?: { lat: number; lon: number }
  countryCode?: string
  icon?: string
}

const RECENT_KEY = "transhola_recent_locations"
const MAX_RECENT = 6

const DEFAULT_COUNTRY_SUGGESTIONS: Record<string, LocationResult[]> = {
  AE: [
    { name: "Zayed International Airport (AUH)", address: "Zayed International Airport, Abu Dhabi, United Arab Emirates", coordinate: { lat: 24.4330, lon: 54.6511 }, countryCode: "AE", icon: "navigation" },
    { name: "Al Khalidiyah (Khaldiya)", address: "Al Khalidiyah, Abu Dhabi, United Arab Emirates", coordinate: { lat: 24.4682, lon: 54.3493 }, countryCode: "AE", icon: "map" },
    { name: "Dubai International Airport (DXB)", address: "Airport Road, Garhoud, Dubai, United Arab Emirates", coordinate: { lat: 25.2532, lon: 55.3657 }, countryCode: "AE", icon: "navigation" },
    { name: "Yas Island & Marina Circuit", address: "Yas Island, Abu Dhabi, United Arab Emirates", coordinate: { lat: 24.4899, lon: 54.6062 }, countryCode: "AE", icon: "briefcase" },
  ],
  ES: [
    { name: "Adolfo Suárez Madrid-Barajas (MAD)", address: "Av de la Hispanidad, 28042 Madrid, Spain", coordinate: { lat: 40.4839, lon: -3.5680 }, countryCode: "ES", icon: "navigation" },
    { name: "Gran Vía & Plaza Mayor", address: "Gran Vía, Centro, 28013 Madrid, Spain", coordinate: { lat: 40.4200, lon: -3.7058 }, countryCode: "ES", icon: "map" },
    { name: "Barcelona-El Prat Airport (BCN)", address: "08820 El Prat de Llobregat, Barcelona, Spain", coordinate: { lat: 41.2974, lon: 2.0833 }, countryCode: "ES", icon: "navigation" },
  ],
  MA: [
    { name: "Mohammed V International Airport (CMN)", address: "Nouaceur, Casablanca, Morocco", coordinate: { lat: 33.3675, lon: -7.5898 }, countryCode: "MA", icon: "navigation" },
    { name: "Casablanca Finance City", address: "Maarif, Casablanca, Morocco", coordinate: { lat: 33.5867, lon: -7.6324 }, countryCode: "MA", icon: "briefcase" },
    { name: "Marrakech Menara Airport (RAK)", address: "Mhamid, Marrakech, Morocco", coordinate: { lat: 31.6069, lon: -8.0363 }, countryCode: "MA", icon: "navigation" },
  ],
  US: [
    { name: "JFK International Airport (JFK)", address: "Queens, NY 11430, United States", coordinate: { lat: 40.6413, lon: -73.7781 }, countryCode: "US", icon: "navigation" },
    { name: "Ronald Reagan Washington National (DCA)", address: "2401 Smith Blvd, Arlington, VA, United States", coordinate: { lat: 38.8512, lon: -77.0402 }, countryCode: "US", icon: "navigation" },
    { name: "Midtown Manhattan", address: "Broadway & 7th Ave, New York, NY, United States", coordinate: { lat: 40.7580, lon: -73.9855 }, countryCode: "US", icon: "briefcase" },
  ],
  GB: [
    { name: "London Heathrow Airport (LHR)", address: "Hounslow TW6, Greater London, United Kingdom", coordinate: { lat: 51.4700, lon: -0.4543 }, countryCode: "GB", icon: "navigation" },
    { name: "City of London Financial Hub", address: "Bank, City of London, United Kingdom", coordinate: { lat: 51.5128, lon: -0.0918 }, countryCode: "GB", icon: "briefcase" },
  ],
}


export function saveRecentLocation(loc: LocationResult) {
  try {
    const existing: LocationResult[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
    const deduped = existing.filter((r) => r.address !== loc.address)
    localStorage.setItem(RECENT_KEY, JSON.stringify([loc, ...deduped].slice(0, MAX_RECENT)))
  } catch {}
}

export function getRecentLocations(): LocationResult[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") } catch { return [] }
}

// ─── Smart dedup + relevance ranking ─────────────────────────────────────────
function rankResults(results: LocationResult[], query: string): LocationResult[] {
  if (!Array.isArray(results)) return []
  const q = (query || "").toLowerCase().trim()
  const seen = new Set<string>()

  return results
    .filter((r) => {
      if (!r) return false
      const addr = (r.address || r.name || (r as any).displayName || "").trim()
      if (!addr) return false
      const key = addr.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((r) => {
      const addr = (r.address || r.name || (r as any).displayName || "").trim()
      const name = (r.name || addr.split(",")[0] || addr).trim()
      const coord = r.coordinate || { lat: (r as any).lat || 0, lon: (r as any).lon || 0 }
      const qLower = q
      const nameLower = name.toLowerCase()
      const addrLower = addr.toLowerCase()
      let score = 0
      if (nameLower === qLower || addrLower === qLower) score = 100
      else if (nameLower.startsWith(qLower) || addrLower.startsWith(qLower)) score = 80
      else if (nameLower.includes(qLower) || addrLower.includes(qLower)) score = 60
      else score = 40
      return { 
        ...r, 
        address: addr, 
        name, 
        coordinate: coord, 
        _score: score 
      }
    })
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, 8)
}

export function LocationSearchInput({
  placeholder,
  onSelect,
  showLocateMe = false,
  onLocateMe,
  value: controlledValue,
  bias,
  hasError = false,
  disabled = false,
}: {
  placeholder: string
  onSelect: (location: LocationResult) => void
  showLocateMe?: boolean
  onLocateMe?: () => void
  value?: string
  hasError?: boolean
  disabled?: boolean
  bias?: { lat: number; lon: number; countryCode?: string; city?: string } | null
}) {
  const [query, setQuery] = React.useState(controlledValue || "")
  const [gisResults, setGisResults] = React.useState<LocationResult[]>([])
  const [recentResults, setRecentResults] = React.useState<LocationResult[]>([])
  const [popularCitySuggestions, setPopularCitySuggestions] = React.useState<LocationResult[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedDisplay, setSelectedDisplay] = React.useState<LocationResult | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const hasSelectedRef = React.useRef(false) // tracks if user already confirmed a result
  const mounted = React.useRef(false)

  const activeCountryCode = ((bias?.countryCode || "AE").toUpperCase() === "UK" ? "GB" : (bias?.countryCode || "AE").toUpperCase())
  const activeCityName = (bias?.city || "").split(",")[0]?.trim() || ""

  const getScopedRecents = React.useCallback((filterQuery?: string) => {
    const all = getRecentLocations().filter((r) => {
      if (r.countryCode && r.countryCode.toUpperCase() !== activeCountryCode) return false
      return true
    })
    if (!filterQuery) return all
    const qLower = filterQuery.toLowerCase()
    return all.filter((r) =>
      r.address.toLowerCase().includes(qLower) ||
      (r.name || "").toLowerCase().includes(qLower)
    )
  }, [activeCountryCode])

  // Auto-populate popular suggestions based on the client's active city & country
  React.useEffect(() => {
    const basePresets = DEFAULT_COUNTRY_SUGGESTIONS[activeCountryCode] || DEFAULT_COUNTRY_SUGGESTIONS.AE
    const cityFiltered = activeCityName
      ? basePresets.filter((p) => p.address.toLowerCase().includes(activeCityName.toLowerCase()))
      : []
    setPopularCitySuggestions(cityFiltered.length > 0 ? [...cityFiltered, ...basePresets.filter((p) => !cityFiltered.includes(p))].slice(0, 5) : basePresets)

    if (activeCityName && bias) {
      let cancelled = false
      GisClient.geocode(`${activeCityName} Airport`, bias)
        .then((res) => {
          if (cancelled || !res || res.length === 0) return
          const dynamicItems: LocationResult[] = res.slice(0, 3).map((r) => ({
            name: r.name || r.address.split(",")[0],
            address: r.address,
            coordinate: r.coordinate,
            countryCode: r.countryCode || activeCountryCode,
            icon: "navigation",
          }))
          setPopularCitySuggestions((prev) => {
            const seen = new Set<string>()
            return [...dynamicItems, ...prev].filter((item) => {
              const k = item.address.toLowerCase()
              if (seen.has(k)) return false
              seen.add(k)
              return true
            }).slice(0, 5)
          })
        })
        .catch(() => {})
      return () => { cancelled = true }
    }
  }, [activeCountryCode, activeCityName, bias?.lat, bias?.lon])

  React.useEffect(() => { mounted.current = true }, [])

  const [rect, setRect] = React.useState<DOMRect | null>(null)

  const updateRect = React.useCallback(() => {
    if (containerRef.current) {
      setRect(containerRef.current.getBoundingClientRect())
    }
  }, [])

  React.useEffect(() => {
    if (isOpen) {
      updateRect()
      window.addEventListener('resize', updateRect)
      window.addEventListener('scroll', updateRect, true)
      return () => {
        window.removeEventListener('resize', updateRect)
        window.removeEventListener('scroll', updateRect, true)
      }
    }
  }, [isOpen, updateRect])

  const portalRef = React.useRef<HTMLDivElement>(null)

  // Click-outside handler — reliably closes dropdown when clicking anywhere else
  React.useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const isInsideInput = containerRef.current && containerRef.current.contains(e.target as Node)
      const isInsidePortal = portalRef.current && portalRef.current.contains(e.target as Node)
      if (!isInsideInput && !isInsidePortal) {
        setIsOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  const lastEmittedAddress = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== lastEmittedAddress.current) {
      setQuery(controlledValue)
      setSelectedDisplay(null)
      // When value is updated externally (e.g. from map pin drag), 
      // we do NOT want the dropdown to auto-open.
      hasSelectedRef.current = true 
    }
  }, [controlledValue])

  const handleFocus = () => {
    setRecentResults(getScopedRecents(query || undefined))
    setIsOpen(true)
  }

  React.useEffect(() => {
    // Prevent geocoding and auto-opening if we just selected something or got an external pin drop
    if (hasSelectedRef.current) return;

    if (!query || query.length === 0) {
      setGisResults([])
      setRecentResults(getScopedRecents())
      return
    }
    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await GisClient.geocode(query, bias || undefined)
        setGisResults(res.slice(0, 8))
        // Only reopen if the user is actively typing
        if (!hasSelectedRef.current) {
           setIsOpen(true)
        }
      } catch {
        setGisResults([])
      } finally {
        setIsLoading(false)
      }
      setRecentResults(getScopedRecents(query))
    }, 140)
    return () => clearTimeout(timeout)
  }, [query, activeCountryCode, activeCityName, bias?.lat, bias?.lon, getScopedRecents])

  const handleSelect = (loc: LocationResult) => {
    hasSelectedRef.current = true  // ← block dropdown from reopening on re-focus or query change
    const enrichedLoc = { ...loc, countryCode: loc.countryCode || activeCountryCode }
    setQuery(enrichedLoc.address)
    setSelectedDisplay(enrichedLoc)
    setIsOpen(false)
    saveRecentLocation(enrichedLoc)
    lastEmittedAddress.current = enrichedLoc.address
    onSelect(enrichedLoc)
  }

  const showStatic = (!query || query.length === 0) && popularCitySuggestions.length > 0
  const hasResults = gisResults.length > 0 || recentResults.length > 0 || showStatic

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          disabled={disabled}
          placeholder={hasError ? `Required: ${placeholder}` : placeholder}
          value={query}
          onChange={(e) => {
            hasSelectedRef.current = false  // user is re-typing → allow dropdown
            setQuery(e.target.value)
            setSelectedDisplay(null)
            setIsOpen(true)
          }}
          onFocus={handleFocus}
          style={{
            width: '100%',
            height: '52px',
            padding: showLocateMe ? '0 76px 0 4px' : '0 36px 0 4px',
            fontSize: selectedDisplay ? '14px' : '14px',
            fontWeight: selectedDisplay ? 700 : 500,
            border: 'none', outline: 'none',
            background: 'transparent',
            color: hasError ? '#ef4444' : '#0f172a',
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.5 : 1
          }}
          className={hasError ? 'placeholder-red-400' : ''}
        />
        {/* Sub-address shown via placeholder trick after selection */}
        {isLoading && (
          <div style={{ position: 'absolute', right: showLocateMe ? '44px' : '10px' }}>
            <Loader2 style={{ width: '15px', height: '15px', color: '#2563eb' }} className="animate-spin" />
          </div>
        )}
        {showLocateMe && onLocateMe && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onLocateMe() }}
            title="Use my location"
            style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LocateFixed style={{ width: '18px', height: '18px', color: '#2563eb' }} />
          </button>
        )}
      </div>

      {/* Dropdown (Portal to appear between form and map) */}
      {isOpen && hasResults && rect && mounted.current && createPortal(
        (() => {
          const POPUP_WIDTH = 480;
          const MAX_HEIGHT = 400;
          const SPACING = 8;
          let top = rect.top - SPACING;
          let left = rect.right + 24;
          let width = POPUP_WIDTH;

          // If there's not enough room on the right, position it below the input
          if (left + POPUP_WIDTH > window.innerWidth - 16) {
            left = rect.left;
            top = rect.bottom + SPACING;
            width = Math.max(rect.width, Math.min(POPUP_WIDTH, window.innerWidth - 32));

            // If it overflows the bottom edge, check if there's more room above
            if (top + MAX_HEIGHT > window.innerHeight - 16) {
               const spaceAbove = rect.top;
               const spaceBelow = window.innerHeight - rect.bottom;
               if (spaceAbove > spaceBelow) {
                  top = rect.top - MAX_HEIGHT - SPACING;
               }
            }
          } else {
            // It's on the right. If it overflows the bottom, shift it up
            if (top + MAX_HEIGHT > window.innerHeight - 16) {
              top = Math.max(16, window.innerHeight - MAX_HEIGHT - 16);
            }
          }

          return (
            <div ref={portalRef} style={{
              position: 'fixed', 
              top, 
              left,
              width,
              background: 'white', border: '1.5px solid #e2e8f0',
              borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              zIndex: 999999, maxHeight: `${MAX_HEIGHT}px`, overflowY: 'auto', padding: '10px',
              animation: 'fadeIn 0.2s ease'
            }}>
          {/* GIS live results first */}
          {gisResults.length > 0 && (
            <>
              <div style={{ padding: '6px 10px 4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                Search Results
              </div>
              {gisResults.map((r, i) => <ResultRow key={`gis-${i}`} loc={r} onSelect={handleSelect} icon="map" />)}
            </>
          )}

          {/* Recent locations section */}
          {recentResults.length > 0 && (
            <>
              <div style={{
                padding: '8px 10px 4px', fontSize: '10px', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8',
                borderTop: gisResults.length > 0 ? '1px solid #f1f5f9' : 'none',
                marginTop: gisResults.length > 0 ? '4px' : 0,
              }}>
                Recently Used
              </div>
              {recentResults.map((r, i) => <ResultRow key={`recent-${i}`} loc={r} onSelect={handleSelect} icon="clock" />)}
            </>
          )}

          {/* Active City & Country popular suggestions (shown when empty) */}
          {showStatic && (
            <>
              <div style={{
                padding: '8px 10px 4px', fontSize: '10px', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8',
                borderTop: recentResults.length > 0 ? '1px solid #f1f5f9' : 'none',
                marginTop: recentResults.length > 0 ? '4px' : 0,
              }}>
                Popular in {activeCityName ? `${activeCityName}, ${activeCountryCode}` : activeCountryCode}
              </div>
              {popularCitySuggestions.map((place, i) => (
                <ResultRow key={`static-${i}`} loc={place} onSelect={handleSelect} icon={(place.icon as any) || "map"} />
              ))}
            </>
          )}

          {gisResults.length === 0 && !isLoading && query.length > 0 && recentResults.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              No locations found
            </div>
          )}
        </div>
        );
      })(),
      document.body
    )}
    </div>
  )
}

// ─── Result row: name (large bold) + address (small grey) ────────────────────
function ResultRow({ loc, onSelect, icon }: {
  loc: LocationResult
  onSelect: (l: LocationResult) => void
  icon: "map" | "clock" | "briefcase" | "navigation" | "home" | string
}) {
  const cleanText = (str: string) => {
    if (!str) return str;
    return str.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, '') // Remove CJK characters
              .replace(/,\s*,/g, ',') // Clean up double commas
              .replace(/\s+/g, ' ')   // Clean up double spaces
              .replace(/^,\s*/, '')   // Clean leading commas
              .replace(/,\s*$/, '')   // Clean trailing commas
              .trim();
  }

  const rawName = loc.name || loc.address.split(",")[0]
  const name = cleanText(rawName)
  const fullAddress = cleanText(loc.address)
  const hasFullAddress = name && fullAddress !== name

  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onSelect(loc) }}
      style={{
        width: '100%', textAlign: 'left', padding: '9px 10px',
        borderRadius: '10px', background: 'transparent', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: icon === "clock" ? '#fef9c3' : '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
      }}>
        {icon === "clock" && <Clock style={{ width: '13px', height: '13px', color: '#ca8a04' }} />}
        {icon === "map" && <MapPin style={{ width: '13px', height: '13px', color: '#2563eb' }} />}
        {icon === "briefcase" && <Briefcase style={{ width: '13px', height: '13px', color: '#475569' }} />}
        {icon === "navigation" && <Navigation style={{ width: '13px', height: '13px', color: '#475569' }} />}
        {icon === "home" && <MapPin style={{ width: '13px', height: '13px', color: '#475569' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name — larger, bold */}
        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        {/* Full address — smaller, grey, allowed to wrap */}
        {hasFullAddress && (
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
            {fullAddress}
          </p>
        )}
      </div>
    </button>
  )
}
