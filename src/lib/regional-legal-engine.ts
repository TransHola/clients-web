import { createHash } from 'crypto'

export interface RegionalLegalDocSeed {
  docNumber: number
  id: string
  name: string
  categoryLabel: string
  audienceCodes: string[]
  primarySide: 'client' | 'both' | 'fleet-operator'
  type: 'signup' | 'booking'
  lifecycleStage: string
  enforcementAction: string
  description: string
  clauses: [string, string, string, string, string]
}

export interface HydratedRegionalLegalDoc {
  id: string
  docNumber: number
  name: string
  version: string
  status: 'active' | 'draft' | 'archived'
  enforcementAction: string
  description: string
  hydratedContent: string
  contentSha256: string
  lastUpdated: string
  hasCountryOverride: boolean
  hasRegionOverride: boolean
  scopeLabel: string
  alwaysFreshPerBooking: boolean
  previouslyAcceptedVersion: boolean
  triggerBadge: string
  highlights: string[]
}

function buildClientLegalContent(doc: RegionalLegalDocSeed): string {
  const isPassengerOnly =
    doc.audienceCodes.length === 1 && doc.audienceCodes[0] === 'X'

  const sec2 = isPassengerOnly
    ? `2. PASSENGER BOARDING, CONDUCT & SAFETY STANDARDS\n${doc.clauses[1]} Passengers traveling in {{country_of_incorporation}} must adhere to scheduled boarding times, seatbelt mandates, luggage safety rules, and courteous onboard conduct.`
    : `2. BOOKING PARAMETERS & SERVICE STANDARDS\n${doc.clauses[1]} The Booking Client ({{client_legal_name}}) and traveling passengers must adhere to confirmed itinerary parameters, passenger/luggage capacity limits, and minimum advance booking lead-time requirements ({{min_advance_lead_time_hours}} where applicable) configured for {{country_of_incorporation}}.`

  const sec3 = isPassengerOnly
    ? `3. PASSENGER SAFETY, PRIVACY & SERVICE DELIVERY\n${doc.clauses[2]} Trip coordination, live tracking during the active trip window (from start to completion), and passenger safety protections under Booking Reference {{booking_ref}} are enforced throughout the scheduled journey.`
    : `3. CLIENT BOOKING PRICE, PAYMENT & CUSTOMER POLICY TERMS\n${doc.clauses[2]} The Booking Client pays strictly the confirmed customer booking price in {{currency}} (plus any customer-approved trip extensions or published customer cancellation/no-show charges of {{cancellation_fee}} in {{currency}} where applicable) under Booking Reference {{booking_ref}}.`

  const sec4 = isPassengerOnly
    ? `4. PASSENGER PRIVACY & DATA PROTECTION\n${doc.clauses[3]} Passenger information is processed strictly to deliver the scheduled trip safely and is protected under applicable data privacy laws.`
    : `4. CUSTOMER DATA PRIVACY & ACTIVE TRIP VISIBILITY\n${doc.clauses[3]} Customer booking records and passenger details are processed strictly to fulfill the reservation ({{booking_ref}}), with live trip tracking active solely from job start until job completion.`

  return [
    `1. PURPOSE, SCOPE & APPLICABILITY\n${doc.clauses[0]} This instrument (#${doc.docNumber} — ${doc.name}) is promulgated by {{platform_legal_name}} and applies across {{country_of_incorporation}} (Jurisdiction: {{governing_law_country}}).`,
    sec2,
    sec3,
    sec4,
    `5. ENFORCEMENT, GOVERNING LAW & DIGITAL EXECUTION\n${doc.clauses[4]} Non-compliance triggers automated platform governance (${doc.enforcementAction}). This document is governed by {{governing_law_country}} and is binding upon electronic acceptance. Digital Execution Metadata: {{signature_metadata}}.`,
  ].join('\n\n')
}

