/**
 * Flag emoji from ISO 3166-1 alpha-2 (e.g. "IN" -> 🇮🇳).
 */
export function isoToFlagEmoji(iso) {
  const cc = String(iso || '')
    .trim()
    .toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

/** English country name (as in app) / geocoder aliases → ISO alpha-2 */
const NAME_TO_ISO = {
  afghanistan: 'AF',
  australia: 'AU',
  bangladesh: 'BD',
  belgium: 'BE',
  brazil: 'BR',
  canada: 'CA',
  china: 'CN',
  france: 'FR',
  germany: 'DE',
  india: 'IN',
  indonesia: 'ID',
  ireland: 'IE',
  italy: 'IT',
  japan: 'JP',
  kenya: 'KE',
  malaysia: 'MY',
  mexico: 'MX',
  nepal: 'NP',
  netherlands: 'NL',
  'new zealand': 'NZ',
  nigeria: 'NG',
  norway: 'NO',
  pakistan: 'PK',
  philippines: 'PH',
  poland: 'PL',
  portugal: 'PT',
  qatar: 'QA',
  russia: 'RU',
  'russian federation': 'RU',
  'saudi arabia': 'SA',
  singapore: 'SG',
  'south africa': 'ZA',
  'south korea': 'KR',
  korea: 'KR',
  'republic of korea': 'KR',
  spain: 'ES',
  'sri lanka': 'LK',
  sweden: 'SE',
  switzerland: 'CH',
  thailand: 'TH',
  'united arab emirates': 'AE',
  uae: 'AE',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  britain: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  us: 'US',
  vietnam: 'VN',
  'viet nam': 'VN',
};

/**
 * Flag emoji for a stored country name, or empty if unknown.
 */
export function flagEmojiFromCountryName(name) {
  const key = String(name || '')
    .trim()
    .toLowerCase();
  if (!key) return '';
  const iso = NAME_TO_ISO[key];
  if (!iso) return '';
  return isoToFlagEmoji(iso);
}
