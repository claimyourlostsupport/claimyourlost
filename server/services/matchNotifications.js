import { Item } from '../models/Item.js';
import { Notification } from '../models/Notification.js';

function tokenize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
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

function locationSimilar(a, b) {
  const la = String(a).toLowerCase().trim();
  const lb = String(b).toLowerCase().trim();
  if (!la || !lb) return false;
  if (la.includes(lb) || lb.includes(la)) return true;
  const ta = tokenize(la);
  const tb = new Set(tokenize(lb));
  return ta.some((t) => t.length > 2 && tb.has(t));
}

function placeLine(item) {
  return [item.location, item.country].filter(Boolean).join(' ').trim();
}

/**
 * When a new listing is created, find opposite-type listings in the same category
 * with similar title and location; notify both parties once per pair.
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
    .select('_id title location country userId type')
    .lean();

  const uid = newItem.userId?._id ?? newItem.userId;
  const ownerNew = uid?.toString?.() ?? String(uid);

  const MAX_MATCHES = 8;
  let notified = 0;

  for (const c of candidates) {
    if (notified >= MAX_MATCHES) break;
    if (String(c.userId) === ownerNew) continue;

    if (!titleSimilar(newItem.title, c.title)) continue;
    if (!locationSimilar(placeLine(newItem), placeLine(c))) continue;

    const titleShort = (s) => String(s).slice(0, 60);
    const near = placeLine(newItem) || placeLine(c) || 'your area';
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
