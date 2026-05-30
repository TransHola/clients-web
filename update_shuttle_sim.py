import re

file_path = "/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/booking-panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

# I will find the `{shuttleTotalSec && shuttleVehicles ? (` block and inject the simulation logic right after it.
insertion_point = "{shuttleTotalSec && shuttleVehicles ? ("

simulation_logic = """{shuttleTotalSec && shuttleVehicles ? (
                            (() => {
                              const actDate = multiDayStore[activeDayIdx]?.dateStr || startDate;
                              let simDurMins = 0;
                              let simulatedVehicleFinishMins: Record<number, number> = {};
                              let tripsPerBus = 0;

                              if (actDate && startTime && endDate && endTime && shuttleTotalSec && shuttleReturnSec) {
                                const sDt = new Date(`${actDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`);
                                const eDt = new Date(`${endDate}T${endTime.length === 5 ? endTime + ':00' : endTime}`);
                                const durSec = Math.max(0, (eDt.getTime() - sDt.getTime()) / 1000);
                                simDurMins = Math.floor(durSec / 60);

                                const oneWayMins = Math.ceil(shuttleTotalSec / 60);
                                const returnMins = Math.ceil(shuttleReturnSec / 60);
                                const roundTripMins = oneWayMins + returnMins;
                                const staggerMins = manualShuttleInterval || (shuttleStaggered && shuttleVehicles > 1 ? Math.ceil(roundTripMins / shuttleVehicles) : 0);

                                let totalCompletedLegs = 0;

                                for (let v = 0; v < shuttleVehicles; v++) {
                                  let vTime = v * staggerMins;
                                  let vLegs = 0;
                                  const endingId = shuttleVehicleEndings[v] || 'origin';
                                  const isOvertimeAllowed = shuttleVehicleOvertimes[v] !== false; // Checked by default
                                  
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
                                        } else if (isOvertimeAllowed) {
                                          vTime += legDuration + returnMins;
                                          vLegs += 2;
                                        }
                                      } else if (endingId === 'destination') {
                                        if (!isReturnLeg) {
                                          vTime += legDuration;
                                          vLegs++;
                                        } else if (isOvertimeAllowed) {
                                          vTime += legDuration + oneWayMins;
                                          vLegs += 2;
                                        }
                                      } else {
                                        if (!isReturnLeg) {
                                        } else {
                                          if (isOvertimeAllowed) {
                                            vTime += legDuration + stopCumulativeMins;
                                            vLegs += 1; 
                                          }
                                        }
                                      }
                                      break;
                                    }
                                  }
                                  totalCompletedLegs += vLegs;
                                  simulatedVehicleFinishMins[v] = vTime;
                                }
                                tripsPerBus = Math.floor(totalCompletedLegs / shuttleVehicles);
                                if (tripsPerBus === 0 && simDurMins > 0) tripsPerBus = 1;
                              }

                              return (
"""
content = content.replace(insertion_point, simulation_logic)

# Replace the mapping in CARD 1 to use calculated time and `!== false`
map_old = """                                    const vTime = addSecondsToDatetime(startDate || today, startTime, staggerWait).time;"""
map_new = """                                    const isOvertimeAllowed = shuttleVehicleOvertimes[i] !== false;
                                    const finishMins = simulatedVehicleFinishMins[i] !== undefined ? simulatedVehicleFinishMins[i] : (staggerWait / 60);
                                    const finishTime = addSecondsToDatetime(startDate || today, startTime, finishMins * 60).time;"""
content = content.replace(map_old, map_new)

# Replace `checked={!!shuttleVehicleOvertimes[i]}` with `checked={isOvertimeAllowed}`
content = content.replace("checked={!!shuttleVehicleOvertimes[i]}", "checked={isOvertimeAllowed}")

# Replace `{formatTimeStr(vTime)}` with `{formatTimeStr(finishTime)}`
content = content.replace("{formatTimeStr(vTime)}", "{formatTimeStr(finishTime)}")


# Now replace the inner Calculated Total Trips block inside CARD 2
inner_block_old = """                                  {/* Calculated Total Trips */}
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
                                                // Actually, if it finishes the leg, but the target was a stop, it should keep going until the end of the shift.
                                                // Yes, it keeps going until the final leg where vTime + legDuration > simDurMins!
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                          

                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f3e8ff', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#5b21b6' }}>Total Estimated Trips:</span>
                                            <span style={{ fontSize: '11px', fontWeight: 900, color: '#7c3aed' }}>{tripsPerBus} one-way trips per bus</span>
                                          </div>

                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}"""

inner_block_new = """                                  {/* Calculated Total Trips */}
                                  {tripsPerBus > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f3e8ff', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#5b21b6' }}>Total Estimated Trips:</span>
                                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#7c3aed' }}>{tripsPerBus} one-way trips per bus</span>
                                      </div>
                                    </div>
                                  )}"""

content = content.replace(inner_block_old, inner_block_new)

# Add closing `})() : null}` to the end of `{shuttleTotalSec && shuttleVehicles ? (` block
# Let's find where to put it. 
# It's at the very end of the `shuttleTotalSec && shuttleVehicles` block, which is right before `{/* ── Additional Dropoff Inputs ── */}`
# Oh wait, the block ends with `) : null}`.
end_insertion = """                            </div>
                          ) : null}"""
end_new = """                            </div>
                            );
                          })()
                          ) : null}"""
content = content.replace(end_insertion, end_new)

with open(file_path, "w") as f:
    f.write(content)

print("Updated script.")
