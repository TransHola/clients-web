"use client"

import * as React from "react"
import { ClientHeader } from "@/components/layout/client-header"
import { BookingPanel } from "@/components/booking/booking-panel"
import { LiveMapWrapper } from "@/components/map/live-map-wrapper"
import { VehicleDetailsPanel } from "@/components/booking/vehicle-details-panel"
import type { PinLocation, StopLocation } from "@/components/map/live-map"

export default function Home() {
  const [pickup, setPickup] = React.useState<any>(null)
  const [dropoff, setDropoff] = React.useState<any>(null)
  const [returnLoc, setReturnLoc] = React.useState<any>(null)
  const [stops, setStops] = React.useState<StopLocation[]>([])
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lon: number } | null>(null)
  const [bookingStep, setBookingStep] = React.useState<"search" | "quotation" | "timeline">("search")
  const [selectedQuote, setSelectedQuote] = React.useState<any | null>(null)
  const [tripType, setTripType] = React.useState<string>("oneway")
  const [shuttleVehicles, setShuttleVehicles] = React.useState<number>(1)
  const [countryCode, setCountryCode] = React.useState<string>("AE")
  const [distanceUnit, setDistanceUnit] = React.useState<string>("km")

  // Track the "pinned" (drag-adjusted) locations separately from the typed ones
  const [pickupPinned, setPickupPinned] = React.useState<PinLocation | null>(null)
  const [dropoffPinned, setDropoffPinned] = React.useState<PinLocation | null>(null)

  // Detect user location on mount
  React.useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }, [])

  // When typed location changes → clear any previous pin adjustment
  const handlePickupChange = (loc: any) => {
    setPickup(loc)
    setPickupPinned(null)
  }
  const handleDropoffChange = (loc: any) => {
    setDropoff(loc)
    setDropoffPinned(null)
  }

  // When pin is dragged on map → update pinned position
  const handlePickupMoved = (loc: PinLocation) => {
    setPickupPinned(loc)
    setPickup(loc)
  }
  const handleDropoffMoved = (loc: PinLocation) => {
    setDropoffPinned(loc)
    setDropoff(loc)
  }

  // When a shuttle stop pin is dragged on the map → update that stop's loc
  const handleStopMoved = (id: string, loc: PinLocation) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, address: loc.address, loc } : s))
  }

  // Reinstate original typed addresses
  const reinstatePickup = () => {
    if (!pickupPinned) return
    setPickup(null)
    setPickupPinned(null)
  }
  const reinstateDropoff = () => {
    if (!dropoffPinned) return
    setDropoff(null)
    setDropoffPinned(null)
  }

  const handleRestoreRoute = (p: PinLocation, d: PinLocation, s: StopLocation[]) => {
    setPickup(p)
    setPickupPinned(p) // Also mark as pinned so they know it was dragged/restored
    setDropoff(d)
    setDropoffPinned(d)
    setStops(s)
  }

  return (
    <div style={{
      height: '100%',
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      overflow: 'hidden',
      background: '#f1f5f9',
    }}>
      <ClientHeader />

      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedQuote 
          ? (bookingStep === 'quotation' ? '1040px 1fr 380px' : '600px 1fr 380px') 
          : (bookingStep === 'quotation' ? '1040px 1fr' : '600px 1fr'),
        gap: '12px',
        padding: '12px',
        minHeight: 0,
        overflow: 'hidden',
        transition: 'grid-template-columns 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        {/* LEFT — Booking Panel */}
        <div style={{
          background: 'white',
          borderRadius: '18px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          overflow: 'hidden',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
        }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
            <BookingPanel
              onPickupChange={handlePickupChange}
              onDropoffChange={handleDropoffChange}
              onUserLocationDetected={setUserLocation}
              pickupPinMoved={pickupPinned}
              dropoffPinMoved={dropoffPinned}
              onReinstatePickup={reinstatePickup}
              onReinstateDropoff={reinstateDropoff}
              onStepChange={setBookingStep}
              onStopsChange={setStops}
              onQuoteSelected={setSelectedQuote}
              onTripTypeChange={setTripType}
              onShuttleVehiclesChange={setShuttleVehicles}
              onReturnChange={setReturnLoc}
              onCountryCodeChange={setCountryCode}
              onDistanceUnitChange={setDistanceUnit}
            />
          </div>
        </div>

        {/* RIGHT — Live Map */}
        <div style={{
          borderRadius: '18px',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0,
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
        }}>
          <LiveMapWrapper
            pickup={pickup}
            dropoff={dropoff}
            returnLoc={returnLoc}
            stops={stops}
            tripType={tripType}
            shuttleVehicles={shuttleVehicles}
            userLocation={userLocation}
            countryCode={countryCode}
            distanceUnit={distanceUnit}
            onPickupMoved={handlePickupMoved}
            onDropoffMoved={handleDropoffMoved}
            onStopMoved={handleStopMoved}
            onRestoreRoute={handleRestoreRoute}
            pinsLocked={bookingStep === "quotation"}
          />
        </div>

        {/* RIGHT — Vehicle Details Panel (conditional dynamic 3rd pane) */}
        {selectedQuote && (
          <div style={{
            overflow: 'hidden',
            minHeight: 0,
            animation: 'fadeInSlideLeft 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}>
            <VehicleDetailsPanel option={selectedQuote} />
          </div>
        )}
      </div>
    </div>
  )
}
