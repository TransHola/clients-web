"use client"

import * as React from "react"
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  Lock,
  Sparkles,
  AlertTriangle,
} from "lucide-react"

export interface LegalGateBundle {
  scope: {
    countryCode: string
    countryName: string
    regionName: string
    regionCode: string
    jurisdictionLabel: string
    governingLawLabel: string
  }
  requiredDocs: Array<{
    id: string
    docNumber: number
    name: string
    version: string
    status: string
    enforcementAction: string
    description: string
    hydratedContent: string
    contentSha256: string
    lastUpdated: string
    hasCountryOverride: boolean
    hasRegionOverride: boolean
    scopeLabel: string
    alwaysFreshPerBooking: boolean
    previouslyAcceptedVersion: boolean
    triggerBadge: string
    highlights: string[]
  }>
  informationalDocs?: Array<{
    id: string
    docNumber: number
    name: string
    version: string
    description: string
    hydratedContent: string
  }>
  summary: {
    totalRequired: number
    freshSignatureCount: number
    rememberedPolicyCount: number
    isCrossBorder: boolean
    isGroupOrConvoy: boolean
  }
}

export function PostPaymentLegalGate({
  legalBundle,
  isLoadingBundle = false,
  currency = "AED",
  totalPrice = 0,
  vehicleLabel = "Charter Fleet",
  isSubmitting = false,
  submitError = null,
  onCancel,
  onConfirmAll,
}: {
  legalBundle: LegalGateBundle | null
  isLoadingBundle?: boolean
  currency?: string
  totalPrice?: number
  vehicleLabel?: string
  isSubmitting?: boolean
  submitError?: string | null
  onCancel: () => void
  onConfirmAll: (acceptedDocs: LegalGateBundle["requiredDocs"]) => void
}) {
  const requiredDocs = legalBundle?.requiredDocs || []
  const informationalDocs = legalBundle?.informationalDocs || []

  const [checkedMap, setCheckedMap] = React.useState<Record<string, boolean>>({})
  const [expandedDocId, setExpandedDocId] = React.useState<string | null>(null)
  const [showInfoDocs, setShowInfoDocs] = React.useState(false)

  // Smart initialization: pre-check standing policies already accepted at this exact version by this client,
  // while always requiring fresh consent on transaction-specific contracts & new/updated regional policies
  React.useEffect(() => {
    if (!requiredDocs.length) return
    setCheckedMap((prev) => {
      const next: Record<string, boolean> = {}
      for (const doc of requiredDocs) {
        if (prev[doc.id] !== undefined) {
          next[doc.id] = prev[doc.id]
        } else {
          next[doc.id] = Boolean(doc.previouslyAcceptedVersion && !doc.alwaysFreshPerBooking)
        }
      }
      return next
    })
  }, [requiredDocs])

  const allChecked =
    requiredDocs.length > 0 && requiredDocs.every((doc) => Boolean(checkedMap[doc.id]))
  const checkedCount = requiredDocs.filter((doc) => Boolean(checkedMap[doc.id])).length

  const toggleSingle = (id: string) => {
    setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {}
    for (const doc of requiredDocs) {
      next[doc.id] = checked
    }
    setCheckedMap(next)
  }

  const formattedAmount = Number(totalPrice || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const cleanCurr =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : `${currency} `

  if (isLoadingBundle || !legalBundle) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "40px 24px",
          gap: "14px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "3.5px solid #e2e8f0",
            borderTopColor: "#2563eb",
            animation: "spin 0.85s linear infinite",
          }}
        />
        <p style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Loading Regional Legal Agreements…
        </p>
        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
          Resolving active SuperAdmin compliance policies for your booking region
        </p>
      </div>
    )
  }

  const jurisdictionLabel = legalBundle.scope.jurisdictionLabel || legalBundle.scope.countryName
  const rememberedCount = legalBundle.summary?.rememberedPolicyCount || 0

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
        background: "#ffffff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Header: Step 2 of 2 — Card Confirmed + Regional Jurisdiction */}
      <div
        style={{
          flexShrink: 0,
          padding: "16px 20px 13px",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#15803d",
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
              padding: "3px 9px",
              borderRadius: "999px",
            }}
          >
            <CheckCircle2 style={{ width: "12px", height: "12px" }} />
            Card Payment Confirmed ({cleanCurr}
            {formattedAmount})
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#1e40af",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "3px 9px",
              borderRadius: "999px",
            }}
          >
            <MapPin style={{ width: "11px", height: "11px" }} />
            {jurisdictionLabel} ({legalBundle.scope.countryCode})
          </span>
        </div>

        <h2
          style={{
            fontSize: "18px",
            fontWeight: 900,
            color: "#0f172a",
            letterSpacing: "-0.3px",
            margin: "0 0 3px",
          }}
        >
          Regional Legal Agreements
        </h2>
        <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.45 }}>
          Review and accept the required transportation agreements configured for{" "}
          <strong style={{ color: "#334155" }}>{jurisdictionLabel}</strong> to finalize{" "}
          <strong style={{ color: "#334155" }}>{vehicleLabel}</strong>.
        </p>

        {rememberedCount > 0 && (
          <div
            style={{
              marginTop: "9px",
              padding: "6px 10px",
              borderRadius: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#166534",
            }}
          >
            <Sparkles style={{ width: "12px", height: "12px", flexShrink: 0 }} />
            <span>
              Smart Compliance Memory: {rememberedCount} unchanged regional polic
              {rememberedCount === 1 ? "y" : "ies"} pre-verified from your account history.
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Body of Required Regional Legal Documents */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          padding: "14px 20px",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {requiredDocs.map((doc) => {
          const isChecked = Boolean(checkedMap[doc.id])
          const isExpanded = expandedDocId === doc.id

          return (
            <div
              key={doc.id}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                border: isChecked ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0",
                boxShadow: isChecked
                  ? "0 4px 12px -4px rgba(37, 99, 235, 0.12)"
                  : "0 1px 3px rgba(15, 23, 42, 0.03)",
                transition: "all 0.16s ease",
                flexShrink: 0,
              }}
            >
              <div style={{ padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id={`legal-doc-${doc.id}`}
                    checked={isChecked}
                    onChange={() => toggleSingle(doc.id)}
                    style={{
                      width: "17px",
                      height: "17px",
                      marginTop: "2px",
                      cursor: "pointer",
                      accentColor: "#2563eb",
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <label
                        htmlFor={`legal-doc-${doc.id}`}
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#0f172a",
                          cursor: "pointer",
                          lineHeight: 1.3,
                        }}
                      >
                        {doc.name}
                      </label>

                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 800,
                            color: doc.alwaysFreshPerBooking ? "#1d4ed8" : "#475569",
                            background: doc.alwaysFreshPerBooking ? "#eff6ff" : "#f1f5f9",
                            border: doc.alwaysFreshPerBooking
                              ? "1px solid #bfdbfe"
                              : "1px solid #e2e8f0",
                            padding: "1px 6px",
                            borderRadius: "5px",
                          }}
                        >
                          {doc.triggerBadge}
                        </span>
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 800,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            color: "#64748b",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "1px 5px",
                            borderRadius: "4px",
                          }}
                        >
                          {doc.version}
                        </span>
                        {doc.previouslyAcceptedVersion && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 800,
                              color: "#15803d",
                              background: "#dcfce7",
                              padding: "1px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            ✓ Verified on file
                          </span>
                        )}
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: "11.5px",
                        color: "#64748b",
                        margin: "4px 0 6px",
                        lineHeight: 1.4,
                      }}
                    >
                      {doc.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        {doc.scopeLabel} · SHA-256 {doc.contentSha256.slice(0, 10)}…
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        style={{
                          background: isExpanded ? "#eff6ff" : "#f8fafc",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          color: isExpanded ? "#1d4ed8" : "#334155",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <FileText style={{ width: "11px", height: "11px" }} />
                        {isExpanded ? "Hide Full Clauses" : "Read Full Clauses"}
                        {isExpanded ? (
                          <ChevronUp style={{ width: "11px", height: "11px" }} />
                        ) : (
                          <ChevronDown style={{ width: "11px", height: "11px" }} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Live-Hydrated Clauses */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "12px",
                      borderRadius: "9px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontSize: "11.5px",
                      color: "#334155",
                      lineHeight: 1.6,
                      whiteSpace: "pre-line",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "8px",
                        marginBottom: "8px",
                        borderBottom: "1px dashed #cbd5e1",
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#475569",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <span>
                        Document #{doc.docNumber} · {legalBundle.scope.governingLawLabel}
                      </span>
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                        Updated {doc.lastUpdated}
                      </span>
                    </div>
                    {doc.hydratedContent}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Optional Informational Reference Policies */}
        {informationalDocs.length > 0 && (
          <div style={{ marginTop: "4px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setShowInfoDocs((v) => !v)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "10px",
                background: "#ffffff",
                border: "1px dashed #cbd5e1",
                fontSize: "11px",
                fontWeight: 700,
                color: "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>
                Additional Regional Reference Policies ({informationalDocs.length})
              </span>
              {showInfoDocs ? (
                <ChevronUp style={{ width: "13px", height: "13px" }} />
              ) : (
                <ChevronDown style={{ width: "13px", height: "13px" }} />
              )}
            </button>
            {showInfoDocs && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {informationalDocs.map((info) => (
                  <div
                    key={info.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      fontSize: "11px",
                      color: "#475569",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "3px" }}>
                      {info.name} ({info.version})
                    </div>
                    <div>{info.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Master Select-All Consent Bar + Left Cancel / Right Finalize Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 20px 16px",
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {submitError && (
          <div
            style={{
              padding: "8px 11px",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "11.5px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertTriangle style={{ width: "14px", height: "14px", flexShrink: 0 }} />
            <span>{submitError}</span>
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            padding: "9px 12px",
            borderRadius: "10px",
            background: allChecked ? "#eff6ff" : "#f8fafc",
            border: allChecked ? "1.5px solid #93c5fd" : "1px solid #cbd5e1",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
            style={{
              width: "17px",
              height: "17px",
              cursor: "pointer",
              accentColor: "#2563eb",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", display: "block" }}>
              I have read and agree to all {requiredDocs.length} required {jurisdictionLabel} legal agreements ({checkedCount}/{requiredDocs.length})
            </span>
            <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>
              Binding electronic execution under {legalBundle.scope.governingLawLabel}
            </span>
          </div>
        </label>

        {/* Strictly Left = Cancel, Right = Agree & Complete Booking */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            style={{
              height: "46px",
              padding: "0 18px",
              borderRadius: "12px",
              border: "1.5px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 800,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!allChecked || isSubmitting}
            onClick={() => onConfirmAll(requiredDocs)}
            style={{
              flex: 1,
              maxWidth: "310px",
              height: "46px",
              padding: "0 18px",
              borderRadius: "12px",
              border: "none",
              background: allChecked && !isSubmitting ? "#16a34a" : "#cbd5e1",
              color: allChecked && !isSubmitting ? "#ffffff" : "#64748b",
              fontSize: "13.5px",
              fontWeight: 800,
              cursor: allChecked && !isSubmitting ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              boxShadow:
                allChecked && !isSubmitting ? "0 4px 12px rgba(22, 163, 74, 0.22)" : "none",
              transition: "all 0.16s ease",
            }}
          >
            <ShieldCheck style={{ width: "16px", height: "16px" }} />
            {isSubmitting ? "Finalizing Booking…" : "Agree & Complete Booking"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            fontSize: "10.5px",
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          <Lock style={{ width: "11px", height: "11px" }} />
          <span>Cryptographic SHA-256 consent receipt archived with your reservation</span>
        </div>
      </div>
    </div>
  )
}
