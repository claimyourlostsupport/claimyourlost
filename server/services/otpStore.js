/** In-memory OTP store (use Redis in production at scale). */
const store = new Map();

const TTL_MS = 10 * 60 * 1000;

export function setOtp(phone, code) {
  store.set(phone, { code: String(code), exp: Date.now() + TTL_MS });
}

export function verifyAndConsumeOtp(phone, otp) {
  const entry = store.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.exp) {
    store.delete(phone);
    return false;
  }
  if (entry.code !== String(otp).trim()) return false;
  store.delete(phone);
  return true;
}
