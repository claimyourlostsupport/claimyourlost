import { Router } from 'express';
import { Message } from '../models/Message.js';
import { Item } from '../models/Item.js';
import { Claim } from '../models/Claim.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function canAccessItemMessages(userId, itemId) {
  const item = await Item.findById(itemId);
  if (!item) return { ok: false, reason: 'not_found' };
  if (item.userId.toString() === userId) return { ok: true, item };
  if (item.type === 'lost') return { ok: true, item };
  const hasClaim = await Claim.exists({ itemId, userId });
  if (hasClaim) return { ok: true, item };
  return { ok: false, reason: 'forbidden' };
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { itemId, text } = req.body;
    if (!itemId || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'itemId and text are required' });
    }

    const access = await canAccessItemMessages(req.userId, itemId);
    if (!access.ok) {
      if (access.reason === 'not_found') {
        return res.status(404).json({ error: 'Item not found' });
      }
      return res.status(403).json({
        error: 'You can only message about items you posted or claimed',
      });
    }

    const msg = await Message.create({
      itemId,
      senderId: req.userId,
      text: String(text).trim().slice(0, 5000),
    });

    const populated = await Message.findById(msg._id)
      .populate('senderId', 'phone')
      .lean();
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/:itemId', requireAuth, async (req, res) => {
  try {
    const access = await canAccessItemMessages(req.userId, req.params.itemId);
    if (!access.ok) {
      if (access.reason === 'not_found') {
        return res.status(404).json({ error: 'Item not found' });
      }
      return res.status(403).json({ error: 'Not allowed' });
    }

    const messages = await Message.find({ itemId: req.params.itemId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'phone')
      .lean();

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

export default router;
