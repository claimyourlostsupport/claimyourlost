import crypto from 'crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { setOtp, verifyAndConsumeOtp } from '../services/otpStore.js';
import { sendOtpSms, isTwilioEnabled } from '../services/sms.js';

const router = Router();

function isSixDigits(otp) {
  return typeof otp === 'string' && /^\d{6}$/.test(otp.trim());
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

    const normalized = phone.replace(/\s/g, '').trim();

    if (isTwilioEnabled()) {
      const ok = verifyAndConsumeOtp(normalized, otp);
      if (!ok) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
    }

    let user = await User.findOne({ phone: normalized });
    if (!user) {
      user = await User.create({ phone: normalized });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const token = jwt.sign({ userId: user._id.toString(), phone: user.phone }, secret, {
      expiresIn: '30d',
    });

    res.json({
      token,
      user: { id: user._id, phone: user.phone },
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
    const normalized = phone.replace(/\s/g, '').trim();

    if (isTwilioEnabled()) {
      const code = String(crypto.randomInt(100000, 1000000));
      setOtp(normalized, code);
      const result = await sendOtpSms(normalized, code);
      if (!result.sent) {
        return res.status(503).json({ error: 'SMS could not be sent' });
      }
      return res.json({
        message: 'OTP sent to your phone.',
        mode: 'sms',
      });
    }

    res.json({
      message: 'OTP not required (mock mode). Use any 6 digits to verify.',
      mode: 'mock',
      mockHint: process.env.NODE_ENV !== 'production' ? 'Try: 123456' : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send OTP' });
  }
});

export default router;
