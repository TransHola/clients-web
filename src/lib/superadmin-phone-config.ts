export interface CountryPhoneRule {
  code: string
  name: string
  flag: string
  dialCode: string
  phoneRegex: string
  phonePlaceholder: string
  phoneFormatMask: string
  digitGroups: number[]
  maxLocalDigits: number
  stripTrunkZero: boolean
  isActiveMarket?: boolean
}

export const DEFAULT_COUNTRY_PHONE_RULES: CountryPhoneRule[] = [
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971', phoneRegex: '^5[0-9]{8}$', phonePlaceholder: '50 123 4567', phoneFormatMask: '5X XXX XXXX', digitGroups: [2, 3, 4], maxLocalDigits: 9, stripTrunkZero: true, isActiveMarket: true },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', phoneRegex: '^5[0-9]{8}$', phonePlaceholder: '50 123 4567', phoneFormatMask: '5X XXX XXXX', digitGroups: [2, 3, 4], maxLocalDigits: 9, stripTrunkZero: true, isActiveMarket: false },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34', phoneRegex: '^[6789][0-9]{8}$', phonePlaceholder: '612 345 678', phoneFormatMask: '6XX XXX XXX', digitGroups: [3, 3, 3], maxLocalDigits: 9, stripTrunkZero: false, isActiveMarket: true },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dialCode: '+212', phoneRegex: '^[567][0-9]{8}$', phonePlaceholder: '612 345 678', phoneFormatMask: '6XX XXX XXX', digitGroups: [3, 3, 3], maxLocalDigits: 9, stripTrunkZero: true, isActiveMarket: true },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', phoneRegex: '^[2-9][0-9]{9}$', phonePlaceholder: '202 555 0123', phoneFormatMask: 'XXX XXX XXXX', digitGroups: [3, 3, 4], maxLocalDigits: 10, stripTrunkZero: false, isActiveMarket: true },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974', phoneRegex: '^[3567][0-9]{7}$', phonePlaceholder: '5512 3456', phoneFormatMask: 'XXXX XXXX', digitGroups: [4, 4], maxLocalDigits: 8, stripTrunkZero: false },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965', phoneRegex: '^[569][0-9]{7}$', phonePlaceholder: '5001 2345', phoneFormatMask: 'XXXX XXXX', digitGroups: [4, 4], maxLocalDigits: 8, stripTrunkZero: false },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973', phoneRegex: '^3[0-9]{7}$', phonePlaceholder: '3600 1234', phoneFormatMask: 'XXXX XXXX', digitGroups: [4, 4], maxLocalDigits: 8, stripTrunkZero: false },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968', phoneRegex: '^[79][0-9]{7}$', phonePlaceholder: '9212 3456', phoneFormatMask: 'XXXX XXXX', digitGroups: [4, 4], maxLocalDigits: 8, stripTrunkZero: false },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', phoneRegex: '^7[0-9]{9}$', phonePlaceholder: '7700 900123', phoneFormatMask: '7XXX XXXXXX', digitGroups: [4, 6], maxLocalDigits: 10, stripTrunkZero: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33', phoneRegex: '^[67][0-9]{8}$', phonePlaceholder: '6 12 34 56 78', phoneFormatMask: '6 XX XX XX XX', digitGroups: [1, 2, 2, 2, 2], maxLocalDigits: 9, stripTrunkZero: true },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49', phoneRegex: '^1[567][0-9]{8,9}$', phonePlaceholder: '151 2345 6789', phoneFormatMask: '1XX XXXX XXXX', digitGroups: [3, 4, 4], maxLocalDigits: 11, stripTrunkZero: true },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39', phoneRegex: '^3[0-9]{8,9}$', phonePlaceholder: '312 345 6789', phoneFormatMask: '3XX XXX XXXX', digitGroups: [3, 3, 4], maxLocalDigits: 10, stripTrunkZero: false },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351', phoneRegex: '^9[0-9]{8}$', phonePlaceholder: '912 345 678', phoneFormatMask: '9XX XXX XXX', digitGroups: [3, 3, 3], maxLocalDigits: 9, stripTrunkZero: false },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dialCode: '+41', phoneRegex: '^7[0-9]{8}$', phonePlaceholder: '79 123 45 67', phoneFormatMask: '7X XXX XX XX', digitGroups: [2, 3, 2, 2], maxLocalDigits: 9, stripTrunkZero: true },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31', phoneRegex: '^6[0-9]{8}$', phonePlaceholder: '6 1234 5678', phoneFormatMask: '6 XXXX XXXX', digitGroups: [1, 4, 4], maxLocalDigits: 9, stripTrunkZero: true },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dialCode: '+32', phoneRegex: '^4[0-9]{8}$', phonePlaceholder: '470 12 34 56', phoneFormatMask: '4XX XX XX XX', digitGroups: [3, 2, 2, 2], maxLocalDigits: 9, stripTrunkZero: true },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dialCode: '+90', phoneRegex: '^5[0-9]{9}$', phonePlaceholder: '532 123 45 67', phoneFormatMask: '5XX XXX XX XX', digitGroups: [3, 3, 2, 2], maxLocalDigits: 10, stripTrunkZero: true },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20', phoneRegex: '^1[0125][0-9]{8}$', phonePlaceholder: '100 123 4567', phoneFormatMask: '1XX XXX XXXX', digitGroups: [3, 3, 4], maxLocalDigits: 10, stripTrunkZero: true },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dialCode: '+962', phoneRegex: '^7[789][0-9]{7}$', phonePlaceholder: '79 123 4567', phoneFormatMask: '7X XXX XXXX', digitGroups: [2, 3, 4], maxLocalDigits: 9, stripTrunkZero: true },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dialCode: '+961', phoneRegex: '^[378][0-9]{6,7}$', phonePlaceholder: '71 123 456', phoneFormatMask: 'XX XXX XXX', digitGroups: [2, 3, 3], maxLocalDigits: 8, stripTrunkZero: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', phoneRegex: '^[2-9][0-9]{9}$', phonePlaceholder: '416 555 0123', phoneFormatMask: 'XXX XXX XXXX', digitGroups: [3, 3, 4], maxLocalDigits: 10, stripTrunkZero: false },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', phoneRegex: '^[6789][0-9]{9}$', phonePlaceholder: '98765 43210', phoneFormatMask: 'XXXXX XXXXX', digitGroups: [5, 5], maxLocalDigits: 10, stripTrunkZero: true },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92', phoneRegex: '^3[0-9]{9}$', phonePlaceholder: '300 1234567', phoneFormatMask: '3XX XXXXXXX', digitGroups: [3, 7], maxLocalDigits: 10, stripTrunkZero: true },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', phoneRegex: '^[89][0-9]{7}$', phonePlaceholder: '8123 4567', phoneFormatMask: 'XXXX XXXX', digitGroups: [4, 4], maxLocalDigits: 8, stripTrunkZero: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', phoneRegex: '^4[0-9]{8}$', phonePlaceholder: '412 345 678', phoneFormatMask: '4XX XXX XXX', digitGroups: [3, 3, 3], maxLocalDigits: 9, stripTrunkZero: true },
]

