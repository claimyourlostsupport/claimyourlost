import { useState } from 'react';

function getListingUrl(itemId) {
  const base = import.meta.env.VITE_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/items/${itemId}`;
}

function buildShareText(title, type, placeLine, url) {
  const kind = type === 'found' ? 'Found' : 'Lost';
  const loc = placeLine ? ` · ${placeLine}` : '';
  return `${kind}: ${title}${loc}\n${url}\n— ClaimYourLost.com`;
}

export function ShareListing({ itemId, title, type, location, country }) {
  const [copied, setCopied] = useState(false);
  const url = getListingUrl(itemId);
  const placeLine = [location, country].filter((s) => s && String(s).trim()).join(', ');
  const text = buildShareText(title, type, placeLine, url);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  }

  function shareWhatsApp() {
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ClaimYourLost.com', text, url });
      } catch (e) {
        if (e.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-800 mb-3">Share this listing</p>
      <div className="flex flex-wrap gap-2">
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          WhatsApp
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-2 break-all">{url}</p>
    </div>
  );
}
