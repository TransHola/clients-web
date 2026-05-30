import re

file_path = "/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/booking-panel.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add state variables
content = content.replace(
'''  const [shuttleEndAtOrigin, setShuttleEndAtOrigin] = React.useState(true)''',
'''  const [shuttleVehicleEndings, setShuttleVehicleEndings] = React.useState<Record<number, string>>({})
  const [shuttleWaypoints, setShuttleWaypoints] = React.useState<{id: string, name: string, cumulativeSec: number}[]>([])
  const [shuttleEndAtOrigin, setShuttleEndAtOrigin] = React.useState(true)'''
)

# 2. Modify compute function to populate shuttleWaypoints
compute_target = '''        // Fetch each leg sequentially (Origin -> Stops -> Destination)
        let totalSec = pickupWaitMin * 60; // Initial wait at origin
        for (let i = 0; i < waypoints.length - 1; i++) {
          const result = await GisClient.getRoute([waypoints[i], waypoints[i + 1]], 'driving')
          const route = result?.routes?.[0] ?? result?.route ?? result
          const legSec: number = route?.duration ?? route?.legs?.[0]?.duration ?? 0
          totalSec += Math.ceil(legSec * 1.15) // 15% traffic buffer per leg
          // Add stop wait time (not for the final destination)
          if (i < stops.length) {
            totalSec += (stops[i]?.stopDurationMin ?? 0) * 60
          }
        }
        setShuttleTotalSec(totalSec)'''

compute_replacement = '''        let cumulativeWps = [];
        
        // Fetch each leg sequentially (Origin -> Stops -> Destination)
        let totalSec = pickupWaitMin * 60; // Initial wait at origin
        for (let i = 0; i < waypoints.length - 1; i++) {
          const result = await GisClient.getRoute([waypoints[i], waypoints[i + 1]], 'driving')
          const route = result?.routes?.[0] ?? result?.route ?? result
          const legSec: number = route?.duration ?? route?.legs?.[0]?.duration ?? 0
          totalSec += Math.ceil(legSec * 1.15) // 15% traffic buffer per leg
          
          if (i < stops.length) {
            totalSec += (stops[i]?.stopDurationMin ?? 0) * 60;
            const wpId = stops[i].id;
            const wpName = stops[i].loc?.address?.split(',')[0] || `Stop ${i+1}`;
            cumulativeWps.push({ id: wpId, name: wpName, cumulativeSec: totalSec });
          }
        }
        setShuttleWaypoints(cumulativeWps);
        setShuttleTotalSec(totalSec)'''

content = content.replace(compute_target, compute_replacement)

# 3. Modify Overtime logic
simulation_target = '''                                      // Simulate trips for each vehicle
                                      for (let v = 0; v < shuttleVehicles; v++) {
                                        let vTime = v * staggerMins;
                                        let vLegs = 0;
                                        
                                        while (vTime < simDurMins) {
                                          const isReturnLeg = (vLegs % 2) === 1;
                                          const legDuration = isReturnLeg ? returnMins : oneWayMins;
                                          
                                          if (vTime + legDuration <= simDurMins) {
                                            // Normal completion within shift
                                            vTime += legDuration;
                                            vLegs++;
                                          } else {
                                            // Overtime scenario
                                            if (shuttleEndAtOrigin) {
                                              // Requires ending at origin (even number of legs)
                                              if (isReturnLeg) {
                                                // Currently at dropoff (odd legs), force return trip to origin
                                                vTime += legDuration;
                                                vLegs++;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              } else if (shuttleOvertime) {
                                                // Currently at origin. Only start new round-trip if overtime allowed.
                                                vTime += legDuration + returnMins;
                                                vLegs += 2;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              }
                                            } else {
                                              // Allowed to end at destination (One-Way)
                                              if (shuttleOvertime) {
                                                // Start the leg even if it exceeds shift
                                                vTime += legDuration;
                                                vLegs++;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              }
                                            }
                                            break;
                                          }
                                        }
                                        totalCompletedLegs += vLegs;
                                      }'''

simulation_replacement = '''                                      // Simulate trips for each vehicle
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
                                              } else if (shuttleOvertime) {
                                                vTime += legDuration + returnMins;
                                                vLegs += 2;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              }
                                            } else if (endingId === 'destination') {
                                              if (!isReturnLeg) {
                                                vTime += legDuration;
                                                vLegs++;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              } else if (shuttleOvertime) {
                                                vTime += legDuration + oneWayMins;
                                                vLegs += 2;
                                                maxLateReturnMins = Math.max(maxLateReturnMins, vTime - simDurMins);
                                              }
                                            } else {
                                              if (!isReturnLeg) {
                                                // Already handled by the check at the top of the loop!
                                              } else {
                                                if (shuttleOvertime) {
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
                                      }'''

content = content.replace(simulation_target, simulation_replacement)

with open(file_path, "w") as f:
    f.write(content)

print("Updated logic.")
