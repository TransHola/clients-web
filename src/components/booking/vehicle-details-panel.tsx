"use client"

import * as React from "react"
import { Users, Briefcase, Zap, ShieldCheck, CheckCircle2, ChevronRight, Droplets, Wifi, Coffee, Baby, MapPin } from "lucide-react"

export function VehicleDetailsPanel({ option, amenities = [], adaRequired = false, adaVehicleCount = 1 }: { option: any; amenities?: string[]; adaRequired?: boolean; adaVehicleCount?: number }) {
  // Pre-compiled read-only presentation UI

  if (!option) return null

  return (
    <div style={{
      background: 'white',
      borderRadius: '18px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      {/* Scrollable Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 4px', color: '#0f172a' }}>Pricing Breakdown</h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px' }}>Review invoice details and requested amenities</p>

        <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Rate</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(option.vehicles || [{ type: option.label || option.title || 'Standard', count: 1, seats: option.totalSeats || option.seats || 4 }]).map((v: any, idx: number) => {
                const days = Math.max(1, option.daysCount || 1);
                const dailyRate = v.price !== undefined ? v.price / days : 0;
                
                return Array.from({ length: days }).map((_, dayIdx) => (
                  <tr key={`${idx}-${dayIdx}`} style={{ borderBottom: dayIdx === days - 1 && idx === (option.vehicles?.length || 1) - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>{v.type} Class</p>
                          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{days > 1 ? `Day ${dayIdx + 1}` : 'Full Trip'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>{v.count}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                      {v.price !== undefined ? `${option.currencySymbol || option.currency || '$'}${dailyRate.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      {v.price !== undefined ? `${option.currencySymbol || option.currency || '$'}${(dailyRate * v.count).toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
          
          <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
              <span>Subtotal (Vehicles)</span>
              <span style={{ fontWeight: 600 }}>{option.currencySymbol || option.currency || '$'} {option.vehicles ? option.vehicles.reduce((sum: number, v: any) => sum + ((v.price || 0) * v.count), 0).toFixed(2) : parseFloat(option.price).toFixed(2)}</span>
            </div>
            {option.price > (option.vehicles ? option.vehicles.reduce((sum: number, v: any) => sum + ((v.price || 0) * v.count), 0) : option.price) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                <span>Taxes & Fees</span>
                <span style={{ fontWeight: 600 }}>{option.currencySymbol || option.currency || '$'} {(option.price - option.vehicles.reduce((sum: number, v: any) => sum + ((v.price || 0) * v.count), 0)).toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>
              <span>Total</span>
              <span>{option.currencySymbol || option.currency || '$'} {parseFloat(option.price).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0' }}>Included Services</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
              <Coffee style={{ width: '14px', height: '14px', color: '#64748b' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Meet & Greet</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
              <CheckCircle2 style={{ width: '14px', height: '14px', color: '#16a34a' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Free Waiting Time</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
              <ShieldCheck style={{ width: '14px', height: '14px', color: '#64748b' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Professional Driver</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
              <Wifi style={{ width: '14px', height: '14px', color: '#64748b' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Onboard Wi-Fi (Select classes)</span>
            </div>
          </div>
        </div>

        {/* Requested Amenities */}
        {amenities.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
               <h5 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0ea5e9', margin: 0 }}>Requested Amenities</h5>
            </div>
            <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 12px', padding: '8px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #cbd5e1' }}>
               <strong>Note:</strong> The amenities requested below will be based on fleet availability on the day of service.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {amenities.map((am) => {
                 const isWater = am.includes('Water');
                 const isBaby = am.includes('Seat');
                 const isVIP = am.includes('VIP');
                 const Icon = isWater ? Droplets : isBaby ? Baby : isVIP ? ShieldCheck : Zap;
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

      </div>

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

      {/* Trust Elements - Pinned Static Footer */}
      <div style={{ flexShrink: 0, padding: '16px 24px 24px 24px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ padding: '14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16a34a' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>Price Guarantee</span>
          </div>
          <p style={{ fontSize: '11px', color: '#166534', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
            Your quoted price of <strong>{option.currencySymbol || option.currency || '$'} {option.price}</strong> is locked in. Inclusive of all taxes, tolls, and standard fees.
          </p>
        </div>

        {/* Portal Target for Booking Buttons */}
        <div id="vehicle-details-footer-target"></div>
      </div>
    </div>
  )
}
