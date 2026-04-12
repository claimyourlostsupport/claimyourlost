import { SUPPORT_EMAIL, PAYPAL_DONATION_EMAIL, paypalSupportUrl } from '../constants/support.js';

/**
 * @param {'default' | 'compact'} variant
 */
export function SupportBlock({ variant = 'default' }) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
        isCompact ? 'p-4 space-y-3' : 'p-5 sm:p-6 space-y-4'
      }`}
    >
      <div>
        <h3 className={`font-bold text-slate-900 ${isCompact ? 'text-sm' : 'text-base'}`}>Contact us</h3>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-brand-blue font-medium hover:underline break-all text-sm sm:text-base"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
      <div className="border-t border-slate-100 pt-3 sm:pt-4">
        <h3 className={`font-bold text-slate-900 ${isCompact ? 'text-sm' : 'text-base'} mb-2`}>
          Support us
        </h3>
        <p className="text-sm text-slate-600 mb-2">
          Contributions help with hosting and improvements. We use a normal PayPal payment link (not charity checkout).
        </p>
        <p className="text-xs text-slate-500 mb-3">Recipient: {PAYPAL_DONATION_EMAIL}</p>
        <a
          href={paypalSupportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0070BA] text-white text-sm font-semibold hover:bg-[#005ea6] transition-colors shadow-sm"
        >
          <span aria-hidden>💙</span>
          Support with PayPal
        </a>
      </div>
    </div>
  );
}
