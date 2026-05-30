import re

file_path = "/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/booking-panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Fleet Dispatch Mode
content = content.replace(
'''<span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }} title="Choose how vehicles should start their trips">
                                      Fleet Dispatch Mode
                                      <Info className="w-3 h-3 text-slate-400" />
                                    </span>''',
'''<Tooltip>
                                      <TooltipTrigger asChild>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                          Fleet Dispatch Mode
                                          <Info className="w-3 h-3 text-slate-400" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Choose how vehicles should start their trips</p>
                                      </TooltipContent>
                                    </Tooltip>'''
)

# 2. Interval Start (One by one)
content = content.replace(
'''<button
                                        onClick={() => setShuttleStaggered(true)}
                                        title="Vehicles will start one by one to reduce wait time for passengers"''',
'''<Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => setShuttleStaggered(true)}'''
)

content = content.replace(
'''Interval Start (One by one)
                                        {shuttleStaggered && <Info className="w-3 h-3" />}
                                      </button>''',
'''Interval Start (One by one)
                                            {shuttleStaggered && <Info className="w-3 h-3" />}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Vehicles will start one by one to reduce wait time for passengers</p>
                                        </TooltipContent>
                                      </Tooltip>'''
)

# 3. Start Together (All at once)
content = content.replace(
'''<button
                                        onClick={() => setShuttleStaggered(false)}
                                        title="All vehicles will start at the exact same time"''',
'''<Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => setShuttleStaggered(false)}'''
)

content = content.replace(
'''Start Together (All at once)
                                        {!shuttleStaggered && <Info className="w-3 h-3" />}
                                      </button>''',
'''Start Together (All at once)
                                            {!shuttleStaggered && <Info className="w-3 h-3" />}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>All vehicles will start at the exact same time</p>
                                        </TooltipContent>
                                      </Tooltip>'''
)

# 4. Pickup Interval Settings
content = content.replace(
'''<p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }} title="How many minutes between each vehicle arriving at the pickup location">
                                        Pickup Interval Settings
                                        <Info className="w-3 h-3 text-slate-400" />
                                      </p>''',
'''<Tooltip>
                                        <TooltipTrigger asChild>
                                          <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                            Pickup Interval Settings
                                            <Info className="w-3 h-3 text-slate-400" />
                                          </p>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>How many minutes between each vehicle arriving at the pickup location</p>
                                        </TooltipContent>
                                      </Tooltip>'''
)

# 5. Pickup Frequency
content = content.replace(
'''<p style={{ fontSize: '12px', margin: 0, fontWeight: 700, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '4px' }} title="Expected waiting time between buses arriving at the pickup location">
                                    Pickup Frequency: ~<span style={{ fontWeight: 900 }}>{manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(shuttleTotalSec / 60 / shuttleVehicles) : Math.ceil(shuttleTotalSec / 60))} min</span> between each bus
                                    <Info className="w-3 h-3 text-violet-400" />
                                  </p>''',
'''<Tooltip>
                                    <TooltipTrigger asChild>
                                      <p style={{ fontSize: '12px', margin: 0, fontWeight: 700, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                        Pickup Frequency: ~<span style={{ fontWeight: 900 }}>{manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(shuttleTotalSec / 60 / shuttleVehicles) : Math.ceil(shuttleTotalSec / 60))} min</span> between each bus
                                        <Info className="w-3 h-3 text-violet-400" />
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Expected waiting time between buses arriving at the pickup location</p>
                                    </TooltipContent>
                                  </Tooltip>'''
)

# 6. Shift Ending Location
content = content.replace(
'''<span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }} title="Where the bus should be when its shift time is over">
                                              Shift Ending Location
                                              <Info className="w-3 h-3 text-slate-400" />
                                            </span>''',
'''<Tooltip>
                                              <TooltipTrigger asChild>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                  Shift Ending Location
                                                  <Info className="w-3 h-3 text-slate-400" />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Where the bus should be when its shift time is over</p>
                                              </TooltipContent>
                                            </Tooltip>'''
)

# 7. Origin (Round-Trip)
content = content.replace(
'''<button
                                                onClick={() => setShuttleEndAtOrigin(true)}
                                                title="Bus will finish its shift at the starting location"''',
'''<Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button
                                                    onClick={() => setShuttleEndAtOrigin(true)}'''
)

content = content.replace(
'''Origin (Round-Trip)
                                                {shuttleEndAtOrigin && <Info className="w-3 h-3" />}
                                              </button>''',
'''Origin (Round-Trip)
                                                    {shuttleEndAtOrigin && <Info className="w-3 h-3" />}
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Bus will finish its shift at the starting location</p>
                                                </TooltipContent>
                                              </Tooltip>'''
)


# 8. Destination (One-Way)
content = content.replace(
'''<button
                                                onClick={() => setShuttleEndAtOrigin(false)}
                                                title="Bus will finish its shift at the destination"''',
'''<Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button
                                                    onClick={() => setShuttleEndAtOrigin(false)}'''
)

content = content.replace(
'''Destination (One-Way)
                                                {!shuttleEndAtOrigin && <Info className="w-3 h-3" />}
                                              </button>''',
'''Destination (One-Way)
                                                    {!shuttleEndAtOrigin && <Info className="w-3 h-3" />}
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Bus will finish its shift at the destination</p>
                                                </TooltipContent>
                                              </Tooltip>'''
)

# 9. Allow Late Return 1
content = content.replace(
'''<span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px' }} title="Permit the bus to finish its last trip even if it goes past the scheduled finish time">
                                                  Allow Late Return
                                                  <Info className="w-3 h-3 text-amber-600" />
                                                </span>''',
'''<Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                      Allow Late Return
                                                      <Info className="w-3 h-3 text-amber-600" />
                                                    </span>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Permit the bus to finish its last trip even if it goes past the scheduled finish time</p>
                                                  </TooltipContent>
                                                </Tooltip>'''
)

# 10. Allow Late Return 2
content = content.replace(
'''<span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }} title="Permit the bus to finish its last trip even if it goes past the scheduled finish time">
                                                Allow Late Return
                                                <Info className="w-3 h-3 text-slate-400" />
                                              </span>''',
'''<Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                                    Allow Late Return
                                                    <Info className="w-3 h-3 text-slate-400" />
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Permit the bus to finish its last trip even if it goes past the scheduled finish time</p>
                                                </TooltipContent>
                                              </Tooltip>'''
)

with open(file_path, "w") as f:
    f.write(content)

print("Done replacing tooltips.")

