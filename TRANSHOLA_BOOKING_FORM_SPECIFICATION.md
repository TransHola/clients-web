# TransHola Booking & Pricing Form Engine Specification
**Comprehensive Multi-Scenario Architecture, Workflow Rules & State Machine**

---

## 1. Executive Mission & Core Philosophy

The TransHola booking and pricing form is the primary conversion and dispatch funnel across the entire TransHola ecosystem, operating identically across the public web portal ([transhola.com](https://transhola.com)) and the authenticated client enterprise portal ([client.transhola.com](https://client.transhola.com)).

### Cardinal Engineering Rules:
1. **Zero-Friction Quotations (NO FORCED ACCOUNTS):**
   - A client or enterprise visitor requesting a price or quotation **MUST NEVER BE FORCED TO REGISTER OR ENTER A PASSWORD**.
   - Quotations are generated immediately on screen with an official reference code (`#TH-Q-XXXXX`), itemized pricing, route specs, and immediate guest actions (Email quote to inbox, Print/Save PDF, Copy Quote Link, or Instant Checkout).
   - Account creation is purely optional for users wishing to track multiple quotes inside the client portal.
2. **100% Sleek Grayscale Basemap (Carto / OpenStreetMap):**
   - The map background MUST remain clean, high-contrast monochrome grayscale (`filter: grayscale(100%) contrast(92%) brightness(104%)`).
   - Saturated colors are reserved exclusively for functional UI elements:
     - ⬛ Black Pin: Pickup Origin
     - 🟣 Purple Numbered Pins: Intermediate Destination Stops
     - 🟦 Blue Square Pin: Final Dropoff Destination
     - 🔵 Electric Blue / Cyan: OSRM Route Polyline (`#2563eb`)
3. **Sequential Step Progression:**
   - **Step 0 (Initial Screen):** User selects activity type (One Way, Round Trip, or Shuttle). In Step 0, the horizontal "Popular Fleets & Rates" preview deck is visible on top of the map.
   - **Step 1 (Itinerary Route Builder):** The "Popular Fleets & Rates" deck is hidden (`display: none`) so the map is unobstructed to display the live itinerary route, waypoints, and HUD.
   - **Step 2 (Recommended Fleets):** Recommended vehicle choices based on group size with transparent pricing.
   - **Step 3 (Quotation Sheet / Booking):** Instant quotation sheet with guest delivery or direct checkout.

---

## 2. Complete Scenarios & Workflow Matrix

### Scenario 1: One-Way Direct Transfer (A → B)
- **Primary Use Case:** Airport transfers, corporate executive rides, point-to-point transfers.
- **Required Inputs:**
  - Pickup Location (with address autofill)
  - Final Destination Dropoff (with address autofill)
  - Travel Date
  - Start Time (15/30-minute intervals)
  - Passenger Count (1 to 56+ passengers)
- **Optional Inputs:**
  - Up to 5 Intermediate Destination Stops with individual layover wait times (5 min to 120 min)
- **Engine Behavior:**
  - OSRM computes shortest legal driving route between A and B (and any intermediate waypoints).
  - Calculates driving distance (km / mi) and estimated travel duration.
  - Automatically recommends fleet class fitting passenger headcount.
  - Generates one-way fixed transfer rate based on distance, local city base fare, and vehicle size.

---

### Scenario 2: Round Trip (Continuous Charter / Chauffeur on Standby)
- **Primary Use Case:** Corporate roadshows, diplomatic delegations, VIP day charters, executive meetings.
- **Required Inputs:**
  - Pickup Location & Final Destination
  - Travel Date
  - Start Time (e.g. 09:00 AM)
  - End Time / Return Time (e.g. 05:00 PM)
  - Passenger Count
- **Engine Behavior:**
  - Chauffeur and vehicle remain dedicated and on standby with the client for the full duration.
  - Layover wait times at destination and intermediate stops are factored into total journey time.
  - Rates are calculated as continuous hourly or daily charter rates.
  - "Sync with Route Activity timing" automatically recalculates return/end times when layover durations or stop counts are adjusted.

---

### Scenario 3: Round Trip (Two-Leg Independent Transfers)
- **Primary Use Case:** Airport departures with return pickups days or hours later (outbound leg + separate return leg).
- **Required Inputs:**
  - Outbound Leg: Pickup A → Dropoff B (Date 1, Time 1)
  - Return Leg: Pickup B → Dropoff A (Date 2, Time 2)
  - Passengers count
- **Engine Behavior:**
  - Generates two discrete transfer legs with separate driver assignments.
  - Pricing is combined with a round-trip efficiency discount.

---

### Scenario 4: Multi-Day Tour & Itinerary
- **Primary Use Case:** Multi-day conferences, sports teams, cross-city corporate summits, extended tours.
- **Required Inputs:**
  - Interactive Day Tabs (`+ Add Day` button adds Day 1, Day 2, Day 3... up to multiple days).
  - Per-day itinerary dates, pickup point, scheduled start/end times, intermediate stops, and dropoffs.
  - Day selector tab bar to switch between days and review/edit individual legs.
- **Engine Behavior:**
  - Computes cumulative daily mileage and driver rest periods.
  - Displays multi-day fleet packages (e.g. Full Coach Day Rate × N days).
  - Summary chip in quotation displays: `N Passengers · Oct 10 - Oct 12 · 3 Days · Total Mileage`.

---

### Scenario 5: Shuttle Service / Continuous Loop Circuit
- **Primary Use Case:** Event venue shuttles, festival transit, employee campus loops, exhibition park-and-ride.
- **Required Inputs:**
  - 3 or more route waypoints forming a circuit.
  - Service operating hours (Start Time to Finish Time).
  - Passenger volume or vehicle fleet count.
- **Engine Behavior:**
  - Computes the loop cycle time (time to complete one full round including all stop layovers).
  - Calculates required vehicle rotation frequency (e.g. 15-minute headway).
  - Rates priced on active operational vehicle-hours.

---

### Scenario 6: Intermediate Destination Stops & Layover Automation
- **Inputs:**
  - `+ Destination Stop` button adds a new stop row.
  - Each stop row features:
    - 🟣 Purple stop bullet
    - Sleek modern input box (`32px` height, `#f8fafc` background, `#e2e8f0` border)
    - Live address autofill with instant suggestion dropdown
    - Inline layover stepper (`[ 5 min − + ]` adjustable in 5-minute increments up to 120 minutes)
    - Circular `✕` remove button (`22px` rounded icon with hover red accent)
- **Engine Behavior:**
  - Dynamically recalculates the multi-waypoint OSRM driving route.
  - Inserts numbered pin badges (`1`, `2`, `3`) on the interactive map.
  - Adds each stop's wait time to the total itinerary duration badge on the map HUD (`XX km · YY min total`).

---

### Scenario 7: Address Autofill & Right-Side Suggestions Popover (Floating Over Map)
- **Positioning Rule (Right-Side Map Popover):**
  - In parity with `clients-web`, the suggestions dropdown **MUST NOT** appear directly beneath the input field on desktop screens.
  - Instead, it is anchored to the **RIGHT** of the input field (`left = rect.right + 20px`, `top = rect.top - 8px`), floating directly over the left portion of the interactive grayscale map adjacent to the active field being edited.
  - On narrow/mobile viewports (`window.innerWidth < 768px`), it gracefully falls back below the input with automatic top/bottom collision detection.
- **Focus / Empty Field Behavior:**
  - Floating suggestions dropdown immediately presents:
    1. **Curated City Hubs:** Airports, financial districts, landmarks, and luxury hotels tailored to the currently selected city (Abu Dhabi, Dubai, Riyadh, Doha, New York, London, Paris, Madrid).
    2. **Recent Searches:** Up to 5 recently used locations pulled from `localStorage`.
- **Typing Behavior (Debounced 180ms):**
  - Queries OpenStreetMap's **Photon API** biased to the selected city's latitude/longitude:
    `https://photon.komoot.io/api/?q=${query}&limit=7&lat=${city.lat}&lon=${city.lon}`
  - Categorizes suggestions with custom visual badges:
    - ✈️ **Airports** (AUH, DXB, JFK, LHR, CDG, MAD, etc.)
    - 🏨 **Hotels & Resorts**
    - 🏢 **Commercial / Financial Hubs**
    - 📍 **Street Addresses & Landmarks**
- **Selection Behavior:**
  - Sets clean, formatted address in the input.
  - Direct coordinates (`lat`, `lon`) cached to bypass secondary geocoding.
  - Saves location to recent searches.
  - Immediately updates OSRM polyline and flies the map camera to fit the itinerary.

---

### Scenario 8: Draft Auto-Save & "Saved Itinerary Found" Restore Dialog
- **Automatic State Persistence (`localStorage.setItem('saved_itinerary', ...)`):**
  - Whenever the user edits any itinerary parameter (pickup, dropoff, intermediate stops, passenger count, travel dates, or start/end times), the engine automatically persists the active draft payload to `localStorage['saved_itinerary']`.
- **Page Load / Refresh Detection:**
  - When the user returns to or refreshes the page, the engine inspects `localStorage['saved_itinerary']`.
  - If a draft is detected, the **"Saved Itinerary Found"** dialog is displayed immediately:
    - Blue Calendar icon (`CalendarDays` style SVG, `#2563eb`).
    - Title: **Saved Itinerary Found**
    - Description: *Would you like to restore the draft you were working on earlier?*
    - Two interactive action buttons:
      1. **Start Over (`#btn-restore-start-over`):** Purges `saved_itinerary` from `localStorage` and closes the modal, starting with a clean slate.
      2. **Restore Draft (`#btn-restore-draft`):** Restores all previous inputs (pickup, stops, dropoff, coordinates, dates, passengers, trip mode), immediately switches into Step 1 (hiding the Popular Fleets deck), draws the OSRM route on the map, and recomputes live distance and pricing.

---

### Scenario 9: Animated Route Navigation Moving Progress
- **Multi-Layer Route Polyline Architecture:**
  1. **Base Track:** Translucent underlying guide polyline (`#0ea5e9`, weight 6, opacity 0.22).
  2. **Flowing Dashes Polyline (`.animated-polyline`):** High-contrast dashed line with a continuous linear 1.0s forward dash animation (`stroke-dasharray: 14, 14; stroke-dashoffset: 28 -> 0`).
  3. **Glowing Snake Progress Line (`.snake-oneway`):** Dynamic SVG path using `--path-length` with a 3.2s cubic-bezier stroke animation progressing from origin through all stops to final destination.
  4. **Live Moving Navigation Progress Beacon (`.moving-route-beacon`):** A pulsing radar beacon marker that smoothly travels along the route coordinate array in a continuous loop, visualizing real-time vehicular progress along the itinerary path.

---

### Scenario 10: Intelligent Fleet Recommendation & Passenger Capacity Engine

The TransHola Fleet Recommendation & Passenger Capacity Engine is a fully automated, configuration-driven, and real-time availability-aware optimization system. Operating as a distributed microservice (`services/fleet-optimization-engine` on port `4010`) and integrated into both the client booking portal ([client.transhola.com](https://client.transhola.com)) and the public booking console ([transhola.com/get-price](https://transhola.com/get-price)), it dynamically solves passenger capacity matching while strictly adhering to Super Admin controls, country-specific vehicle registries, and real-time commercial operator fleet availability.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN CENTRAL CONTROL MATRIX                              │
│  • Country-Specific Solutions (`country_solutions`)                                    │
│  • Approved Vehicle Types & Cap Limits (`country_solution_vehicles`: max_pax, luggage) │
│  • Regulatory Compliance & License Rules (`country_compliance_condition_vehicles`)     │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Dynamic Rules & Active Catalog
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             REAL-TIME OPERATOR FLEET & DEPOT AVAILABILITY PIPELINE                     │
│  • Auto-Expanding Geo-Radius (`15km → 30km → 50km → 75km → 100km`)                     │
│  • Real-Time Depot Telemetry, Schedule Calendars & Turnaround Buffers                  │
│  • Compliance Gate: Excludes unverified, inactive, or lapsed carrier fleets            │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Verified Available Fleet Inventory
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│              INTELLIGENT PASSENGER CAPACITY & CONVOY OPTIMIZER                         │
│  • Single-Vehicle Direct Match (Headcount ≤ max vehicle capacity)                      │
│  • Multi-Vehicle Knapsack Convoy Solver (Headcount > single vehicle capacity)          │
│  • Shuttle Headway & Loop Rotation Engine (Headway-driven fleet sizing)                │
│  • Multi-Objective Optimization: Min Cost • Min Vehicles • Lowest CO2 • VIP Tier      │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Ranked Candidate Solutions
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  CLIENT BOOKING CONSOLE & INSTANT QUOTATION UI                         │
│  • Dynamic Fleet Cards with itemized vehicle allocations (e.g. 1x Coach + 1x Minibus)   │
│  • Guaranteed Availability Badge & 100% Rate Lock                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### 1. Dynamic Fleet Configuration (Pillar 1)

1. **Country & Market Resolution:**
   - Fleet recommendations never assume universal vehicle types. Instead, the engine resolves the active market via the origin point's country code (`country_code`: e.g. `AE`, `US`, `GB`, `SA`, `FR`, `DE`, `ES`).
   - Retrieves active vehicle classifications from `country_solutions` and `country_solution_vehicles`:
     - **United Arab Emirates (AE):** Executive Sedan (3), Luxury SUV (6), VIP Sprinter Van (14), Executive Minibus (24), Executive Midicoach (36), Luxury Motorcoach (56), High-Capacity Double Decker (81).
     - **United States (US):** Premium Sedan (3), Executive SUV (6), Passenger Sprinter (14), Minicoach (28), Standard School Bus (44/72), Motorcoach (56).
     - **United Kingdom & Europe (GB/EU):** Executive Chauffeur Car (3), Luxury V-Class Van (7), Midi Coach (33), Long-Distance Touring Coach (53/56).
2. **Approved & Active Fleet Filtering:**
   - Only vehicle classifications flagged as `is_active = true` within the Super Admin country solution are evaluated.
   - Deactivated, suspended, or unapproved categories in a specific country are omitted from the calculation matrix.
3. **Dynamic Geo-Spatial Radius & Carrier Retrieval:**
   - From the trip origin GPS coordinates (`lat`, `lng`), the engine scans certified operator depots using Haversine indexing.
   - Default search radius begins at **15 km**. If matching operator inventory is constrained, the radius automatically expands through predefined milestones:
     $$\text{Radius Path: } 15\text{ km} \longrightarrow 30\text{ km} \longrightarrow 50\text{ km} \longrightarrow 75\text{ km} \longrightarrow 100\text{ km}$$
   - Only operators with active operating authorities in the requested jurisdiction and verified depot locations within the radius are considered eligible.

---

#### 2. Intelligent Passenger Capacity Matching (Pillar 2)

The engine models fleet allocation as a **Multi-Objective Bounded Knapsack Optimization Problem**:

$$\min \quad Z = \alpha \cdot \text{Cost} + \beta \cdot N_{\text{vehicles}} + \gamma \cdot \text{CO}_2$$

$$\text{Subject to:} \quad \sum_{i=1}^{k} s_i \cdot x_i \ge P \quad (\text{Passenger Demand})$$

$$\sum_{i=1}^{k} l_i \cdot x_i \ge L \quad (\text{Luggage Volume Constraint})$$

$$x_i \le A_i \quad (\text{Real-Time Available Vehicles of Type } i)$$

Where:
- $P$ = Total booking passenger headcount ($1 \le P \le 1,000+$)
- $L$ = Total luggage item count
- $s_i$ = Seating capacity of vehicle category $i$ (configured by Super Admin in `country_solution_vehicles.max_pax`)
- $l_i$ = Luggage capacity of vehicle category $i$ (`country_solution_vehicles.max_luggage`)
- $x_i$ = Integer quantity of vehicle category $i$ deployed
- $A_i$ = Number of verified available, active, compliant vehicles in radius
- $\alpha, \beta, \gamma$ = Super Admin optimization priority weights (`balanced`, `lowest-cost`, `min-vehicles`, `lowest-co2`)

##### Allocation Strategies Generated:

1. **Single-Vehicle Direct Match ($P \le \max(s_i)$):**
   - For passenger counts that fit within a single vehicle, the engine identifies the closest vehicle size that satisfies $s_i \ge P$ with minimal empty seat waste, preventing a 2-passenger booking from receiving a 56-passenger bus.
   - Evaluates multiple comfort tiers (e.g. for 4 passengers: *Executive Sedan [Exceeded]* vs *Executive SUV [Best Match]* vs *Luxury Sprinter Van [VIP Upgrade]*).

2. **Uniform Grand Convoy (Minimum Vehicle Count Strategy):**
   - When $P > 56$, the engine calculates the minimum number of identical largest-available commercial coaches:
     $$x_{\text{coach}} = \left\lceil \frac{P}{s_{\text{coach}}} \right\rceil$$
   - Maximizes group cohesion and simplifies dispatch management with identical vehicle specifications and simultaneous arrival.

3. **Optimal Mixed Convoy (Lowest Cost & Minimal Waste Strategy):**
   - Employs branch-and-bound integer programming to find mixed combinations that minimize empty seats and total fleet hire costs.
   - *Example:* For **75 Passengers**:
     - *Uniform Fleet:* $2\times 56\text{-Pax Motorcoaches} = 112\text{ seats } (37\text{ empty seats})$.
     - *Optimized Mixed Convoy:* $1\times 56\text{-Pax Motorcoach} + 1\times 24\text{-Pax Minibus} = 80\text{ seats } (\mathbf{5}\text{ empty seats buffer})$.
     - Delivers up to 28% cost savings for corporate clients while ensuring complete seated capacity.

4. **Shuttle Frequency & Loop Rotation Strategy (`activityType === 'shuttle'`):**
   - For recurring shuttle loops (corporate commuter campus, conference circuits, airport loops), the vehicle count is calculated from cycle time and target dispatch headway ($H_{\text{target}}$):
     $$T_{\text{cycle}} = 2 \times T_{\text{one-way}} + T_{\text{dwell}}$$
     $$N_{\text{active}} = \max\left(1, \; \left\lceil \frac{T_{\text{cycle}}}{H_{\text{target}}} \right\rceil\right)$$
   - Computes actual headway, round trips per hour, and total moving passenger throughput per hour ($P_{\text{hourly}} = N_{\text{active}} \times s_{\text{vehicle}} \times \text{TripsPerHour}$).

5. **Ancillary Demand Constraints:**
   - **Luggage Constraints ($L$):** Automatically upgrades fleet recommendations (e.g. from Sedan to SUV or Minicoach with rear luggage compartment) if passenger luggage exceeds trunk capacity.
   - **Accessibility & ADA Requirements:** If wheelchair/ADA accommodations are requested, the engine mandates vehicles with certified hydraulic wheelchair lifts and tracks `ada_vehicle_count`.

---

#### 3. Real-Time Operator Availability & Compliance Verification (Pillar 3)

The recommendation engine strictly refuses to show phantom fleet quotes. Every generated option is backed by verified commercial capacity:

1. **Carrier Compliance Gate:**
   - A vehicle is strictly marked **ineligible** if any of the following apply:
     - Carrier company status is not `active` or `verified`.
     - Required regulatory vehicle documents (commercial registration, annual roadworthiness inspection, public passenger transport permit) are expired or pending audit.
     - Assigned chauffeur lacks the mandatory commercial driver qualification (`requires_cdl` check against `driver_licenses`).
2. **Calendar Overlap & Turnaround Buffers:**
   - The engine checks existing booking assignments for each physical vehicle in the target region for the specified date and operational time window ($[T_{\text{start}} - \Delta_{\text{reposition}}, \; T_{\text{end}} + \Delta_{\text{turnaround}}]$).
   - If an operator's fleet is committed to another corporate charter or school transit run during the requested window, that specific vehicle count $A_i$ is decremented in the availability pool.
3. **Reactive Re-calculation:**
   - Changes to the client form (headcount stepper increment, date picker change, intermediate stop added, or pickup address change) trigger an immediate debounced re-evaluation ($\le 120\text{ms}$).
   - The UI displays live fulfillment assurance chips:
     - 🟢 **100% Verified Carrier Availability:** At least 2 verified depots with idle capacity within 15 km.
     - 🟡 **Expanded Regional Coverage:** Capacity confirmed via the 30–50 km expanded radius.
     - 🔴 **Capacity Alert:** Date/time peak capacity reached; alternative vehicle combination or adjacent time window proposed.

---

#### 4. Centralized Super Admin Control (Pillar 4)

All recommendation behavior is governed dynamically through the Super Admin Mission Control portal ([superadmin.transhola.com](https://superadmin.transhola.com)):

| Control Dimension | Super Admin Entity / Table | Governed Parameters |
| :--- | :--- | :--- |
| **Market Solutions** | `country_solutions` | Active status per country, solution types (One-Way, Charter, Shuttle), region definitions |
| **Fleet Capacity & Limits** | `country_solution_vehicles` | `max_pax`, `max_luggage`, display order, default vehicle classifications |
| **Amenity Rules** | `country_vehicle_amenities` | Wi-Fi, Restrooms, Leather, Conference tables, Child seats, Surcharge pricing |
| **Compliance Conditions** | `country_compliance_condition_vehicles` | Mandatory carrier licenses, CDL endorsements, vehicle age caps |
| **Dynamic Rate Cards** | `country_vehicle_rates`, `country_surge_rules` | Base fares, per-km rates, hourly minimums, seasonal / peak multipliers |
| **Optimizer Priorities** | Super Admin Engine Configuration | Weights for $\alpha$ (Cost), $\beta$ (Fleet Consolidation), $\gamma$ (CO2 ESG Score) |

**Zero-Hardcoding Guarantee:** The engine contains zero hardcoded passenger capacities or vehicle matrices in application code. When a Super Admin updates `country_solution_vehicles.max_pax` (e.g. reclassifying executive midicoaches from 36 to 38 seats), the fleet optimization engine immediately ingests the revised boundary condition on the very next query without application downtime or rebuilds.

---

#### 5. Data Contracts & Microservice Protocol

##### Microservice Endpoint
```http
POST /api/v1/optimize
Host: 127.0.0.1:4010
Content-Type: application/json
```

##### Request Payload
```json
{
  "passengers": 75,
  "activityType": "one-way",
  "distanceKm": 48.5,
  "durationMinutes": 42,
  "tripDate": "2026-10-24",
  "startLocation": { "lat": 24.4539, "lng": 54.3773 },
  "startAddress": "Al Reem Island, Abu Dhabi, UAE",
  "currency": "AED",
  "priority": "balanced",
  "luggageCount": 60,
  "allowMixedFleet": true
}
```

##### Response Structure
```json
{
  "status": "success",
  "query": {
    "passengers": 75,
    "activityType": "one-way",
    "distanceKm": 48.5,
    "durationMinutes": 42,
    "currency": "AED",
    "priority": "balanced"
  },
  "bestRecommendation": {
    "solutionId": "optimal_mixed_convoy",
    "strategy": "cost-optimized",
    "title": "1x Luxury Motorcoach + 1x Executive Minibus",
    "badge": "Recommended Convoy",
    "summary": "Optimized knapsack combination precisely matching 75 passengers with minimum excess seats (5 seats buffer).",
    "vehicles": [
      {
        "vehicleId": "coach",
        "vehicleName": "Luxury Motorcoach",
        "category": "Coach",
        "quantity": 1,
        "seatsPerVehicle": 56,
        "totalSeats": 56,
        "totalLuggage": 56,
        "unitCost": 3073,
        "subtotalCost": 3073
      },
      {
        "vehicleId": "minibus",
        "vehicleName": "Executive Minibus",
        "category": "Minibus",
        "quantity": 1,
        "seatsPerVehicle": 24,
        "totalSeats": 24,
        "totalLuggage": 24,
        "unitCost": 1734,
        "subtotalCost": 1734
      }
    ],
    "totalVehicles": 2,
    "totalSeats": 80,
    "seatUtilizationPercent": 94,
    "totalLuggageCapacity": 80,
    "finalCost": 4807,
    "currency": "AED",
    "costPerPassenger": 64,
    "totalCo2Kg": 33.47,
    "co2GramsPerPassengerKm": 9,
    "availability": {
      "status": "guaranteed",
      "searchRadiusKm": 15,
      "radiusExpanded": false,
      "verifiedDepotsCount": 3,
      "availableVehiclesInRadius": 18,
      "fulfillmentGuaranteeText": "Direct wholesale rates backed by 3 certified depots in your pickup radius.",
      "isGuaranteed": true
    }
  },
  "solutions": [ ... ],
  "benchmark": {
    "computeTimeMicroseconds": 412,
    "branchesExplored": 16,
    "candidateSolutionsFound": 3,
    "memoryRssMB": 12.4
  }
}
```

---

#### 6. Client Portal & Public Web UI Presentation Matrix

1. **Single-Vehicle Cards:** Displayed with high-resolution LHD 3D vehicle photography, seating pill (e.g. `Up to 56 Pax`), luggage capacity, verified amenities, and transparent guaranteed fare.
2. **Convoy Fleet Cards:** When multiple vehicles are required, the UI displays a multi-unit convoy capsule:
   - Header badge: `Convoy Allocation (2 Vehicles)`
   - Breakdown badges: `1x Luxury Motorcoach (56 Pax)` + `1x Executive Minibus (24 Pax)`
   - Aggregate metrics: Total Seated Capacity (`80 Seats`), Group Utilization (`94%`), Price per Passenger (`AED 64 / pax`).
3. **Capacity Warning & Guardrail:** If an enterprise user inputs 1,000+ passengers, the engine dynamically recommends mass-transit convoy logistics ($18\times \text{Coaches}$) with dedicated convoy dispatch coordinator assignment.
4. **Instant Handoff to Quotation / Checkout:** Selection transfers the full vehicle allocation array directly into the Instant Quotation PDF generator (Scenario 11) or the Checkout Handoff (Scenario 12) without data loss.

---

---

### Scenario 11: Guest Instant Quotation (Zero Account Friction)
- **Clicking "Save as Quotation":**
  - **Does NOT prompt for login or registration.**
  - Generates unique reference code `#TH-Q-XXXXX`.
  - Saves snapshot to `localStorage['transhola_saved_quotes']`.
  - Opens the **Official Instant Quotation Modal**:
    - **Header:** TransHola branding, `#TH-Q-XXXXX`, "Valid for 24 Hours".
    - **Vehicle Card:** Category badge, title, seat count, amenities summary.
    - **Guaranteed Price:** Total price in local currency (`AED`, `USD`, `EUR`, `GBP`, `SAR`) with "All Fuel, Tolls & Chauffeur Included".
    - **Itinerary Card:** Passengers, trip type, dates, start time, total distance, driving duration, origin, intermediate stops, destination, and Net-Zero ESG offset badge.
    - **Instant Actions:**
      1. **Send to Email:** Guest enters email to receive official PDF without creating a password.
      2. **Print / Save PDF:** Triggers clean print view formatted as an official corporate quote receipt.
      3. **Copy Quote Link:** Copies direct reference URL to clipboard.
      4. **Proceed to Booking:** Direct handoff to instant checkout.
      5. **Optional Portal Link:** For enterprise users who *want* to log in to link the quote to their corporate account.

---

### Scenario 12: Seamless Booking Handoff
- **Clicking "Book Now":**
  - Gathers all verified itinerary state:
    - `pickup`: URL-encoded pickup address
    - `dropoff`: URL-encoded dropoff address
    - `passengers`: Total headcount
    - `date`: Start date (YYYY-MM-DD)
    - `time`: Scheduled start time (HH:MM)
    - `vehicle`: Selected fleet ID
    - `quoteRef`: Generated quote reference
  - Redirects to `https://client.transhola.com/bookings?...` for guest or authenticated checkout.
    - `time`: Scheduled start time (HH:MM)
    - `vehicle`: Selected fleet ID
    - `quoteRef`: Generated quote reference
  - Redirects to `https://client.transhola.com/bookings?...` for guest or authenticated checkout.

---

## 3. Maintenance & Parity Verification Protocol

Whenever modifications are made to either the client portal ([clients-web](file:///Users/fathallahlahlou/Workspace/clients-web)) or the public website ([landing-page](file:///Users/fathallahlahlou/Workspace/landing-page)):
1. Run the local build check: `bun run build`.
2. Deploy using the automated orchestrator:
   ```bash
   /Users/fathallahlahlou/Workspace/scripts/fast-deploy.sh landing-page
   ```
3. Run the automated architecture and API documentation synchronization engine:
   ```bash
   node /Users/fathallahlahlou/Workspace/superadmin/scripts/sync-system-docs.mjs
   ```
4. Verify HTTP 200 and live functionality on `https://transhola.com`.
