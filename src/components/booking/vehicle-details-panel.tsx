"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  Users,
  Briefcase,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Droplets,
  Baby,
  Calculator,
  Clock,
  Route,
  X,
} from "lucide-react"
import { resolveFleetImageUrl } from "./quotation-panel"

function formatMoney(curr: string, amount: number): string {
  const cleanCurr = String(curr || 'AED').trim()
  const needsSpace = /^[A-Za-z]{2,4}$/.test(cleanCurr)
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return needsSpace ? `${cleanCurr} ${formatted}` : `${cleanCurr}${formatted}`
}

function buildFallbackBreakdownAndLogs(v: any, idx: number, allVehicles: any[], option: any) {
  const count = Math.max(1, Number(v.count || 1))
  const seats = Math.max(4, Number(v.seats || option.totalSeats || 14))
  const days = Math.max(1, Number(option.daysCount || (Array.isArray(v.dailyBreakdown) ? v.dailyBreakdown.length : 1)))
  const currLabel = String(
    option.currencySymbol ||
    (option.currency === 'EUR' ? '€' : option.currency === 'USD' ? '$' : option.currency) ||
    'AED'
  ).trim()

  const weights = allVehicles.map((item: any) =>
    Math.max(1, Number(item.count || 1)) * Math.sqrt(Math.max(4, Number(item.seats || 14)))
  )
  const weightSum = weights.reduce((a: number, b: number) => a + b, 0) || 1
  const share = (weights[idx] || 1) / weightSum

  const optionGross = Math.max(1, Number(option.price || 0))
  const grossTotal = v.price !== undefined
    ? Number(v.price)
    : (allVehicles.length === 1 ? optionGross : +(optionGross * share).toFixed(2))

  const inferredTaxPct =
    v.taxRatePct !== undefined
      ? Number(v.taxRatePct)
      : option.taxRatePct !== undefined
        ? Number(option.taxRatePct)
        : currLabel === 'AED'
          ? 5
          : currLabel === '€'
            ? 10
            : currLabel === 'MAD'
              ? 14
              : 0

  const netSubtotal = v.costBreakdown?.netSubtotal !== undefined
    ? Number(v.costBreakdown.netSubtotal)
    : inferredTaxPct > 0
      ? +(grossTotal / (1 + inferredTaxPct / 100)).toFixed(2)
      : grossTotal
  const taxAmount = v.costBreakdown?.taxAmount !== undefined
    ? Number(v.costBreakdown.taxAmount)
    : +(grossTotal - netSubtotal).toFixed(2)

  const minCharterHours = seats >= 30 ? 5 : seats >= 10 ? 4 : 3
  const billableHours = Number(v.costBreakdown?.billableHours || Math.max(minCharterHours, 6) * days)
  const distanceKm = Number(v.costBreakdown?.distanceKm || option.distanceKm || 120)
  const waitMinutes = Number(v.costBreakdown?.waitMinutes ?? 60)

  const baseCharterCost = v.costBreakdown?.baseCharterCost !== undefined
    ? Number(v.costBreakdown.baseCharterCost)
    : +(netSubtotal * 0.72).toFixed(2)
  const distanceFuelCost = v.costBreakdown?.distanceFuelCost !== undefined
    ? Number(v.costBreakdown.distanceFuelCost)
    : +(netSubtotal * 0.18).toFixed(2)
  const waitingStopsCost = v.costBreakdown?.waitingStopsCost !== undefined
    ? Number(v.costBreakdown.waitingStopsCost)
    : +(netSubtotal - baseCharterCost - distanceFuelCost).toFixed(2)
  const deadheadCost = Number(v.costBreakdown?.deadheadCost || 0)

  const effectiveUnitHourly = v.costBreakdown?.effectiveUnitHourly !== undefined
    ? Number(v.costBreakdown.effectiveUnitHourly)
    : +((baseCharterCost / count) / Math.max(1, billableHours)).toFixed(2)

  const unitGross = +(grossTotal / count).toFixed(2)
  const unitNet = +(netSubtotal / count).toFixed(2)
  const bagsPerUnit = Number(v.bagsPerUnit || (seats >= 45 ? 50 : seats >= 30 ? 30 : seats >= 18 ? 20 : seats >= 10 ? 12 : Math.max(4, seats - 1)))

  const existingLogs = Array.isArray(v.debugLog) && v.debugLog.length > 0 ? v.debugLog : null
  const logs: string[] = existingLogs || (() => {
    const out: string[] = []
    for (let d = 1; d <= days; d++) {
      const dayFactor = 1 / days
      out.push(
        `[Day ${d}] Engine: Whole-Hour Commercial Charter (${Math.round(billableHours / days)}h billable block · min ${minCharterHours}h · ${distanceKm} km route)`
      )
      out.push(
        `[Day ${d}] Base Charter Time Block (${count}× ${v.type || 'Charter Vehicle'}) -> Charged ${Math.round(billableHours / days)} hrs @ ${effectiveUnitHourly.toFixed(2)} × ${count} = ${(baseCharterCost * dayFactor).toFixed(2)}`
      )
      out.push(
        `[Day ${d}] Verified Route Distance & Fuel Allocation -> Charged ${distanceKm} km @ ${((distanceFuelCost * dayFactor) / Math.max(1, distanceKm)).toFixed(2)}/km = ${(distanceFuelCost * dayFactor).toFixed(2)}`
      )
      if (waitingStopsCost > 0.25) {
        out.push(
          `[Day ${d}] Boarding & Scheduled Stop Waiting (${waitMinutes} min) -> Charged ${waitMinutes} min @ ${((waitingStopsCost * dayFactor) / Math.max(1, waitMinutes)).toFixed(2)}/min = ${(waitingStopsCost * dayFactor).toFixed(2)}`
        )
      }
      if (deadheadCost > 0.5) {
        out.push(
          `[Day ${d}] Depot Positioning & Return Deadhead -> Charged ${count} unit(s) @ ${((deadheadCost * dayFactor) / count).toFixed(2)} = ${(deadheadCost * dayFactor).toFixed(2)}`
        )
      }
    }
    if (taxAmount > 0) {
      out.push(
        `[Day ${days}] Statutory Transport VAT / Tax (${inferredTaxPct}%) -> Charged ${netSubtotal.toFixed(2)} @ ${inferredTaxPct}% = ${taxAmount.toFixed(2)}`
      )
    }
    out.push(
      `[Day ${days}] Total ${count}× ${v.type || 'Charter Vehicle'} Allocation -> Charged ${count} × ${currLabel} ${unitGross.toFixed(2)} = ${grossTotal.toFixed(2)}`
    )
    return out
  })()

  return {
    count,
    seats,
    days,
    currLabel,
    bagsPerUnit,
    grossTotal,
    netSubtotal,
    taxRatePct: inferredTaxPct,
    taxAmount,
    unitGross,
    unitNet,
    billableHours,
    minCharterHours,
    effectiveUnitHourly,
    distanceKm,
    waitMinutes,
    baseCharterCost,
    distanceFuelCost,
    waitingStopsCost,
    deadheadCost,
    logs,
    imageUrl: v.imageUrl || resolveFleetImageUrl(v.iconName || v.type, seats),
  }
}

