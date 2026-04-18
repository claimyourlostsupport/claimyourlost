import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SocialPost } from '../models/SocialPost.js';
import { requireAuth } from '../middleware/auth.js';
import { optimizeUploadedImage } from '../services/imageOptimize.js';
import {
  isCloudinaryEnabled,
  uploadImageToCloudinary,
  uploadMediaToCloudinary,
} from '../services/cloudinaryStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (!ok) return cb(new Error('Only image or video files are allowed'));
    cb(null, true);
  },
});

const router = Router();

function parseCoord(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

router.get('/', async (_req, res) => {
  try {
    const posts = await SocialPost.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'phone')
      .lean();
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

router.get('/near', async (req, res) => {
  try {
    const lat = parseCoord(req.query.lat);
    const lng = parseCoord(req.query.lng);
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }
    const km = Math.min(100, Math.max(0, parseFloat(String(req.query.km || '25')) || 25));
    const all = await SocialPost.find({
      lat: { $ne: null },
      lng: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('userId', 'phone')
      .lean();

    const filtered = all
      .map((post) => ({
        ...post,
        distanceKm: haversineKm(lat, lng, Number(post.lat), Number(post.lng)),
      }))
      .filter((post) => Number.isFinite(post.distanceKm) && post.distanceKm <= km)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load nearby posts' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id).populate('userId', 'phone').lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load post' });
  }
});

router.post('/', requireAuth, (req, res, next) => {
  upload.single('media')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image or video file is required' });
    }

    const description = String(req.body?.description || '').trim();
    const city = String(req.body?.city || '').trim();
    const country = String(req.body?.country || '').trim();
    const latN = parseCoord(req.body?.lat);
    const lngN = parseCoord(req.body?.lng);
    const coords =
      latN != null && lngN != null && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180
        ? { lat: latN, lng: lngN }
        : { lat: null, lng: null };
    const isVideo = req.file.mimetype.startsWith('video/');

    let mediaUrl = '';
    let imagePublicId = '';
    let mediaType = isVideo ? 'video' : 'image';

    if (isVideo) {
      if (isCloudinaryEnabled()) {
        try {
          const uploaded = await uploadMediaToCloudinary(req.file.path, req.file.mimetype);
          mediaUrl = uploaded.secureUrl;
          imagePublicId = uploaded.publicId;
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            /* ignore */
          }
        } catch (e) {
          console.error('Social video cloudinary:', e);
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            /* ignore */
          }
          return res.status(400).json({ error: 'Could not upload video. Try a smaller file or MP4.' });
        }
      } else {
        const name = path.basename(req.file.path);
        mediaUrl = `/uploads/${name}`;
      }
    } else {
      try {
        // SocialHub image storage is independent from Lost & Found.
        const finalName = await optimizeUploadedImage(req.file.path, { maxWidth: 240, maxHeight: 140 });
        const localOptimizedPath = path.join(uploadDir, finalName);
        if (isCloudinaryEnabled()) {
          const uploaded = await uploadImageToCloudinary(localOptimizedPath);
          mediaUrl = uploaded.secureUrl;
          imagePublicId = uploaded.publicId;
          try {
            fs.unlinkSync(localOptimizedPath);
          } catch {
            /* ignore */
          }
        } else {
          mediaUrl = `/uploads/${finalName}`;
        }
        try {
          if (req.file.path !== localOptimizedPath) fs.unlinkSync(req.file.path);
        } catch {
          /* ignore */
        }
      } catch (imgErr) {
        console.error('Social image optimize:', imgErr);
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          /* ignore */
        }
        return res.status(400).json({
          error:
            'Could not process image. Try JPEG or PNG. iPhone HEIC: save as JPEG before uploading.',
        });
      }
    }

    const post = await SocialPost.create({
      userId: req.userId,
      description,
      city,
      country,
      lat: coords.lat,
      lng: coords.lng,
      mediaUrl,
      mediaType,
      imagePublicId,
    });

    const populated = await SocialPost.findById(post._id).populate('userId', 'phone').lean();
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.post('/:id/react', requireAuth, async (req, res) => {
  try {
    const value = String(req.body?.value || '').trim().toLowerCase();
    if (!['like', 'dislike', ''].includes(value)) {
      return res.status(400).json({ error: 'value must be like, dislike, or empty' });
    }

    const post = await SocialPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const uid = String(req.userId);
    const idx = (post.reactions || []).findIndex((r) => String(r.userId) === uid);
    const prev = idx >= 0 ? String(post.reactions[idx].value) : '';

    if (!value) {
      if (idx >= 0) {
        post.reactions.splice(idx, 1);
        if (prev === 'like') post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
        if (prev === 'dislike') post.dislikesCount = Math.max(0, (post.dislikesCount || 0) - 1);
      }
    } else if (idx < 0) {
      post.reactions.push({ userId: req.userId, value });
      if (value === 'like') post.likesCount = (post.likesCount || 0) + 1;
      if (value === 'dislike') post.dislikesCount = (post.dislikesCount || 0) + 1;
    } else if (prev !== value) {
      post.reactions[idx].value = value;
      if (prev === 'like') post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
      if (prev === 'dislike') post.dislikesCount = Math.max(0, (post.dislikesCount || 0) - 1);
      if (value === 'like') post.likesCount = (post.likesCount || 0) + 1;
      if (value === 'dislike') post.dislikesCount = (post.dislikesCount || 0) + 1;
    }

    await post.save();
    res.json({
      ok: true,
      likesCount: post.likesCount || 0,
      dislikesCount: post.dislikesCount || 0,
      userReaction: value || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

export default router;
