import re

file_path = "/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/booking-panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update State
content = content.replace("const [shuttleOvertime, setShuttleOvertime] = React.useState(false)", "const [shuttleVehicleOvertimes, setShuttleVehicleOvertimes] = React.useState<Record<number, boolean>>({})")

# 2. Update state saving logic (line 498)
content = content.replace("shuttleOvertime,", "shuttleVehicleOvertimes,")
content = content.replace("shuttleOvertime,\n              shuttleEndAtOrigin", "shuttleVehicleOvertimes,\n              shuttleEndAtOrigin")

# 3. Update the Overtime loop logic
# I need to find `if (shuttleOvertime) {` and replace with `if (shuttleVehicleOvertimes[v]) {`
# Also find `} else if (shuttleOvertime) {` and replace with `} else if (shuttleVehicleOvertimes[v]) {`
content = content.replace("if (shuttleOvertime)", "if (shuttleVehicleOvertimes[v])")

# 4. Remove the old "Allow Late Return" section from the bottom
# Wait, I should do this precisely
old_overtime_section = '''                                          {maxLateReturnMins > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '14px' }}>⚠️</span>
                                                <div>
                                                  <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#b45309' }}>Strict finish time reduces trips</p>
                                                  <p style={{ margin: 0, fontSize: '9px', color: '#d97706' }}>Bus will return {maxLateReturnMins} mins late if you force this last dispatch.</p>
                                                </div>
                                              </div>
                                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                <input 
                                                  type="checkbox" 
                                                  checked={shuttleVehicleOvertimes[v]} 
                                                  onChange={(e) => setShuttleOvertime(e.target.checked)}
                                                  style={{ cursor: 'pointer', margin: 0 }}
                                                />
                                                <Tooltip>
                                                  <TooltipTrigger>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                      Allow Late Return
                                                      <Info className="w-3 h-3 text-amber-600" />
                                                    </span>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Permit the bus to finish its last trip even if it goes past the scheduled finish time</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </label>
                                            </div>
                                          ) : (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '0 4px' }}>
                                              <input 
                                                type="checkbox" 
                                                checked={shuttleVehicleOvertimes[v]} 
                                                onChange={(e) => setShuttleOvertime(e.target.checked)}
                                                style={{ cursor: 'pointer', margin: 0 }}
                                              />
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                    Allow Late Return
                                                    <Info className="w-3 h-3 text-slate-400" />
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Permit the bus to finish its last trip even if it goes past the scheduled finish time</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </label>
                                          )}'''
# Since I already changed `shuttleOvertime` to `shuttleVehicleOvertimes[v]` in point 3, the old section string matching might fail.
# Let me use regex or string indexing to remove it.
with open(file_path, "w") as f:
    f.write(content)

print("Partially updated.")
