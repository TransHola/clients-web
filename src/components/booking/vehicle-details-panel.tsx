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
        <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 4px', color: '#0f172a' }}>Vehicle Details</h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px' }}>Review vehicle specs and request optional amenities</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {option.vehicles.map((v: any, idx: number) => {
          return (
            <div key={idx} style={{ padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Placeholder for vehicle icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0', color: '#0f172a', textTransform: 'capitalize' }}>
                      {v.type} Class
                    </h4>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', fontWeight: 600 }}>
                      Quantity: {v.count}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>Capacity</p>
                    <p style={{ fontSize: '13px', color: '#0f172a', margin: 0, fontWeight: 800 }}>{v.seats} Seats <span style={{fontSize: '10px', color: '#94a3b8'}}>/ ea</span></p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase style={{ width: '14px', height: '14px', color: '#d97706' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>Luggage</p>
                    <p style={{ fontSize: '13px', color: '#0f172a', margin: 0, fontWeight: 800 }}>{Math.floor(v.seats * 0.8)} Bags <span style={{fontSize: '10px', color: '#94a3b8'}}>/ ea</span></p>
                  </div>
                </div>
              </div>

              {/* Standard Features */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <h5 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', margin: '0 0 10px' }}>Standard Features</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!amenities.includes('Professional VIP Driver') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px 12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ShieldCheck style={{ width: '15px', height: '15px', color: '#64748b' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Professional Driver</p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>Vetted, safe driver</p>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                      </div>
                    </div>
                  )}
                  {['executive', 'coach'].includes(v.type.toLowerCase()) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px 12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Wifi style={{ width: '15px', height: '15px', color: '#64748b' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>High-Speed Wi-Fi</p>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                      </div>
                    </div>
                  )}
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
          )
        })}
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

      </div>

      {/* Trust Elements - Pinned Static Footer */}
      <div style={{ flexShrink: 0, padding: '16px 24px 24px 24px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ padding: '14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16a34a' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>Price Guarantee</span>
          </div>
          <p style={{ fontSize: '11px', color: '#166534', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
            Your quoted price of <strong>{option.currency || 'USD'} {option.price}</strong> is locked in. Inclusive of all taxes, tolls, and standard fees.
          </p>
        </div>
      </div>
    </div>
  )
}