export function getFlagEmojiFromIso(iso2: string): string {
  const clean = String(iso2 || '').trim().toUpperCase()
  if (clean.length !== 2) return '🌍'
  return String.fromCodePoint(...clean.split('').map((c) => 127397 + c.charCodeAt(0)))
}

export function deriveRuleFromSuperAdminRow(row: any): CountryPhoneRule | null {
  const code = String(row?.country_code || row?.code || '').trim().toUpperCase()
  if (!code || code === 'GLOBAL' || code.length !== 2) return null

  const cfg = row?.config && typeof row.config === 'object' ? row.config : {}
  const base = DEFAULT_COUNTRY_PHONE_RULES.find((r) => r.code === code)

  let dialCode = String(cfg.phoneCode || base?.dialCode || '+1').trim()
  if (!dialCode.startsWith('+')) dialCode = `+${dialCode.replace(/\D/g, '')}`

  // Inspect regional mobile formats if configured in SuperAdmin Regions tab
  let regionMobileFormat = ''
  let regionMobileCode = ''
  if (Array.isArray(cfg.regions)) {
    for (const reg of cfg.regions) {
      const mFmt = Array.isArray(reg?.phoneFormats)
        ? reg.phoneFormats.find((pf: any) => pf?.type === 'mobile' && (pf?.format || pf?.code))
        : null
      if (mFmt) {
        regionMobileFormat = String(mFmt.format || '')
        regionMobileCode = String(mFmt.code || '')
        break
      }
    }
  }

  let digitGroups = Array.isArray(cfg.digitGroups) ? cfg.digitGroups : base?.digitGroups || [3, 3, 4]
  let phoneFormatMask = String(cfg.phoneFormatMask || base?.phoneFormatMask || 'XXX XXX XXXX')
  if (!cfg.phoneFormatMask && !base && regionMobileFormat) {
    const firstCode = regionMobileCode.split('/')[0].trim()
    const cleanPrefix = firstCode.replace(/^0/, '').replace(/\*/g, 'X')
    const maskParts = `${cleanPrefix} ${regionMobileFormat.replace(/[*x#]/gi, 'X')}`.trim().split(/[\s-]+/).filter(Boolean)
    if (maskParts.length >= 2) {
      digitGroups = maskParts.map((p) => p.length)
      phoneFormatMask = maskParts.join(' ')
    }
  }

  const phoneRegex = String(cfg.phoneRegex || base?.phoneRegex || '^[0-9]{7,12}$')
  const maxLocalDigits =
    Number(cfg.maxLocalDigits) ||
    base?.maxLocalDigits ||
    Math.max(8, digitGroups.reduce((a: number, b: number) => a + b, 0))

  return {
    code,
    name: String(row?.country_name || cfg.name || base?.name || code),
    flag: String(cfg.flag || base?.flag || getFlagEmojiFromIso(code)),
    dialCode,
    phoneRegex,
    phonePlaceholder: String(cfg.phonePlaceholder || base?.phonePlaceholder || '50 123 4567'),
    phoneFormatMask,
    digitGroups,
    maxLocalDigits,
    stripTrunkZero: typeof cfg.stripTrunkZero === 'boolean' ? cfg.stripTrunkZero : (base?.stripTrunkZero ?? true),
    isActiveMarket: Boolean(row?.is_active ?? cfg.is_active ?? cfg.isActive ?? base?.isActiveMarket),
  }
}

