import { Router } from 'express';
import { Claim } from '../models/Claim.js';
import { Item } from '../models/Item.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/status/:itemId', requireAuth, async (req, res) => {
  try {
    const claim = await Claim.findOne({ itemId: req.params.itemId, userId: req.userId }).lean();
    res.json({ hasClaim: Boolean(claim) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check claim status' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const claims = await Claim.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate('itemId')
      .populate('userId', 'phone')
      .lean();
    res.json(claims);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load your claims' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { itemId, message } = req.body;
    if (!itemId || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'itemId and message are required' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.userId.toString() === req.userId) {
      return res.status(400).json({ error: 'You cannot claim your own post' });
    }

    const existing = await Claim.findOne({ itemId, userId: req.userId });
    if (existing) {
      existing.message = String(message).trim();
      await existing.save();
      const populated = await Claim.findById(existing._id)
        .populate('userId', 'phone')
        .populate('itemId');
      return res.json(populated);
    }

    const claim = await Claim.create({
      itemId,
      userId: req.userId,
      message: String(message).trim(),
    });

    const populated = await Claim.findById(claim._id)
      .populate('userId', 'phone')
      .populate('itemId');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You already submitted a claim for this item' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

router.get('/:itemId', requireAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const isOwner = item.userId.toString() === req.userId;
    const isClaimant = await Claim.exists({ itemId: req.params.itemId, userId: req.userId });

    if (!isOwner && !isClaimant) {
      return res.status(403).json({ error: 'Not allowed to view claims for this item' });
    }

    const claims = await Claim.find({ itemId: req.params.itemId })
      .sort({ createdAt: -1 })
      .populate('userId', 'phone')
      .lean();

    res.json(claims);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load claims' });
  }
});

export default router;
