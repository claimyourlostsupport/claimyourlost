import { Router } from 'express';
import mongoose from 'mongoose';
import { SocialPost } from '../models/SocialPost.js';
import { renderSocialSharePage } from '../utils/socialShareOg.js';

const router = Router();

/** Public HTML with Open Graph tags; redirects humans to the SPA. */
router.get('/social/:id', async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).type('text/plain').send('Not found');
  }
  try {
    const post = await SocialPost.findById(id).lean();
    if (!post) {
      return res.status(404).type('text/plain').send('Not found');
    }
    const html = renderSocialSharePage({ post, req });
    res.set('Cache-Control', 'public, max-age=300');
    return res.type('html').send(html);
  } catch (err) {
    console.error(err);
    return res.status(500).type('text/plain').send('Server error');
  }
});

export default router;
