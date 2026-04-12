/**
 * Baseline country names for dropdowns (merged with /items/countries).
 * Deduped case-insensitively so "India" and "india" never appear twice.
 */
export const COMMON_COUNTRIES = [
  'Afghanistan',
  'Australia',
  'Bangladesh',
  'Belgium',
  'Brazil',
  'Canada',
  'China',
  'France',
  'Germany',
  'India',
  'Indonesia',
  'Ireland',
  'Italy',
  'Japan',
  'Kenya',
  'Malaysia',
  'Mexico',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Pakistan',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Russia',
  'Saudi Arabia',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sri Lanka',
  'Sweden',
  'Switzerland',
  'Thailand',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
];

export function mergeCountryOptions(apiCountries) {
  const byKey = new Map();
  for (const c of COMMON_COUNTRIES) {
    const t = String(c).trim();
    if (t) byKey.set(t.toLowerCase(), t);
  }
  for (const c of apiCountries || []) {
    const t = String(c ?? '').trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!byKey.has(k)) byKey.set(k, t);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}