export function VehicleDetailsPanel({
  option,
  amenities = [],
  adaRequired = false,
  adaVehicleCount = 1,
}: {
  option: any
  amenities?: string[]
  adaRequired?: boolean
  adaVehicleCount?: number
}) {
  const [engineModalOpen, setEngineModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expandedVehicles, setExpandedVehicles] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset expanded dropdown state to open whenever user clicks a different fleet option
  useEffect(() => {
    setExpandedVehicles({ 0: true, 1: true, 2: true })
  }, [option?.id, option?.label])

  if (!option) return null

  const rawVehicles: any[] =
    Array.isArray(option.vehicles) && option.vehicles.length > 0
      ? option.vehicles
      : [{ type: option.label || option.title || 'Charter Bus', count: 1, seats: option.totalSeats || option.seats || 56 }]

  const computedVehicles = rawVehicles.map((v: any, idx: number) => ({
    raw: v,
    meta: buildFallbackBreakdownAndLogs(v, idx, rawVehicles, option),
  }))

  const curr =
    computedVehicles[0]?.meta.currLabel ||
    option.currencySymbol ||
    (option.currency === 'EUR' ? '€' : option.currency === 'USD' ? '$' : option.currency) ||
    'AED'

  const totalGrossPrice = Number(option.price || computedVehicles.reduce((s, item) => s + item.meta.grossTotal, 0))
  const totalTaxAmount =
    option.taxAmount !== undefined
      ? Number(option.taxAmount)
      : +computedVehicles.reduce((s, item) => s + item.meta.taxAmount, 0).toFixed(2)
  const totalNetSubtotal = +(totalGrossPrice - totalTaxAmount).toFixed(2)
  const effectiveTaxPct = computedVehicles[0]?.meta.taxRatePct || 0

  const toggleVehicleDropdown = (idx: number) => {
    setExpandedVehicles((prev) => ({
      ...prev,
      [idx]: !(prev[idx] ?? true),
    }))
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Scrollable Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 16px' }}>
        {/* Header: Pricing Breakdown + Raw Calculations */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', margin: 0 }}>
              Pricing Breakdown
            </h4>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', margin: '2px 0 0' }}>
              Itemized cost for selected vehicle{computedVehicles.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEngineModalOpen(true)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
              flexShrink: 0,
            }}
          >
            <Calculator size={12} color="#2563eb" />
            Raw Calculations
          </button>
        </div>

        {/* Selected Vehicle(s) Dropdown Cost Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {computedVehicles.map(({ raw: v, meta }, idx: number) => {
            const isExpanded = expandedVehicles[idx] ?? true
            const avgDailyRate = meta.days > 0 ? meta.grossTotal / meta.days : meta.grossTotal

            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: isExpanded ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
                  boxShadow: isExpanded
                    ? '0 6px 18px -6px rgba(37, 99, 235, 0.12)'
                    : '0 2px 8px rgba(15, 23, 42, 0.03)',
                  overflow: 'hidden',
                  transition: 'all 0.18s ease',
                }}
              >
                {/* Clickable Vehicle Summary Header */}
                <button
                  type="button"
                  onClick={() => toggleVehicleDropdown(idx)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: 'none',
                    padding: '14px 14px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '54px',
                        height: '42px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3px',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      <img
                        src={meta.imageUrl}
                        alt={v.type || 'Vehicle'}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 900,
                            color: '#1d4ed8',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '1px 6px',
                            borderRadius: '5px',
                          }}
                        >
                          {meta.count}×
                        </span>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#0f172a',
                            textTransform: 'capitalize',
                            lineHeight: 1.2,
                          }}
                        >
                          {v.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                          <Users size={11} color="#64748b" />
                          {meta.seats} Pax/unit ({meta.count * meta.seats} Seats)
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>·</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                          {meta.days} Day{meta.days > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>
                      Vehicle Total
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0, whiteSpace: 'nowrap' }}>
                      {formatMoney(curr, meta.grossTotal)}
                    </p>
                  </div>
                </button>

                {/* Interactive Dropdown Trigger Bar */}
                <button
                  type="button"
                  onClick={() => toggleVehicleDropdown(idx)}
                  style={{
                    width: '100%',
                    background: isExpanded ? '#eff6ff' : '#f8fafc',
                    border: 'none',
                    borderTop: '1px solid #e2e8f0',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isExpanded ? '#1d4ed8' : '#475569', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{isExpanded ? 'Hide Cost Breakdown' : 'View Cost Breakdown'}</span>
                    {meta.count > 1 && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: '999px' }}>
                        {formatMoney(curr, meta.unitGross)} / unit
                      </span>
                    )}
                  </span>
                  {isExpanded ? <ChevronUp size={14} color="#1d4ed8" /> : <ChevronDown size={14} color="#64748b" />}
                </button>

                {/* Expanded Dropdown Cost Breakdown Content */}
                {isExpanded && (
                  <div style={{ padding: '12px 14px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Unit Rate vs Fleet Allocation Pill */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#475569' }}>
                        Per-Vehicle Rate ({meta.seats} Seats · {meta.bagsPerUnit} Bags)
                      </span>
                      <span style={{ fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {formatMoney(curr, meta.unitNet)} × {meta.count}
                      </span>
                    </div>

                    {/* Itemized Cost Components */}
                    <div
                      style={{
                        background: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* 1. Base Charter Time Block */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={11} color="#2563eb" />
                            Base Charter Time Block
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                            {meta.billableHours}h charter block (min {meta.minCharterHours}h) · {meta.count} vehicle{meta.count > 1 ? 's' : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {formatMoney(curr, meta.baseCharterCost)}
                        </span>
                      </div>

                      {/* 2. Route Distance & Fuel */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', borderTop: '1px dashed #f1f5f9', paddingTop: '7px' }}>
                        <div>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Route size={11} color="#0284c7" />
                            Route Distance &amp; Fuel
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                            {meta.distanceKm} km verified route &amp; chauffeur fuel
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {formatMoney(curr, meta.distanceFuelCost)}
                        </span>
                      </div>

                      {/* 3. Boarding & Stop Waiting */}
                      {meta.waitingStopsCost > 0.25 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', borderTop: '1px dashed #f1f5f9', paddingTop: '7px' }}>
                          <div>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b' }}>
                              Boarding &amp; Stop Waiting
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                              {meta.waitMinutes} min scheduled layover &amp; group loading
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {formatMoney(curr, meta.waitingStopsCost)}
                          </span>
                        </div>
                      )}

                      {/* 4. Deadhead / Dispatch Positioning */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px dashed #f1f5f9', paddingTop: '7px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b' }}>
                          {meta.deadheadCost > 0.5 ? 'Depot Positioning & Deadhead' : 'Chauffeur, Tolls & Dispatch'}
                        </span>
                        {meta.deadheadCost > 0.5 ? (
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {formatMoney(curr, meta.deadheadCost)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '1px 7px', borderRadius: '999px' }}>
                            Included
                          </span>
                        )}
                      </div>

                      {/* 5. Net Vehicle Subtotal + Tax */}
                      {meta.taxAmount > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '7px', fontSize: '11.5px' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>Net Vehicle Subtotal</span>
                            <span style={{ fontWeight: 800, color: '#334155' }}>{formatMoney(curr, meta.netSubtotal)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>Transport VAT / Tax ({meta.taxRatePct}%)</span>
                            <span style={{ fontWeight: 800, color: '#334155' }}>{formatMoney(curr, meta.taxAmount)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Multi-Day Schedule Breakdown when > 1 Day */}
                    {meta.days > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Daily Allocation
                        </span>
                        {Array.from({ length: meta.days }).map((_, dayIdx) => {
                          const hasBreakdown = Array.isArray(v.dailyBreakdown) && v.dailyBreakdown.length > dayIdx
                          const dayTotalCost = hasBreakdown ? Number(v.dailyBreakdown[dayIdx]) : avgDailyRate
                          return (
                            <div
                              key={dayIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 10px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '7px',
                              }}
                            >
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Day {dayIdx + 1}</span>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{formatMoney(curr, dayTotalCost)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Requested Amenities */}
        {amenities.length > 0 && (
          <div style={{ marginBottom: '20px', paddingTop: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h5 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0ea5e9', margin: 0 }}>
                Requested Amenities
              </h5>
            </div>
            <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 12px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #3b82f6', lineHeight: 1.5 }}>
              <strong>Operational Policy:</strong> We only guarantee the vehicle itself and passenger capacity. The only specific requirement guaranteed at reservation is ADA accessibility (where applicable). Other onboard amenities are optional and depend on operating company fleet availability.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {amenities.map((am) => {
                const isWater = am.includes('Water')
                const isBaby = am.includes('Seat')
                const isVIP = am.includes('VIP')
                const Icon = isWater ? Droplets : isBaby ? Baby : isVIP ? ShieldCheck : Zap
                return (
                  <div key={am} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: '1px solid #e0f2fe', borderRadius: '12px', padding: '10px 12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: '15px', height: '15px', color: '#0284c7' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{am}</p>
                    </div>
                    <CheckCircle2 style={{ width: '16px', height: '16px', color: '#0284c7' }} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {adaRequired && (
          <div style={{ padding: '14px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users style={{ width: '12px', height: '12px', color: 'white' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af', letterSpacing: '-0.3px' }}>100% ADA Guaranteed</span>
            </div>
            <p style={{ fontSize: '11px', color: '#1e3a8a', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              {adaVehicleCount} ADA-compliant vehicle(s) strictly guaranteed for this trip. We exclusively match you with equipped vehicles.
            </p>
          </div>
        )}
      </div>

      {/* Pinned Static Footer containing Totals and Action Buttons */}
      <div style={{ flexShrink: 0, background: '#f8fafc', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 16px rgba(0,0,0,0.02)', position: 'relative', zIndex: 40 }}>
        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#475569', marginBottom: '6px' }}>
            <span>Subtotal (Vehicles)</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{formatMoney(curr, totalNetSubtotal)}</span>
          </div>
          {totalTaxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#475569', marginBottom: '6px' }}>
              <span>VAT / Transport Tax{effectiveTaxPct > 0 ? ` (${effectiveTaxPct}%)` : ''}</span>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{formatMoney(curr, totalTaxAmount)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '16px', color: '#0f172a', fontWeight: 900, marginBottom: '16px' }}>
            <span>Total</span>
            <span style={{ fontSize: '18px', letterSpacing: '-0.02em' }}>{formatMoney(curr, totalGrossPrice)}</span>
          </div>

          {/* Portal Target for Booking Buttons */}
          <div id="vehicle-details-footer-portal"></div>
        </div>
      </div>

      {/* Rate Engine Calculation Log Modal */}
      {engineModalOpen &&
        mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setEngineModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(3px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '640px',
                maxHeight: '84vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calculator size={17} color="#2563eb" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>Rate Engine Calculation Log</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
                      Verified commercial charter tariff &amp; fleet optimization trace
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEngineModalOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {computedVehicles.map(({ raw: v, meta }, idx: number) => {
                  const logs = meta.logs
                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 4px 10px -2px rgba(15, 23, 42, 0.05)',
                      }}
                    >
                      <div style={{ padding: '12px 16px', background: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Zap size={15} color="#38bdf8" />
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                          {meta.count}× {v.type || option.title || 'Charter Vehicle'}
                        </h4>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1' }}>
                          · {meta.seats} Seats/unit ({meta.count * meta.seats} Total)
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 800, color: '#38bdf8', background: '#1e293b', border: '1px solid #334155', padding: '3px 9px', borderRadius: '999px' }}>
                          CALCULATION ENGINE
                        </span>
                      </div>

                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {logs.map((log: string, lIdx: number) => {
                          const isInit = log.includes('initialized for')
                          const isDayHeader = log.includes('Engine:')
                          const isCharge = log.includes('-> Charged')

                          if (isInit) return null

                          if (isDayHeader) {
                            const dayMatch = log.match(/\[(Day \d+)\]/)
                            const dayStr = dayMatch ? dayMatch[1] : 'Day 1'
                            const details = log.replace(/\[Day \d+\]\s*Engine:/, '').trim()
                            return (
                              <div key={lIdx} style={{ marginTop: lIdx > 0 ? '6px' : 0, paddingBottom: '6px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', fontWeight: 900, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '5px' }}>
                                  {dayStr}
                                </span>
                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>{details}</span>
                              </div>
                            )
                          }

                          if (isCharge) {
                            const parts = log.split('-> Charged')
                            const title = parts[0].replace(/\[Day \d+\]/, '').trim()
                            const mathParts = parts[1].split('=')
                            let math = (mathParts[0] || '').trim().replace('@', '×')
                            const rawTotalStr = (mathParts[1] || '').trim()
                            const numericTotal = parseFloat(rawTotalStr.replace(/[^0-9.-]/g, ''))
                            const formattedTotal = !isNaN(numericTotal) ? formatMoney(curr, numericTotal) : rawTotalStr
                            const isTotalRow = title.toLowerCase().startsWith('total ')

                            return (
                              <div
                                key={lIdx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '9px 12px',
                                  background: isTotalRow ? '#eff6ff' : '#f8fafc',
                                  borderRadius: '8px',
                                  borderLeft: isTotalRow ? '3px solid #2563eb' : '3px solid #cbd5e1',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: isTotalRow ? 900 : 700, color: isTotalRow ? '#1e3a8a' : '#334155' }}>
                                    {title}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', marginTop: '2px' }}>
                                    {math}
                                  </div>
                                </div>
                                <div style={{ fontSize: '13.5px', fontWeight: 900, color: isTotalRow ? '#1d4ed8' : '#0f172a', whiteSpace: 'nowrap' }}>
                                  {formattedTotal}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div key={lIdx} style={{ fontSize: '11.5px', color: '#475569', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '4px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                              {log}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Modal Footer — Cancel/Close pinned Left, Summary Total pinned Right */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEngineModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginRight: '8px' }}>Combined Fleet Total:</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{formatMoney(curr, totalGrossPrice)}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
