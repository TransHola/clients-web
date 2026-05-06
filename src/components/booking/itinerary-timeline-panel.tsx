"use client"

import * as React from "react"
import { MapPin, Navigation, Compass, CalendarDays, Clock, Users, ArrowDown, Flag } from "lucide-react"

export function ItineraryTimelinePanel({ bookingDetails, activeDayIdx = 0, onActiveDayChange }: { bookingDetails: any, activeDayIdx?: number, onActiveDayChange?: (idx: number) => void }) {
  if (!bookingDetails) return <div className="p-8 text-center text-muted-foreground">No itinerary details available</div>

  const { pickup, dropoff, stops = [], startDate, startTime, passengers, tripType, option, multiDayStore } = bookingDetails

  const [internalDayIdx, setInternalDayIdx] = React.useState(0)
  const currentDayIdx = typeof onActiveDayChange !== 'undefined' ? activeDayIdx : internalDayIdx;

  const handleDayChange = (i: number) => {
    if (onActiveDayChange) onActiveDayChange(i);
    else setInternalDayIdx(i);
  };

  const isMultiDay = tripType === 'multi-day' && multiDayStore && multiDayStore.length > 1;

  const effPickup = isMultiDay ? multiDayStore[currentDayIdx]?.pickupLoc : pickup;
  const effDropoff = isMultiDay ? multiDayStore[currentDayIdx]?.dropoffLoc : dropoff;
  const effStops = isMultiDay ? multiDayStore[currentDayIdx]?.stops || [] : stops;
  const effStartTime = isMultiDay ? multiDayStore[currentDayIdx]?.startTime : startTime;
  const effDate = isMultiDay ? multiDayStore[currentDayIdx]?.dateStr : startDate;

  const waypoints = [
    { type: "pickup", ...effPickup, time: effStartTime, label: "Pickup Location" },
    ...effStops.map((s: any, i: number) => ({ type: "stop", ...s, label: `Stop ${i + 1}` })),
    { type: "dropoff", ...effDropoff, label: "Final Dropoff" }
  ].filter(w => w?.address) // filter out invalid spots

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-slate-50 shrink-0">
        <h2 className="text-xl font-black text-slate-900 mb-1">Trip Itinerary</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 mt-3">
          {effDate && (
            <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border shadow-sm">
              <CalendarDays className="w-4 h-4 text-blue-600" /> {effDate}
            </span>
          )}
          {passengers && (
            <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border shadow-sm">
              <Users className="w-4 h-4 text-blue-600" /> {passengers} passengers
            </span>
          )}
          {tripType && (
            <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border shadow-sm uppercase text-xs">
              <Compass className="w-4 h-4 text-blue-600" /> {tripType}
            </span>
          )}
        </div>
      </div>

      {/* Multi-Day Tab Selector */}
      {isMultiDay && (
         <div className="px-6 py-3 border-b bg-slate-50/50 overflow-x-auto flex gap-2 shrink-0">
           {multiDayStore.map((day: any, i: number) => (
             <button
               key={i}
               onClick={() => handleDayChange(i)}
               className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                 currentDayIdx === i 
                   ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                   : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
               }`}
             >
               Day {i + 1}
             </button>
           ))}
         </div>
      )}

      {/* Body: Timeline */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="relative pl-4 space-y-8">
          {/* Vertical dashed line */}
          <div className="absolute top-6 bottom-8 left-[23px] w-[2px] bg-slate-200 border-l-2 border-dashed border-slate-300" />

          {waypoints.map((wp: any, idx: number) => {
            const isFirst = idx === 0
            const isLast = idx === waypoints.length - 1
            const Icon = isFirst ? Navigation : isLast ? Flag : MapPin
            const colorClass = isFirst ? "bg-green-500 text-white" : isLast ? "bg-red-500 text-white" : "bg-blue-500 text-white"

            return (
              <div key={idx} className="relative flex items-start gap-5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md relative z-10 shrink-0 ring-4 ring-white ${colorClass}`}>
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="pt-1.5 flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {wp.label}
                  </p>
                  <p className="text-base font-bold text-slate-900 leading-tight mb-1 truncate">
                    {wp.name || wp.address?.split(",")[0] || "Unknown Location"}
                  </p>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {wp.address}
                  </p>
                  {wp.time && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-md">
                      {isFirst ? "Departure:" : isLast ? "Arrival:" : "Time:"} {wp.time}
                    </div>
                  )}
                  {wp.stopDurationMin && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5" /> {wp.stopDurationMin} min wait
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Footer Info */}
      {option && (
        <div className="p-6 bg-slate-50 border-t shrink-0 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Selected Vehicle</p>
            <p className="text-sm font-bold text-slate-900">{option.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
            <p className="text-xl font-black text-slate-900">{option.currency || 'USD'} {option.price}</p>
          </div>
        </div>
      )}
    </div>
  )
}
