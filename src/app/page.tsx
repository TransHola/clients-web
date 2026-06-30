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
  const [multiDayStore, setMultiDayStore] = React.useState<any[]>([])
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
    <div className="relative h-screen w-full flex flex-col overflow-hidden bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50">
      
      {/* 1. HEADER */}
      <div className="flex-none z-50 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <ClientHeader />
      </div>

      {/* 2. MAIN SPLIT CONTENT */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative p-3 md:p-4 gap-3 md:gap-4 bg-slate-50 dark:bg-slate-900">
        
        {/* LEFT BLOCK — Booking Panel */}
        <div 
          className={`flex-none h-[60%] md:h-full flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl md:rounded-3xl z-20 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
            bookingStep === 'quotation' ? 'md:flex-[1.5]' : 'md:flex-none'
          }`}
          style={{ 
            width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : (bookingStep === 'quotation' ? 'auto' : '550px'),
            minWidth: typeof window !== 'undefined' && window.innerWidth >= 768 && bookingStep === 'quotation' ? '700px' : 'auto',
            maxWidth: typeof window !== 'undefined' && window.innerWidth >= 768 && bookingStep === 'quotation' ? '900px' : '100%',
          }}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar">
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
              onMultiDayStoreChange={setMultiDayStore}
            />
          </div>
        </div>

        {/* MIDDLE BLOCK — Map Layer */}
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-800 z-10 flex flex-col overflow-hidden h-[40%] md:h-full rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm" style={{ minWidth: typeof window !== 'undefined' && window.innerWidth >= 768 && selectedQuote ? '200px' : '300px' }}>
          <div className="absolute inset-0">
            <LiveMapWrapper
              pickup={pickup}
              dropoff={dropoff}
              returnLoc={returnLoc}
              stops={stops}
              tripType={tripType}
              shuttleVehicles={shuttleVehicles}
              multiDayStore={multiDayStore}
              userLocation={userLocation}
              countryCode={countryCode}
              distanceUnit={distanceUnit}
              onPickupMoved={handlePickupMoved}
              onDropoffMoved={handleDropoffMoved}
              onStopMoved={handleStopMoved}
              onRestoreRoute={handleRestoreRoute}
              pinsLocked={bookingStep === "quotation"}
              isVehicleDetailsOpen={!!selectedQuote}
            />
          </div>
        </div>

        {/* RIGHT BLOCK — Vehicle Details */}
        {selectedQuote && (
          <div className="flex-none hidden lg:flex flex-col w-[380px] xl:w-[420px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl md:rounded-3xl z-20 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden animate-in slide-in-from-right-8 fade-in">
            <VehicleDetailsPanel option={selectedQuote} />
          </div>
        )}
      </div>
    </div>
  )
}
