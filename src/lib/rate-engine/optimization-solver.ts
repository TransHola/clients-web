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
    /** Maximum physically available units from the Availability Engine */
    maxAvailable?: number;
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
    badgeText?: string;
    score?: number;
}

function inferDefraCo2GramsPerKm(seats: number): number {
    if (seats >= 75) return 920; // Double Decker (~11.4 g/seat-km)
    if (seats >= 45) return 720; // 56-Pax Charter Bus (~12.9 g/seat-km)
    if (seats >= 35) return 635; // 36-Pax Midi Coach (~17.6 g/seat-km)
    if (seats >= 27) return 565; // 33-Pax Mini Coach (~17.1 g/seat-km)
    if (seats >= 18) return 445; // 24-Pax Minibus (~18.5 g/seat-km)
    if (seats >= 10) return 285; // 14-Pax Van / Sprinter (~20.4 g/seat-km)
    if (seats >= 6) return 210;  // Executive SUV / MPV
    return 148;                  // Sedan
}

function computeComfortCurve(seatEfficiency: number, spareSeats: number, totalVehicles: number): number {
    const eff = Math.max(0, Math.min(1, seatEfficiency));
    if (eff >= 0.84 && eff <= 0.96) return 1.0;
    if (eff > 0.96) return totalVehicles >= 2 && spareSeats === 0 ? 0.84 : 0.93;
    if (eff >= 0.72) return 0.76 + ((eff - 0.72) / 0.12) * 0.24;
    return Math.max(0.2, (eff / 0.72) * 0.76);
}

export class OptimizationSolver {
    
