/**
 * Optional Twilio SMS. If TWILIO_ACCOUNT_SID is unset, sendSms is a no-op
 * and auth falls back to mock OTP verification.
 */

/** Best-effort E.164 for Twilio (configure DEFAULT_COUNTRY_CODE, e.g. 91 for India). */
export function toE164(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 10 && digits.length <= 15 && raw.toString().trim().startsWith('+')) {
    return `+${digits}`;
  }
  const cc = String(process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');
  if (digits.length === 10 && cc) {
    return `+${cc}${digits}`;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export async function sendOtpSms(toPhone, code) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return { sent: false, reason: 'twilio_not_configured' };
  }

  const { default: twilio } = await import('twilio');
  const client = twilio(sid, token);
  const body = `Your ClaimYourLost code is ${code}. It expires in 10 minutes.`;

  const to = toE164(toPhone);
  if (!to || to.length < 11) {
    throw new Error('Invalid phone number for SMS');
  }

  await client.messages.create({
    body,
    from,
    to,
  });

  return { sent: true };
}

export function isTwilioEnabled() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}
