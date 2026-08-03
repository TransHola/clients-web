import { AsYouType, CountryCode, parsePhoneNumber } from 'libphonenumber-js';

const COUNTRY_MAP: Record<string, CountryCode> = {
  "Spain": "ES",
  "United States": "US",
  "United Kingdom": "GB",
  "France": "FR",
  "Germany": "DE",
  "Italy": "IT",
  "Portugal": "PT",
  "Morocco": "MA",
  "Australia": "AU",
  "Canada": "CA"
};

/**
 * Formats a phone number string dynamically.
 * @param value The current string value of the input or database.
 * @param defaultCountry The default country code (e.g. 'ES', 'US') or full name ('Spain')
 * @returns The formatted phone number string, including the international dial code.
 */
export const formatPhone = (value: string, defaultCountry: any = 'US'): string => {
  if (!value) return '';

  let cleaned = value.replace(/[^\d+]/g, '');

  let isoCode = defaultCountry as string;
  if (isoCode && isoCode.length > 2) {
    isoCode = COUNTRY_MAP[isoCode] || 'US';
  }

  try {
    const phoneNumber = parsePhoneNumber(cleaned, isoCode as CountryCode);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatInternational();
    }
  } catch(e) {
    // Fallback for partial numbers
  }

  const formatter = new AsYouType(isoCode as CountryCode);
  return formatter.input(cleaned);
};
