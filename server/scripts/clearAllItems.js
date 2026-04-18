/**
 * Full test reset: MongoDB (users, items, SocialHub posts, messages, claims, notifications),
 * local media under server/uploads/, and Cloudinary (item + social) when env is configured.
 *
 * Usage (from server/):
 *   npm run clean-all
 *   node scripts/clearAllItems.js --yes
 *
 * Requires --yes or -y so it never runs by accident.
 * Uses MONGODB_URI from .env (default mongodb://127.0.0.1:27017/claimyourlost).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { executeFullDataReset } from '../services/fullDataReset.js';

async function main() {
  const ok = process.argv.includes('--yes') || process.argv.includes('-y');
  if (!ok) {
    console.error('Refusing to run without --yes. Example: node scripts/clearAllItems.js --yes');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claimyourlost';
  await mongoose.connect(uri);
  console.log('Connected:', uri.replace(/\/\/.*@/, '//***@'));

  const deleted = await executeFullDataReset();

  console.log('Deleted:');
  console.log(`  messages:         ${deleted.messages}`);
  console.log(`  claims:           ${deleted.claims}`);
  console.log(`  notifications:    ${deleted.notifications}`);
  console.log(`  items:            ${deleted.items}`);
  console.log(`  social posts:     ${deleted.socialPosts}`);
  console.log(`  users:            ${deleted.users}`);
  console.log(`  upload files:     ${deleted.uploadFiles} (uploads/*)`);
  console.log(`  cloudinary items: ${deleted.cloudinaryItems}`);
  console.log(`  cloudinary social:${deleted.cloudinarySocial}`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
