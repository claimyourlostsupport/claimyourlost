import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const BCRYPT_ROUNDS = 10;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const router = Router();

function isSixDigits(otp) {
  return typeof otp === 'string' && /^\d{6}$/.test(otp.trim());
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s/g, '').trim();
}

function lastSixDigitsOfPhone(phone) {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  if (digits.length < 6) return '';
  return digits.slice(-6);
}

router.post('/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }
    if (!otp || !isSixDigits(String(otp))) {
      return res.status(400).json({ error: 'Enter a 6-digit OTP' });
    }

    const normalized = normalizePhone(phone);
    const expectedOtp = lastSixDigitsOfPhone(normalized);
    if (!expectedOtp) {
      return res.status(400).json({ error: 'Phone number must contain at least 6 digits' });
    }
    if (String(otp).trim() !== expectedOtp) {
      return res.status(400).json({ error: 'Invalid OTP. Enter the last 6 digits of your phone number.' });
    }

    let user = await User.findOne({ phone: normalized });
    let isNewUser = false;
    if (!user) {
      user = await User.create({ phone: normalized });
      isNewUser = true;
    }

    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const token = jwt.sign({ userId: user._id.toString(), phone: user.phone }, secret, {
      expiresIn: '30d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname || '',
        isNewUser,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || phone.replace(/\s/g, '').length < 8) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }
    const normalized = normalizePhone(phone);
    const hintOtp = lastSixDigitsOfPhone(normalized);
    if (!hintOtp) {
      return res.status(400).json({ error: 'Phone number must contain at least 6 digits' });
    }
    res.json({
      message: 'Use the last 6 digits of your phone number as OTP.',
      mode: 'phone_last6',
      hint: `Enter last 6 digits of ${normalized}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send OTP' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      // 401 (not 404): JWT is valid but the account no longer exists — treat as invalid session.
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname || '',
        hasPassword: Boolean(user.passwordHash),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.post('/password', requireAuth, async (req, res) => {
  try {
    const { password, currentPassword } = req.body;
    if (password == null || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }
    const pw = password.trim();
    if (pw.length < PASSWORD_MIN) {
      return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN} characters` });
    }
    if (pw.length > PASSWORD_MAX) {
      return res.status(400).json({ error: 'Password is too long' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.passwordHash) {
      if (currentPassword == null || typeof currentPassword !== 'string') {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    user.passwordHash = await bcrypt.hash(pw, BCRYPT_ROUNDS);
    await user.save();

    res.json({
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname || '',
        hasPassword: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update password' });
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    if (!('nickname' in req.body)) {
      return res.status(400).json({ error: 'nickname is required' });
    }
    const raw = req.body.nickname;
    const nickname = raw == null || raw === '' ? '' : String(raw).trim().slice(0, 48);
    const user = await User.findByIdAndUpdate(req.userId, { $set: { nickname } }, { new: true }).lean();
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname || '',
        hasPassword: Boolean(user.passwordHash),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

export default router;
