/** City/area is stored in `location`; country is separate. */
export function formatCityCountry(item) {
  const city = item?.location?.trim?.() || '';
  const country = item?.country?.trim?.() || '';
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return '';
}

export function formatCityCountryOrPlaceholder(item, placeholder = 'Location not set') {
  const s = formatCityCountry(item);
  return s || placeholder;
}
