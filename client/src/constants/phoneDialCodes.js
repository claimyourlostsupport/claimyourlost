/**
 * Country / territory dial codes for login (E.164 without leading + in `dial`).
 * `name` should match browse / listing country names where possible.
 */
export const PHONE_DIAL_CODES = [
  { name: 'Afghanistan', dial: '93' },
  { name: 'Algeria', dial: '213' },
  { name: 'Angola', dial: '244' },
  { name: 'Argentina', dial: '54' },
  { name: 'Armenia', dial: '374' },
  { name: 'Australia', dial: '61' },
  { name: 'Austria', dial: '43' },
  { name: 'Azerbaijan', dial: '994' },
  { name: 'Bahrain', dial: '973' },
  { name: 'Bangladesh', dial: '880' },
  { name: 'Belarus', dial: '375' },
  { name: 'Belgium', dial: '32' },
  { name: 'Bhutan', dial: '975' },
  { name: 'Bolivia', dial: '591' },
  { name: 'Botswana', dial: '267' },
  { name: 'Brazil', dial: '55' },
  { name: 'Brunei', dial: '673' },
  { name: 'Bulgaria', dial: '359' },
  { name: 'Cambodia', dial: '855' },
  { name: 'Cameroon', dial: '237' },
  { name: 'Canada', dial: '1' },
  { name: 'Chile', dial: '56' },
  { name: 'China', dial: '86' },
  { name: 'Colombia', dial: '57' },
  { name: 'Costa Rica', dial: '506' },
  { name: 'Croatia', dial: '385' },
  { name: 'Cyprus', dial: '357' },
  { name: 'Czech Republic', dial: '420' },
  { name: 'Denmark', dial: '45' },
  { name: 'Dominican Republic', dial: '1' },
  { name: 'Ecuador', dial: '593' },
  { name: 'Egypt', dial: '20' },
  { name: 'Estonia', dial: '372' },
  { name: 'Ethiopia', dial: '251' },
  { name: 'Finland', dial: '358' },
  { name: 'France', dial: '33' },
  { name: 'Georgia', dial: '995' },
  { name: 'Germany', dial: '49' },
  { name: 'Ghana', dial: '233' },
  { name: 'Greece', dial: '30' },
  { name: 'Guatemala', dial: '502' },
  { name: 'Honduras', dial: '504' },
  { name: 'Hong Kong', dial: '852' },
  { name: 'Hungary', dial: '36' },
  { name: 'Iceland', dial: '354' },
  { name: 'India', dial: '91' },
  { name: 'Indonesia', dial: '62' },
  { name: 'Iran', dial: '98' },
  { name: 'Iraq', dial: '964' },
  { name: 'Ireland', dial: '353' },
  { name: 'Israel', dial: '972' },
  { name: 'Italy', dial: '39' },
  { name: 'Ivory Coast', dial: '225' },
  { name: 'Jamaica', dial: '1' },
  { name: 'Japan', dial: '81' },
  { name: 'Jordan', dial: '962' },
  { name: 'Kazakhstan', dial: '7' },
  { name: 'Kenya', dial: '254' },
  { name: 'Kuwait', dial: '965' },
  { name: 'Kyrgyzstan', dial: '996' },
  { name: 'Laos', dial: '856' },
  { name: 'Latvia', dial: '371' },
  { name: 'Lebanon', dial: '961' },
  { name: 'Libya', dial: '218' },
  { name: 'Lithuania', dial: '370' },
  { name: 'Luxembourg', dial: '352' },
  { name: 'Macau', dial: '853' },
  { name: 'Malaysia', dial: '60' },
  { name: 'Maldives', dial: '960' },
  { name: 'Malta', dial: '356' },
  { name: 'Mauritius', dial: '230' },
  { name: 'Mexico', dial: '52' },
  { name: 'Moldova', dial: '373' },
  { name: 'Mongolia', dial: '976' },
  { name: 'Morocco', dial: '212' },
  { name: 'Mozambique', dial: '258' },
  { name: 'Myanmar', dial: '95' },
  { name: 'Namibia', dial: '264' },
  { name: 'Nepal', dial: '977' },
  { name: 'Netherlands', dial: '31' },
  { name: 'New Zealand', dial: '64' },
  { name: 'Nicaragua', dial: '505' },
  { name: 'Nigeria', dial: '234' },
  { name: 'Norway', dial: '47' },
  { name: 'Oman', dial: '968' },
  { name: 'Pakistan', dial: '92' },
  { name: 'Palestine', dial: '970' },
  { name: 'Panama', dial: '507' },
  { name: 'Paraguay', dial: '595' },
  { name: 'Peru', dial: '51' },
  { name: 'Philippines', dial: '63' },
  { name: 'Poland', dial: '48' },
  { name: 'Portugal', dial: '351' },
  { name: 'Qatar', dial: '974' },
  { name: 'Romania', dial: '40' },
  { name: 'Russia', dial: '7' },
  { name: 'Rwanda', dial: '250' },
  { name: 'Saudi Arabia', dial: '966' },
  { name: 'Senegal', dial: '221' },
  { name: 'Serbia', dial: '381' },
  { name: 'Singapore', dial: '65' },
  { name: 'Slovakia', dial: '421' },
  { name: 'Slovenia', dial: '386' },
  { name: 'South Africa', dial: '27' },
  { name: 'South Korea', dial: '82' },
  { name: 'Spain', dial: '34' },
  { name: 'Sri Lanka', dial: '94' },
  { name: 'Sudan', dial: '249' },
  { name: 'Sweden', dial: '46' },
  { name: 'Switzerland', dial: '41' },
  { name: 'Taiwan', dial: '886' },
  { name: 'Tajikistan', dial: '992' },
  { name: 'Tanzania', dial: '255' },
  { name: 'Thailand', dial: '66' },
  { name: 'Trinidad and Tobago', dial: '1' },
  { name: 'Tunisia', dial: '216' },
  { name: 'Turkey', dial: '90' },
  { name: 'Turkmenistan', dial: '993' },
  { name: 'Uganda', dial: '256' },
  { name: 'Ukraine', dial: '380' },
  { name: 'United Arab Emirates', dial: '971' },
  { name: 'United Kingdom', dial: '44' },
  { name: 'United States', dial: '1' },
  { name: 'Uruguay', dial: '598' },
  { name: 'Uzbekistan', dial: '998' },
  { name: 'Venezuela', dial: '58' },
  { name: 'Vietnam', dial: '84' },
  { name: 'Yemen', dial: '967' },
  { name: 'Zambia', dial: '260' },
  { name: 'Zimbabwe', dial: '263' },
];