export const CLIENT_BOOKING_LEGAL_SEEDS: RegionalLegalDocSeed[] = [
  {
    docNumber: 42,
    id: 'doc-42-customer-booking-terms-conditions',
    name: 'Customer Booking Terms & Conditions',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C'],
    primarySide: 'client',
    type: 'signup',
    lifecycleStage: 'signup',
    enforcementAction: 'block_booking',
    description:
      'Master terms governing consumer, corporate, and government client accounts, booking eligibility, lead-time rules, and account responsibilities.',
    clauses: [
      'These Customer Booking Terms & Conditions govern all individual, corporate, and government clients ({{client_legal_name}}) requesting transportation services on TransHola.',
      'Clients must provide accurate passenger counts, luggage requirements, pickup/drop-off coordinates, and activity types when confirming reservations.',
      "All bookings must satisfy the region's configured Minimum Advance Booking Lead-Time Policy ({{min_advance_lead_time_hours}} in advance unless an authorized override applies).",
      'The Client is responsible for verifying itinerary details prior to confirmation and ensuring all passengers in their party comply with platform conduct rules.',
      'TransHola reserves the right to suspend accounts that engage in payment fraud, repeated unexcused no-shows, or abuse of drivers and fleet equipment.',
    ],
  },
  {
    docNumber: 43,
    id: 'doc-43-booking-confirmation-service-contract',
    name: 'Booking Confirmation / Transportation Service Contract',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'block_booking',
    description:
      'Transaction-specific transportation contract generated per confirmed booking, binding the itinerary, vehicle class, fare, and assigned operator.',
    clauses: [
      'This Booking Confirmation constitutes the transaction-specific Transportation Service Contract for Booking Reference {{booking_ref}} between {{client_legal_name}}, {{platform_legal_name}}, and the assigned Fleet Operator ({{operator_legal_name}}).',
      'The confirmed fare in {{currency}} covers the specified vehicle classification, passenger seating capacity, scheduled dates/times, and approved route waypoints.',
      'Any unscheduled route deviations, extra stops, or time extensions requested during the trip are subject to real-time availability and automated Rate Engine recalculation.',
      'Temporary checkout inventory holds expire automatically if payment authorization and regional legal execution are not completed within the configured Checkout Hold TTL.',
      "Saved quotations that have not been confirmed expire automatically after the region's configured Quotation Validity Window.",
    ],
  },
  {
    docNumber: 44,
    id: 'doc-44-cancellation-refund-policy',
    name: 'Cancellation & Refund Policy',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'financial_penalty',
    description:
      'Defines client cancellation windows, tiered cancellation fees, free grace periods, and refund processing timelines.',
    clauses: [
      'This Cancellation & Refund Policy governs client-initiated cancellations for confirmed bookings ({{booking_ref}}) in {{country_of_incorporation}}.',
      "Cancellations submitted outside the penalty window or within the configured post-booking grace period qualify for a full or partial refund according to the region's Client Cancellation Tiers.",
      'Cancellations made close to the scheduled pickup time incur the applicable customer cancellation charge ({{cancellation_fee}} in {{currency}}) according to the published Client Cancellation Policy.',
      'If an assigned Operator cancels and TransHola is unable to provide an equivalent replacement vehicle within the SLA window, the Client receives a 100% full refund.',
      'Approved refunds are credited back to the original payment method or corporate credit ledger within standard banking settlement timelines.',
    ],
  },
  {
    docNumber: 45,
    id: 'doc-45-customer-passenger-noshow-policy',
    name: 'Customer & Passenger No-Show Policy',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C', 'X'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'operations',
    enforcementAction: 'financial_penalty',
    description:
      'Defines passenger waiting grace periods, driver contact verification steps, and non-refundable no-show charges.',
    clauses: [
      "A Customer/Passenger No-Show occurs when the lead passenger or group fails to board the assigned vehicle at the designated pickup coordinate within the region's configured Waiting Grace Period for {{booking_ref}}.",
      'Before a trip can be marked as a No-Show, the Driver and Dispatch Center must verify GPS presence at the pickup geofence and attempt contact with the Client/Lead Passenger.',
      'Once the waiting grace period expires without passenger contact or authorized paid waiting extension, the booking is classified as a confirmed No-Show.',
      "Confirmed Customer No-Shows are subject to the region's configured No-Show Penalty up to 100% of the booked trip fare ({{cancellation_fee}} in {{currency}}).",
      'For multi-leg bookings, a No-Show on the outbound leg does not automatically cancel subsequent legs unless the Client fails to reconfirm with Dispatch.',
    ],
  },
  {
    docNumber: 46,
    id: 'doc-46-waiting-time-delays-additional-charges',
    name: 'Waiting Time, Delays & Additional Charges Policy',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'operations',
    enforcementAction: 'financial_penalty',
    description:
      'Governs complimentary pickup waiting windows, flight delay monitoring, overtime charter rates, extra stops, and cleaning/damage fees.',
    clauses: [
      'Each confirmed booking ({{booking_ref}}) includes a complimentary pickup waiting grace period as configured for standard, airport, or VIP pickups in {{country_of_incorporation}}.',
      "Wait time beyond the complimentary grace period, client-requested itinerary extensions, or unscheduled extra stops are billed in {{currency}} at the vehicle class's configured per-minute or hourly overtime rate.",
      'Where a valid commercial flight number is provided at booking, airport pickup times are adjusted automatically within reasonable operational limits for verified flight delays.',
      "Parking fees, road tolls, congestion charges, or ferry fees incurred due to client-requested route modifications are billed transparently to the Client's final invoice.",
      'Soiling or interior damage caused by passengers incurs a standardized vehicle sanitation or repair recovery fee.',
    ],
  },
  {
    docNumber: 47,
    id: 'doc-47-booking-modification-rescheduling',
    name: 'Booking Modification & Rescheduling Policy',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'informational',
    description:
      'Rules for changing pickup times, dates, passenger counts, vehicle classes, or route stops after booking confirmation.',
    clauses: [
      'Clients may request modifications to pickup time, date, passenger count, vehicle type, or route stops for {{booking_ref}} through the Client Portal prior to the lock window.',
      'All modification requests are evaluated in real time by the Availability Engine and Rate Engine to verify fleet schedule feasibility, driver Hours of Service compliance, and updated pricing.',
      'Increases in passenger count, trip duration, mileage, or vehicle tier generate an itemized fare adjustment in {{currency}} that must be authorized before the modification takes effect.',
      'Rescheduling requests submitted inside the minimum advance lead-time window ({{min_advance_lead_time_hours}}) are subject to operator schedule availability and late-change fees.',
      'Once modified and confirmed, an updated Booking Confirmation version is issued electronically.',
    ],
  },
  {
    docNumber: 48,
    id: 'doc-48-passenger-conduct-safety-policy',
    name: 'Passenger Conduct & Safety Policy',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C', 'X'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'operations',
    enforcementAction: 'suspend_entity',
    description:
      'Mandatory passenger safety rules including seatbelt usage, no smoking/vaping, alcohol restrictions, and respectful treatment of drivers.',
    clauses: [
      'All passengers traveling under Booking Reference {{booking_ref}} must wear seatbelts at all times while the vehicle is in motion and remain seated until the vehicle comes to a complete stop.',
      'Smoking, vaping, e-cigarettes, open flames, and consumption of illegal substances are strictly prohibited inside all fleet vehicles.',
      'Consumption of alcohol onboard is prohibited unless explicitly permitted by local law in {{country_of_incorporation}} and pre-authorized in writing for the specific charter vehicle class.',
      'Passengers must not distract the Driver, tamper with vehicle doors or emergency equipment, throw objects from windows, or engage in unruly, aggressive, or unsafe behavior.',
      'The Driver and Fleet Operator reserve the right to refuse boarding or terminate a trip at the nearest safe location if any passenger endangers safety, without refund.',
    ],
  },
  {
    docNumber: 50,
    id: 'doc-50-children-minors-unaccompanied-passengers',
    name: 'Children, Minors & Unaccompanied Passengers Policy',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C', 'X'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'operations',
    enforcementAction: 'block_booking',
    description:
      'Safeguarding rules for child restraint seats, adult chaperones, school/youth group charters, and unaccompanied minor restrictions.',
    clauses: [
      'Every child and infant counts toward the total legal seating capacity of the vehicle and must occupy an individual seat equipped with an appropriate restraint system as required in {{country_of_incorporation}}.',
      'Unless booked under a verified School Transportation or Youth Charter addendum with designated chaperones, minors under the statutory age of majority must be accompanied by a responsible adult parent or guardian.',
      'For school, camp, and youth group charters ({{booking_ref}}), the Booking Client ({{client_legal_name}}) must provide adult supervisors on board who are responsible for student roll-call, boarding, and conduct.',
      "Clients requiring infant carriers or child booster seats must specify them at booking or provide certified seats compatible with the vehicle's ISOFIX/seatbelt restraints.",
      'Drivers will not depart if required child safety restraints or mandatory adult chaperones are absent.',
    ],
  },
  {
    docNumber: 51,
    id: 'doc-51-accessibility-disability-special-needs',
    name: 'Accessibility, Disability Assistance & Special Needs Policy',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C', 'X'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'require_consent',
    description:
      'Guarantees non-discriminatory service, wheelchair-accessible vehicle (WAV) matching, service animal accommodation, and boarding assistance.',
    clauses: [
      'TransHola and all participating Fleet Operators provide inclusive, non-discriminatory transportation for passengers with disabilities, mobility devices, and special assistance requirements.',
      'Certified service and guide animals accompanying passengers with disabilities are welcomed onboard all vehicles at no additional charge.',
      'Clients requiring hydraulic wheelchair lifts, ramps, or secure wheelchair tie-down positions have selected the ADA Accessibility guarantee so the Availability Engine assigns a certified WAV unit.',
      'Extended complimentary boarding and alighting time is automatically granted for passengers with reduced mobility.',
      'Drivers are trained to provide courteous assistance with collapsible mobility aids and safe boarding while respecting passenger dignity and independence.',
    ],
  },
  {
    docNumber: 54,
    id: 'doc-54-payment-authorization-billing-terms',
    name: 'Payment Authorization & Billing Terms',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'block_booking',
    description:
      'Authorizes payment confirmation, settlement timing, verified post-trip overtime/extension adjustments, and electronic tax invoicing.',
    clauses: [
      'By confirming Booking Reference {{booking_ref}}, {{client_legal_name}} authorizes {{platform_legal_name}} and its designated PCI-DSS Level 1 payment gateway to settle the confirmed reservation in {{currency}}.',
      "Payment timing (upfront settlement, pre-authorization hold, or approved corporate/government billing cycle) is governed by {{country_of_incorporation}}'s configured Client Payment Rules.",
      'The Client authorizes verified post-trip settlement adjustments solely for waiting time beyond the complimentary grace period, client-requested route extensions, extra stops, tolls, or documented vehicle damage/cleaning fees.',
      'Corporate and Government accounts operating on approved Credit Lines must settle invoices within their configured clearance cycle.',
      'Official tax/VAT invoices are issued electronically upon trip completion and settlement.',
    ],
  },
  {
    docNumber: 55,
    id: 'doc-55-group-booking-lead-passenger-responsibility',
    name: 'Group Booking & Lead Passenger Responsibility Agreement',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['C'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'require_consent',
    description:
      'Designates the Booking Client and Lead Passenger as responsible for group assembly, manifest accuracy, convoy coordination, and passenger conduct.',
    clauses: [
      'For group charters, multi-vehicle convoys, road trips, and event shuttles ({{booking_ref}}), {{client_legal_name}} designates a reachable on-site Lead Passenger or Group Coordinator.',
      'The Lead Passenger is responsible for ensuring all group members assemble at the pickup staging point on time and board the correct assigned vehicle(s).',
      'The Booking Client assumes financial and legal responsibility for the conduct of all passengers in the group, including any interior vehicle damage, excessive cleaning costs, or overtime delays caused by group members.',
      'For multi-vehicle bookings, the Lead Passenger coordinates with the Lead Driver or on-site Dispatch Supervisor to manage staggered or simultaneous departures.',
      'Instructions given by the designated Lead Passenger regarding minor timing adjustments at stops are binding on the Booking Client.',
    ],
  },
  {
    docNumber: 56,
    id: 'doc-56-passenger-information-privacy-notice',
    name: 'Passenger Information & Privacy Notice (Agency / Third-Party)',
    categoryLabel: 'Booking Clients & Passengers',
    audienceCodes: ['X'],
    primarySide: 'client',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'require_consent',
    description:
      'Privacy & coordination notice when booking on behalf of corporate employees, VIP guests, agency travelers, or third-party passengers.',
    clauses: [
      'This notice applies to passengers traveling on a TransHola booking ({{booking_ref}}) arranged on their behalf by {{client_legal_name}}.',
      'The Booking Client confirms lawful authority to share the Lead Passenger contact details solely so Dispatch and the assigned Chauffeur can coordinate pickup and share live trip tracking.',
      'Live vehicle tracking links shared with passengers allow real-time visibility of the assigned vehicle registration, driver name, and estimated arrival time.',
      'Where fleet vehicles are equipped with road-facing or statutory safety dashcams, recordings are governed by local transport authority regulations in {{country_of_incorporation}} and accessed strictly for safety incident investigation.',
      'Passenger data is retained strictly in accordance with applicable data protection laws and is never used for unsolicited marketing.',
    ],
  },
  {
    docNumber: 61,
    id: 'doc-61-dangerous-goods-weapons-prohibited-items',
    name: 'Dangerous Goods, Weapons & Prohibited Items Policy',
    categoryLabel: 'Specialized Transportation & Risk Protection',
    audienceCodes: ['O', 'D', 'C', 'X'],
    primarySide: 'both',
    type: 'booking',
    lifecycleStage: 'compliance',
    enforcementAction: 'suspend_entity',
    description:
      'Strict ban on explosives, flammables, toxic materials, unauthorized firearms/weapons, and illicit substances onboard any passenger vehicle.',
    clauses: [
      'No client or passenger may bring onboard any vehicle ({{booking_ref}}) hazardous materials, explosives, fireworks, compressed flammable gases, toxic chemicals, radioactive substances, or biological hazards.',
      'Firearms, ammunition, knives, and weapons of any kind are strictly prohibited onboard all passenger vehicles, except for on-duty law enforcement or diplomatic security personnel pre-authorized in writing under the laws of {{country_of_incorporation}}.',
      'Illicit narcotics, contraband, and smuggled goods are strictly forbidden across all domestic and cross-border journeys.',
      'Drivers are required to refuse boarding if they observe or reasonably suspect prohibited dangerous goods or weapons.',
      'Violations result in immediate trip termination without refund, permanent account ban, and immediate notification of authorities.',
    ],
  },
  {
    docNumber: 68,
    id: 'doc-68-service-specific-addenda',
    name: 'Service-Specific Addenda (Shuttle, Multi-Day & Cross-Border)',
    categoryLabel: 'Specialized Transportation & Risk Protection',
    audienceCodes: ['O', 'A', 'D', 'C', 'X'],
    primarySide: 'both',
    type: 'booking',
    lifecycleStage: 'booking',
    enforcementAction: 'require_consent',
    description:
      'Modular service addenda governing Continuous Shuttles, Multi-Day Road Trips, Corporate Loops, and Cross-Border Corridors.',
    clauses: [
      'This Service-Specific Addendum supplements the Master Agreements whenever Booking Reference {{booking_ref}} involves Continuous Shuttles, Multi-Day Road Trips, or Cross-Border Corridors.',
      'School & Youth Transport: Operators and Drivers hold specialized endorsements required in {{country_of_incorporation}}, following strict manifest sign-in/sign-out handoffs.',
      'Continuous Shuttle & Corporate Loops: Vehicles operate on recurrent loop cadences with designated staging stops, turnaround recovery buffers, and relief-driver rotations where cumulative duty hours exceed single-driver limits.',
      'Multi-Day Road Trips: Driver overnight accommodation and subsistence allowances are governed transparently by the SuperAdmin Rate Engine package.',
      'Cross-Border Corridors: Passengers are solely responsible for carrying valid passports, visas, and customs declarations required at border checkpoints.',
    ],
  },
]

const CORE_ALWAYS_FRESH_IDS = new Set([
  'doc-43-booking-confirmation-service-contract',
  'doc-54-payment-authorization-billing-terms',
])

const CORE_REGIONAL_POLICY_IDS = new Set([
  'doc-44-cancellation-refund-policy',
  'doc-45-customer-passenger-noshow-policy',
  'doc-46-waiting-time-delays-additional-charges',
  'doc-48-passenger-conduct-safety-policy',
  'doc-61-dangerous-goods-weapons-prohibited-items',
])

const COUNTRY_FALLBACK_NAMES: Record<string, string> = {
  AE: 'United Arab Emirates',
  US: 'United States',
  SA: 'Saudi Arabia',
  GB: 'United Kingdom',
  MA: 'Morocco',
  FR: 'France',
  DE: 'Germany',
  ES: 'Spain',
  QA: 'Qatar',
  KW: 'Kuwait',
  BH: 'Bahrain',
  OM: 'Oman',
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function detectSubRegionFromCountryConfig(
  countryConfig: Record<string, any> | null | undefined,
  pickupAddress: string,
  pickupLat?: number | null,
  pickupLon?: number | null
): { regionName: string; regionCode: string; regionNode: any | null } {
  const regions: any[] = Array.isArray(countryConfig?.regions) ? countryConfig!.regions : []
  if (regions.length === 0) {
    return { regionName: '', regionCode: '', regionNode: null }
  }

  const addrLower = String(pickupAddress || '').toLowerCase()

  // 1. Exact text match on region or child district name
  for (const reg of regions) {
    if (reg?.status === 'inactive' || reg?.isActive === false) continue
    const rName = String(reg?.name || '').trim()
    if (rName && addrLower.includes(rName.toLowerCase())) {
      return {
        regionName: rName,
        regionCode: String(reg?.abbreviation || '').toUpperCase(),
        regionNode: reg,
      }
    }
    if (Array.isArray(reg?.children)) {
      for (const child of reg.children) {
        const cName = String(child?.name || '').trim()
        if (cName && addrLower.includes(cName.toLowerCase())) {
          return {
            regionName: rName || cName,
            regionCode: String(reg?.abbreviation || child?.abbreviation || '').toUpperCase(),
            regionNode: reg,
          }
        }
      }
    }
  }

  // 2. Nearest active region by GPS coordinate (within 250 km)
  if (
    typeof pickupLat === 'number' &&
    typeof pickupLon === 'number' &&
    Number.isFinite(pickupLat) &&
    Number.isFinite(pickupLon)
  ) {
    let bestReg: any = null
    let bestDist = Infinity
    for (const reg of regions) {
      if (reg?.status === 'inactive' || reg?.isActive === false) continue
      const rLat = Number(reg?.lat)
      const rLng = Number(reg?.lng ?? reg?.lon)
      if (Number.isFinite(rLat) && Number.isFinite(rLng)) {
        const d = haversineKm(pickupLat, pickupLon, rLat, rLng)
        if (d < bestDist && d <= 250) {
          bestDist = d
          bestReg = reg
        }
      }
    }
    if (bestReg) {
      return {
        regionName: String(bestReg.name || '').trim(),
        regionCode: String(bestReg.abbreviation || '').toUpperCase(),
        regionNode: bestReg,
      }
    }
  }

  return { regionName: '', regionCode: '', regionNode: null }
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function resolveRegionalLegalBundle(params: {
  countryCode: string
  countryName?: string
  countryConfig?: Record<string, any> | null
  globalConfig?: Record<string, any> | null
  legalAgreementRows?: any[]
  priorAcceptances?: Array<{ doc_id: string; doc_version: string; content_sha256?: string }>
  pickupAddress?: string
  pickupLat?: number | null
  pickupLon?: number | null
  dropoffCountryCode?: string
  tripType?: string
  passengers?: number
  vehicleCount?: number
  adaRequired?: boolean
  amenities?: string[]
  isThirdParty?: boolean
  clientName?: string
  currency?: string
  totalPrice?: number
  bookingRefHint?: string
}) {
  const cCode = String(params.countryCode || 'AE').trim().toUpperCase() || 'AE'
  const cCfg = params.countryConfig || {}
  const gCfg = params.globalConfig || {}
  const cName =
    String(params.countryName || cCfg.name || COUNTRY_FALLBACK_NAMES[cCode] || cCode).trim()

  const { regionName, regionCode, regionNode } = detectSubRegionFromCountryConfig(
    cCfg,
    params.pickupAddress || '',
    params.pickupLat,
    params.pickupLon
  )

  const jurisdictionLabel = regionName ? `${regionName}, ${cName}` : cName
  const governingLawLabel = regionName
    ? `Laws of ${cName} (${regionName} Transport & Commercial Jurisdiction)`
    : `Laws of ${cName}`

  // Collect overrides in strict 3-tier order: Global -> Country -> Sub-Region
  const globalOverrides: Record<string, any> = {
    ...(gCfg.legalAgreements && typeof gCfg.legalAgreements === 'object' ? gCfg.legalAgreements : {}),
  }
  const countryOverrides: Record<string, any> = {
    ...(cCfg.legalAgreements && typeof cCfg.legalAgreements === 'object' ? cCfg.legalAgreements : {}),
  }
  const regionOverrides: Record<string, any> = {
    ...(regionNode?.legalAgreements && typeof regionNode.legalAgreements === 'object'
      ? regionNode.legalAgreements
      : {}),
  }

  const customDbTemplates: Record<string, any> = {}
  if (Array.isArray(params.legalAgreementRows)) {
    for (const row of params.legalAgreementRows) {
      const rawId = String(row?.id || '')
      if (!rawId) continue
      const parts = rawId.split('::')
      const baseId = parts[0]
      const scopedCountry = (parts[1] || '').toUpperCase()
      const scopedRegion = (parts[2] || '').toUpperCase()

      const normObj = {
        id: baseId,
        name: row.name,
        type: row.type,
        audience: row.audience,
        description: row.description,
        content: row.content,
        version: row.version,
        status: row.status,
        lastUpdated: row.last_updated || (row.updated_at ? String(row.updated_at).split('T')[0] : undefined),
        enforcementAction: row.enforcement_action,
      }

      if (parts.length >= 3 && scopedCountry === cCode && regionCode && scopedRegion === regionCode) {
        regionOverrides[baseId] = { ...(regionOverrides[baseId] || {}), ...normObj }
      } else if (parts.length === 2 && scopedCountry === cCode) {
        countryOverrides[baseId] = { ...(countryOverrides[baseId] || {}), ...normObj }
      } else if (parts.length === 1) {
        const rowCountries = Array.isArray(row.countries)
          ? row.countries.map((x: any) => String(x).toUpperCase())
          : []
        if (rowCountries.length === 1 && rowCountries[0] === cCode) {
          countryOverrides[baseId] = { ...(countryOverrides[baseId] || {}), ...normObj }
        } else if (rowCountries.length === 0 || rowCountries.includes('GLOBAL') || rowCountries.includes(cCode)) {
          globalOverrides[baseId] = { ...(globalOverrides[baseId] || {}), ...normObj }
        }
      }

      // Track custom SuperAdmin-created client booking docs not in base seeds
      if (
        !CLIENT_BOOKING_LEGAL_SEEDS.some((s) => s.id === baseId) &&
        String(row.audience || '').toLowerCase() === 'client' &&
        String(row.type || '').toLowerCase() === 'booking' &&
        (scopedCountry === '' || scopedCountry === 'GLOBAL' || scopedCountry === cCode)
      ) {
        customDbTemplates[baseId] = normObj
      }
    }
  }

  // Booking context signals for Smart Conditional Selection
  const pax = Math.max(1, Number(params.passengers || 1))
  const vehCount = Math.max(1, Number(params.vehicleCount || 1))
  const tripKey = String(params.tripType || 'one-way').toLowerCase()
  const dropCountry = String(params.dropoffCountryCode || cCode).toUpperCase()
  const isCrossBorder = Boolean(dropCountry && dropCountry !== cCode)
  const isGroupOrConvoy = pax >= 8 || vehCount > 1
  const isShuttleOrMultiOrCrossBorder =
    tripKey === 'shuttle' || tripKey === 'multi-day' || isCrossBorder
  const amList = Array.isArray(params.amenities) ? params.amenities : []
  const hasChildOrYouth = amList.some((a) => /child|booster|infant|baby|minor|school/i.test(String(a)))
  const hasAda = Boolean(params.adaRequired)
  const hasThirdParty = Boolean(params.isThirdParty)

  // Runtime variable values from SuperAdmin country config + booking context
  const minLeadHrs =
    cCfg?.bookingPolicy?.minAdvanceLeadTimeHours ||
    cCfg?.dispatchingEngine?.scheduled?.minAdvanceHours ||
    3
  const cancelFeeLabel =
    cCfg?.cancellationPolicy?.latePenaltyLabel ||
    'Tiered Regional Schedule (0% outside penalty window; up to 100% inside late/no-show window)'
  const currency = String(params.currency || cCfg.currency || 'AED').toUpperCase()
  const clientLegalName = String(params.clientName || 'Authorized Booking Client').trim()
  const refLabel = String(params.bookingRefHint || 'CONFIRMED-AT-EXECUTION').trim()
  const sealPreview = `Jurisdiction: ${cCode}${regionCode ? `-${regionCode}` : ''} | Verified Card Payment`

  const replaceVariables = (rawText: string): string => {
    const map: Record<string, string> = {
      '{{platform_legal_name}}': 'TransHola International LLC',
      '{{operator_legal_name}}': `Assigned Licensed ${cName} Fleet Partner`,
      '{{client_legal_name}}': clientLegalName,
      '{{country_of_incorporation}}': jurisdictionLabel,
      '{{governing_law_country}}': governingLawLabel,
      '{{booking_ref}}': refLabel,
      '{{currency}}': currency,
      '{{cancellation_fee}}': String(cancelFeeLabel),
      '{{min_advance_lead_time_hours}}': `${minLeadHrs} Hours`,
      '{{signature_metadata}}': sealPreview,
    }
    return rawText.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, (token) => map[token] || token)
  }

  const priorSet = new Set(
    (params.priorAcceptances || []).map(
      (a) => `${String(a.doc_id)}@@${String(a.doc_version || 'v1.0').toLowerCase()}`
    )
  )

  const requiredDocs: HydratedRegionalLegalDoc[] = []
  const informationalDocs: HydratedRegionalLegalDoc[] = []

  const evaluateDoc = (
    base: {
      id: string
      docNumber: number
      name: string
      description: string
      content: string
      version: string
      status: 'active' | 'draft' | 'archived'
      enforcementAction: string
      lastUpdated: string
    },
    triggerReason: { shouldIncludeByDefault: boolean; badge: string }
  ) => {
    const gOv = globalOverrides[base.id]
    const cOv = countryOverrides[base.id]
    const rOv = regionOverrides[base.id]

    const hasCountryOverride = Boolean(cOv)
    const hasRegionOverride = Boolean(rOv)

    const mergedStatus = (rOv?.status || cOv?.status || gOv?.status || base.status || 'active') as
      | 'active'
      | 'draft'
      | 'archived'

    if (mergedStatus !== 'active') return

    const mergedEnforcement = String(
      rOv?.enforcementAction || cOv?.enforcementAction || gOv?.enforcementAction || base.enforcementAction || 'require_consent'
    )
    const explicitlyForcedBySuperAdmin =
      Boolean(rOv || cOv) &&
      ['block_booking', 'require_consent', 'financial_penalty', 'suspend_entity'].includes(
        mergedEnforcement
      )

    if (!triggerReason.shouldIncludeByDefault && !explicitlyForcedBySuperAdmin) {
      return
    }

    const mergedName = String(rOv?.name || cOv?.name || gOv?.name || base.name)
    const mergedDesc = String(rOv?.description || cOv?.description || gOv?.description || base.description)
    const mergedVersionRaw = String(rOv?.version || cOv?.version || gOv?.version || base.version || 'v1.0').trim()
    const mergedVersion = mergedVersionRaw.toLowerCase().startsWith('v')
      ? mergedVersionRaw
      : `v${mergedVersionRaw}`
    const rawContent = String(rOv?.content || cOv?.content || gOv?.content || base.content)
    const hydratedContent = replaceVariables(rawContent)
    const digest = sha256Hex(`${base.id}|${mergedVersion}|${cCode}|${hydratedContent}`)
    const lastUpdated = String(
      rOv?.lastUpdated || cOv?.lastUpdated || gOv?.lastUpdated || base.lastUpdated || '2026-11-05'
    )

    const scopeLabel = hasRegionOverride
      ? `${regionName} Regional Mandate`
      : hasCountryOverride
        ? `${cName} Country Mandate`
        : `${cName} / Global Standard`

    const alwaysFreshPerBooking = CORE_ALWAYS_FRESH_IDS.has(base.id)
    const previouslyAcceptedVersion =
      !alwaysFreshPerBooking && priorSet.has(`${base.id}@@${mergedVersion.toLowerCase()}`)

    // Extract 2 concise executive highlights for fast scanning
    const highlights: string[] = [
      `Jurisdiction: ${jurisdictionLabel}`,
      alwaysFreshPerBooking
        ? `Binding for ${currency}${params.totalPrice ? ` ${Number(params.totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''} reservation`
        : `Version ${mergedVersion} · ${scopeLabel}`,
    ]

    const docOut: HydratedRegionalLegalDoc = {
      id: base.id,
      docNumber: base.docNumber,
      name: mergedName,
      version: mergedVersion,
      status: mergedStatus,
      enforcementAction: mergedEnforcement,
      description: mergedDesc,
      hydratedContent,
      contentSha256: digest,
      lastUpdated,
      hasCountryOverride,
      hasRegionOverride,
      scopeLabel,
      alwaysFreshPerBooking,
      previouslyAcceptedVersion,
      triggerBadge: hasRegionOverride
        ? `${regionName} Override`
        : hasCountryOverride
          ? `${cCode} Country Rule`
          : triggerReason.badge,
      highlights,
    }

    if (mergedEnforcement === 'informational') {
      informationalDocs.push(docOut)
    } else {
      requiredDocs.push(docOut)
    }
  }

  for (const seed of CLIENT_BOOKING_LEGAL_SEEDS) {
    const baseContent = buildClientLegalContent(seed)
    let shouldInclude = false
    let badge = `${cName} Policy`

    if (CORE_ALWAYS_FRESH_IDS.has(seed.id)) {
      shouldInclude = true
      badge = 'Mandatory Booking Contract'
    } else if (CORE_REGIONAL_POLICY_IDS.has(seed.id)) {
      shouldInclude = true
      badge = `${cCode} Regional Policy`
    } else if (seed.id === 'doc-55-group-booking-lead-passenger-responsibility' && isGroupOrConvoy) {
      shouldInclude = true
      badge = `Group / Multi-Vehicle (${pax} Pax)`
    } else if (seed.id === 'doc-68-service-specific-addenda' && isShuttleOrMultiOrCrossBorder) {
      shouldInclude = true
      badge = isCrossBorder ? 'Cross-Border Addendum' : `${tripKey === 'shuttle' ? 'Shuttle' : 'Multi-Day'} Addendum`
    } else if (seed.id === 'doc-50-children-minors-unaccompanied-passengers' && hasChildOrYouth) {
      shouldInclude = true
      badge = 'Child / Youth Safety'
    } else if (seed.id === 'doc-51-accessibility-disability-special-needs' && hasAda) {
      shouldInclude = true
      badge = 'ADA Accessibility'
    } else if (seed.id === 'doc-56-passenger-information-privacy-notice' && hasThirdParty) {
      shouldInclude = true
      badge = 'Agency / Third-Party Notice'
    }

    evaluateDoc(
      {
        id: seed.id,
        docNumber: seed.docNumber,
        name: seed.name,
        description: seed.description,
        content: baseContent,
        version: 'v1.0',
        status: 'active',
        enforcementAction: seed.enforcementAction,
        lastUpdated: '2026-11-05',
      },
      { shouldIncludeByDefault: shouldInclude, badge }
    )
  }

  // Also append any custom SuperAdmin booking templates created specifically in DB
  let customIdx = 70
  for (const [customId, customRow] of Object.entries(customDbTemplates)) {
    evaluateDoc(
      {
        id: customId,
        docNumber: customIdx++,
        name: String(customRow.name || 'Regional Transport Addendum'),
        description: String(customRow.description || 'Mandatory regional legal requirement configured by SuperAdmin.'),
        content: String(customRow.content || ''),
        version: String(customRow.version || 'v1.0'),
        status: (customRow.status || 'active') as any,
        enforcementAction: String(customRow.enforcementAction || 'require_consent'),
        lastUpdated: String(customRow.lastUpdated || '2026-11-18'),
      },
      { shouldIncludeByDefault: true, badge: `${cCode} SuperAdmin Rule` }
    )
  }

  // Sort: Transaction-binding contracts first, then conditional trip addenda, then standing regional policies
  requiredDocs.sort((a, b) => {
    if (a.alwaysFreshPerBooking !== b.alwaysFreshPerBooking) {
      return a.alwaysFreshPerBooking ? -1 : 1
    }
    if (a.previouslyAcceptedVersion !== b.previouslyAcceptedVersion) {
      return a.previouslyAcceptedVersion ? 1 : -1
    }
    return a.docNumber - b.docNumber
  })

  const rememberedCount = requiredDocs.filter((d) => d.previouslyAcceptedVersion).length

  return {
    scope: {
      countryCode: cCode,
      countryName: cName,
      regionName,
      regionCode,
      jurisdictionLabel,
      governingLawLabel,
    },
    requiredDocs,
    informationalDocs,
    summary: {
      totalRequired: requiredDocs.length,
      freshSignatureCount: requiredDocs.length - rememberedCount,
      rememberedPolicyCount: rememberedCount,
      isCrossBorder,
      isGroupOrConvoy,
    },
  }
}
