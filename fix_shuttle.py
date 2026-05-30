import re

with open('src/components/booking/booking-panel.tsx', 'r') as f:
    content = f.read()

# We need to find the block:
# {shuttleTotalSec && shuttleVehicles ? (
#   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', animation: 'fadeIn 0.2s ease' }}>
#     {/* ── CARD 1: Vehicle Dispatch ── */}

target_start = """{shuttleTotalSec && shuttleVehicles ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', animation: 'fadeIn 0.2s ease' }}>
                              {/* ── CARD 1: Vehicle Dispatch ── */}"""

# And we replace it with:
new_start = """{shuttleTotalSec && shuttleVehicles ? (() => {
                            const actDate = multiDayStore[activeDayIdx]?.dateStr || startDate;
                            let simDurMins = 0;
                            let oneWayMins = Math.ceil(shuttleTotalSec / 60);
                            let returnMins = Math.ceil(shuttleReturnSec / 60);
                            let roundTripMins = oneWayMins + returnMins;
                            let staggerMins = manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(roundTripMins / shuttleVehicles) : 0);

                            if (actDate && startTime && endDate && endTime) {
                                const sDt = new Date(`${actDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`);
                                const eDt = new Date(`${endDate}T${endTime.length === 5 ? endTime + ':00' : endTime}`);
                                const durSec = Math.max(0, (eDt.getTime() - sDt.getTime()) / 1000);
                                simDurMins = Math.floor(durSec / 60);
                            }
                            
                            let totalCompletedLegs = 0;
                            let maxLateReturnMins = 0;
                            let simulatedVehicleFinishMins = [];

                            // Simulate trips for each vehicle
                            for (let v = 0; v < shuttleVehicles; v++) {
                                let vTime = v * staggerMins;
                                let vLegs = 0;
                                const endingId = shuttleVehicleEndings[v] || 'origin';
                                
                                let stopCumulativeMins = 0;
                                if (endingId !== 'origin' && endingId !== 'destination') {
                                    const wp = shuttleWaypoints.find(w => w.id === endingId);
                                    if (wp) stopCumulativeMins = Math.ceil(wp.cumulativeSec / 60);
                                }
                                
                                while (vTime < simDurMins) {
                                    const isReturnLeg = (vLegs % 2) === 1;
                                    const legDuration = isReturnLeg ? returnMins : oneWayMins;
                                    
                                    if (endingId !== 'origin' && endingId !== 'destination' && !isReturnLeg && vTime + stopCumulativeMins > simDurMins) {
                                        vTime += stopCumulativeMins;
                                        break;
                                    }

                                    if (vTime + legDuration <= simDurMins) {
                                        vTime += legDuration;
                                        vLegs++;
                                    } else {
                                        if (endingId === 'origin') {
                                            if (isReturnLeg) {
                                                vTime += legDuration;
                                                vLegs++;
                                            } else if (shuttleVehicleOvertimes[v]) {
                                                vTime += legDuration + returnMins;
                                                vLegs += 2;
                                            }
                                        } else if (endingId === 'destination') {
                                            if (!isReturnLeg) {
                                                vTime += legDuration;
                                                vLegs++;
                                            } else if (shuttleVehicleOvertimes[v]) {
                                                vTime += legDuration + oneWayMins;
                                                vLegs += 2;
                                            }
                                        } else {
                                            if (isReturnLeg && shuttleVehicleOvertimes[v]) {
                                                vTime += legDuration + stopCumulativeMins;
                                                vLegs += 1; 
                                            }
                                        }
                                        break;
                                    }
                                }
                                maxLateReturnMins = Math.max(maxLateReturnMins, Math.max(0, vTime - simDurMins));
                                simulatedVehicleFinishMins.push(vTime);
                                totalCompletedLegs += vLegs;
                            }

                            let tripsPerBus = Math.floor(totalCompletedLegs / shuttleVehicles);
                            if (tripsPerBus === 0 && simDurMins > 0) tripsPerBus = 1;

                            return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', animation: 'fadeIn 0.2s ease' }}>
                              {/* ── CARD 1: Vehicle Dispatch ── */}"""

content = content.replace(target_start, new_start)

# Now we need to modify the display in CARD 1 to show the finish time instead of start time.
target_card1_loop = """                                  {Array.from({ length: shuttleVehicles }).map((_, i) => {
                                    const staggerWait = (!shuttleStaggered) ? 0 : (manualShuttleInterval ? (manualShuttleInterval * 60 * i) : ((shuttleTotalSec / shuttleVehicles) * i));
                                    const vTime = addSecondsToDatetime(startDate || today, startTime, staggerWait).time;
                                    const currentEndingId = shuttleVehicleEndings[i] || 'origin';
                                    return (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'white', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ede9fe', gap: '8px' }}>"""

new_card1_loop = """                                  {Array.from({ length: shuttleVehicles }).map((_, i) => {
                                    const currentEndingId = shuttleVehicleEndings[i] || 'origin';
                                    // Use the exact calculated finish time from the simulation loop
                                    const vFinishTime = addSecondsToDatetime(startDate || today, startTime, simulatedVehicleFinishMins[i] * 60).time;
                                    return (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'white', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ede9fe', gap: '8px' }}>"""

