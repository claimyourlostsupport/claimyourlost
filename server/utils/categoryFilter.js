/**
 * Map UI "main category" slugs to DB values, including legacy category strings.
 */
export function categoryMongoFilter(cat) {
  if (!cat || cat === 'all') return null;
  const c = String(cat).trim().toLowerCase();
  const map = {
    electronics: ['electronics', 'mobile'],
    wallets_bags: ['wallets_bags', 'wallet'],
    documents: ['documents'],
    keys_accessories: ['keys_accessories'],
    jewelry: ['jewelry'],
    clothing: ['clothing'],
    pets: ['pets'],
    vehicles: ['vehicles'],
    school_office: ['school_office'],
    misc: ['misc', 'other'],
  };
  /** Legacy query slugs used in older links */
  const legacyOnly = {
    mobile: ['electronics', 'mobile'],
    wallet: ['wallets_bags', 'wallet'],
    other: ['misc', 'other'],
  };
  if (legacyOnly[c]) return { $in: legacyOnly[c] };
  const list = map[c];
  if (list) return { $in: list };
  return c;
}
