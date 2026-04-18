import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { Item } from '../models/Item.js';
import { Message } from '../models/Message.js';
import { Claim } from '../models/Claim.js';
import { Notification } from '../models/Notification.js';
import { SocialPost } from '../models/SocialPost.js';
import { User } from '../models/User.js';
import { deleteCloudinaryMedia, isCloudinaryEnabled } from './cloudinaryStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function clearUploadsDir(uploadDir) {
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

async function unlinkSocialLocalMedia(post) {
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

/**
 * Deletes every SocialHub post, their chat messages and related notifications, and each
 * post’s local / Cloudinary media. Does not touch lost & found items, users, or item messages.
 */
export async function executeDeleteAllSocialPosts() {
  const allSocial = await SocialPost.find({}).select('_id mediaUrl imagePublicId mediaType').lean();

  let cloudinarySocial = 0;
  if (isCloudinaryEnabled()) {
    for (const sp of allSocial) {
      const pid = String(sp?.imagePublicId || '').trim();
      if (!pid) continue;
      const rt = sp.mediaType === 'video' ? 'video' : 'image';
      if (await deleteCloudinaryMedia(pid, rt)) cloudinarySocial += 1;
    }
  }

  let localFilesRemoved = 0;
  for (const sp of allSocial) {
    if (await unlinkSocialLocalMedia(sp)) localFilesRemoved += 1;
  }

  const msg = await Message.deleteMany({ socialPostId: { $exists: true, $ne: null } });
  const notif = await Notification.deleteMany({
    relatedSocialPostId: { $exists: true, $ne: null },
  });
  const posts = await SocialPost.deleteMany({});

  return {
    messages: msg.deletedCount || 0,
    notifications: notif.deletedCount || 0,
    socialPosts: posts.deletedCount || 0,
    uploadFiles: localFilesRemoved,
    cloudinarySocial: cloudinarySocial,
  };
}

/**
 * Wipes app data for local/test resets: Mongo collections (items, social posts, users,
 * messages, claims, notifications), local files in server/uploads, and Cloudinary assets
 * when configured (item images + social image/video).
 *
 * Requires an active mongoose connection.
 */
export async function executeFullDataReset() {
  const uploadDir = path.join(__dirname, '..', 'uploads');

  const allItems = await Item.find({}).select('_id image imagePublicId').lean();
  const allSocial = await SocialPost.find({}).select('_id mediaUrl imagePublicId mediaType').lean();

  let cloudinaryItems = 0;
  let cloudinarySocial = 0;
  if (isCloudinaryEnabled()) {
    for (const it of allItems) {
      const pid = String(it?.imagePublicId || '').trim();
      if (pid && (await deleteCloudinaryMedia(pid, 'image'))) cloudinaryItems += 1;
    }
    for (const sp of allSocial) {
      const pid = String(sp?.imagePublicId || '').trim();
      if (!pid) continue;
      const rt = sp.mediaType === 'video' ? 'video' : 'image';
      if (await deleteCloudinaryMedia(pid, rt)) cloudinarySocial += 1;
    }
  }

  const msg = await Message.deleteMany({});
  const cl = await Claim.deleteMany({});
  const notif = await Notification.deleteMany({});
  const items = await Item.deleteMany({});
  const posts = await SocialPost.deleteMany({});
  const users = await User.deleteMany({});

  const uploadFiles = await clearUploadsDir(uploadDir);

  return {
    messages: msg.deletedCount || 0,
    claims: cl.deletedCount || 0,
    notifications: notif.deletedCount || 0,
    items: items.deletedCount || 0,
    socialPosts: posts.deletedCount || 0,
    users: users.deletedCount || 0,
    uploadFiles,
    cloudinaryItems: cloudinaryItems,
    cloudinarySocial: cloudinarySocial,
    cloudinaryImages: cloudinaryItems + cloudinarySocial,
  };
}
