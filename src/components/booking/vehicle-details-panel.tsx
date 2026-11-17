"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  Users,
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
  Briefcase,
  X,
} from "lucide-react"
import { resolveFleetImageUrl } from "./quotation-panel"

function resolveCleanCurrency(option: any): string {
  const code = String(option?.currency || '').trim().toUpperCase()
  if (code === 'EUR') return '€'
  if (code === 'USD') return '$'
  if (code === 'GBP') return '£'
  if (code) return code
  const sym = String(option?.currencySymbol || '').trim()
  if (sym === '€' || sym === '$' || sym === '£') return sym
  return 'AED'
}

function formatMoney(curr: string, amount: number): string {
  const cleanCurr = String(curr || 'AED').trim()
  const needsSpace = /^[A-Za-z]{2,4}$/.test(cleanCurr)
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return needsSpace ? `${cleanCurr} ${formatted}` : `${cleanCurr}${formatted}`
}

function buildVehicleBreakdownAndLogs(v: any, idx: number, allVehicles: any[], option: any, currLabel: string) {
  const count = Math.max(1, Number(v.count || 1))
  const seats = Math.max(4, Number(v.seats || option.totalSeats || 14))
  const days = Math.max(1, Number(option.daysCount || (Array.isArray(v.dailyBreakdown) ? v.dailyBreakdown.length : 1)))
  const bagsPerUnit = Number(
    v.bagsPerUnit || (seats >= 45 ? 50 : seats >= 30 ? 30 : seats >= 18 ? 20 : seats >= 10 ? 12 : Math.max(4, seats - 1))
  )

  // 1. Authoritative SuperAdmin Go 1.24 Rate Engine output (`v.lineItems` present)
  if (Array.isArray(v.lineItems) && v.lineItems.length > 0) {
    const grossTotal = Number(v.price ?? option.price ?? 0)
    const taxAmount = Number(v.taxAmount ?? 0)
    const netSubtotal = v.netSubtotal !== undefined ? Number(v.netSubtotal) : +(grossTotal - taxAmount).toFixed(2)
    const taxableSubtotal = v.taxableSubtotal !== undefined ? Number(v.taxableSubtotal) : netSubtotal
    const taxRatePct = Number(v.taxRatePct ?? v.rateCardSummary?.taxRatePct ?? option.taxRatePct ?? 0)
    const taxLabel = String(v.taxLabel || v.rateCardSummary?.taxLabel || option.taxLabel || `Transport VAT (${taxRatePct}%)`)
    const unitGross = v.unitPrice !== undefined ? Number(v.unitPrice) : +(grossTotal / count).toFixed(2)
    const unitNet = v.unitNetPrice !== undefined ? Number(v.unitNetPrice) : +(netSubtotal / count).toFixed(2)

    return {
      isAuthoritative: true,
      count,
      seats,
      days,
      currLabel,
      bagsPerUnit,
      grossTotal,
      netSubtotal,
      taxableSubtotal,
      taxRatePct,
      taxLabel,
      taxAmount,
      unitGross,
      unitNet,
      lineItems: v.lineItems as Array<{
        label: string
        sublabel: string
        formula: string
        unitAmount: number
        totalAmount: number
        taxable: boolean
        category: string
      }>,
      rateCardSummary: v.rateCardSummary || null,
      logs: Array.isArray(v.debugLog) && v.debugLog.length > 0 ? v.debugLog : [],
      imageUrl: v.imageUrl || resolveFleetImageUrl(v.iconName || v.type, seats),
    }
  }

  // 2. Fallback for legacy saved quotations that predate structured lineItems
  const weights = allVehicles.map((item: any) =>
    Math.max(1, Number(item.count || 1)) * Math.sqrt(Math.max(4, Number(item.seats || 14)))
  )
  const weightSum = weights.reduce((a: number, b: number) => a + b, 0) || 1
  const share = (weights[idx] || 1) / weightSum

  const optionGross = Math.max(1, Number(option.price || 0))
  const grossTotal =
    v.price !== undefined
      ? Number(v.price)
      : allVehicles.length === 1
        ? optionGross
        : +(optionGross * share).toFixed(2)

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

  const netSubtotal =
    inferredTaxPct > 0 ? +(grossTotal / (1 + inferredTaxPct / 100)).toFixed(2) : grossTotal
  const taxAmount = +(grossTotal - netSubtotal).toFixed(2)
  const unitGross = +(grossTotal / count).toFixed(2)
  const unitNet = +(netSubtotal / count).toFixed(2)
  const taxLabel = inferredTaxPct === 5 && currLabel === 'AED' ? 'UAE VAT (5%)' : `Transport Tax (${inferredTaxPct}%)`

  const fallbackLineItems = [
    {
      label: `Charter Fleet Allocation (${count}× ${v.type || 'Charter Vehicle'})`,
      sublabel: `${count} vehicle${count > 1 ? 's' : ''} × ${formatMoney(currLabel, unitNet)} net`,
      formula: `${count} × ${unitNet.toFixed(2)}`,
      unitAmount: unitNet,
      totalAmount: netSubtotal,
      taxable: true,
      category: 'engine',
    },
  ]

  const existingLogs = Array.isArray(v.debugLog) && v.debugLog.length > 0 ? v.debugLog : null
  const logs: string[] = existingLogs || [
    `[Day 1] Engine: Verified Charter Rate (${count}× ${v.type || 'Charter Vehicle'} · ${seats} Seats/unit)`,
    `[Day 1] Net Charter Allocation -> Charged ${count} × ${unitNet.toFixed(2)} = ${netSubtotal.toFixed(2)}`,
    ...(taxAmount > 0
      ? [`[Day 1] ${taxLabel} -> Charged ${netSubtotal.toFixed(2)} @ ${inferredTaxPct}% = ${taxAmount.toFixed(2)}`]
      : []),
    `[Day 1] Total ${count}× ${v.type || 'Charter Vehicle'} Allocation -> Charged ${count} × ${currLabel} ${unitGross.toFixed(2)} = ${grossTotal.toFixed(2)}`,
  ]

  return {
    isAuthoritative: false,
    count,
    seats,
    days,
    currLabel,
    bagsPerUnit,
    grossTotal,
    netSubtotal,
    taxableSubtotal: netSubtotal,
    taxRatePct: inferredTaxPct,
    taxLabel,
    taxAmount,
    unitGross,
    unitNet,
    lineItems: fallbackLineItems,
    rateCardSummary: null,
    logs,
    imageUrl: v.imageUrl || resolveFleetImageUrl(v.iconName || v.type, seats),
  }
}

