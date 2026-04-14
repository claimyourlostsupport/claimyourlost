import { Item } from '../models/Item.js';
import { Notification } from '../models/Notification.js';

function tokenize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Tokens that are too vague to treat as a “same place” match on their own (e.g. country name shared by many listings). */
const PLACE_STOPWORDS = new Set([
  'india',
  'pakistan',
  'bangladesh',
  'nepal',
  'china',
  'usa',
  'united',
  'states',
  'kingdom',
  'canada',
  'australia',
  'japan',
  'germany',
  'france',
  'uae',
  'emirates',
  'arab',
  'singapore',
  'malaysia',
  'thailand',
  'vietnam',
  'philippines',
  'srilanka',
  'lanka',
  'indonesia',
  'republic',
  'of',
  'the',
]);

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function tokensWithoutStopwords(s) {
  return tokenize(s).filter((t) => !PLACE_STOPWORDS.has(t) && t.length > 2);
}

function titleSimilar(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.length === 0 || B.length === 0) return false;
  const setB = new Set(B);
  for (const w of A) {
    if (w.length > 2 && setB.has(w)) return true;
  }
  const la = String(a).toLowerCase();
  const lb = String(b).toLowerCase();
  return A.some((w) => w.length > 2 && lb.includes(w)) || B.some((w) => w.length > 2 && la.includes(w));
}

function sameSubcategory(a, b) {
  const sa = String(a.subcategory || '').trim().toLowerCase();
  const sb = String(b.subcategory || '').trim().toLowerCase();
  return sa.length > 0 && sa === sb;
}

/** Full place text for fuzzy matching (city + area + country). */
function placeLine(item) {
  return [item.city, item.county, item.location, item.country].filter(Boolean).join(' ').trim();
}

function locationTextMentions(haystack, cityNorm) {
  const h = norm(haystack);
  const c = norm(cityNorm);
  return c.length > 2 && h.includes(c);
}

/**
 * When both listings have no structured city, require overlap on non-generic tokens
 * (do not match “India” alone across different cities).
 */
function locationSimilarNoCountryOnly(a, b) {
  const la = norm(a);
  const lb = norm(b);
  if (!la || !lb) return false;

  const shorter = la.length <= lb.length ? la : lb;
  const longer = la.length > lb.length ? la : lb;
  if (shorter.length >= 4 && longer.includes(shorter)) return true;

  const ta = tokensWithoutStopwords(la);
  const tb = new Set(tokensWithoutStopwords(lb));
  for (const w of ta) {
    if (tb.has(w)) return true;
  }
  return false;
}

/**
 * Same metro / area: structured city must agree when both set; otherwise fuzzy line match without country-only.
 */
function placeCompatible(a, b) {
  const ca = norm(a.city);
  const cb = norm(b.city);
  const la = placeLine(a);
  const lb = placeLine(b);

  if (ca && cb) {
    if (ca === cb) return true;
    if (ca.includes(cb) || cb.includes(ca)) return true;
    return false;
  }

  if (ca && !cb) {
    return locationTextMentions(lb, ca) || locationSimilarNoCountryOnly(la, lb);
  }
  if (cb && !ca) {
    return locationTextMentions(la, cb) || locationSimilarNoCountryOnly(la, lb);
  }

  return locationSimilarNoCountryOnly(la, lb);
}

/**
 * Similar titles OR same sub-type (e.g. both “Mobile phones”) with compatible place.
 */
function listingCompatible(a, b) {
  if (titleSimilar(a.title, b.title)) return true;
  if (sameSubcategory(a, b)) return true;
  return false;
}

function placeSummary(item) {
  const parts = [item.city, item.location, item.country].filter((x) => x && String(x).trim());
  const s = parts.join(', ').trim();
  return s ? s.slice(0, 100) : 'your area';
}

function matchScore(newItem, c) {
  let s = 0;
  if (sameSubcategory(newItem, c)) s += 10;
  const ca = norm(newItem.city);
  const cb = norm(c.city);
  if (ca && cb && ca === cb) s += 8;
  if (titleSimilar(newItem.title, c.title)) s += 5;
  return s;
}

/**
 * When a new listing is created, find opposite-type listings in the same category
 * with compatible title or sub-type and compatible place; notify both parties once per pair.
 */
export async function notifyPotentialMatches(newItem) {
  if (!newItem?._id) return;

  const opposite = newItem.type === 'lost' ? 'found' : 'lost';

  const candidates = await Item.find({
    _id: { $ne: newItem._id },
    type: opposite,
    category: newItem.category,
    status: 'open',
  })
    .select('_id title location country city county subcategory userId type')
    .lean();

  const uid = newItem.userId?._id ?? newItem.userId;
  const ownerNew = uid?.toString?.() ?? String(uid);

  candidates.sort((a, b) => matchScore(newItem, b) - matchScore(newItem, a));

  const MAX_MATCHES = 8;
  let notified = 0;

  for (const c of candidates) {
    if (notified >= MAX_MATCHES) break;
    if (String(c.userId) === ownerNew) continue;

    if (!listingCompatible(newItem, c)) continue;
    if (!placeCompatible(newItem, c)) continue;

    const titleShort = (s) => String(s).slice(0, 60);
    const near = placeSummary(newItem) !== 'your area' ? placeSummary(newItem) : placeSummary(c);
    const msg = `Possible match: “${titleShort(newItem.title)}” ↔ “${titleShort(c.title)}” near ${near}.`;

    await Notification.create({
      userId: uid,
      type: 'match',
      title: 'Possible match for your listing',
      body: msg,
      relatedItemId: newItem._id,
      matchedItemId: c._id,
      read: false,
    });

    await Notification.create({
      userId: c.userId,
      type: 'match',
      title: 'Possible match for your listing',
      body: msg,
      relatedItemId: c._id,
      matchedItemId: newItem._id,
      read: false,
    });

    notified += 1;
  }
}
