/**
 * optimization-solver.ts
 * Core Mathematical Engine for "Zero-Touch" intent-based charter quoting.
 * Solves the Unbounded Knapsack problem to map raw passenger intent to an optimized Fleet Array.
 */

export interface VehicleSpec {
    id: string;
    name: string;
    capacity: number;
    // An abstraction of operating cost per mile/hour to allow the solver to optimize for price
    baseCostIndex: number; 
}

export interface FleetUnit {
    vehicle: VehicleSpec;
    quantity: number;
}

export interface OptimizationResult {
    strategyName: string;
    fleet: FleetUnit[];
    totalCapacity: number;
    totalCostIndex: number;
    efficiencyRating: number; // Percentage of seats filled
    co2PerPaxKm?: number;
}

export class OptimizationSolver {
    
    /**
     * Solves for strict uniform fleets (e.g. 2x 56-Pax Coaches), enforcing the
     * Tail-Vehicle Occupancy Rule so oversized multi-vehicle fleets (like 2x 81-Pax
     * Double Deckers for 89 pax where the 2nd bus is < 10% full) are filtered out.
     */
    static calculateUniformFleet(passengerCount: number, availableVehicles: VehicleSpec[]): OptimizationResult[] {
        const results: OptimizationResult[] = [];
        const maxSingleCap = Math.max(...availableVehicles.map(v => v.capacity), 81);
        const minVehicles = Math.max(1, Math.ceil(passengerCount / maxSingleCap));

        for (const vehicle of availableVehicles) {
            if (vehicle.capacity <= 0) continue;
            if (passengerCount > 30 && vehicle.capacity < 14) continue;

            const quantityRequired = Math.ceil(passengerCount / vehicle.capacity);
            if (quantityRequired > minVehicles + 2 && quantityRequired > 3) continue;

            const totalCapacity = quantityRequired * vehicle.capacity;
            const totalCostIndex = quantityRequired * vehicle.baseCostIndex;
            const efficiency = (passengerCount / totalCapacity) * 100;

            // Tail-Vehicle Occupancy Rule: if multiple large buses are used, the last bus must be >= 48% occupied
            if (quantityRequired >= 2 && vehicle.capacity > 24) {
                const remPax = passengerCount - (quantityRequired - 1) * vehicle.capacity;
                const tailOccupancy = remPax / vehicle.capacity;
                if (tailOccupancy < 0.48) continue;
            }

            const estCo2PerVehicle = 110 + vehicle.capacity * 11.2;
            const co2PerPaxKm = Math.round(((estCo2PerVehicle * quantityRequired) / Math.max(1, passengerCount)) * 10) / 10;

            results.push({
                strategyName: `Uniform ${vehicle.name}`,
                fleet: [{ vehicle, quantity: quantityRequired }],
                totalCapacity,
                totalCostIndex,
                efficiencyRating: Number(efficiency.toFixed(2)),
                co2PerPaxKm
            });
        }

        // Sort by multi-objective score: high seat efficiency + low cost + minimal CO2
        return results.sort((a, b) => {
            const scoreA = a.efficiencyRating * 1.2 - (a.co2PerPaxKm || 18) * 1.5 - a.totalCostIndex * 0.05;
            const scoreB = b.efficiencyRating * 1.2 - (b.co2PerPaxKm || 18) * 1.5 - b.totalCostIndex * 0.05;
            return scoreB - scoreA;
        });
    }

