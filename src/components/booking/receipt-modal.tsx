"use client"

import * as React from "react"
import { Printer, Download, X, CalendarDays, Clock, Car, Users, QrCode, CreditCard, ShieldCheck } from "lucide-react"

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  bookingDetails?: any
}

function formatDateStr(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-')
    const date = new Date(parseInt(y), parseInt(m)-1, parseInt(d))
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date)
  } catch {
    return dateStr
  }
}

function formatTimeStr(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  if (!h || !m) return timeStr
  const hour = parseInt(h, 10)
  let displayH = hour % 12
  if (displayH === 0) displayH = 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${displayH}:${m} ${ampm}`
}

export function ReceiptModal({ isOpen, onClose, bookingDetails }: ReceiptModalProps) {
  if (!isOpen) return null

  const handlePrint = () => window.print()
  const handleDownload = () => setTimeout(() => window.print(), 100)

  const b = bookingDetails || {}
  const ref = b.ref || "TRN-PENDING"
  const pickup = b.pickup?.name || b.pickup?.address || "Pending Pickup Location"
  const dropoff = b.dropoff?.name || b.dropoff?.address || "Pending Dropoff Location"
  const startDate = b.startDate ? formatDateStr(b.startDate) : "Pending Date"
  const startTime = b.startTime ? formatTimeStr(b.startTime) : "Pending Time"
  const passengers = b.passengers || 1
  const option = b.option || { label: "Standard Class", price: b.price || 0 }
  
  const exactVehicles = option.vehicles && Array.isArray(option.vehicles)
    ? option.vehicles.map((v: any) => `${v.count}x ${v.type}`).join(' + ')
    : b.vehicle_type || option.label || 'Premium Fleet'

  const total = option.price || b.price || 0
  const baseFare = Math.round(total * 0.75)
  const tax = Math.round(total * 0.05)
  const fees = total - baseFare - tax
  const ataTime = b.ataTime ? formatTimeStr(b.ataTime) : option.eta || "TBD"

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/95 backdrop-blur-md overflow-y-auto no-print">
      
      {/* Top Action Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 no-print shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-white leading-tight">E-Ticket &amp; Receipt</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ref}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-sm transition-colors border border-slate-700">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Download className="w-4 h-4" /> Save PDF
          </button>
        </div>
      </div>

      {/* A4 Document Canvas */}
      <div className="flex-1 py-10 flex justify-center px-4 w-full">
        <div className="bg-white w-full max-w-[850px] min-h-[1100px] shadow-2xl overflow-hidden print:shadow-none print:m-0 print:border-none relative flex flex-col font-sans">
          
          <style>
            {`
              @media print {
                @page { margin: 0; size: A4 portrait; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .no-print { display: none !important; }
              }
            `}
          </style>

          {/* Premium Header (Dark) */}
          <div className="bg-[#0f172a] text-white p-12 flex justify-between items-start relative overflow-hidden print:bg-[#0f172a]">
            {/* Background Accent */}
            <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-blue-600/30 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-20%] left-0 w-[200px] h-[200px] bg-emerald-500/20 rounded-full blur-[60px]" />
            
            <div className="relative z-10">
              <div className="text-4xl font-black tracking-tighter mb-2 flex items-center gap-3">
                TRANSHOLA <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-sm text-slate-400 font-medium uppercase tracking-[0.2em]">Global Transport Network</div>
            </div>

            <div className="text-right relative z-10 flex flex-col items-end">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl mb-4">
                <QrCode className="w-16 h-16 text-white" strokeWidth={1} />
              </div>
              <div className="text-2xl font-black text-emerald-400 mb-1">E-TICKET</div>
              <div className="text-sm font-mono text-slate-300">{ref}</div>
            </div>
          </div>

          <div className="p-12 flex-1 flex flex-col">
            
            <div className="grid grid-cols-3 gap-8 mb-12 pb-12 border-b border-slate-200">
              <div className="col-span-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Passenger Details</h3>
                <p className="text-xl font-bold text-slate-900 mb-1">Guest Passenger</p>
                <div className="flex items-center gap-4 mt-3">
                  <Badge icon={Users} label={`${passengers} Passenger${passengers !== 1 ? 's' : ''}`} />
                  <Badge icon={Car} label={exactVehicles} />
                </div>
              </div>
              
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Trip Schedule</h3>
                <p className="text-base font-bold text-slate-900 mb-1">{startDate}</p>
                <p className="text-sm font-medium text-slate-500">Pickup at {startTime}</p>
              </div>
            </div>

            {/* Itinerary Timeline */}
            <div className="mb-12">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Confirmed Itinerary</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 relative">
                
                {/* Connecting Line */}
                <div className="absolute left-[39px] top-[48px] bottom-[48px] w-0.5 bg-slate-200" />

                <div className="flex gap-6 relative z-10 mb-12">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 ring-8 ring-emerald-50 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Departure ({startTime})</p>
                    <p className="text-lg font-bold text-slate-900 leading-snug">{pickup}</p>
                  </div>
                </div>

                {Array.isArray(b.stops) && b.stops.map((stop: any, idx: number) => (
                  <div key={idx} className="flex gap-6 relative z-10 mb-12">
                    <div className="w-4 h-4 rounded-full bg-slate-400 ring-8 ring-slate-50 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stop {idx + 1}</p>
                      <p className="text-lg font-bold text-slate-900 leading-snug">{stop.name || stop.address}</p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-6 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-blue-600 ring-8 ring-blue-50 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-1">Destination (ETA {ataTime})</p>
                    <p className="text-lg font-bold text-slate-900 leading-snug">{dropoff}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Invoice Breakdown */}
            <div className="mt-auto">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Summary</h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-4 px-6 text-sm font-medium text-slate-700">Base Fare ({option.label})</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-900 text-right">${baseFare.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm font-medium text-slate-700">Taxes &amp; Surcharges</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-900 text-right">${tax.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-sm font-medium text-slate-700">Service Fees</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-900 text-right">${fees.toFixed(2)}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-[#0f172a] text-white">
                    <tr>
                      <td className="py-5 px-6 font-bold text-sm">TOTAL AMOUNT PAID</td>
                      <td className="py-5 px-6 font-black text-xl text-emerald-400 text-right">${total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Securely processed online
              </div>
              <div>
                Transhola Inc. • contact@transhola.com
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function Badge({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
      <Icon className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-xs font-bold text-slate-700">{label}</span>
    </div>
  )
}
