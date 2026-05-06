"use client"

import * as React from "react"
import { X, AlertTriangle, ChevronDown, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react"

const CANCEL_REASONS = [
  "Change of plans",
  "Found alternative transport",
  "Trip time changed",
  "Wrong booking details",
  "Emergency",
  "Other",
]

type Step = "policy" | "reason" | "otp" | "final" | "locked"

interface Policy { refundType: "full" | "partial" | "none"; pct?: number; message: string }

function getPolicy(minutesToTrip: number): Policy {
  if (minutesToTrip > 120) return { refundType: "full", message: "Full refund will be issued within 3–5 business days." }
  if (minutesToTrip > 30)  return { refundType: "partial", pct: 50, message: "50% refund due to late cancellation. Remaining amount is non-refundable." }
  return { refundType: "none", message: "No refund — cancellation is within 30 minutes of pickup." }
}

export function CancellationModal({
  onClose,
  onConfirmed,
  bookingRef = "TH-ABC123",
  minutesToTrip = 90,
}: {
  onClose: () => void
  onConfirmed: () => void
  bookingRef?: string
  minutesToTrip?: number
}) {
  const policy = getPolicy(minutesToTrip)
  const [step, setStep] = React.useState<Step>("policy")
  const [reason, setReason] = React.useState("")
  const [note, setNote]   = React.useState("")
  const [otp, setOtp]     = React.useState(["", "", "", "", "", ""])
  const [otpSecs, setOtpSecs]   = React.useState(90)
  const [otpFails, setOtpFails] = React.useState(0)
  const [otpError, setOtpError] = React.useState("")
  const [confirmed, setConfirmed] = React.useState(false)
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for OTP
  React.useEffect(() => {
    if (step !== "otp") return
    if (otpSecs <= 0) return
    const id = setInterval(() => setOtpSecs(s => s - 1), 1000)
    return () => clearInterval(id)
  }, [step, otpSecs])

  const simulatedCode = "123456"

  const handleOtpKey = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const verifyOtp = () => {
    if (otp.join("") === simulatedCode) {
      setStep("final")
    } else {
      const fails = otpFails + 1
      setOtpFails(fails)
      setOtpError(`Incorrect code (${3 - fails} attempt${3 - fails !== 1 ? "s" : ""} left)`)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
      if (fails >= 3) setStep("locked")
    }
  }

  const resendOtp = () => { setOtpSecs(90); setOtpError("") }

  const policyColors = { full: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '#16a34a' }, partial: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', icon: '#d97706' }, none: { bg: '#fee2e2', border: '#fecaca', text: '#9f1f1f', icon: '#dc2626' } }
  const pc = policyColors[policy.refundType]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 24px 36px', animation: 'slideUp 0.25s ease', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#e2e8f0', margin: '0 auto 18px' }} />

        {/* Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Cancel Booking</h3>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '20px' }}>REF: {bookingRef}</p>

        {/* ── STEP 1: Policy ── */}
        {step === "policy" && (
          <>
            <div style={{ padding: '14px 16px', borderRadius: '14px', background: pc.bg, border: `1.5px solid ${pc.border}`, marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertTriangle style={{ width: '18px', height: '18px', color: pc.icon, flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: pc.text, margin: '0 0 4px' }}>
                    {policy.refundType === "full" ? "✓ Full Refund Eligible" : policy.refundType === "partial" ? `⚠ Partial Refund (${policy.pct}%)` : "✕ No Refund Applies"}
                  </p>
                  <p style={{ fontSize: '12px', color: pc.text, margin: 0, lineHeight: 1.5 }}>{policy.message}</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '22px' }}>
              <p style={{ fontSize: '12px', color: '#7f1d1d', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                ⚠ Cancellations are final and cannot be undone. You will be required to verify your identity via OTP before cancellation is processed.
              </p>
            </div>
            <button onClick={() => setStep("reason")} style={{ width: '100%', height: '48px', borderRadius: '14px', background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
              I Understand — Continue
            </button>
            <button onClick={onClose} style={{ width: '100%', height: '44px', borderRadius: '14px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer', marginTop: '10px' }}>
              Keep My Booking
            </button>
          </>
        )}

        {/* ── STEP 2: Reason ── */}
        {step === "reason" && (
          <>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Why are you cancelling?</p>
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', height: '46px', padding: '0 36px 0 14px', borderRadius: '12px', border: `1.5px solid ${reason ? '#2563eb' : '#e2e8f0'}`, background: 'white', fontSize: '13px', fontWeight: 600, outline: 'none', appearance: 'none', cursor: 'pointer', color: reason ? '#0f172a' : '#94a3b8', boxSizing: 'border-box' }}>
                <option value="" disabled>— Select a reason —</option>
                {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Additional notes (optional)…" rows={3} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '18px' }} />
            <button disabled={!reason} onClick={() => setStep("otp")} style={{ width: '100%', height: '48px', borderRadius: '14px', background: reason ? '#0f172a' : '#e2e8f0', color: reason ? 'white' : '#94a3b8', fontWeight: 800, fontSize: '14px', border: 'none', cursor: reason ? 'pointer' : 'not-allowed', marginBottom: '10px' }}>
              Continue to Verification →
            </button>
            <button onClick={() => setStep("policy")} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>← Back</button>
          </>
        )}

        {/* ── STEP 3: OTP ── */}
        {step === "otp" && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldAlert style={{ width: '24px', height: '24px', color: '#2563eb' }} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Identity Verification</p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Enter the 6-digit code sent to your registered contact</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>(Demo code: <strong>123456</strong>)</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
              {otp.map((d, i) => (
                <input key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleOtpKey(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) { inputRefs.current[i - 1]?.focus() } }}
                  style={{ width: '44px', height: '52px', textAlign: 'center', fontSize: '22px', fontWeight: 800, borderRadius: '12px', border: `2px solid ${otpError ? '#fca5a5' : d ? '#2563eb' : '#e2e8f0'}`, outline: 'none', background: d ? '#eff6ff' : 'white', transition: 'border-color 0.15s', color: '#0f172a' }}
                />
              ))}
            </div>

            {otpError && <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>{otpError}</p>}

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              {otpSecs > 0
                ? <span style={{ fontSize: '12px', color: '#94a3b8' }}>Resend in {otpSecs}s</span>
                : <button onClick={resendOtp} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}><RefreshCw style={{ width: '12px', height: '12px' }} /> Resend Code</button>
              }
            </div>

            <button onClick={verifyOtp} disabled={otp.join("").length < 6} style={{ width: '100%', height: '48px', borderRadius: '14px', background: otp.join("").length === 6 ? '#dc2626' : '#e2e8f0', color: otp.join("").length === 6 ? 'white' : '#94a3b8', fontWeight: 800, fontSize: '14px', border: 'none', cursor: otp.join("").length === 6 ? 'pointer' : 'not-allowed', marginBottom: '10px' }}>
              Verify & Proceed
            </button>
            <button onClick={() => setStep("reason")} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>← Back</button>
          </>
        )}

        {/* ── STEP 4: Final ── */}
        {step === "final" && !confirmed && (
          <>
            <div style={{ padding: '14px 16px', borderRadius: '14px', background: '#fef2f2', border: '1.5px solid #fca5a5', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: 800, color: '#7f1d1d', margin: '0 0 6px' }}>Final Confirmation</p>
              <p style={{ fontSize: '12px', color: '#7f1d1d', margin: 0, lineHeight: 1.6 }}>
                This action is <strong>irreversible</strong>. Your booking <strong>{bookingRef}</strong> will be permanently cancelled.{' '}
                {policy.refundType === 'none' ? 'No refund will be issued.' : policy.refundType === 'partial' ? `A ${policy.pct}% refund will be processed.` : 'A full refund will be issued.'}
              </p>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '18px' }}>Reason: <strong>{reason}</strong>{note ? ` — "${note}"` : ''}</p>
            <button onClick={() => { setConfirmed(true); setTimeout(onConfirmed, 1200) }} style={{ width: '100%', height: '48px', borderRadius: '14px', background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
              Confirm Cancellation
            </button>
            <button onClick={onClose} style={{ width: '100%', height: '44px', borderRadius: '14px', background: 'white', color: '#0f172a', fontWeight: 700, fontSize: '13px', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>
              Never Mind — Keep Booking
            </button>
          </>
        )}

        {/* ── Cancellation done ── */}
        {confirmed && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 style={{ width: '40px', height: '40px', color: '#16a34a', marginBottom: '12px' }} />
            <p style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>Booking Cancelled</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Cancellation confirmed. {policy.refundType !== 'none' ? 'Refund initiated.' : ''}</p>
          </div>
        )}

        {/* ── OTP locked ── */}
        {step === "locked" && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <ShieldAlert style={{ width: '24px', height: '24px', color: '#dc2626' }} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>Verification Locked</p>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>Too many failed attempts. Contact TRANSHOLA support to proceed with cancellation.</p>
            <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}
