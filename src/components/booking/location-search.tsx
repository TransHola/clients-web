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

const STATIC_SUGGESTIONS = [
  { name: "Corporate HQ", address: "123 Business Park, Silicon Valley", icon: "briefcase" },
  { name: "JFK Airport", address: "Terminal 4 Arrivals", icon: "navigation" },
  { name: "Home", address: "Add your home address", icon: "home" },
]


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
  const q = query.toLowerCase().trim()
  const seen = new Set<string>()

  return results
    .filter((r) => {
      const key = r.address.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((r) => {
      const name = (r.name || "").toLowerCase()
      const addr = r.address.toLowerCase()
      let score = 0
      if (name === q || addr === q) score = 100
      else if (name.startsWith(q) || addr.startsWith(q)) score = 80
      else if (name.includes(q) || addr.includes(q)) score = 60
      return { ...r, _score: score }
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
  bias?: { lat: number; lon: number } | null
}) {
  const [query, setQuery] = React.useState(controlledValue || "")
  const [gisResults, setGisResults] = React.useState<LocationResult[]>([])
  const [recentResults, setRecentResults] = React.useState<LocationResult[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedDisplay, setSelectedDisplay] = React.useState<LocationResult | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const hasSelectedRef = React.useRef(false) // tracks if user already confirmed a result
  const mounted = React.useRef(false)

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
    const recent = getRecentLocations()
    // If there is a query, filter the recent locations
    if (query) {
      const filtered = recent.filter((r) =>
        r.address.toLowerCase().includes(query.toLowerCase()) ||
        (r.name || "").toLowerCase().includes(query.toLowerCase())
      )
      setRecentResults(filtered)
    } else {
      setRecentResults(recent)
    }
    setIsOpen(true)
  }

  React.useEffect(() => {
    // Prevent geocoding and auto-opening if we just selected something or got an external pin drop
    if (hasSelectedRef.current) return;

    if (!query || query.length === 0) {
      setGisResults([])
      setRecentResults(getRecentLocations())
      return
    }
    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await GisClient.geocode(query, bias || undefined)
        setGisResults(rankResults(res || [], query))
        // Only reopen if the user is actively typing
        if (!hasSelectedRef.current) {
           setIsOpen(true)
        }
      } catch {
        setGisResults([])
      } finally {
        setIsLoading(false)
      }
      const recent = getRecentLocations()
      const filtered = recent.filter((r) =>
        r.address.toLowerCase().includes(query.toLowerCase()) ||
        (r.name || "").toLowerCase().includes(query.toLowerCase())
      )
      setRecentResults(filtered)
    }, 220)
    return () => clearTimeout(timeout)
  }, [query])

  const handleSelect = (loc: LocationResult) => {
    hasSelectedRef.current = true  // ← block dropdown from reopening on re-focus or query change
    setQuery(loc.address)
    setSelectedDisplay(loc)
    setIsOpen(false)
    saveRecentLocation(loc)
    lastEmittedAddress.current = loc.address
    onSelect(loc)
  }

  const showStatic = !query || query.length === 0
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
        <div ref={portalRef} style={{
          position: 'fixed', 
          top: rect.top - 8, 
          left: rect.right + 24,
          width: '480px',
          background: 'white', border: '1.5px solid #e2e8f0',
          borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 1000, maxHeight: '400px', overflowY: 'auto', padding: '10px',
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

          {/* Static suggestions section (only shown when empty) */}
          {showStatic && (
            <>
              {recentResults.length === 0 && (
                <div style={{ padding: '8px 10px 4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                  Suggestions
                </div>
              )}
              {STATIC_SUGGESTIONS.map((place, i) => (
                <ResultRow key={`static-${i}`} loc={place as any} onSelect={handleSelect} icon={place.icon as any} />
              ))}
            </>
          )}

          {gisResults.length === 0 && !isLoading && query.length > 0 && recentResults.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              No locations found
            </div>
          )}
        </div>,
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