function formatVariationLabel(raw: string): string {
  const key = String(raw || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (key === 'oneway') return 'One Way'
  if (key === 'roundtrip' || key === 'roundtripcontinuous') return 'Round Trip'
  if (key === 'shuttle') return 'Shuttle'
  if (key === 'multiday') return 'Multi-Day'
  if (!raw) return ''
  return String(raw).trim()
}

function formatCompactNum(val: number): string {
  const n = Number(val || 0)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

function extractSharedEngineContext(computedVehicles: Array<{ raw: any; meta: any }>, option: any) {
  const primaryMeta = computedVehicles.find((item) => item.meta?.rateCardSummary)?.meta || computedVehicles[0]?.meta
  const rc = primaryMeta?.rateCardSummary
  const daysCount = Math.max(1, Number(primaryMeta?.days || option?.daysCount || 1))

  if (rc) {
    const unitLabel = String(rc.unitLabel || 'hrs')
    const billableVal = Number(rc.billableHours || 0)
    const distVal = Number(rc.distanceUnits || 0)
    const distUnit = String(rc.distanceUnit || 'km')

    return {
      variationLabel: formatVariationLabel(rc.variation || option?.tripType || ''),
      engineLabel: String(rc.engineLabel || 'Duration Engine'),
      daysLabel: `${daysCount} Day${daysCount > 1 ? 's' : ''}`,
      billableLabel: billableVal > 0 ? `Billable ${formatCompactNum(billableVal)} ${unitLabel}` : '',
      distanceLabel: distVal > 0 ? `${formatCompactNum(distVal)} ${distUnit}` : '',
      pricingModeLabel: rc.tiered ? 'Tiered Pricing' : 'Standard Tariff',
    }
  }

  // Fallback parser for legacy saved quotations that only stored debugLog strings
  const firstEngineLog =
    computedVehicles
      .flatMap((item) => (Array.isArray(item.meta?.logs) ? item.meta.logs : []))
      .find((line: string) => line.includes('Engine:')) || ''

  if (firstEngineLog) {
    const cleaned = firstEngineLog.replace(/\[Day \d+\]\s*Engine:\s*/, '').trim()
    const parenIdx = cleaned.indexOf('(')
    const engineLabel = parenIdx > 0 ? cleaned.slice(0, parenIdx).trim() : cleaned
    const inner = parenIdx > 0 ? cleaned.slice(parenIdx + 1).replace(/\)$/, '') : ''
    const tokens = inner.split('·').map((t: string) => t.trim()).filter(Boolean)

    const variationRaw = tokens.find((t: string) => /^(oneway|roundtrip|shuttle|multiday|one way|round trip)/i.test(t)) || ''
    const billableTok = tokens.find((t: string) => /^billable\s+/i.test(t)) || ''
    const distTok = tokens.find((t: string) => /^\d+(\.\d+)?\s*(km|mi|miles)\b/i.test(t)) || ''
    const tierTok = tokens.find((t: string) => /tiered/i.test(t))

    return {
      variationLabel: formatVariationLabel(variationRaw || option?.tripType || ''),
      engineLabel: engineLabel || 'Verified Charter Rate',
      daysLabel: `${daysCount} Day${daysCount > 1 ? 's' : ''}`,
      billableLabel: billableTok,
      distanceLabel: distTok,
      pricingModeLabel: tierTok ? 'Tiered Pricing' : '',
    }
  }

  return {
    variationLabel: formatVariationLabel(option?.tripType || ''),
    engineLabel: 'Verified Charter Rate',
    daysLabel: `${daysCount} Day${daysCount > 1 ? 's' : ''}`,
    billableLabel: '',
    distanceLabel: '',
    pricingModeLabel: '',
  }
}

function extractVehicleRateBadge(meta: any, curr: string): string {
  const rc = meta?.rateCardSummary
  if (rc && Number(rc.baseRate) > 0) {
    const singularUnit = String(rc.unitLabel || 'hrs').replace(/s$/, '')
    const minPart = Number(rc.minBillable) > 0 ? ` · Min ${formatCompactNum(rc.minBillable)} ${rc.unitLabel || 'hrs'}` : ''
    return `Base ${formatMoney(curr, rc.baseRate)}/${singularUnit}${minPart}`
  }

  const engineLine = Array.isArray(meta?.logs) ? meta.logs.find((l: string) => l.includes('Engine:')) : ''
  if (engineLine) {
    const innerMatch = engineLine.match(/\(([^)]+)\)/)
    if (innerMatch) {
      const tokens = innerMatch[1].split('·').map((t: string) => t.trim())
      const baseTok = tokens.find((t: string) => /^base\s+/i.test(t))
      const minTok = tokens.find((t: string) => /^min\s+/i.test(t))
      if (baseTok) {
        return minTok ? `${baseTok} · ${minTok}` : baseTok
      }
    }
  }

  return `${formatMoney(curr, meta.unitGross)} / unit`
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

  useEffect(() => {
    setExpandedVehicles({ 0: true, 1: true, 2: true })
  }, [option?.id, option?.label])

  useEffect(() => {
    if (!engineModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEngineModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [engineModalOpen])

  if (!option) return null

  const curr = resolveCleanCurrency(option)

  const rawVehicles: any[] =
    Array.isArray(option.vehicles) && option.vehicles.length > 0
      ? option.vehicles
      : [{ type: option.label || option.title || 'Charter Bus', count: 1, seats: option.totalSeats || option.seats || 56 }]

  const computedVehicles = rawVehicles.map((v: any, idx: number) => ({
    raw: v,
    meta: buildVehicleBreakdownAndLogs(v, idx, rawVehicles, option, curr),
  }))

  const totalGrossPrice = Number(option.price || computedVehicles.reduce((s, item) => s + item.meta.grossTotal, 0))
  const totalTaxAmount =
    option.taxAmount !== undefined
      ? Number(option.taxAmount)
      : +computedVehicles.reduce((s, item) => s + item.meta.taxAmount, 0).toFixed(2)
  const totalNetSubtotal = +(totalGrossPrice - totalTaxAmount).toFixed(2)
  const primaryTaxLabel = computedVehicles[0]?.meta.taxLabel || 'VAT / Transport Tax'

  const vehicleTypeCount = computedVehicles.length
  const totalFleetUnits = computedVehicles.reduce((s, item) => s + item.meta.count, 0)
  const totalFleetSeats = computedVehicles.reduce((s, item) => s + item.meta.count * item.meta.seats, 0)
  const maxRowsPerVehicle = Math.max(
    1,
    ...computedVehicles.map((item) =>
      item.meta.isAuthoritative ? item.meta.lineItems.length + 2 : item.meta.logs.length
    )
  )

  const dynamicModalMaxWidth =
    vehicleTypeCount >= 3
      ? 'min(1380px, 96vw)'
      : vehicleTypeCount === 2
        ? 'min(1120px, 95vw)'
        : maxRowsPerVehicle >= 6
          ? 'min(880px, 94vw)'
          : 'min(680px, 94vw)'

  const vehicleGridColumns =
    vehicleTypeCount >= 3
      ? 'repeat(auto-fit, minmax(360px, 1fr))'
      : vehicleTypeCount === 2
        ? 'repeat(auto-fit, minmax(420px, 1fr))'
        : '1fr'

  const sharedEngineContext = extractSharedEngineContext(computedVehicles, option)

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
              100% SuperAdmin preconfigured tariff
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
            const rc = meta.rateCardSummary

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
                    {/* SuperAdmin Active Engine Summary Pill */}
                    {rc && (
                      <div
                        style={{
                          padding: '7px 10px',
                          borderRadius: '8px',
                          background: '#0f172a',
                          color: '#f8fafc',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#38bdf8', fontWeight: 800 }}>
                          <Zap size={11} color="#38bdf8" />
                          {rc.engineLabel || 'Duration Engine'}
                        </span>
                        <span style={{ color: '#e2e8f0' }}>
                          Base {formatMoney(curr, rc.baseRate)}/{String(rc.unitLabel || 'hrs').replace(/s$/, '')} · Min {rc.minBillable} {rc.unitLabel || 'hrs'}
                          {rc.tiered ? ' · Tiered' : ''}
                        </span>
                      </div>
                    )}

                    {/* Per-Vehicle Net Summary Strip */}
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
                        Net Rate / Unit ({meta.seats} Seats · {meta.bagsPerUnit} Bags)
                      </span>
                      <span style={{ fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {formatMoney(curr, meta.unitNet)} × {meta.count}
                      </span>
                    </div>

                    {/* Exact SuperAdmin Line Items */}
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
                      {meta.lineItems.map((item, liIdx) => {
                        const ItemIcon =
                          item.category === 'allowance' || item.category === 'secondary_driver'
                            ? Briefcase
                            : item.category === 'deadhead'
                              ? Route
                              : Clock
                        return (
                          <div
                            key={liIdx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '8px',
                              borderTop: liIdx > 0 ? '1px dashed #f1f5f9' : 'none',
                              paddingTop: liIdx > 0 ? '7px' : 0,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                <ItemIcon size={11} color="#2563eb" />
                                <span>{item.label}</span>
                                {!item.taxable && (
                                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '0px 5px', borderRadius: '4px' }}>
                                    Non-taxable
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1.5px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                {item.sublabel}
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {formatMoney(curr, item.totalAmount)}
                            </span>
                          </div>
                        )
                      })}

                      {/* Net Vehicle Subtotal + Statutory Tax */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '7px', fontSize: '11.5px' }}>
                        <span style={{ fontWeight: 700, color: '#64748b' }}>Net Vehicle Subtotal</span>
                        <span style={{ fontWeight: 800, color: '#334155' }}>{formatMoney(curr, meta.netSubtotal)}</span>
                      </div>
                      {meta.taxAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                          <span style={{ fontWeight: 700, color: '#64748b' }}>
                            {meta.taxLabel}
                            {meta.taxableSubtotal !== meta.netSubtotal
                              ? ` (on ${formatMoney(curr, meta.taxableSubtotal)})`
                              : ''}
                          </span>
                          <span style={{ fontWeight: 800, color: '#334155' }}>{formatMoney(curr, meta.taxAmount)}</span>
                        </div>
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
              <span>{primaryTaxLabel}</span>
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

      {/* Rate Engine Calculation Log Modal — Dynamic Width, Smooth Scroll & Zero Duplication */}
      {engineModalOpen &&
        mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setEngineModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.58)',
              backdropFilter: 'blur(3px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: dynamicModalMaxWidth,
                maxHeight: 'min(90vh, 880px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.32)',
                border: '1px solid #e2e8f0',
                transition: 'max-width 0.18s ease',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '15px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Calculator size={17} color="#2563eb" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                      Rate Engine Calculation Log
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
                      Live SuperAdmin country tariff · Exact per-vehicle cost allocation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEngineModalOpen(false)}
                  aria-label="Close calculation log"
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
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Single Deduplicated Trip & Engine Context Bar */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '10px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {sharedEngineContext.variationLabel && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#1e40af',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {sharedEngineContext.variationLabel}
                    </span>
                  )}
                  {sharedEngineContext.engineLabel && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0f172a',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Zap size={11} color="#2563eb" />
                      {sharedEngineContext.engineLabel}
                    </span>
                  )}
                  {sharedEngineContext.daysLabel && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#334155',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {sharedEngineContext.daysLabel}
                    </span>
                  )}
                  {sharedEngineContext.billableLabel && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#334155',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={11} color="#64748b" />
                      {sharedEngineContext.billableLabel}
                    </span>
                  )}
                  {sharedEngineContext.distanceLabel && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#334155',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Route size={11} color="#64748b" />
                      {sharedEngineContext.distanceLabel}
                    </span>
                  )}
                  {sharedEngineContext.pricingModeLabel && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0369a1',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {sharedEngineContext.pricingModeLabel}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                  {totalFleetUnits} Vehicle{totalFleetUnits > 1 ? 's' : ''} · {totalFleetSeats} Seats Total
                </div>
              </div>

              {/* Scrollable Modal Body — Pure Block Scroll Container + Dynamic CSS Grid (Zero Clipping) */}
              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  padding: '16px 20px',
                  background: '#f1f5f9',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: vehicleGridColumns,
                    gap: '16px',
                    alignItems: 'start',
                  }}
                >
                  {computedVehicles.map(({ raw: v, meta }, idx: number) => {
                    const vehicleTitle = v.type || option.title || 'Charter Vehicle'
                    const rateBadge = extractVehicleRateBadge(meta, curr)
                    const useTwoColItems =
                      vehicleTypeCount === 1 && meta.isAuthoritative && meta.lineItems.length >= 5

                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Per-Vehicle Dark Header — Shows Only Vehicle-Specific Capacity & Base Tariff */}
                        <div
                          style={{
                            padding: '11px 15px',
                            background: '#0f172a',
                            borderRadius: '13px 13px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                            <Zap size={14} color="#38bdf8" />
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '13.5px',
                                fontWeight: 800,
                                color: '#ffffff',
                                textTransform: 'capitalize',
                              }}
                            >
                              {meta.count}× {vehicleTitle}
                            </h4>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1' }}>
                              · Up to {meta.seats} Pax/unit ({meta.count * meta.seats} Seats)
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: '#38bdf8',
                              background: '#1e293b',
                              border: '1px solid #334155',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {rateBadge}
                          </span>
                        </div>

                        {/* Per-Vehicle Calculation Rows */}
                        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {meta.isAuthoritative ? (
                            <>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: useTwoColItems
                                    ? 'repeat(auto-fit, minmax(300px, 1fr))'
                                    : '1fr',
                                  gap: '8px',
                                }}
                              >
                                {meta.lineItems.map((item: any, liIdx: number) => (
                                  <div
                                    key={liIdx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '10px',
                                      padding: '8px 11px',
                                      background: '#f8fafc',
                                      borderRadius: '8px',
                                      borderLeft: '3px solid #cbd5e1',
                                    }}
                                  >
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          color: '#1e293b',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        <span>{item.label}</span>
                                        {!item.taxable && (
                                          <span
                                            style={{
                                              fontSize: '9.5px',
                                              fontWeight: 800,
                                              color: '#475569',
                                              background: '#e2e8f0',
                                              padding: '1px 5px',
                                              borderRadius: '4px',
                                            }}
                                          >
                                            Non-taxable
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '10.5px',
                                          color: '#64748b',
                                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                          marginTop: '2px',
                                        }}
                                      >
                                        {item.sublabel || item.formula}
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {formatMoney(curr, item.totalAmount)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Net Subtotal + Statutory Tax + Vehicle Allocation Total */}
                              {(meta.lineItems.length > 1 || meta.taxAmount > 0) && (
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '7px 11px',
                                    background: '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                                      Net Vehicle Subtotal
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '10.5px',
                                        color: '#64748b',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                      }}
                                    >
                                      {meta.count > 1
                                        ? `${formatMoney(curr, meta.unitNet)} net/unit × ${meta.count} vehicles`
                                        : 'Net charter tariff before tax'}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>
                                    {formatMoney(curr, meta.netSubtotal)}
                                  </div>
                                </div>
                              )}

                              {meta.taxAmount > 0 && (
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '7px 11px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    borderLeft: '3px solid #94a3b8',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                                      {meta.taxLabel}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '10.5px',
                                        color: '#64748b',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                      }}
                                    >
                                      {formatMoney(curr, meta.taxableSubtotal)} taxable × {formatCompactNum(meta.taxRatePct)}%
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                    {formatMoney(curr, meta.taxAmount)}
                                  </div>
                                </div>
                              )}

                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '9px 12px',
                                  background: '#eff6ff',
                                  borderRadius: '8px',
                                  borderLeft: '3px solid #2563eb',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#1e3a8a', textTransform: 'capitalize' }}>
                                    Total {meta.count}× {vehicleTitle} Allocation
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '10.5px',
                                      color: '#3b82f6',
                                      fontWeight: 700,
                                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                      marginTop: '1px',
                                    }}
                                  >
                                    {meta.count > 1
                                      ? `${meta.count} vehicles × ${formatMoney(curr, meta.unitGross)} / unit`
                                      : `1 vehicle gross total`}
                                  </div>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                                  {formatMoney(curr, meta.grossTotal)}
                                </div>
                              </div>
                            </>
                          ) : (
                            /* Legacy fallback logs — skips duplicated Engine header lines */
                            meta.logs.map((log: string, lIdx: number) => {
                              const isInit = log.includes('initialized for')
                              const isDayHeader = log.includes('Engine:')
                              const isCharge = log.includes('-> Charged')

                              if (isInit || isDayHeader) return null

                              if (isCharge) {
                                const parts = log.split('-> Charged')
                                const title = parts[0].replace(/\[Day \d+\]/, '').trim()
                                const mathParts = parts[1].split('=')
                                const math = (mathParts[0] || '').trim().replace('@', '×')
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
                                      padding: '8px 11px',
                                      background: isTotalRow ? '#eff6ff' : '#f8fafc',
                                      borderRadius: '8px',
                                      borderLeft: isTotalRow ? '3px solid #2563eb' : '3px solid #cbd5e1',
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: '12px', fontWeight: isTotalRow ? 900 : 700, color: isTotalRow ? '#1e3a8a' : '#334155' }}>
                                        {title}
                                      </div>
                                      <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', marginTop: '2px' }}>
                                        {math}
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 900, color: isTotalRow ? '#1d4ed8' : '#0f172a', whiteSpace: 'nowrap' }}>
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
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Modal Footer — Close pinned Left, Combined Fleet Summary pinned Right */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '12px 20px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {totalTaxAmount > 0 && (
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>
                      Net: <strong style={{ color: '#334155' }}>{formatMoney(curr, totalNetSubtotal)}</strong> · {primaryTaxLabel}:{' '}
                      <strong style={{ color: '#334155' }}>{formatMoney(curr, totalTaxAmount)}</strong>
                    </span>
                  )}
                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', marginRight: '6px' }}>
                      Combined Fleet Total:
                    </span>
                    <span style={{ fontSize: '15.5px', fontWeight: 900, color: '#0f172a' }}>
                      {formatMoney(curr, totalGrossPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