    /**
     * Solves the Unbounded Knapsack Minimum Cost problem.
     * Finds the absolute cheapest combination of mixed vehicles.
     * Dynamic Programming approach ensuring `Sum(capacity) >= passengerCount`.
     */
    static calculateEconomicalMixedFleet(passengerCount: number, availableVehicles: VehicleSpec[]): OptimizationResult | null {
        // Filter out invalid vehicles
        const validVehicles = availableVehicles.filter(v => v.capacity > 0 && v.baseCostIndex > 0);
        if (validVehicles.length === 0) return null;

        // DP array to store minimum cost for an "exact" capacity. 
        // We will calculate up to the maximum possible capacity overshoot.
        const maxOvershoot = Math.max(...validVehicles.map(v => v.capacity));
        const maxTarget = passengerCount + maxOvershoot;
        
        const dpCost = new Array(maxTarget + 1).fill(Infinity);
        // Track which vehicle was chosen to reach this exact capacity
        const dpChoice = new Array(maxTarget + 1).fill(-1);

        dpCost[0] = 0; // 0 passengers cost 0

        for (let j = 0; j <= maxTarget; j++) {
            if (dpCost[j] === Infinity) continue;
            
            for (let i = 0; i < validVehicles.length; i++) {
                const v = validVehicles[i];
                const nextCap = j + v.capacity;
                if (nextCap <= maxTarget) {
                    const newCost = dpCost[j] + v.baseCostIndex;
                    if (newCost < dpCost[nextCap]) {
                        dpCost[nextCap] = newCost;
                        dpChoice[nextCap] = i; // Save the vehicle index that got us here
                    }
                }
            }
        }

        // Find the absolute minimum cost for any capacity >= passengerCount
        let minCost = Infinity;
        let optimalCapacityTarget = -1;

        for (let cap = passengerCount; cap <= maxTarget; cap++) {
            if (dpCost[cap] < minCost) {
                minCost = dpCost[cap];
                optimalCapacityTarget = cap;
            }
        }

        if (optimalCapacityTarget === -1 || minCost === Infinity) return null;

        // Backtrack to assemble the fleet dictionary
        const fleetMap = new Map<string, FleetUnit>();
        let currentCap = optimalCapacityTarget;

        while (currentCap > 0) {
            const vIndex = dpChoice[currentCap];
            if (vIndex === -1) break; // Should not happen if DP was built correctly
            
            const chosenVehicle = validVehicles[vIndex];
            
            if (fleetMap.has(chosenVehicle.id)) {
                fleetMap.get(chosenVehicle.id)!.quantity++;
            } else {
                fleetMap.set(chosenVehicle.id, { vehicle: chosenVehicle, quantity: 1 });
            }
            
            currentCap -= chosenVehicle.capacity;
        }

        const efficiency = (passengerCount / optimalCapacityTarget) * 100;

        return {
            strategyName: 'Hybrid Optimal Value',
            fleet: Array.from(fleetMap.values()),
            totalCapacity: optimalCapacityTarget,
            totalCostIndex: minCost,
            efficiencyRating: Number(efficiency.toFixed(2))
        };
    }

    /**
     * Master Orchestrator: Given intent, returns the top 3 tiered quotations.
     */
    static generateQuotationMatrix(passengerCount: number, availableVehicles: VehicleSpec[]): {
        economical: OptimizationResult | null,
        recommended: OptimizationResult | null,
        premiumUniform: OptimizationResult | null
    } {
        const uniformFleets = this.calculateUniformFleet(passengerCount, availableVehicles);
        const mixedOptimal = this.calculateEconomicalMixedFleet(passengerCount, availableVehicles);

        // Economical = The absolute mathematical cheapest combination
        let economical = mixedOptimal;

        // Recommended = The cheapest Uniform fleet (business clients prefer uniformity over slight savings)
        let recommended = uniformFleets.length > 0 ? uniformFleets[0] : null;

        // Premium = The Uniform fleet with the highest BaseCostIndex per passenger (most luxurious)
        // Sort uniforms by cost descending
        const luxuryRanked = [...uniformFleets].sort((a, b) => b.totalCostIndex - a.totalCostIndex);
        let premiumUniform = luxuryRanked.length > 0 ? luxuryRanked[0] : null;

        // Edge Case: If mixed is actually more expensive? (Shouldn't happen with DP, but fallback)
        if (economical && recommended && economical.totalCostIndex > recommended.totalCostIndex) {
            economical = recommended;
        }

        return {
            economical,
            recommended,
            premiumUniform
        };
    }
}
