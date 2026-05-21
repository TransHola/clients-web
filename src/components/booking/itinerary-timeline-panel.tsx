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

  const normalizeLoc = (loc: any) => {
    if (!loc) return null;
    if (typeof loc === 'string') return { address: loc, name: loc };
    return loc;
  };

  const normPickup = normalizeLoc(effPickup);
  const normDropoff = normalizeLoc(effDropoff);

  const waypoints = [
    { type: "pickup", ...normPickup, time: effStartTime, label: "Pickup Location" },
    ...effStops.map((s: any, i: number) => ({ type: "stop", ...normalizeLoc(s), label: `Stop ${i + 1}` })),
    { type: "dropoff", ...normDropoff, label: "Final Dropoff" }
  ].filter(w => w && (w.address || w.name)) // filter out invalid spots

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
        <div className="relative space-y-6">
          {/* Vertical line aligned to center of 40px circle (20px - 1px half-width = 19px) */}
          <div className="absolute top-5 bottom-6 left-[19px] w-[2px] bg-slate-200" />

          {waypoints.map((wp: any, idx: number) => {
            const isFirst = idx === 0
            const isLast = idx === waypoints.length - 1
            const isStop = !isFirst && !isLast
            const Icon = isFirst ? Navigation : isLast ? Flag : MapPin
            const circleClass = isFirst 
              ? "bg-emerald-500 text-white shadow-emerald-500/20" 
              : isLast 
              ? "bg-rose-500 text-white shadow-rose-500/20" 
              : "bg-white border-2 border-blue-500 shadow-sm"

            const labelColor = isFirst ? "text-emerald-500" : isLast ? "text-rose-500" : "text-blue-500"

            return (
              <div key={idx} className="relative flex items-start gap-5 group">
                {/* Circle Marker */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md relative z-10 shrink-0 ring-4 ring-white transition-transform duration-300 group-hover:scale-110 ${circleClass}`}>
                  {isStop ? (
                     <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  ) : (
                     <Icon className="w-4 h-4" strokeWidth={2.5} />
                  )}
                </div>
                
                {/* Content */}
                <div className="pt-1 flex-1 min-w-0 pb-2">
                  <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${labelColor}`}>
                    {wp.label}
                  </p>
                  <p className="text-base font-bold text-slate-900 leading-tight mb-1 truncate group-hover:text-blue-600 transition-colors">
                    {wp.name || wp.address?.split(",")[0] || "Unknown Location"}
                  </p>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {wp.address}
                  </p>
                  
                  {/* Badges container */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {wp.time && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 w-fit px-2.5 py-1 rounded-md shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {wp.time}
                      </div>
                    )}
                    {wp.stopDurationMin && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 w-fit px-2.5 py-1 rounded-md shadow-sm">
                        <ArrowDown className="w-3.5 h-3.5 text-blue-500" /> {wp.stopDurationMin} min wait
                      </div>
                    )}
                  </div>
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
