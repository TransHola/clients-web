import re

file_path = "/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/booking-panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update the Vehicle List condition and add dropdown
vehicle_list_target = '''                                {shuttleStaggered && shuttleVehicles > 1 && (
                                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {Array.from({ length: shuttleVehicles }).map((_, i) => {
                                      const waitTimeSec = manualShuttleInterval ? (manualShuttleInterval * 60 * i) : ((shuttleTotalSec / shuttleVehicles) * i);
                                      const vTime = addSecondsToDatetime(startDate || today, startTime, waitTimeSec).time;
                                      return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'white', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ede9fe' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>{i + 1}</span>
                                            <span style={{ fontWeight: 600, color: '#4c1d95' }}>Vehicle</span>
                                          </div>
                                          <span style={{ fontWeight: 800, color: '#7c3aed' }}>{formatTimeStr(vTime)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}'''

vehicle_list_replacement = '''                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {Array.from({ length: shuttleVehicles }).map((_, i) => {
                                    const staggerWait = (!shuttleStaggered) ? 0 : (manualShuttleInterval ? (manualShuttleInterval * 60 * i) : ((shuttleTotalSec / shuttleVehicles) * i));
                                    const vTime = addSecondsToDatetime(startDate || today, startTime, staggerWait).time;
                                    const currentEndingId = shuttleVehicleEndings[i] || 'origin';
                                    return (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'white', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ede9fe', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                          <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>{i + 1}</span>
                                          <span style={{ fontWeight: 600, color: '#4c1d95' }}>Vehicle</span>
                                        </div>
                                        
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                          <select 
                                            value={currentEndingId}
                                            onChange={(e) => setShuttleVehicleEndings(prev => ({ ...prev, [i]: e.target.value }))}
                                            style={{ fontSize: '10px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', outline: 'none', cursor: 'pointer', maxWidth: '140px' }}
                                          >
                                            <option value="origin">End at Origin</option>
                                            {shuttleWaypoints.filter(wp => wp.id !== 'origin' && wp.id !== 'destination').map(wp => (
                                              <option key={wp.id} value={wp.id}>End at {wp.name}</option>
                                            ))}
                                            <option value="destination">End at Destination</option>
                                          </select>
                                        </div>

                                        <span style={{ fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>{formatTimeStr(vTime)}</span>
                                      </div>
                                    );
                                  })}
                                </div>'''

content = content.replace(vehicle_list_target, vehicle_list_replacement)

# 2. Remove the old "Shift Ending Location" section
old_ending_target = '''                                          {/* Finishing Location Override */}
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                  Shift Ending Location
                                                  <Info className="w-3 h-3 text-slate-400" />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Where the bus should be when its shift time is over</p>
                                              </TooltipContent>
                                            </Tooltip>
                                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <button
                                                    onClick={() => setShuttleEndAtOrigin(true)}
                                                style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: 'none', background: shuttleEndAtOrigin ? 'white' : 'transparent', color: shuttleEndAtOrigin ? '#7c3aed' : '#64748b', cursor: 'pointer', boxShadow: shuttleEndAtOrigin ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Origin (Round-Trip)
                                                    {shuttleEndAtOrigin && <Info className="w-3 h-3" />}
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Vehicle must return to the pickup point</p>
                                                </TooltipContent>
                                              </Tooltip>
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <button
                                                    onClick={() => setShuttleEndAtOrigin(false)}
                                                style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: 'none', background: !shuttleEndAtOrigin ? 'white' : 'transparent', color: !shuttleEndAtOrigin ? '#7c3aed' : '#64748b', cursor: 'pointer', boxShadow: !shuttleEndAtOrigin ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Destination (One-Way)
                                                    {!shuttleEndAtOrigin && <Info className="w-3 h-3" />}
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Vehicle can end at the dropoff point</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </div>
                                          </div>'''

content = content.replace(old_ending_target, "")

with open(file_path, "w") as f:
    f.write(content)

print("Updated UI.")
