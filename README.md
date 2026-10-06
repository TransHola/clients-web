# TransHola Clients Web — Passenger & Corporate Booking Portal

> **Enterprise Charter Transportation, Self-Service Booking & Live Trip Tracking**  
> Built with **Next.js (App Router)**, **React**, **Tailwind CSS**, and **Stripe Elements**.

---

## 🎯 Purpose & Scope

TransHola Clients Web provides a modern, seamless digital booking and trip management experience for both individual travelers and enterprise corporate accounts (universities, tour operators, corporate event managers, wedding planners).

### Key Features
1. **Dynamic Quotation Flow:** Instant price estimation powered by the backend **`booking-engine`** and **`gis-engine`**, evaluating vehicle classes, mileage, duration, and regional taxes.
2. **Interactive Map Route Planner:** Turn-by-turn route visualization, multi-stop itineraries, and pickup/drop-off point geocoding.
3. **Secure Checkout & Invoicing:** Seamless payment processing via Stripe Elements, corporate PO billing, and automated invoice PDF generation.
4. **Live Trip Tracking HUD:** Real-time map tracking of the assigned vehicle on the day of service with live ETA updates.
5. **Passenger Manifests & Digital Boarding:** Manage passenger lists, send SMS boarding notifications, and access digital boarding passes.

---

## 🏛️ Project Structure

```
clients-web/
├── src/
│   ├── app/
│   │   ├── (auth)/                     # Client login, registration, SSO & password recovery
│   │   ├── (booking)/                  # Multi-step booking wizard
│   │   │   ├── quote/                  # Itinerary input, date picker & passenger count
│   │   │   ├── vehicles/               # Vehicle category selection & amenities comparison
│   │   │   ├── checkout/               # Stripe card payment, invoice billing & confirmation
│   │   ├── (dashboard)/                # Account overview, upcoming trips & past travel history
│   │   │   ├── trips/[id]/             # Trip detail, live driver tracking map & manifest
│   │   │   └── invoices/               # Financial receipts, invoices & tax breakdowns
│   │   └── api/                        # Next.js route handlers & Stripe webhook listeners
│   ├── components/
│   │   ├── booking/                    # Quotation calculators, vehicle cards, route reviews
│   │   ├── maps/                       # Interactive Leaflet / MapLibre itinerary preview
│   │   └── ui/                         # Reusable UI component library (shadcn/ui)
│   └── lib/                            # Supabase client, Stripe client & distance formatting
```

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
bun install
# or: npm install

# 2. Configure environment
cp .env.example .env.local

# Required environment variables:
# NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
# NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
# STRIPE_SECRET_KEY="sk_test_..."
# NEXT_PUBLIC_API_GATEWAY_URL="https://api.transhola.com"

# 3. Start development server
bun run dev
# or: npm run dev
```

Visit [`http://localhost:3000`](http://localhost:3000).
