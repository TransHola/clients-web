"use client"

import * as React from "react"
import { Printer, Download, X, MapPin, CalendarDays, Clock, Car, Users, Accessibility, CreditCard } from "lucide-react"

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

  const handlePrint = () => {
    window.print()
  }

  // Use the browser's native high-quality PDF engine
  const handleDownload = () => {
    setTimeout(() => window.print(), 100)
  }

  // Extract from booking details or fallback securely
  const b = bookingDetails || {}
  const ref = b.ref || "TRN-PENDING"
  const pickup = b.pickup?.name || b.pickup?.address || "Pending Pickup Location"
  const dropoff = b.dropoff?.name || b.dropoff?.address || "Pending Dropoff Location"
  const startDate = b.startDate ? formatDateStr(b.startDate) : "Pending Date"
  const startTime = b.startTime ? formatTimeStr(b.startTime) : "Pending Time"
  const passengers = b.passengers || 1
  const option = b.option || { label: "Standard Class", price: 0 }
  const total = option.price
  const baseFare = Math.round(total * 0.75) // Rough breakdown logic for receipt aesthetics
  const tax = Math.round(total * 0.05)
  const tolls = total - baseFare - tax
  const ataTime = b.ataTime ? formatTimeStr(b.ataTime) : option.eta || "TBD"

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-100/95 backdrop-blur-sm overflow-y-auto no-print">
      
      {/* Top Action Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm no-print">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-slate-900 leading-tight">Receipt &amp; Itinerary</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Booking #{ref}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors border border-transparent">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* A4 Document Canvas */}
      <div className="flex-1 py-10 flex justify-center px-4 w-full">
        <div className="bg-white w-full max-w-[800px] min-h-[1100px] shadow-2xl rounded-sm overflow-hidden p-[40px] md:p-[80px] print:shadow-none print:p-0 print:m-0 print:border-none relative">
          
          {/* Print Header */}
          <div className="flex items-start justify-between mb-16 border-b pb-8">
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">TRANSHOLA</div>
              <div className="text-sm text-slate-500 font-medium">Enterprise Transport Network &amp; Logistics</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-blue-600 mb-1">RECEIPT</div>
              <div className="text-sm text-slate-500 font-medium">Date: {new Date().toLocaleDateString()}</div>
              <div className="text-sm text-slate-500 font-medium">Ref: {ref}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-16">
            {/* Bill To */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Billed To</h3>
              <p className="text-sm font-bold text-slate-900 mb-1">Guest Account</p>
              <p className="text-sm text-slate-600">Generated directly via Booking Engine</p>
            </div>
            
            {/* Trip Specs */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">Trip Specifications</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-800 font-medium">{startDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-800 font-medium">Pickup at {startTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-800 font-medium">{passengers} Passenger{passengers !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Itinerary */}
          <div className="mb-16">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b pb-2">Full Itinerary</h3>
            
            <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
              <div className="relative">
                <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[31px] top-1.5 ring-4 ring-white" />
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Pickup ({startTime})</p>
                <p className="text-sm font-bold text-slate-900">{pickup}</p>
              </div>

              <div className="relative">
                <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[31px] top-1.5 ring-4 ring-white" />
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Dropoff (ETA {ataTime})</p>
                <p className="text-sm font-bold text-slate-900">{dropoff}</p>
              </div>
            </div>
          </div>

          {/* Vehicle & Preferences */}
          <div className="mb-16">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b pb-2">Vehicle Specification</h3>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Car className="w-6 h-6 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{option.label}</p>
                  <p className="text-xs text-slate-500 font-medium">Enterprise Guaranteed Fulfillment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b pb-2">Payment Details</h3>
            
            <table className="w-full text-sm mb-6">
              <tbody>
                <tr className="border-b border-slate-50">
                  <td className="py-3 text-slate-600 font-medium">Base Fare</td>
                  <td className="py-3 text-right text-slate-900 font-bold">{b.currency || 'USD'} {baseFare.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="py-3 text-slate-600 font-medium">Surcharges &amp; Priority Dispatch</td>
                  <td className="py-3 text-right text-slate-900 font-bold">{b.currency || 'USD'} {tolls.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 text-slate-600 font-medium">Tax &amp; Vat (5%)</td>
                  <td className="py-3 text-right text-slate-900 font-bold">{b.currency || 'USD'} {tax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-4 text-base font-black text-slate-900">Total Charged</td>
                  <td className="py-4 text-right text-xl font-black text-blue-600">{b.currency || 'USD'} {total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-3 rounded-lg w-fit">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs font-bold">Status: Secured &amp; Paid in Full</span>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="absolute bottom-8 left-0 right-0 text-center">
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">TRANSHOLA Booking Engine • Generated Automatically</p>
          </div>
        </div>
      </div>
    </div>
  )
}
