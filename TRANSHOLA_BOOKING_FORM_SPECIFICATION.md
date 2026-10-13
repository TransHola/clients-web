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

### Scenario 10: Recommended Fleets & Passenger Capacity Engine
When the user clicks `⚡ REQUEST PRICE`, the rate engine filters and highlights vehicle recommendations based on passenger headcount:

| Fleet Category | Seat Capacity | Luggage Capacity | Key Amenities | Ideal For |
| :--- | :--- | :--- | :--- | :--- |
| **Executive Sedan** | 1 – 3 Pax | 2 Large Bags | Leather, Wi-Fi, Water | VIPs, Solo Executives |
| **Executive MPV / SUV** | 4 – 6 Pax | 4 Large Bags | Dual AC, Reclining, Wi-Fi | Small Teams, VIP Families |
| **Luxury Van** | 7 – 14 Pax | 10 Bags | High Roof, USB, Dual AC | Corporate Delegations |
| **Executive Minicoach** | 15 – 28 Pax | 20 Bags | Leather Seats, Rear Trunk | Airport Crews, Events |
| **Executive Midicoach** | 29 – 36 Pax | 30 Bags | Dual AV, Reclining, Luggage | Wedding Groups, Mid-size Tours |
| **Luxury Motorcoach** | 37 – 56 Pax | Full Underfloor Bays | Restroom, Dual AV, Wi-Fi | Large Conferences, Tour Groups |

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
