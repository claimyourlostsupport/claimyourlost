/** Build /search URL including browse country when scope is Country (Loss & Found). */
export function lossFoundSearchUrl(scope, country, query = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v != null && String(v).trim() !== '') p.set(k, String(v).trim());
  }
  if (scope === 'country' && String(country || '').trim()) {
    p.set('country', String(country).trim());
  }
  const s = p.toString();
  return s ? `/search?${s}` : '/search';
}
