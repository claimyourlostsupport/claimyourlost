/**
 * Deletes all SocialHub posts (and related messages/notifications/media only).
 * Does not touch lost & found items or users.
 *
 * Usage (from server/): npm run clear-social-posts
 *   node scripts/clearAllSocialPosts.js --yes
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { executeDeleteAllSocialPosts } from '../services/fullDataReset.js';

async function main() {
  const ok = process.argv.includes('--yes') || process.argv.includes('-y');
  if (!ok) {
    console.error('Refusing without --yes. Example: node scripts/clearAllSocialPosts.js --yes');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claimyourlost';
  await mongoose.connect(uri);
  console.log('Connected:', uri.replace(/\/\/.*@/, '//***@'));

  const deleted = await executeDeleteAllSocialPosts();
  console.log('Deleted:', deleted);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
