import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import { Item } from '../models/Item.js';
import { Message } from '../models/Message.js';
import { Claim } from '../models/Claim.js';
import { Notification } from '../models/Notification.js';
import { SocialPost } from '../models/SocialPost.js';
import { deleteCloudinaryImage, deleteCloudinaryMedia } from '../services/cloudinaryStorage.js';
import { executeFullDataReset } from '../services/fullDataReset.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Lets you verify the deployed API includes admin routes (no token). */
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'admin',
    posts: [
      'POST /admin/clear-all-items',
      'POST /admin/clear-item/:itemId',
      'POST /admin/clear-social-post/:postId',
    ],
  });
});

function getTokenFromReq(req) {
  return String(req.headers['x-admin-token'] || '').trim();
}

function hasValidAdminToken(req) {
  const expected = process.env.CLEAR_DATA_TOKEN || '';
  if (!expected) return { ok: false, reason: 'missing_server_token' };
  const token = getTokenFromReq(req);
  if (!token || token !== expected) return { ok: false, reason: 'forbidden' };
  return { ok: true };
}

async function removeUploadedFileForItem(item) {
  const p = String(item?.image || '').trim();
  if (!p || !p.startsWith('/uploads/')) return false;
  const filename = p.replace('/uploads/', '').trim();
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  const uploadDir = path.join(__dirname, '..', 'uploads');
  const full = path.join(uploadDir, filename);
  try {
    await fs.unlink(full);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    throw e;
  }
}

async function removeCloudinaryImageForItem(item) {
  const publicId = String(item?.imagePublicId || '').trim();
  if (!publicId) return false;
  return deleteCloudinaryImage(publicId);
}

async function removeUploadedFileForSocialPost(post) {
  const p = String(post?.mediaUrl || '').trim();
  if (!p || !p.startsWith('/uploads/')) return false;
  const filename = p.replace('/uploads/', '').trim();
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  const uploadDir = path.join(__dirname, '..', 'uploads');
  const full = path.join(uploadDir, filename);
  try {
    await fs.unlink(full);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    throw e;
  }
}

async function removeCloudinaryForSocialPost(post) {
  const publicId = String(post?.imagePublicId || '').trim();
  if (!publicId) return false;
  const rt = post.mediaType === 'video' ? 'video' : 'image';
  return deleteCloudinaryMedia(publicId, rt);
}

/**
 * Full test reset (same as `npm run clean-all` in server/): users, items, SocialHub posts,
 * messages, claims, notifications, uploads/*, Cloudinary item + social media.
 *
 * Required:
 * - Header: x-admin-token: <CLEAR_DATA_TOKEN>
 * - Body: { "confirm": "DELETE_ALL_DATA" } or { "confirm": "DELETE_ALL_ITEMS" } (legacy alias)
 */
router.post('/clear-all-items', async (req, res) => {
  try {
    const auth = hasValidAdminToken(req);
    if (!auth.ok && auth.reason === 'missing_server_token') {
      return res.status(503).json({ error: 'CLEAR_DATA_TOKEN is not configured' });
    }
    if (!auth.ok) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const confirm = String(req.body?.confirm || '').trim();
    if (confirm !== 'DELETE_ALL_DATA' && confirm !== 'DELETE_ALL_ITEMS') {
      return res.status(400).json({
        error: 'Missing confirm: use DELETE_ALL_DATA (or legacy DELETE_ALL_ITEMS)',
      });
    }

    const deleted = await executeFullDataReset();

    return res.json({
      ok: true,
      deleted: {
        messages: deleted.messages,
        claims: deleted.claims,
        notifications: deleted.notifications,
        items: deleted.items,
        socialPosts: deleted.socialPosts,
        users: deleted.users,
        uploadFiles: deleted.uploadFiles,
        cloudinaryItems: deleted.cloudinaryItems,
        cloudinarySocial: deleted.cloudinarySocial,
        cloudinaryImages: deleted.cloudinaryImages,
      },
    });
  } catch (err) {
    console.error('clear-all-items failed:', err);
    return res.status(500).json({ error: 'Failed to clear data' });
  }
});

