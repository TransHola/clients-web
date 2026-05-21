"use client"
import dynamic from 'next/dynamic'
import type { PinLocation, StopLocation } from './live-map'

export const LiveMapWrapper = dynamic(
  () => import('./live-map').then((mod) => mod.LiveMap),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#f1f5f9' }} /> }
) as React.FC<{
  pickup?: any
  dropoff?: any
  stops?: StopLocation[]
  tripType?: string
  shuttleVehicles?: number
  userLocation?: { lat: number; lon: number } | null
  onPickupMoved?: (loc: PinLocation) => void
  onDropoffMoved?: (loc: PinLocation) => void
  onStopMoved?: (id: string, loc: PinLocation) => void
  onRestoreRoute?: (pickup: PinLocation, dropoff: PinLocation, stops: StopLocation[]) => void
  pinsLocked?: boolean
}>

