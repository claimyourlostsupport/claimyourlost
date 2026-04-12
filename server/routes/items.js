import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Item } from '../models/Item.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyPotentialMatches } from '../services/matchNotifications.js';
import { optimizeUploadedImage } from '../services/imageOptimize.js';
import { categoryMongoFilter } from '../utils/categoryFilter.js';

function parseCoord(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    if (req.file) {
      try {
        const finalName = await optimizeUploadedImage(req.file.path);
        imagePath = `/uploads/${finalName}`;
      } catch (imgErr) {
        console.error('Image optimize failed:', imgErr);
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          /* ignore */
        }
        return res.status(400).json({ error: 'Could not process image. Try another photo.' });
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
      country: String(country || '').trim(),
      lat: coords.lat,
      lng: coords.lng,
      date: itemDate,
      userId: req.userId,
      image: imagePath,
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
    const type = req.query.type;
    const category = req.query.category ? String(req.query.category).toLowerCase() : '';

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }

    const geoFilter = {
      lat: { $ne: null },
      lng: { $ne: null },
      status: 'open',
    };
    if (type && ['lost', 'found'].includes(type)) {
      geoFilter.type = type;
    }
    const catFilter = categoryMongoFilter(category);
    if (catFilter) {
      geoFilter.category = catFilter;
    }
    const subQ = req.query.subcategory ? String(req.query.subcategory).trim().toLowerCase() : '';
    if (subQ && subQ !== 'all' && catFilter) {
      geoFilter.subcategory = subQ;
    }
    const nearCountry = req.query.country ? String(req.query.country).trim() : '';
    if (nearCountry && nearCountry !== 'all') {
      geoFilter.country = { $regex: new RegExp(`^${escapeRegex(nearCountry)}$`, 'i') };
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

router.get('/reverse-geocode', async (req, res) => {
  try {
    const lat = parseCoord(req.query.lat);
    const lng = parseCoord(req.query.lng);
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }
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
    if (!r.ok) {
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }
    const data = await r.json();
    const addr = data.address || {};
    const country = addr.country || '';
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      '';
    res.json({
      country: country ? String(country) : '',
      city: city ? String(city) : '',
      displayName: data.display_name ? String(data.display_name) : '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reverse geocode failed' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    const type = req.query.type;
    const category = req.query.category;
    const subcategoryQ = req.query.subcategory ? String(req.query.subcategory).trim().toLowerCase() : '';
    const countryQ = req.query.country ? String(req.query.country).trim() : '';
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || '200'), 10) || 200));
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;

    const filter = {};
    if (type && ['lost', 'found'].includes(type)) {
      filter.type = type;
    }
    const catFilter = categoryMongoFilter(category);
    if (catFilter) {
      filter.category = catFilter;
    }
    if (subcategoryQ && subcategoryQ !== 'all' && catFilter) {
      filter.subcategory = subcategoryQ;
    }
    if (countryQ && countryQ !== 'all') {
      filter.country = { $regex: new RegExp(`^${escapeRegex(countryQ)}$`, 'i') };
    }
    if (from && !Number.isNaN(from.getTime())) {
      filter.date = { ...(filter.date || {}), $gte: from };
    }
    if (to && !Number.isNaN(to.getTime())) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.date = { ...(filter.date || {}), $lte: end };
    }
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { location: { $regex: safe, $options: 'i' } },
        { country: { $regex: safe, $options: 'i' } },
        { subcategoryCustom: { $regex: safe, $options: 'i' } },
      ];
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
    const type = req.query.type;
    const category = req.query.category;
    const subcategoryQ = req.query.subcategory ? String(req.query.subcategory).trim().toLowerCase() : '';
    const countryQ = req.query.country ? String(req.query.country).trim() : '';
    const q = req.query.q ? String(req.query.q).trim() : '';
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '100'), 10) || 100));

    const filter = {};
    if (type && ['lost', 'found'].includes(type)) {
      filter.type = type;
    }
    const catFilter = categoryMongoFilter(category);
    if (catFilter) {
      filter.category = catFilter;
    }
    if (subcategoryQ && subcategoryQ !== 'all' && catFilter) {
      filter.subcategory = subcategoryQ;
    }
    if (countryQ && countryQ !== 'all') {
      filter.country = { $regex: new RegExp(`^${escapeRegex(countryQ)}$`, 'i') };
    }
    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { location: { $regex: safe, $options: 'i' } },
        { country: { $regex: safe, $options: 'i' } },
        { subcategoryCustom: { $regex: safe, $options: 'i' } },
      ];
    }

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

export default router;