    /**
     * Solves for strict uniform fleets (e.g. 2x 56-Pax Coaches), enforcing the
     * Tail-Vehicle Occupancy Rule and ranking by State-of-the-Art Multi-Criteria Utility
     * (Rate Economy + DEFRA/EEA CO2/pax-km + Minimum Fleet Count + Gaussian Comfort Curve).
     */
    static calculateUniformFleet(passengerCount: number, availableVehicles: VehicleSpec[]): OptimizationResult[] {
        const results: OptimizationResult[] = [];
        const valid = availableVehicles.filter(v => v.capacity > 0 && (v.maxAvailable === undefined || v.maxAvailable > 0));
        if (valid.length === 0) return [];

        const maxSingleCap = Math.max(...valid.map(v => v.capacity));
        const minVehicles = Math.max(1, Math.ceil(passengerCount / maxSingleCap));

        for (const vehicle of valid) {
            if (passengerCount > 30 && vehicle.capacity < 14) continue;

            const quantityRequired = Math.ceil(passengerCount / vehicle.capacity);
            if (vehicle.maxAvailable !== undefined && quantityRequired > vehicle.maxAvailable) continue;
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

            const estCo2PerVehicle = inferDefraCo2GramsPerKm(vehicle.capacity);
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

        if (results.length === 0) return [];

        const minCost = Math.max(1, Math.min(...results.map(r => r.totalCostIndex)));
        const maxCost = Math.max(...results.map(r => r.totalCostIndex));
        const minCo2 = Math.max(0.1, Math.min(...results.map(r => r.co2PerPaxKm || 15)));
        const maxCo2 = Math.max(...results.map(r => r.co2PerPaxKm || 15));

        for (const r of results) {
            const totalVehicles = r.fleet.reduce((acc, f) => acc + f.quantity, 0);
            const priceRatio = minCost / Math.max(1, r.totalCostIndex);
            const priceSpread = maxCost > minCost ? (maxCost - r.totalCostIndex) / (maxCost - minCost) : 1.0;
            const priceScore = (priceRatio * 0.65 + priceSpread * 0.35) * 36;

            const co2Val = r.co2PerPaxKm || 18;
            const co2Ratio = minCo2 / Math.max(0.1, co2Val);
            const co2Spread = maxCo2 > minCo2 ? (maxCo2 - co2Val) / (maxCo2 - minCo2) : 1.0;
            const co2Score = (co2Ratio * 0.60 + co2Spread * 0.40) * 28;

            const extraVehicles = Math.max(0, totalVehicles - minVehicles);
            const countScore = extraVehicles === 0 ? 22 : extraVehicles === 1 ? 8 : 0;

            const comfortScore = computeComfortCurve(r.efficiencyRating / 100, r.totalCapacity - passengerCount, totalVehicles) * 14;
            r.score = Math.round((priceScore + co2Score + countScore + comfortScore) * 100) / 100;
        }

        const sorted = results.sort((a, b) => (b.score || 0) - (a.score || 0) || a.totalCostIndex - b.totalCostIndex);
        sorted.forEach((r, idx) => {
            const isCheapest = r.totalCostIndex <= minCost * 1.01;
            const isGreenest = (r.co2PerPaxKm || 99) <= minCo2 + 0.15;
            if (idx === 0) {
                r.badgeText = (isCheapest && isGreenest) ? 'Best Price & Lowest CO₂' : isCheapest ? 'Best Price · Optimal Fit' : 'Recommended · Optimal Value';
            } else if (isGreenest) {
                r.badgeText = 'Lowest CO₂ Footprint';
            } else if (r.totalCapacity === passengerCount) {
                r.badgeText = '100% Exact Seat Match';
            } else {
                r.badgeText = 'Extra Comfort & Luggage';
            }
        });
        return sorted;
    }

    /**
     * Solves the Unbounded Knapsack Minimum Cost problem.
     * Finds the absolute cheapest combination of mixed vehicles.
     * Dynamic Programming approach ensuring `Sum(capacity) >= passengerCount`.
     */
    static calculateEconomicalMixedFleet(passengerCount: number, availableVehicles: VehicleSpec[]): OptimizationResult | null {
        // Filter out invalid or zero-inventory vehicles
        const validVehicles = availableVehicles.filter(
            v => v.capacity > 0 && v.baseCostIndex > 0 && (v.maxAvailable === undefined || v.maxAvailable > 0)
        );
        if (validVehicles.length === 0) return null;

        // Bounded Knapsack DP (0/1 expansion of bounded available units)
        const maxOvershoot = Math.max(...validVehicles.map(v => v.capacity));
        const maxTarget = passengerCount + maxOvershoot;

        const dpCost = new Array(maxTarget + 1).fill(Infinity);
        const dpAlloc: Array<Map<string, FleetUnit> | null> = new Array(maxTarget + 1).fill(null);

        dpCost[0] = 0;
        dpAlloc[0] = new Map();

        // Expand bounded items (up to maxAvailable or ceil(maxTarget / v.capacity))
        const expandedUnits: VehicleSpec[] = [];
        for (const v of validVehicles) {
            const maxNeeded = Math.ceil(maxTarget / v.capacity);
            const limit = v.maxAvailable !== undefined ? Math.min(v.maxAvailable, maxNeeded) : maxNeeded;
            for (let c = 0; c < limit; c++) {
                expandedUnits.push(v);
            }
        }

        for (const unit of expandedUnits) {
            for (let cap = maxTarget; cap >= unit.capacity; cap--) {
                const prevCap = cap - unit.capacity;
                if (dpCost[prevCap] === Infinity || !dpAlloc[prevCap]) continue;
                const newCost = dpCost[prevCap] + unit.baseCostIndex;
                if (newCost < dpCost[cap]) {
                    dpCost[cap] = newCost;
                    const nextMap = new Map<string, FleetUnit>();
                    for (const [k, val] of dpAlloc[prevCap]!.entries()) {
                        nextMap.set(k, { vehicle: val.vehicle, quantity: val.quantity });
                    }
                    if (nextMap.has(unit.id)) {
                        nextMap.get(unit.id)!.quantity += 1;
                    } else {
                        nextMap.set(unit.id, { vehicle: unit, quantity: 1 });
                    }
                    dpAlloc[cap] = nextMap;
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

        if (optimalCapacityTarget === -1 || minCost === Infinity || !dpAlloc[optimalCapacityTarget]) return null;

        const fleetMap = dpAlloc[optimalCapacityTarget]!;

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
