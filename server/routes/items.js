import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Item } from '../models/Item.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyPotentialMatches } from '../services/matchNotifications.js';
import { optimizeUploadedImage } from '../services/imageOptimize.js';
import { isCloudinaryEnabled, uploadImageToCloudinary } from '../services/cloudinaryStorage.js';
import { categoryMongoFilter } from '../utils/categoryFilter.js';

function parseCoord(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Text / location clauses: q, city, county (ANDed when multiple). */
function buildTextLocationClauses(query) {
  const q = query.q ? String(query.q).trim() : '';
  const cityQ = query.city ? String(query.city).trim() : '';
  const countyQ = query.county ? String(query.county).trim() : '';
  const parts = [];
  if (q) {
    const safe = escapeRegex(q);
    parts.push({
      $or: [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { location: { $regex: safe, $options: 'i' } },
        { country: { $regex: safe, $options: 'i' } },
        { city: { $regex: safe, $options: 'i' } },
        { county: { $regex: safe, $options: 'i' } },
        { subcategoryCustom: { $regex: safe, $options: 'i' } },
      ],
    });
  }
  if (cityQ && cityQ !== 'all') {
    const safe = escapeRegex(cityQ);
    parts.push({
      $or: [
        { city: { $regex: new RegExp(`^${safe}$`, 'i') } },
        { location: { $regex: safe, $options: 'i' } },
      ],
    });
  }
  if (countyQ && countyQ !== 'all') {
    const safe = escapeRegex(countyQ);
    parts.push({
      $or: [
        { county: { $regex: new RegExp(`^${safe}$`, 'i') } },
        { location: { $regex: safe, $options: 'i' } },
      ],
    });
  }
  return parts;
}

function buildItemListFilter(query) {
  const filter = {};
  const type = query.type;
  if (type && ['lost', 'found'].includes(type)) {
    filter.type = type;
  }
  const category = query.category ? String(query.category).toLowerCase() : '';
  const catFilter = categoryMongoFilter(category);
  if (catFilter) {
    filter.category = catFilter;
  }
  const subQ = query.subcategory ? String(query.subcategory).trim().toLowerCase() : '';
  if (subQ && subQ !== 'all' && catFilter) {
    filter.subcategory = subQ;
  }
  const countryQ = query.country ? String(query.country).trim() : '';
  if (countryQ && countryQ !== 'all') {
    filter.country = { $regex: new RegExp(`^${escapeRegex(countryQ)}$`, 'i') };
  }
  const parts = buildTextLocationClauses(query);
  if (parts.length === 1) {
    Object.assign(filter, parts[0]);
  } else if (parts.length > 1) {
    filter.$and = parts;
  }
  return filter;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizeReverseGeo(payload = {}) {
  const addr = payload.address || payload || {};
  const country = addr.country || addr.countryName || '';
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.locality ||
    addr.city_district ||
    addr.state_district ||
    addr.principalSubdivision ||
    addr.state ||
    '';
  const county =
    addr.county ||
    addr.state_district ||
    addr.localityInfo?.administrative?.[2]?.name ||
    addr.localityInfo?.administrative?.[1]?.name ||
    addr.region ||
    addr.macroregion ||
    '';
  const displayName = payload.display_name || payload.locality || '';
  return {
    country: country ? String(country) : '',
    city: city ? String(city) : '',
    county: county ? String(county) : '',
    displayName: displayName ? String(displayName) : '',
  };
}

async function reverseGeoNominatim(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'ClaimYourLost/1.0 (claimyourlostsupport@gmail.com)',
      Accept: 'application/json',
    },
  });
  if (!r.ok) throw new Error(`nominatim ${r.status}`);
  return normalizeReverseGeo(await r.json());
}

