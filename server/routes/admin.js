import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import { Item } from '../models/Item.js';
import { Message } from '../models/Message.js';
import { Claim } from '../models/Claim.js';
import { Notification } from '../models/Notification.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function clearUploadsDir(uploadDir) {
  let removed = 0;
  try {
    const names = await fs.readdir(uploadDir);
    for (const name of names) {
      if (name === '.gitkeep') continue;
      const full = path.join(uploadDir, name);
      const stat = await fs.stat(full);
      if (stat.isFile()) {
        await fs.unlink(full);
        removed += 1;
      }
    }
  } catch (e) {
    if (e.code === 'ENOENT') return 0;
    throw e;
  }
  return removed;
}

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

/**
 * Production-safe reset endpoint for test environments.
 * Required:
 * - Header: x-admin-token: <CLEAR_DATA_TOKEN>
 * - Body: { "confirm": "DELETE_ALL_ITEMS" }
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
    if (confirm !== 'DELETE_ALL_ITEMS') {
      return res.status(400).json({ error: 'Missing confirm=DELETE_ALL_ITEMS' });
    }

    const msg = await Message.deleteMany({});
    const cl = await Claim.deleteMany({});
    const notif = await Notification.deleteMany({});
    const items = await Item.deleteMany({});

    const uploadDir = path.join(__dirname, '..', 'uploads');
    const filesRemoved = await clearUploadsDir(uploadDir);

    return res.json({
      ok: true,
      deleted: {
        messages: msg.deletedCount || 0,
        claims: cl.deletedCount || 0,
        notifications: notif.deletedCount || 0,
        items: items.deletedCount || 0,
        uploadFiles: filesRemoved,
      },
    });
  } catch (err) {
    console.error('clear-all-items failed:', err);
    return res.status(500).json({ error: 'Failed to clear items' });
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

    return res.json({
      ok: true,
      deleted: {
        messages: msg.deletedCount || 0,
        claims: cl.deletedCount || 0,
        notifications: notif.deletedCount || 0,
        items: deletedItem.deletedCount || 0,
        imageFileRemoved: removedImage,
      },
    });
  } catch (err) {
    console.error('clear-item failed:', err);
    return res.status(500).json({ error: 'Failed to clear item' });
  }
});

export default router;
