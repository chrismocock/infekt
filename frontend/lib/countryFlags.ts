// Country code to flag emoji mapping
// Maps ISO country codes to flag emojis

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  CA: '🇨🇦',
  AU: '🇦🇺',
  DE: '🇩🇪',
  FR: '🇫🇷',
  IT: '🇮🇹',
  ES: '🇪🇸',
  NL: '🇳🇱',
  BE: '🇧🇪',
  CH: '🇨🇭',
  AT: '🇦🇹',
  SE: '🇸🇪',
  NO: '🇳🇴',
  DK: '🇩🇰',
  FI: '🇫🇮',
  PL: '🇵🇱',
  CZ: '🇨🇿',
  HU: '🇭🇺',
  RO: '🇷🇴',
  GR: '🇬🇷',
  PT: '🇵🇹',
  IE: '🇮🇪',
  IS: '🇮🇸',
  JP: '🇯🇵',
  CN: '🇨🇳',
  KR: '🇰🇷',
  IN: '🇮🇳',
  SG: '🇸🇬',
  MY: '🇲🇾',
  TH: '🇹🇭',
  ID: '🇮🇩',
  PH: '🇵🇭',
  VN: '🇻🇳',
  HK: '🇭🇰',
  TW: '🇹🇼',
  BR: '🇧🇷',
  AR: '🇦🇷',
  CL: '🇨🇱',
  CO: '🇨🇴',
  PE: '🇵🇪',
  MX: '🇲🇽',
  ZA: '🇿🇦',
  EG: '🇪🇬',
  NG: '🇳🇬',
  KE: '🇰🇪',
  AE: '🇦🇪',
  SA: '🇸🇦',
  IL: '🇮🇱',
  TR: '🇹🇷',
  RU: '🇷🇺',
  NZ: '🇳🇿',
};

/**
 * Get flag emoji for a country code
 * @param countryCode - ISO country code (e.g., 'US', 'GB')
 * @returns Flag emoji or empty string if not found
 */
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return '';
  const code = countryCode.toUpperCase();
  return COUNTRY_FLAGS[code] || '';
}

/**
 * Extract country code from countries array and return flag emoji
 * @param countries - Array of country codes
 * @returns Flag emoji or empty string
 */
export function getCountryFlagFromArray(countries: string[] | null | undefined): string {
  if (!countries || countries.length === 0) return '';
  return getCountryFlag(countries[0]);
}

