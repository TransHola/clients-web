/**
 * Authoritative Trip & Quotation Schedule Resolver for TransHola Client Portal
 * Guarantees:
 * 1. Never returns "Date pending" when any valid date exists across booking_details or DB columns.
 * 2. Always formats times in 12-hour AM/PM notation (e.g. "8:30 AM", "2:17 PM").
 * 3. Parses calendar dates without UTC timezone off-by-one shifts.
 * 4. Computes exact Estimated Finish ("Est. Finish") timing for One-Way transfers
 *    (and fallback Round-Trip / Shuttle / Multi-Day schedules when explicit endTime is absent).
 */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function normalizeDateIso(raw?: any): string {
  if (!raw) return ''
  const s = String(raw).trim()
  if (!s || /^(date pending|tbd|n\/a|invalid|null|undefined)$/i.test(s)) return ''

  // Match leading YYYY-MM-DD (handles "2026-11-19", "2026-11-19T08:30:00Z", "2026-11-19 08:30:00+00")
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return ''
}

export function normalizeTime24(raw?: any): string {
  if (!raw) return ''
  const s = String(raw).trim()
  if (!s || /^(date pending|tbd|n\/a|scheduled|flexible|null|undefined)$/i.test(s)) return ''

  // 12-hour AM/PM e.g. "8:30 AM", "08:30 pm", "12:15:00 PM"
  const ampmMatch = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10)
    const m = parseInt(ampmMatch[2], 10)
    const mer = ampmMatch[3].toUpperCase()
    if (mer === 'PM' && h < 12) h += 12
    if (mer === 'AM' && h === 12) h = 0
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  // Plain 24-hour e.g. "08:30", "8:30", "14:45:00"
  const h24Match = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (h24Match) {
    const h = parseInt(h24Match[1], 10)
    const m = parseInt(h24Match[2], 10)
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  // Full timestamp e.g. "2026-11-19 08:30:00+00" or "2026-11-19T08:30:00.000Z"
  // Extract literal clock component before timezone offset so trip-local wall time is preserved
  const tsMatch = s.match(/[T\s](\d{2}):(\d{2})(?::\d{2})?/)
  if (tsMatch) {
    const h = parseInt(tsMatch[1], 10)
    const m = parseInt(tsMatch[2], 10)
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  return ''
}

export function formatTimeAmPm(raw?: any): string {
  const t24 = normalizeTime24(raw)
  if (!t24) return ''
  const [hStr, mStr] = t24.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function formatDateHuman(
  rawDate?: any,
  opts?: { includeWeekday?: boolean; includeYear?: boolean }
): string {
  const iso = normalizeDateIso(rawDate)
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso

  const localCal = new Date(y, m - 1, d, 12, 0, 0)
  const mon = MONTH_SHORT[m - 1] || ''
  const wk = opts?.includeWeekday ? `${WEEKDAY_SHORT[localCal.getDay()]}, ` : ''
  const yr = opts?.includeYear === false ? '' : `, ${y}`
  return `${wk}${mon} ${d}${yr}`
}

export function addSecondsToSchedule(
  dateIso: string,
  time24: string,
  addSeconds: number
): { dateIso: string; time24: string; dayOffset: number } {
  const cleanDate = normalizeDateIso(dateIso)
  const cleanTime = normalizeTime24(time24) || '09:00'
  if (!cleanDate) {
    return { dateIso: '', time24: cleanTime, dayOffset: 0 }
  }

  const [y, m, d] = cleanDate.split('-').map(Number)
  const [hh, mm] = cleanTime.split(':').map(Number)
  const startMidnightMs = new Date(y, m - 1, d, 0, 0, 0).getTime()
  const target = new Date(y, m - 1, d, hh || 0, mm || 0, 0)
  target.setSeconds(target.getSeconds() + Math.max(0, Math.round(addSeconds || 0)))

  const fy = target.getFullYear()
  const fm = String(target.getMonth() + 1).padStart(2, '0')
  const fd = String(target.getDate()).padStart(2, '0')
  const fh = String(target.getHours()).padStart(2, '0')
  const fmin = String(target.getMinutes()).padStart(2, '0')
  const targetMidnightMs = new Date(fy, target.getMonth(), target.getDate(), 0, 0, 0).getTime()
  const dayOffset = Math.max(0, Math.round((targetMidnightMs - startMidnightMs) / 86400000))

  return {
    dateIso: `${fy}-${fm}-${fd}`,
    time24: `${fh}:${fmin}`,
    dayOffset,
  }
}

export interface ResolvedTripSchedule {
  hasDate: boolean
  dateIso: string
  displayDate: string
  displayDateShort: string
  displayDateWithWeekday: string
  startTime24: string
  startTimeAmPm: string
  finishDateIso: string
  finishTime24: string
  finishTimeAmPm: string
  finishDayOffset: number
  isEstimatedFinish: boolean
  isOneWay: boolean
  finishLabel: string
  finishBadgeText: string
  timeSummaryText: string
  startLocalIso: string
  endLocalIso: string
}

export function resolveTripSchedule(
  detailsRaw?: any,
  dbRow?: any,
  dayIdx: number = 0
): ResolvedTripSchedule {
  const details = detailsRaw || dbRow?.booking_details || dbRow?.quotation_details || {}
  const mds = Array.isArray(details.multiDayStore) ? details.multiDayStore : []
  const dayEntry = mds[dayIdx] || mds[0] || null

  const tripTypeKey = String(details.tripType || dbRow?.trip_type || 'one-way')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
  const isOneWay = tripTypeKey === 'one-way' || tripTypeKey === 'oneway'
  const isMultiDay = tripTypeKey === 'multi-day' && mds.length > 1

  // 1. Resolve Start Date (exhaustive multi-source fallback)
  const dateCandidates = isMultiDay
    ? [
        mds[dayIdx]?.dateStr,
        details.startDate,
        details.date,
        details.pickupDate,
        dbRow?.start_date,
        dbRow?.scheduled_at,
        dbRow?.pickup_date,
      ]
    : [
        details.startDate,
        details.date,
        details.pickupDate,
        dayEntry?.dateStr,
        dbRow?.start_date,
        dbRow?.scheduled_at,
        dbRow?.pickup_date,
      ]

  let dateIso = ''
  for (const cand of dateCandidates) {
    const norm = normalizeDateIso(cand)
    if (norm) {
      dateIso = norm
      break
    }
  }

  // 2. Resolve Start Time (exhaustive multi-source fallback, always formatted AM/PM)
  const timeCandidates = isMultiDay
    ? [
        mds[dayIdx]?.startTime,
        details.startTime,
        details.time,
        details.pickupTime,
        dbRow?.scheduled_at,
        dbRow?.pickup_date,
      ]
    : [
        details.startTime,
        details.time,
        details.pickupTime,
        dayEntry?.startTime,
        dbRow?.scheduled_at,
        dbRow?.pickup_date,
      ]

  let startTime24 = ''
  for (const cand of timeCandidates) {
    const norm = normalizeTime24(cand)
    if (norm) {
      startTime24 = norm
      break
    }
  }

  const hasDate = Boolean(dateIso)
  const displayDate = hasDate ? formatDateHuman(dateIso) : 'Date pending'
  const displayDateShort = hasDate ? formatDateHuman(dateIso, { includeYear: false }) : 'Date pending'
  const displayDateWithWeekday = hasDate ? formatDateHuman(dateIso, { includeWeekday: true }) : 'Date pending'
  const startTimeAmPm = formatTimeAmPm(startTime24)

  // 3. Resolve End Time or Estimated Finish ("Est. Finish") Timing
  const activeStops = Array.isArray(isMultiDay ? mds[dayIdx]?.stops : details.stops)
    ? (isMultiDay ? mds[dayIdx]?.stops : details.stops)
    : []
  const activeRouteLegs = Array.isArray(isMultiDay ? mds[dayIdx]?.routeLegs : details.routeLegs)
    ? (isMultiDay ? mds[dayIdx]?.routeLegs : details.routeLegs)
    : []
  const pickupWaitMin = Number(
    (isMultiDay ? mds[dayIdx]?.pickupWaitMin : details.pickupWaitMin) ??
      details.pickupWaitMin ??
      0
  )
  const dropoffWaitMin = isOneWay
    ? 0
    : Number(
        (isMultiDay ? mds[dayIdx]?.dropoffWaitMin : details.dropoffWaitMin) ??
          details.dropoffWaitMin ??
          0
      )

  let finishDateIso = ''
  let finishTime24 = ''
  let finishDayOffset = 0
  let isEstimatedFinish = isOneWay

  const explicitEndTime = normalizeTime24(
    isMultiDay ? mds[dayIdx]?.endTime : details.endTime || dayEntry?.endTime
  )
  const explicitEndDate =
    normalizeDateIso(isMultiDay ? mds[dayIdx]?.dateStr : details.endDate) || dateIso

  if (!isOneWay && explicitEndTime && dateIso) {
    isEstimatedFinish = false
    finishTime24 = explicitEndTime
    finishDateIso = explicitEndDate || dateIso
    if (finishDateIso === dateIso && finishTime24 < (startTime24 || '00:00')) {
      const next = addSecondsToSchedule(dateIso, '00:00', 86400)
      finishDateIso = next.dateIso
      finishDayOffset = 1
    } else if (finishDateIso && dateIso && finishDateIso !== dateIso) {
      const [sy, sm, sd] = dateIso.split('-').map(Number)
      const [ey, em, ed] = finishDateIso.split('-').map(Number)
      finishDayOffset = Math.max(
        0,
        Math.round(
          (new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000
        )
      )
    }
  } else if (dateIso && startTime24) {
    // One-Way (or Round-Trip / Multi-Day without saved explicit endTime): compute exact Est. Finish
    isEstimatedFinish = true
    const savedEstTime = normalizeTime24(details.estFinishTime)
    const savedEstDate = normalizeDateIso(details.estFinishDate) || dateIso

    // Compute physical route + boarding + intermediate stop duration (matches booking-panel getLegEtaInfo 100%)
    let driveSeconds = 0
    if (activeRouteLegs.length > 0) {
      driveSeconds = activeRouteLegs.reduce(
        (sum: number, leg: any) => sum + (Number(leg?.duration) || 0),
        0
      )
    } else {
      const rawDur = Number(
        (isMultiDay ? mds[dayIdx]?.routeDuration : undefined) ??
          details.routeDuration ??
          details.duration ??
          0
      )
      if (rawDur > 60) {
        driveSeconds = rawDur
      } else if (rawDur > 0) {
        driveSeconds = rawDur * 3600
      } else {
        const distKm = Number(details.distance || details.routeDistanceKm || 0)
        if (distKm > 0) driveSeconds = Math.round((distKm / 65) * 3600)
      }
    }

    const stopWaitSeconds = activeStops.reduce(
      (sum: number, st: any) => sum + (Number(st?.stopDurationMin) || 0) * 60,
      0
    )
    const waitSeconds = Math.max(0, pickupWaitMin) * 60 + stopWaitSeconds + Math.max(0, dropoffWaitMin) * 60

    if (driveSeconds > 0 || waitSeconds > 0) {
      let totalTripSeconds = Math.ceil((driveSeconds + waitSeconds) * 1.15)
      if (tripTypeKey === 'roundtrip' && activeRouteLegs.length === 0 && driveSeconds > 0) {
        // Legacy roundtrip where only one-way drive duration was stored
        totalTripSeconds = Math.ceil(driveSeconds * 1.15) + waitSeconds
      }
      const computed = addSecondsToSchedule(dateIso, startTime24, totalTripSeconds)
      finishDateIso = computed.dateIso
      finishTime24 = computed.time24
      finishDayOffset = computed.dayOffset
    } else if (savedEstTime) {
      finishDateIso = savedEstDate
      finishTime24 = savedEstTime
      if (finishDateIso && dateIso && finishDateIso !== dateIso) {
        const [sy, sm, sd] = dateIso.split('-').map(Number)
        const [ey, em, ed] = finishDateIso.split('-').map(Number)
        finishDayOffset = Math.max(
          0,
          Math.round(
            (new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000
          )
        )
      }
    } else {
      const savedAtaTime = normalizeTime24(details.ataTime)
      if (savedAtaTime) {
        finishDateIso = normalizeDateIso(details.ataDate) || dateIso
        finishTime24 = savedAtaTime
      }
    }
  }

  const rawFinishAmPm = formatTimeAmPm(finishTime24)
  const dayOffsetSuffix =
    finishDayOffset === 1 ? ' (+1d)' : finishDayOffset > 1 ? ` (+${finishDayOffset}d)` : ''
  const finishTimeAmPm = rawFinishAmPm ? `${rawFinishAmPm}${dayOffsetSuffix}` : ''
  const finishLabel = isEstimatedFinish ? 'Est. Finish' : 'End'
  const finishBadgeText = finishTimeAmPm ? `${finishLabel} ${finishTimeAmPm}` : ''

  let timeSummaryText = startTimeAmPm
  if (startTimeAmPm && finishTimeAmPm) {
    timeSummaryText = isEstimatedFinish
      ? `${startTimeAmPm} · Est. Finish ${finishTimeAmPm}`
      : `${startTimeAmPm} – ${finishTimeAmPm}`
  }

  const startLocalIso =
    dateIso && startTime24
      ? `${dateIso}T${startTime24}:00`
      : dateIso
        ? `${dateIso}T09:00:00`
        : ''
  const endLocalIso =
    finishDateIso && finishTime24
      ? `${finishDateIso}T${finishTime24}:00`
      : startLocalIso

  return {
    hasDate,
    dateIso,
    displayDate,
    displayDateShort,
    displayDateWithWeekday,
    startTime24,
    startTimeAmPm,
    finishDateIso,
    finishTime24,
    finishTimeAmPm,
    finishDayOffset,
    isEstimatedFinish,
    isOneWay,
    finishLabel,
    finishBadgeText,
    timeSummaryText,
    startLocalIso,
    endLocalIso,
  }
}

export function computeWaypointTimings(detailsRaw?: any, dbRow?: any, dayIdx: number = 0) {
  const details = detailsRaw || dbRow?.booking_details || dbRow?.quotation_details || {}
  const sched = resolveTripSchedule(details, dbRow, dayIdx)
  const mds = Array.isArray(details.multiDayStore) ? details.multiDayStore : []
  const isMultiDay =
    String(details.tripType || '').toLowerCase() === 'multi-day' && mds.length > 1

  const effStops = Array.isArray(isMultiDay ? mds[dayIdx]?.stops : details.stops)
    ? (isMultiDay ? mds[dayIdx]?.stops : details.stops)
    : []
  const effLegs = Array.isArray(isMultiDay ? mds[dayIdx]?.routeLegs : details.routeLegs)
    ? (isMultiDay ? mds[dayIdx]?.routeLegs : details.routeLegs)
    : []
  const pickupWaitMin = Math.max(
    0,
    Number((isMultiDay ? mds[dayIdx]?.pickupWaitMin : details.pickupWaitMin) ?? 0)
  )

  const pickupArriveAmPm = sched.startTimeAmPm
  const pickupDepartObj =
    sched.dateIso && sched.startTime24 && pickupWaitMin > 0
      ? addSecondsToSchedule(sched.dateIso, sched.startTime24, pickupWaitMin * 60)
      : null
  const pickupDepartAmPm = pickupDepartObj ? formatTimeAmPm(pickupDepartObj.time24) : ''

  const stopTimings: Array<{ arriveAmPm: string; departAmPm: string; waitMin: number }> = []
  if (sched.dateIso && sched.startTime24 && effLegs.length > 0) {
    let cumSec = pickupWaitMin * 60
    for (let i = 0; i < effStops.length; i++) {
      cumSec += Number(effLegs[i]?.duration || 0)
      const smartArrSec = Math.ceil(cumSec * 1.15)
      const arrObj = addSecondsToSchedule(sched.dateIso, sched.startTime24, smartArrSec)
      const waitMin = Math.max(0, Number(effStops[i]?.stopDurationMin || 0))
      const depObj =
        waitMin > 0
          ? addSecondsToSchedule(arrObj.dateIso, arrObj.time24, waitMin * 60)
          : arrObj
      stopTimings.push({
        arriveAmPm: formatTimeAmPm(arrObj.time24),
        departAmPm: waitMin > 0 ? formatTimeAmPm(depObj.time24) : '',
        waitMin,
      })
      cumSec += waitMin * 60
    }
  } else {
    for (let i = 0; i < effStops.length; i++) {
      stopTimings.push({
        arriveAmPm: '',
        departAmPm: '',
        waitMin: Math.max(0, Number(effStops[i]?.stopDurationMin || 0)),
      })
    }
  }

  return {
    schedule: sched,
    pickupWaitMin,
    pickupArriveAmPm,
    pickupDepartAmPm,
    stopTimings,
  }
}
