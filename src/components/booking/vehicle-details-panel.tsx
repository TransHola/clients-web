"use client"

import * as React from "react"
import { useState } from "react"
import { Users, Briefcase, Zap, ShieldCheck, CheckCircle2, ChevronRight, ChevronDown, Droplets, Wifi, Coffee, Baby, MapPin } from "lucide-react"

export function VehicleDetailsPanel({ option, amenities = [], adaRequired = false, adaVehicleCount = 1 }: { option: any; amenities?: string[]; adaRequired?: boolean; adaVehicleCount?: number }) {
  const [engineModalOpen, setEngineModalOpen] = useState(false);

  // Pre-compiled read-only presentation UI

  if (!option) return null

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      {/* Scrollable Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>Pricing Breakdown</h3>
          <button onClick={() => setEngineModalOpen(true)} style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Verify Engine Math (Dev)</button>
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px' }}>Review invoice details and requested amenities</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {(option.vehicles || [{ type: option.label || option.title || 'Standard', count: 1, seats: option.totalSeats || option.seats || 4 }]).map((v: any, idx: number) => {
            const days = Math.max(1, option.daysCount || 1);
            const avgDailyRate = v.price !== undefined ? v.price / days : 0;
            const totalVehicleCost = v.price !== undefined ? v.price * (v.count || 1) : 0;
            const curr = option.currencySymbol || option.currency || '$';

            return (
              <div key={idx} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>{v.count}x</span>
                        <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>{v.type}</p>
                      </div>
                      {v.seats && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0 0' }}>
                          <Users size={12} color="#64748b" />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{v.seats} Pax</span>
                        </div>
                      )}
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', margin: '4px 0 0' }}>{days} Day{days > 1 ? 's' : ''} Itinerary</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Total</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: 0 }}>{curr}{totalVehicleCost.toFixed(2)}</p>
                  </div>
                </div>

                {days > 1 && (
                  <details style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <summary style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', listStyle: 'none' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>View Daily Breakdown</span>
                      <ChevronDown size={14} color="#94a3b8" />
                    </summary>
                    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Array.from({ length: days }).map((_, dayIdx) => {
                        const hasBreakdown = v.dailyBreakdown && v.dailyBreakdown.length > dayIdx;
                        const dayTotalCost = hasBreakdown ? v.dailyBreakdown[dayIdx] : avgDailyRate * (v.count || 1);
                        return (
                          <div key={dayIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Day {dayIdx + 1}</span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{curr}{dayTotalCost.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        {/* Requested Amenities */}
        {amenities.length > 0 && (
          <div style={{ marginBottom: '24px', paddingTop: '0' }}>
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

      {/* Pinned Static Footer containing Totals and Buttons */}
      <div style={{ flexShrink: 0, background: '#f8fafc', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 24px 24px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
            <span>Subtotal (Vehicles)</span>
            <span style={{ fontWeight: 600 }}>{option.currencySymbol || option.currency || '$'} {(option.price - (option.taxAmount || 0)).toFixed(2)}</span>
          </div>
          {(option.taxAmount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
              <span>Taxes & Fees</span>
              <span style={{ fontWeight: 600 }}>{option.currencySymbol || option.currency || '$'} {(option.taxAmount || 0).toFixed(2)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#0f172a', fontWeight: 900, marginBottom: '20px' }}>
            <span>Total</span>
            <span>{option.currencySymbol || option.currency || '$'} {parseFloat(option.price).toFixed(2)}</span>
          </div>

          {/* Portal Target for Booking Buttons */}
          <div id="vehicle-details-footer-portal"></div>

        </div>
      </div>
      
      {engineModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Rate Engine Calculation Log</h3>
              <button onClick={() => setEngineModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>&times;</button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {(option.vehicles || [{ type: option.label || option.title || 'Standard', debugLog: option.debugLog }]).map((v: any, idx: number) => {
                const logs = v.debugLog || [];
                return (
                  <div key={idx} style={{ marginBottom: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ padding: '12px 16px', background: '#0f172a', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={16} color="#38bdf8" />
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'white' }}>{v.type || option.title}</h4>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: '#94a3b8', background: '#1e293b', padding: '2px 8px', borderRadius: '12px' }}>CALCULATION ENGINE</span>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {logs.length > 0 ? logs.map((log: string, lIdx: number) => {
                        const isInit = log.includes('initialized for');
                        const isDayHeader = log.includes('Engine:');
                        const isCharge = log.includes('-> Charged');
                        
                        if (isInit) return null; // Skip init log
                        
                        if (isDayHeader) {
                          const dayMatch = log.match(/\[(Day \d+)\]/);
                          const dayStr = dayMatch ? dayMatch[1] : '';
                          const details = log.replace(/\[Day \d+\] Engine:/, '').trim();
                          return (
                            <div key={lIdx} style={{ marginTop: lIdx > 1 ? '8px' : 0, paddingBottom: '4px', borderBottom: '2px solid #f1f5f9' }}>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>{dayStr}</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{details}</span>
                            </div>
                          );
                        }
                        
                        if (isCharge) {
                          const parts = log.split('-> Charged');
                          const title = parts[0].replace(/\[Day \d+\]/, '').trim();
                          const mathParts = parts[1].split('=');
                          const curr = option.currencySymbol || option.currency || '$';
                          let math = mathParts[0].trim().replace('@', '×');
                          if (math.includes('× ') && !math.includes('× $') && !math.includes('× ' + curr)) {
                              math = math.replace('× ', '× ' + curr);
                          }
                          let total = mathParts[1]?.trim() || '';
                          if (total && !total.startsWith('$') && !total.startsWith(curr)) {
                              total = curr + total;
                          }
                          
                          return (
                            <div key={lIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', marginLeft: '12px', borderLeft: '2px solid #cbd5e1' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{title}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>{math}</div>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{total}</div>
                            </div>
                          );
                        }
                        
                        // Fallback generic log
                        return <div key={lIdx} style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{log}</div>;
                      }) : (
                        <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px' }}>No engine log data available. Check backend server.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}
