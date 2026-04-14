/**
 * Main category `id` values match server / MongoDB `category` field (new posts).
 * Subcategory `id` values match `subcategory` field.
 */

export const MAIN_CATEGORIES = [
  {
    id: 'electronics',
    label: 'Electronics',
    shortLabel: 'Electronics',
    icon: '💻',
    imageEmoji: '💻',
    gradient: 'from-violet-600 to-indigo-800',
    subs: [
      { id: 'mobile_phones', label: 'Mobile phones' },
      { id: 'laptops', label: 'Laptops' },
      { id: 'tablets', label: 'Tablets' },
      { id: 'smartwatches', label: 'Smartwatches' },
      { id: 'earbuds_headphones', label: 'Earbuds / headphones' },
      { id: 'chargers_accessories', label: 'Chargers / accessories' },
      { id: 'cameras', label: 'Cameras' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'wallets_bags',
    label: 'Wallets & bags',
    shortLabel: 'Wallets',
    icon: '👛',
    imageEmoji: '👛',
    gradient: 'from-amber-600 to-orange-800',
    subs: [
      { id: 'wallet', label: 'Wallet' },
      { id: 'handbag', label: 'Handbag' },
      { id: 'backpack', label: 'Backpack' },
      { id: 'laptop_bag', label: 'Laptop bag' },
      { id: 'travel_bag', label: 'Travel bag' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    shortLabel: 'Documents',
    icon: '📄',
    imageEmoji: '📄',
    gradient: 'from-blue-600 to-cyan-800',
    highlight: true,
    subs: [
      { id: 'aadhaar_card', label: 'Aadhaar card' },
      { id: 'pan_card', label: 'PAN card' },
      { id: 'driving_license', label: 'Driving license' },
      { id: 'passport', label: 'Passport' },
      { id: 'voter_id', label: 'Voter ID' },
      { id: 'office_id_card', label: 'Office ID card' },
      { id: 'certificates', label: 'Certificates' },
      { id: 'tickets', label: 'Tickets (flight/train)' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'keys_accessories',
    label: 'Keys & accessories',
    shortLabel: 'Keys',
    icon: '🔑',
    imageEmoji: '🔑',
    gradient: 'from-yellow-600 to-amber-900',
    subs: [
      { id: 'house_keys', label: 'House keys' },
      { id: 'car_keys', label: 'Car keys' },
      { id: 'locker_keys', label: 'Locker keys' },
      { id: 'keychains', label: 'Keychains' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'jewelry',
    label: 'Jewelry & valuables',
    shortLabel: 'Jewelry',
    icon: '💍',
    imageEmoji: '💍',
    gradient: 'from-rose-600 to-pink-900',
    subs: [
      { id: 'rings', label: 'Rings' },
      { id: 'chains', label: 'Chains' },
      { id: 'bracelets', label: 'Bracelets' },
      { id: 'watches', label: 'Watches' },
      { id: 'gold_silver', label: 'Gold / silver items' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'clothing',
    label: 'Clothing & personal',
    shortLabel: 'Clothing',
    icon: '👕',
    imageEmoji: '👕',
    gradient: 'from-teal-600 to-emerald-900',
    subs: [
      { id: 'jackets', label: 'Jackets' },
      { id: 'shoes', label: 'Shoes' },
      { id: 'helmets', label: 'Helmets' },
      { id: 'glasses_sunglasses', label: 'Glasses / sunglasses' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'pets',
    label: 'Pets',
    shortLabel: 'Pets',
    icon: '🐶',
    imageEmoji: '🐶',
    gradient: 'from-lime-600 to-green-900',
    subs: [
      { id: 'dogs', label: 'Dogs' },
      { id: 'cats', label: 'Cats' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'vehicles',
    label: 'Vehicles & parts',
    shortLabel: 'Vehicles',
    icon: '🚗',
    imageEmoji: '🚗',
    gradient: 'from-slate-600 to-slate-900',
    subs: [
      { id: 'bicycles', label: 'Bicycles' },
      { id: 'scooters', label: 'Scooters' },
      { id: 'car_parts', label: 'Car parts' },
      { id: 'vehicle_documents', label: 'Vehicle documents' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'school_office',
    label: 'School / office',
    shortLabel: 'School/office',
    icon: '🎒',
    imageEmoji: '🎒',
    gradient: 'from-indigo-600 to-violet-900',
    subs: [
      { id: 'books', label: 'Books' },
      { id: 'notebooks', label: 'Notebooks' },
      { id: 'id_cards', label: 'ID cards' },
      { id: 'office_equipment', label: 'Office equipment' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'misc',
    label: 'Miscellaneous',
    shortLabel: 'Misc',
    icon: '🧸',
    imageEmoji: '🧸',
    gradient: 'from-fuchsia-600 to-purple-900',
    subs: [
      { id: 'toys', label: 'Toys' },
      { id: 'gifts', label: 'Gifts' },
      { id: 'unknown_items', label: 'Unknown items' },
      { id: 'other', label: 'Other' },
    ],
  },
];

const mainById = Object.fromEntries(MAIN_CATEGORIES.map((m) => [m.id, m]));

export function getMainCategory(id) {
  if (!id) return null;
  return mainById[String(id).toLowerCase()] || null;
}

export function getSubLabel(mainId, subId) {
  if (!subId) return '';
  const main = getMainCategory(mainId);
  if (!main?.subs) return '';
  const s = main.subs.find((x) => x.id === String(subId).toLowerCase());
  return s?.label || subId;
}

/** Old DB values -> display-friendly mapping */
const LEGACY_CATEGORY = {
  mobile: { mainId: 'electronics', mainLabel: 'Electronics', subLabel: 'Mobile phones' },
  wallet: { mainId: 'wallets_bags', mainLabel: 'Wallets & bags', subLabel: 'Wallet' },
  documents: { mainId: 'documents', mainLabel: 'Documents', subLabel: '' },
  electronics: { mainId: 'electronics', mainLabel: 'Electronics', subLabel: '' },
  other: { mainId: 'misc', mainLabel: 'Miscellaneous', subLabel: '' },
};

export function formatItemCategory(item) {
  const raw = String(item?.category || '').toLowerCase().trim();
  const sub = String(item?.subcategory || '').toLowerCase().trim();
  const custom = String(item?.subcategoryCustom || '').trim();

  let line = '';
  if (LEGACY_CATEGORY[raw]) {
    const L = LEGACY_CATEGORY[raw];
    const subText = sub ? getSubLabel(L.mainId, sub) || sub : L.subLabel;
    if (subText) line = `${L.mainLabel} · ${subText}`;
    else line = L.mainLabel;
  } else {
    const main = getMainCategory(raw);
    if (!main) {
      line = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Uncategorized';
    } else {
      const subText = sub ? getSubLabel(main.id, sub) || sub : '';
      line = subText ? `${main.label} · ${subText}` : main.label;
    }
  }

  if (custom) {
    return line ? `${line} · ${custom}` : custom;
  }
  return line;
}

export const DEFAULT_COUNTRY = 'India';