/**
 * Deletes one item and all related data.
 * Required:
 * - Header: x-admin-token: <CLEAR_DATA_TOKEN>
 * - Body: { "confirm": "DELETE_ONE_ITEM" }
 */
router.post('/clear-item/:itemId', async (req, res) => {
  try {
    const auth = hasValidAdminToken(req);
    if (!auth.ok && auth.reason === 'missing_server_token') {
      return res.status(503).json({ error: 'CLEAR_DATA_TOKEN is not configured' });
    }
    if (!auth.ok) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const confirm = String(req.body?.confirm || '').trim();
    if (confirm !== 'DELETE_ONE_ITEM') {
      return res.status(400).json({ error: 'Missing confirm=DELETE_ONE_ITEM' });
    }

    const itemId = String(req.params.itemId || '').trim();
    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ error: 'Invalid itemId' });
    }

    const item = await Item.findById(itemId).lean();
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const msg = await Message.deleteMany({ itemId });
    const cl = await Claim.deleteMany({ itemId });
    const notif = await Notification.deleteMany({
      $or: [{ relatedItemId: itemId }, { matchedItemId: itemId }],
    });
    const deletedItem = await Item.deleteOne({ _id: itemId });
    const removedImage = await removeUploadedFileForItem(item);
    const removedCloudinary = await removeCloudinaryImageForItem(item);

    return res.json({
      ok: true,
      deleted: {
        messages: msg.deletedCount || 0,
        claims: cl.deletedCount || 0,
        notifications: notif.deletedCount || 0,
        items: deletedItem.deletedCount || 0,
        imageFileRemoved: removedImage,
        cloudinaryImageRemoved: removedCloudinary,
      },
    });
  } catch (err) {
    console.error('clear-item failed:', err);
    return res.status(500).json({ error: 'Failed to clear item' });
  }
});

/**
 * Deletes one SocialHub post and related chat + notifications; removes local / Cloudinary media.
 * Required:
 * - Header: x-admin-token: <CLEAR_DATA_TOKEN>
 * - Body: { "confirm": "DELETE_ONE_SOCIAL_POST" }
 */
router.post('/clear-social-post/:postId', async (req, res) => {
  try {
    const auth = hasValidAdminToken(req);
    if (!auth.ok && auth.reason === 'missing_server_token') {
      return res.status(503).json({ error: 'CLEAR_DATA_TOKEN is not configured' });
    }
    if (!auth.ok) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const confirm = String(req.body?.confirm || '').trim();
    if (confirm !== 'DELETE_ONE_SOCIAL_POST') {
      return res.status(400).json({ error: 'Missing confirm=DELETE_ONE_SOCIAL_POST' });
    }

    const postId = String(req.params.postId || '').trim();
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ error: 'Invalid postId' });
    }

    const post = await SocialPost.findById(postId).lean();
    if (!post) {
      return res.status(404).json({ error: 'Social post not found' });
    }

    const msg = await Message.deleteMany({ socialPostId: postId });
    const notif = await Notification.deleteMany({ relatedSocialPostId: postId });
    const deletedPost = await SocialPost.deleteOne({ _id: postId });
    const removedFile = await removeUploadedFileForSocialPost(post);
    const removedCloudinary = await removeCloudinaryForSocialPost(post);

    return res.json({
      ok: true,
      deleted: {
        messages: msg.deletedCount || 0,
        notifications: notif.deletedCount || 0,
        socialPosts: deletedPost.deletedCount || 0,
        mediaFileRemoved: removedFile,
        cloudinaryMediaRemoved: removedCloudinary,
      },
    });
  } catch (err) {
    console.error('clear-social-post failed:', err);
    return res.status(500).json({ error: 'Failed to clear social post' });
  }
});

export default router;
