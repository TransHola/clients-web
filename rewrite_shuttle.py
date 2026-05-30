import re

with open('src/components/booking/booking-panel.tsx', 'r') as f:
    content = f.read()

# We need to extract the simulation loop from Card 2 and put it at the top of the block,
# and use `simulatedVehicleFinishMins` inside Card 1, and `totalCompletedLegs` in Card 2.

# First, let's find the start of the block:
# `{shuttleTotalSec && shuttleVehicles ? (`
# We change it to:
# `{shuttleTotalSec && shuttleVehicles ? (() => { ... })() : null}`
# No, we will change it to IIFE.

pattern_start = r"\{shuttleTotalSec && shuttleVehicles \? \("

replacement_start = """{shuttleTotalSec && shuttleVehicles ? (() => {
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
"""

content = re.sub(pattern_start, replacement_start, content, count=1)

# Now, replace the mapping in Card 1 to use `simulatedVehicleFinishMins[i]`
pattern_card1_map = r"\{Array\.from\(\{ length: shuttleVehicles \}\)\.map\(\(_, i\) => \{(.*?)\s*return \(\s*<div key=\{i\} style=\{\{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'"

replacement_card1_map = """{Array.from({ length: shuttleVehicles }).map((_, i) => {
                                    const currentEndingId = shuttleVehicleEndings[i] || 'origin';
                                    const vFinishTime = addSecondsToDatetime(startDate || today, startTime, simulatedVehicleFinishMins[i] * 60).time;
                                    return (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'"""

content = re.sub(pattern_card1_map, replacement_card1_map, content, count=1, flags=re.DOTALL)

# And in Card 1, replace the Late Return Tooltip display value:
# `<span style={{ fontWeight: 600, color: '#ea580c' }}>{vTime}</span>`
# to use `{vFinishTime}` instead.
# Note: we need to find the late return block inside Card 1.
pattern_late_return = r"Late Return:\s*<span style=\{\{ fontWeight: 600, color: '#ea580c' \}\}>[^<]+<\/span>"
replacement_late_return = r"Late Return: <span style={{ fontWeight: 600, color: '#ea580c' }}>{vFinishTime}</span>"

content = re.sub(pattern_late_return, replacement_late_return, content)

# Now remove the old inner simulation loop inside Card 2.
# It starts at `{/* Calculated Total Trips */}` and goes down to the end of the trips block.
pattern_card2_calc = r"\{/\* Calculated Total Trips \*/\}.*?let tripsPerBus = Math\.floor\(totalCompletedLegs / shuttleVehicles\);\s*if \(tripsPerBus === 0 && simDurMins > 0\) tripsPerBus = 1;\s*return \(\s*<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' \}\}>\s*(.*?)<div style=\{\{ display: 'inline-flex'"

replacement_card2_calc = """{/* Calculated Total Trips */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                    <div style={{ display: 'inline-flex'"""

content = re.sub(pattern_card2_calc, replacement_card2_calc, content, flags=re.DOTALL)

# And remove the trailing return inside Card 2:
pattern_card2_tail = r"<span style=\{\{ fontSize: '11px', fontWeight: 900, color: '#7c3aed' \}\}>\{tripsPerBus\} one-way trips per bus<\/span>\s*<\/div>\s*<\/div>\s*\);\s*\}\s*return null;\s*\)\(\)\}"

replacement_card2_tail = """<span style={{ fontSize: '11px', fontWeight: 900, color: '#7c3aed' }}>{tripsPerBus} one-way trips per bus</span>
                                          </div>
                                        </div>"""

content = re.sub(pattern_card2_tail, replacement_card2_tail, content, flags=re.DOTALL)

# Finally, append `); })()` to the end of the ternary logic.
# Wait, the end of the ternary logic is currently:
# `) : shuttleLoading ? (`
# It should become:
# `); })() : shuttleLoading ? (`

pattern_end_ternary = r"\)\s*:\s*shuttleLoading \? \("
replacement_end_ternary = ");\n                          })() : shuttleLoading ? ("

content = re.sub(pattern_end_ternary, replacement_end_ternary, content, count=1)

with open('src/components/booking/booking-panel.tsx', 'w') as f:
    f.write(content)

print("Done rewrite")