async function reverseGeoBigDataCloud(lat, lng) {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('localityLanguage', 'en');
  const r = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`bigdatacloud ${r.status}`);
  return normalizeReverseGeo(await r.json());
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/', requireAuth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      category,
      subcategory,
      subcategoryCustom,
      petBreed,
      contactUrgency,
      location,
      city,
      county,
      country,
      date,
      lat,
      lng,
    } = req.body;
    if (!type || !['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'type must be lost or found' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    let imagePath = '';
    let imagePublicId = '';
    if (req.file) {
      try {
        const finalName = await optimizeUploadedImage(req.file.path);
        const localOptimizedPath = path.join(uploadDir, finalName);
        if (isCloudinaryEnabled()) {
          const uploaded = await uploadImageToCloudinary(localOptimizedPath);
          imagePath = uploaded.secureUrl;
          imagePublicId = uploaded.publicId;
          try {
            fs.unlinkSync(localOptimizedPath);
          } catch {
            /* ignore */
          }
        } else {
          imagePath = `/uploads/${finalName}`;
        }
      } catch (imgErr) {
        console.error('Image optimize failed:', imgErr);
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          /* ignore */
        }
        const hint =
          'Could not process image. Try a smaller JPEG or PNG. iPhone HEIC sometimes fails on Windows — in Photos use Share → save as JPEG, or take a screenshot.';
        return res.status(400).json({ error: hint });
      }
    }

    let itemDate = date ? new Date(date) : new Date();
    if (Number.isNaN(itemDate.getTime())) {
      itemDate = new Date();
    }

    const latN = parseCoord(lat);
    const lngN = parseCoord(lng);
    const coords =
      latN != null && lngN != null && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180
        ? { lat: latN, lng: lngN }
        : { lat: null, lng: null };

    const mainCat = String(category || 'misc').trim().toLowerCase();
    const sub = String(subcategory || '').trim().toLowerCase();
    const subCustom = String(subcategoryCustom || '').trim();
    const item = await Item.create({
      type,
      title: String(title).trim(),
      description: String(description || '').trim(),
      category: mainCat,
      subcategory: sub,
      subcategoryCustom: subCustom,
      petBreed: String(petBreed || '').trim(),
      contactUrgency: String(contactUrgency || '').trim(),
      location: String(location || '').trim(),
      city: String(city || '').trim(),
      county: String(county || '').trim(),
      country: String(country || '').trim(),
      lat: coords.lat,
      lng: coords.lng,
      date: itemDate,
      userId: req.userId,
      image: imagePath,
      imagePublicId,
    });

    const populated = await Item.findById(item._id).populate('userId', 'phone');
    notifyPotentialMatches(populated).catch((e) => console.error('match notify', e));
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.get('/map', async (_req, res) => {
  try {
    const items = await Item.find({
      lat: { $ne: null },
      lng: { $ne: null },
      status: 'open',
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('userId', 'phone')
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load map items' });
  }
});

router.get('/near', async (req, res) => {
  try {
    const lat = parseCoord(req.query.lat);
    const lng = parseCoord(req.query.lng);
    const km = Math.min(100, Math.max(1, parseFloat(req.query.km) || 25));

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }

    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;

    const geoFilter = {
      ...buildItemListFilter(req.query),
      lat: { $ne: null },
      lng: { $ne: null },
      status: 'open',
    };
    if (from && !Number.isNaN(from.getTime())) {
      geoFilter.date = { ...(geoFilter.date || {}), $gte: from };
    }
    if (to && !Number.isNaN(to.getTime())) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      geoFilter.date = { ...(geoFilter.date || {}), $lte: end };
    }

    const all = await Item.find(geoFilter)
      .populate('userId', 'phone')
      .lean();

    const filtered = all
      .map((item) => ({
        ...item,
        distanceKm: haversineKm(lat, lng, item.lat, item.lng),
      }))
      .filter((item) => item.distanceKm <= km)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load nearby items' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'phone')
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load your posts' });
  }
});

router.get('/countries', async (_req, res) => {
  try {
    const docs = await Item.find({
      country: { $exists: true, $nin: [null, ''] },
    })
      .select('country')
      .lean();
    const set = new Set();
    for (const d of docs) {
      const c = String(d.country || '').trim();
      if (c) set.add(c);
    }
    const list = [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load countries' });
  }
});

router.get('/cities', async (req, res) => {
  try {
    const countryQ = req.query.country ? String(req.query.country).trim() : '';
    const mongo = {
      city: { $exists: true, $nin: [null, ''] },
    };
    if (countryQ && countryQ !== 'all') {
      mongo.country = { $regex: new RegExp(`^${escapeRegex(countryQ)}$`, 'i') };
    }
    const docs = await Item.find(mongo).select('city').lean();
    const set = new Set();
    for (const d of docs) {
      const c = String(d.city || '').trim();
      if (c) set.add(c);
    }
    const list = [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load cities' });
  }
});

router.get('/counties', async (req, res) => {
  try {
    const countryQ = req.query.country ? String(req.query.country).trim() : '';
    const mongo = {
      county: { $exists: true, $nin: [null, ''] },
    };
    if (countryQ && countryQ !== 'all') {
      mongo.country = { $regex: new RegExp(`^${escapeRegex(countryQ)}$`, 'i') };
    }
    const docs = await Item.find(mongo).select('county').lean();
    const set = new Set();
    for (const d of docs) {
      const c = String(d.county || '').trim();
      if (c) set.add(c);
    }
    const list = [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load counties' });
  }
});

router.get('/reverse-geocode', async (req, res) => {
  try {
    const lat = parseCoord(req.query.lat);
    const lng = parseCoord(req.query.lng);
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }
    try {
      const primary = await reverseGeoNominatim(lat, lng);
      return res.json(primary);
    } catch (primaryErr) {
      console.warn('reverse-geocode nominatim failed:', primaryErr?.message || primaryErr);
    }

    try {
      const fallback = await reverseGeoBigDataCloud(lat, lng);
      return res.json(fallback);
    } catch (fallbackErr) {
      console.warn('reverse-geocode bigdatacloud failed:', fallbackErr?.message || fallbackErr);
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reverse geocode failed' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || '200'), 10) || 200));
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;

    const filter = buildItemListFilter(req.query);
    if (from && !Number.isNaN(from.getTime())) {
      filter.date = { ...(filter.date || {}), $gte: from };
    }
    if (to && !Number.isNaN(to.getTime())) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.date = { ...(filter.date || {}), $lte: end };
    }

    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'phone')
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '100'), 10) || 100));

    const filter = buildItemListFilter(req.query);

    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'phone')
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list items' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('userId', 'phone');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load item' });
  }
});

