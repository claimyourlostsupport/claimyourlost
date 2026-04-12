export const SUPPORT_EMAIL = 'claimyourlostsupport@gmail.com';

/** PayPal account email (reference only). */
export const PAYPAL_DONATION_EMAIL = 'jaiswal8008@gmail.com';

/**
 * PayPal's /donate/ flow only works for enrolled charities — it often shows
 * "ineligible to receive donations" for personal accounts.
 *
 * Use PayPal.Me for personal support links. Set your real link in .env if needed:
 * VITE_PAYPAL_SUPPORT_URL=https://paypal.me/yourname
 */
const DEFAULT_PAYPAL_ME_SLUG = 'jaiswal8008';

function buildPaypalSupportUrl() {
  const custom = import.meta.env.VITE_PAYPAL_SUPPORT_URL;
  if (custom && String(custom).trim()) {
    return String(custom).trim();
  }
  return `https://paypal.me/${DEFAULT_PAYPAL_ME_SLUG}`;
}

export const paypalSupportUrl = buildPaypalSupportUrl();

/** @deprecated use paypalSupportUrl */
export const paypalDonateUrl = paypalSupportUrl;
