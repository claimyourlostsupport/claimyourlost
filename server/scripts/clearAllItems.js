/**
 * Deletes all lost/found listings and related data (claims, chats, match notifications)
 * and removes image files under server/uploads/.
 *
 * Usage (from server/):
 *   node scripts/clearAllItems.js --yes
 *
 * Requires --yes (or -y) to run, to avoid accidental execution.
 * Uses MONGODB_URI from .env (or default mongodb://127.0.0.1:27017/claimyourlost).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { Item } from '../models/Item.js';
import { Message } from '../models/Message.js';
import { Claim } from '../models/Claim.js';
import { Notification } from '../models/Notification.js';

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
    if (e.code === 'ENOENT') {
      return 0;
    }
    throw e;
  }
  return removed;
}

async function main() {
  const ok = process.argv.includes('--yes') || process.argv.includes('-y');
  if (!ok) {
    console.error('Refusing to run without --yes. Example: node scripts/clearAllItems.js --yes');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claimyourlost';
  await mongoose.connect(uri);
  console.log('Connected:', uri.replace(/\/\/.*@/, '//***@'));

  const msg = await Message.deleteMany({});
  const cl = await Claim.deleteMany({});
  const notif = await Notification.deleteMany({});
  const items = await Item.deleteMany({});

  const uploadDir = path.join(__dirname, '..', 'uploads');
  const filesRemoved = await clearUploadsDir(uploadDir);

  console.log('Deleted:');
  console.log(`  messages:      ${msg.deletedCount}`);
  console.log(`  claims:        ${cl.deletedCount}`);
  console.log(`  notifications: ${notif.deletedCount}`);
  console.log(`  items:         ${items.deletedCount}`);
  console.log(`  upload files:  ${filesRemoved} (in uploads/)`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
