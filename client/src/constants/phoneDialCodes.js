/**
 * Country / territory dial codes for login (E.164 without leading + in `dial`).
 * Extend this list as needed; keep `dial` as digits only (no +).
 */
export const PHONE_DIAL_CODES = [
  { name: 'Afghanistan', dial: '93' },
  { name: 'Argentina', dial: '54' },
  { name: 'Australia', dial: '61' },
  { name: 'Bahrain', dial: '973' },
  { name: 'Bangladesh', dial: '880' },
  { name: 'Belgium', dial: '32' },
  { name: 'Brazil', dial: '55' },
  { name: 'Canada', dial: '1' },
  { name: 'Chile', dial: '56' },
  { name: 'China', dial: '86' },
  { name: 'Colombia', dial: '57' },
  { name: 'Egypt', dial: '20' },
  { name: 'France', dial: '33' },
  { name: 'Germany', dial: '49' },
  { name: 'Ghana', dial: '233' },
  { name: 'Greece', dial: '30' },
  { name: 'India', dial: '91' },
  { name: 'Indonesia', dial: '62' },
  { name: 'Iran', dial: '98' },
  { name: 'Iraq', dial: '964' },
  { name: 'Ireland', dial: '353' },
  { name: 'Israel', dial: '972' },
  { name: 'Italy', dial: '39' },
  { name: 'Japan', dial: '81' },
  { name: 'Kenya', dial: '254' },
  { name: 'Kuwait', dial: '965' },
  { name: 'Malaysia', dial: '60' },
  { name: 'Mexico', dial: '52' },
  { name: 'Nepal', dial: '977' },
  { name: 'Netherlands', dial: '31' },
  { name: 'New Zealand', dial: '64' },
  { name: 'Nigeria', dial: '234' },
  { name: 'Norway', dial: '47' },
  { name: 'Oman', dial: '968' },
  { name: 'Pakistan', dial: '92' },
  { name: 'Peru', dial: '51' },
  { name: 'Philippines', dial: '63' },
  { name: 'Poland', dial: '48' },
  { name: 'Portugal', dial: '351' },
  { name: 'Qatar', dial: '974' },
  { name: 'Russia', dial: '7' },
  { name: 'Saudi Arabia', dial: '966' },
  { name: 'Singapore', dial: '65' },
  { name: 'South Africa', dial: '27' },
  { name: 'South Korea', dial: '82' },
  { name: 'Spain', dial: '34' },
  { name: 'Sri Lanka', dial: '94' },
  { name: 'Sweden', dial: '46' },
  { name: 'Switzerland', dial: '41' },
  { name: 'Thailand', dial: '66' },
  { name: 'Turkey', dial: '90' },
  { name: 'United Arab Emirates', dial: '971' },
  { name: 'United Kingdom', dial: '44' },
  { name: 'United States', dial: '1' },
  { name: 'Vietnam', dial: '84' },
];

export const DEFAULT_DIAL_CODE = '91';

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