router.post('/:id/react', requireAuth, async (req, res) => {
  try {
    const value = String(req.body?.value || '').trim().toLowerCase();
    if (!['like', 'dislike', ''].includes(value)) {
      return res.status(400).json({ error: 'value must be like, dislike, or empty' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const uid = String(req.userId);
    const idx = (item.reactions || []).findIndex((r) => String(r.userId) === uid);
    const prev = idx >= 0 ? String(item.reactions[idx].value) : '';

    if (!value) {
      if (idx >= 0) {
        item.reactions.splice(idx, 1);
        if (prev === 'like') item.likesCount = Math.max(0, (item.likesCount || 0) - 1);
        if (prev === 'dislike') item.dislikesCount = Math.max(0, (item.dislikesCount || 0) - 1);
      }
    } else if (idx < 0) {
      item.reactions.push({ userId: req.userId, value });
      if (value === 'like') item.likesCount = (item.likesCount || 0) + 1;
      if (value === 'dislike') item.dislikesCount = (item.dislikesCount || 0) + 1;
    } else if (prev !== value) {
      item.reactions[idx].value = value;
      if (prev === 'like') item.likesCount = Math.max(0, (item.likesCount || 0) - 1);
      if (prev === 'dislike') item.dislikesCount = Math.max(0, (item.dislikesCount || 0) - 1);
      if (value === 'like') item.likesCount = (item.likesCount || 0) + 1;
      if (value === 'dislike') item.dislikesCount = (item.dislikesCount || 0) + 1;
    }

    await item.save();
    const userReaction = value || '';
    res.json({
      ok: true,
      likesCount: item.likesCount || 0,
      dislikesCount: item.dislikesCount || 0,
      userReaction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

export default router;
