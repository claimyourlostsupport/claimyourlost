import { PHONE_DIAL_CODES } from './phoneDialCodes.js';

/**
 * Baseline country names for dropdowns (merged with /items/countries).
 * Kept in sync with login dial list names. Deduped case-insensitively in mergeCountryOptions.
 */
export const COMMON_COUNTRIES = [...new Set(PHONE_DIAL_CODES.map((c) => c.name))].sort((a, b) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' })
);

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
