"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { LocationSearchInput, LocationResult } from "./location-search"

export interface GeoContext {
  city: string
  country: string
  countryCode?: string
  lat: number
  lon: number
  distanceUnit?: 'km' | 'mi'
}

interface CitySelectorModalProps {
  isOpen: boolean
  onClose: () => void
  currentContext: GeoContext | null
  onCitySelected: (context: GeoContext) => void
}

export function CitySelectorModal({ isOpen, onClose, currentContext, onCitySelected }: CitySelectorModalProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  if (!isOpen) return null

  const handleSelect = (loc: LocationResult) => {
    if (!loc.coordinate) return
    
    // Parse the city and country out of the address string, which is usually "City, State, Country"
    const parts = loc.address.split(',').map(s => s.trim())
    const city = loc.name || parts[0]
    const country = parts.length > 1 ? parts[parts.length - 1] : parts[0]

    onCitySelected({
      city,
      country,
      countryCode: loc.countryCode,
      lat: loc.coordinate.lat,
      lon: loc.coordinate.lon
    })
    onClose()
  }

  const displayCountry = currentContext?.country || "your area"

  if (!mounted) return null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', width: '100%', maxWidth: '800px',
        padding: '60px 80px', borderRadius: '32px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.07)',
        position: 'relative',
        display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1.5fr', gap: '60px'
      }}>
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '32px', right: '32px',
          background: '#f1f5f9', border: 'none', cursor: 'pointer',
          width: '40px', height: '40px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          <X style={{ width: '20px', height: '20px', color: '#0f172a' }} />
        </button>

        {/* Left Col - Title */}
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>
            Change your location
          </h2>
        </div>

        {/* Right Col - Content */}
        <div>
          <div style={{ 
            background: '#f8fafc', borderRadius: '14px', 
            border: '1.5px solid transparent', 
            transition: 'border 0.2s', padding: '2px',
            marginBottom: '16px'
          }}>
            <LocationSearchInput
              placeholder="Enter a city"
              onSelect={handleSelect}
            />
          </div>

          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 24px' }}>
            You're seeing information for <strong>{displayCountry}</strong>. To see local features and services for another location, enter a city in the search box above.
          </p>

          <button onClick={onClose} style={{
            background: '#0f172a', color: 'white',
            border: 'none', padding: '12px 24px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.2s'
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