export function mergeSuperAdminCountryRules(rows: any[]): CountryPhoneRule[] {
  const byCode = new Map<string, CountryPhoneRule>()
  for (const preset of DEFAULT_COUNTRY_PHONE_RULES) {
    byCode.set(preset.code, { ...preset })
  }
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const derived = deriveRuleFromSuperAdminRow(row)
      if (derived) {
        byCode.set(derived.code, derived)
      }
    }
  }
  return Array.from(byCode.values()).sort((a, b) => {
    if (Boolean(a.isActiveMarket) !== Boolean(b.isActiveMarket)) {
      return a.isActiveMarket ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}

/**
 * Normalizes any user typing or paste into clean local national digits
 * (strips duplicate +countryCode, 00countryCode, and local trunk '0' when configured),
 * and formats spacing according to SuperAdmin's digitGroups.
 */
export function normalizeAndFormatLocalPhone(
  rawInput: string,
  rule: CountryPhoneRule
): { localDigits: string; formattedLocal: string; e164: string } {
  const dialDigits = rule.dialCode.replace(/\D/g, '')
  let cleaned = String(rawInput || '').trim()

  const hadIntlPrefix = cleaned.startsWith('+') || cleaned.startsWith('00')
  let digits = cleaned.replace(/\D/g, '')

  if (cleaned.startsWith('00')) {
    digits = digits.slice(2)
  }

  // Strip country dial code if user pasted +971507771234 or typed 971507771234 exceeding local length
  if (dialDigits && digits.startsWith(dialDigits)) {
    if (hadIntlPrefix || digits.length > rule.maxLocalDigits) {
      digits = digits.slice(dialDigits.length)
    }
  }

  // Strip leading trunk '0' (e.g. UAE 0507771234 -> 507771234, Morocco 0612... -> 612..., UK 077... -> 77...)
  if (rule.stripTrunkZero) {
    while (digits.startsWith('0')) {
      digits = digits.slice(1)
    }
  }

  digits = digits.slice(0, rule.maxLocalDigits)

  // Format into SuperAdmin digit groups (e.g. [2, 3, 4] -> "50 777 1234")
  const groups: string[] = []
  let cursor = 0
  for (let i = 0; i < rule.digitGroups.length && cursor < digits.length; i++) {
    const size = rule.digitGroups[i]
    if (i === rule.digitGroups.length - 1) {
      groups.push(digits.slice(cursor))
      cursor = digits.length
    } else {
      groups.push(digits.slice(cursor, cursor + size))
      cursor += size
    }
  }
  if (cursor < digits.length) {
    groups.push(digits.slice(cursor))
  }

  const formattedLocal = groups.filter(Boolean).join(' ')
  const e164 = digits.length > 0 ? `${rule.dialCode}${digits}` : ''

  return { localDigits: digits, formattedLocal, e164 }
}

export function validatePhoneAgainstSuperAdminRule(
  localDigits: string,
  rule: CountryPhoneRule
): { valid: boolean; message?: string } {
  if (!localDigits) {
    return { valid: false, message: `Mobile number is required (${rule.dialCode} ${rule.phoneFormatMask}).` }
  }
  try {
    const reg = new RegExp(rule.phoneRegex)
    if (!reg.test(localDigits)) {
      return {
        valid: false,
        message: `Enter a valid ${rule.name} mobile number matching ${rule.dialCode} ${rule.phoneFormatMask} (e.g. ${rule.dialCode} ${rule.phonePlaceholder}).`,
      }
    }
    return { valid: true }
  } catch {
    const ok = localDigits.length >= 7 && localDigits.length <= 14
    return ok
      ? { valid: true }
      : { valid: false, message: `Enter a valid mobile number (${rule.dialCode} ${rule.phonePlaceholder}).` }
  }
}