content = content.replace(target_card1_loop, new_card1_loop)

# Update the display string in CARD 1 row
target_card1_vtime = """<span style={{ fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>{formatTimeStr(vTime)}</span>"""
new_card1_vtime = """<span style={{ fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>{formatTimeStr(vFinishTime)}</span>"""
content = content.replace(target_card1_vtime, new_card1_vtime)

# Finally, remove the duplicate calculation logic inside CARD 2.
# We look for {/* Calculated Total Trips */} and the IIFE.
# The IIFE goes all the way down to returning the div.

target_card2_calc = """                                  {/* Calculated Total Trips */}
                                  {(() => {
                                    const actDate = multiDayStore[activeDayIdx]?.dateStr || startDate;
                                    if (actDate && startTime && endDate && endTime && shuttleTotalSec && shuttleReturnSec) {
                                      const sDt = new Date(`${actDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`);
                                      const eDt = new Date(`${endDate}T${endTime.length === 5 ? endTime + ':00' : endTime}`);
                                      const durSec = Math.max(0, (eDt.getTime() - sDt.getTime()) / 1000);
                                      const simDurMins = Math.floor(durSec / 60);

                                      const oneWayMins = Math.ceil(shuttleTotalSec / 60);
                                      const returnMins = Math.ceil(shuttleReturnSec / 60);
                                      const roundTripMins = oneWayMins + returnMins;

                                      const staggerMins = manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(roundTripMins / shuttleVehicles) : 0);

                                      let totalCompletedLegs = 0;
                                      let maxLateReturnMins = 0;

                                      // Simulate trips for each vehicle
                                      for (let v = 0; v < shuttleVehicles; v++) {
                                        let vTime = v * staggerMins;
                                        let vLegs = 0;
                                        const endingId = shuttleVehicleEndings[v] || 'origin';
                                        
                                        let stopCumulativeMins = 0;
                                        if (endingId !== 'origin' && endingId !== 'destination') {
                                          const wp = shuttleWaypoints.find(w => w.id === endingId);
                                          if (wp) stopCumulativeMins = Math.ceil(wp.cumulativeSec / 60);
                                        }
                                        
                                        while (vTime < simDurMins) {
                                          const isReturnLeg = (vLegs % 2) === 1;
                                          const legDuration = isReturnLeg ? returnMins : oneWayMins;
                                          
                                          // Note: if ending at a stop, we check if we can reach it in the current outbound leg
                                          if (endingId !== 'origin' && endingId !== 'destination' && !isReturnLeg && vTime + stopCumulativeMins > simDurMins) {
                                              // Can't reach stop, force it
                                              vTime += stopCumulativeMins;
                                              maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              break;
                                          }

                                          if (vTime + legDuration <= simDurMins) {
                                            // Normal completion within shift
                                            vTime += legDuration;
                                            vLegs++;
                                            // Wait, if it exactly reaches the end of leg, but target is a stop, it means it overshot?
                                            // No, if it reaches the end of outbound leg (Destination), but target was a stop, it shouldn't have reached destination!
                                            if (!isReturnLeg && endingId !== 'origin' && endingId !== 'destination') {
                                                // Reached destination, but shift is not over?
                                                // Actually, if it finishes the leg, but the target was a stop, it should keep going until the final leg where vTime + legDuration > simDurMins!
                                            }
                                          } else {
                                            // Overtime scenario (Final leg of the shift)
                                            if (endingId === 'origin') {
                                              if (isReturnLeg) {
                                                // Force return trip to origin
                                                vTime += legDuration;
                                                vLegs++;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              } else if (shuttleVehicleOvertimes[v]) {
                                                vTime += legDuration + returnMins;
                                                vLegs += 2;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              }
                                            } else if (endingId === 'destination') {
                                              if (!isReturnLeg) {
                                                vTime += legDuration;
                                                vLegs++;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              } else if (shuttleVehicleOvertimes[v]) {
                                                vTime += legDuration + oneWayMins;
                                                vLegs += 2;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              }
                                            } else {
                                              if (!isReturnLeg) {
                                                // Already handled by the check at the top of the loop!
                                              } else {
                                                if (shuttleVehicleOvertimes[v]) {
                                                  vTime += legDuration + stopCumulativeMins;
                                                  vLegs += 1; 
                                                  maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                                }
                                              }
                                            }
                                            break;
                                          }
                                        }
                                        totalCompletedLegs += vLegs;
                                      }

                                      let tripsPerBus = Math.floor(totalCompletedLegs / shuttleVehicles);
                                      if (tripsPerBus === 0 && simDurMins > 0) tripsPerBus = 1;

                                      return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>"""

new_card2_calc = """                                  {/* Calculated Total Trips */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>"""

content = content.replace(target_card2_calc, new_card2_calc)

# Fix the end of CARD 2 where the IIFE was closed!
target_card2_end = """                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          ) : null}"""

new_card2_end = """                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                          })() : null}"""
content = content.replace(target_card2_end, new_card2_end)

with open('src/components/booking/booking-panel.tsx', 'w') as f:
    f.write(content)

print("Done replacing.")