const DIAL_KEY_SEP = '::';

export const DEFAULT_DIAL_CODE = '91';

/** Stable select value: disambiguates shared ISD codes (e.g. US/Canada/Jamaica all +1). */
export function dialOptionValue(c) {
  return `${c.dial}${DIAL_KEY_SEP}${c.name}`;
}

export function parseDialSelectionKey(key) {
  const s = String(key || '');
  const i = s.indexOf(DIAL_KEY_SEP);
  if (i <= 0) return null;
  const dial = s.slice(0, i).replace(/\D/g, '');
  const countryName = s.slice(i + DIAL_KEY_SEP.length).trim();
  if (!dial || !countryName) return null;
  return { dial, countryName };
}

export function isValidDialSelectionKey(key) {
  const p = parseDialSelectionKey(key);
  if (!p) return false;
  return PHONE_DIAL_CODES.some((c) => c.dial === p.dial && c.name === p.countryName);
}

/** Session may store legacy digits-only dial or new `dial::Country Name`. */
export function migrateLegacyDialStorage(saved) {
  if (!saved) return dialOptionValue({ dial: DEFAULT_DIAL_CODE, name: 'India' });
  if (isValidDialSelectionKey(saved)) return saved;
  const digits = String(saved).replace(/\D/g, '');
  if (/^\d{1,4}$/.test(digits)) {
    const hit = PHONE_DIAL_CODES.find((c) => c.dial === digits);
    if (hit) return dialOptionValue(hit);
  }
  return dialOptionValue({ dial: DEFAULT_DIAL_CODE, name: 'India' });
}

/** India first, then others A–Z by country name. */
export function getDialOptionsForSelect() {
  const india = PHONE_DIAL_CODES.filter((c) => c.dial === DEFAULT_DIAL_CODE);
  const rest = PHONE_DIAL_CODES.filter((c) => c.dial !== DEFAULT_DIAL_CODE).sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
  return [...india, ...rest];
}

/** Build E.164-style value for the API: +{dial}{nationalDigits} */
export function buildFullPhone(dial, nationalDigits) {
  const d = String(dial || '').replace(/\D/g, '');
  let n = String(nationalDigits || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = n.replace(/^0+/, '');
  if (!d || !n) return '';
  return `+${d}${n}`;
}
