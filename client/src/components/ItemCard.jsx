import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl } from '../api/client';
import {
  listingImagePlaceholderClass,
} from '../constants/images.js';
import { formatItemCategory } from '../constants/categories.js';
import { formatCalendarDate, formatDateTimeLocal } from '../utils/dateDisplay.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

export function ItemCard({ item }) {
  const [descExpanded, setDescExpanded] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { applyReaction: applyFavorite } = useFavorites();
  const initialReaction = (item.reactions || []).find((r) => String(r.userId) === String(user?.id))?.value || '';
  const [vote, setVote] = useState(initialReaction);
  const [likesCount, setLikesCount] = useState(Number(item.likesCount || 0));
  const [dislikesCount, setDislikesCount] = useState(Number(item.dislikesCount || 0));
  const [reactLoading, setReactLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const isFound = item.type === 'found';
  const city =
    item?.city?.trim?.() || item?.location?.trim?.() || '';
  const country =
    item?.country != null && String(item.country).trim() ? String(item.country).trim() : '';
  const description = String(item?.description || '').trim();
  const subcategory = String(item?.subcategory || '').trim().toLowerCase();
  const customSubType = String(item?.subcategoryCustom || '').trim();
  const categoryLine =
    subcategory === 'other'
      ? customSubType || ''
      : formatItemCategory(item).replace(/\s*·\s*Other$/i, '');
  const showSeeMore = description.length > 70;
  const siteBase = import.meta.env.VITE_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const listingUrl = `${siteBase.replace(/\/$/, '')}/items/${item._id}`;
  const shareText = `${isFound ? 'Found' : 'Lost'}: ${item.title}\n${listingUrl}`;

  async function toggleVote() {
    if (!isAuthenticated || reactLoading) return;
    const next = vote === '' ? 'like' : vote === 'like' ? 'dislike' : '';
    setReactLoading(true);
    try {
      const { data } = await api.post(`/items/${item._id}/react`, { value: next });
      setVote(data.userReaction || '');
      setLikesCount(Number(data.likesCount || 0));
      setDislikesCount(Number(data.dislikesCount || 0));
      applyFavorite('item', item._id, data.userReaction || '');
    } catch {
      /* ignore */
    } finally {
      setReactLoading(false);
    }
  }

  function shareWhatsApp() {
    const wa = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
  }

  function reportItem() {
    setOverflowOpen(false);
    window.alert('Flagged for review.');
  }

  function hideItem() {
    setOverflowOpen(false);
    setHidden(true);
  }

  if (hidden) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setShareOpen(false);
    } catch {
      window.prompt('Copy listing link:', listingUrl);
    }
  }

  function openShare(kind) {
    const encodedUrl = encodeURIComponent(listingUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(item.title || 'ClaimYourLost');
    let url = '';
    switch (kind) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'mail':
        url = `mailto:?subject=${encodedTitle}&body=${encodedText}`;
        break;
      case 'instagram':
        // Instagram web does not support direct URL share intents; open app/site and let user paste.
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        copyLink();
        return;
      default:
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  }

  return (
    <article className="relative bg-white rounded-2xl shadow-sm border border-slate-100 p-3 min-h-[240px] hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => setOverflowOpen((x) => !x)}
        title="More"
        className="absolute top-1.5 right-[-4px] z-20 p-1 text-slate-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="5" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="19" r="1.8" fill="currentColor" />
        </svg>
      </button>
      {overflowOpen && (
        <div className="absolute top-8 right-1.5 z-30 w-44 rounded-xl border border-slate-200 bg-white shadow-xl p-1.5">
          <button
            type="button"
            onClick={reportItem}
            className="w-full flex items-center gap-2 text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-700" aria-hidden>
              <path fill="currentColor" d="M6 3a1 1 0 1 1 2 0v1h8.2c1.52 0 2.47 1.65 1.7 2.95l-1.48 2.5a1 1 0 0 0 0 1.1l1.48 2.5c.77 1.3-.18 2.95-1.7 2.95H8v4a1 1 0 1 1-2 0V3Zm2 3v8h8.2l-1.48-2.5a3 3 0 0 1 0-3.1L16.2 6H8Z" />
            </svg>
            <span>Report</span>
          </button>
          <button
            type="button"
            onClick={hideItem}
            className="w-full flex items-center gap-2 text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-50"
          >
            <span aria-hidden>🙈</span>
            <span>Hide</span>
          </button>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                isFound ? 'bg-brand-green' : 'bg-brand-red'
              }`}
            >
              {isFound ? 'FOUND' : 'LOST'}
            </span>
            {categoryLine && (
              <p className="text-[11px] text-slate-500 truncate">
                {categoryLine}
              </p>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 line-clamp-2">{item.title}</h3>

          <p className="text-xs text-slate-600 truncate">📍 {city || 'Not set'}</p>

          <p className="text-xs text-slate-600 truncate">🌍 {country || 'Not set'}</p>

          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span aria-hidden>📅</span>
            {item.date
              ? formatCalendarDate(item.date)
              : formatDateTimeLocal(item.createdAt)}
          </p>

          {description ? (
            <p className={`text-xs text-slate-600 ${descExpanded ? '' : 'line-clamp-1'}`}>
              {description}
              {showSeeMore && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((x) => !x)}
                  className="ml-1 text-brand-blue font-medium hover:underline"
                >
                  {descExpanded ? 'see less' : 'see more'}
                </button>
              )}
            </p>
          ) : (
            <p className="text-xs text-slate-400">No description.</p>
          )}

          {item.distanceKm != null && Number.isFinite(item.distanceKm) && (
            <p className="text-xs font-medium text-brand-blue">
              📏 {item.distanceKm.toFixed(1)} km away
            </p>
          )}
        </div>

        <div className="relative flex h-[120px] w-[120px] items-center justify-center rounded-xl bg-slate-100 shrink-0 overflow-visible">
          <div className="h-full w-full rounded-xl overflow-hidden">
            {item.image ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="block h-full w-full"
                title="Open image"
              >
                <img src={assetUrl(item.image)} alt="" className="h-full w-full object-contain rounded-lg bg-slate-100" />
              </button>
            ) : (
              <div className={listingImagePlaceholderClass}>📦</div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && item.image && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="relative max-w-3xl w-full">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-10 right-0 text-white text-sm font-semibold"
            >
              Close ✕
            </button>
            <img
              src={assetUrl(item.image)}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded-xl bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2.5">
        <Link
          to={`/items/${item._id}`}
          className="inline-flex items-center whitespace-nowrap px-3 py-1.5 rounded-lg bg-white border border-slate-300 shadow-sm text-slate-800 text-xs font-semibold leading-none hover:bg-slate-50 transition-colors shrink-0"
        >
          View details
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 text-base flex-nowrap ml-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5">
            <button
              type="button"
              onClick={toggleVote}
              disabled={!isAuthenticated || reactLoading}
              title={vote === 'like' ? 'Liked (tap to dislike)' : vote === 'dislike' ? 'Disliked (tap to clear)' : 'Like / dislike'}
              className={`h-7 w-7 rounded-full border flex items-center justify-center ${
                vote === 'like'
                  ? 'border-emerald-300 bg-emerald-50'
                  : vote === 'dislike'
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-200 bg-white'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {vote === 'dislike' ? '👎' : '👍'}
            </button>
            <span className="text-[11px] text-slate-600 font-medium leading-none">{likesCount}/{dislikesCount}</span>
          </div>
          <Link
            to={`/items/${item._id}/chat`}
            title="Chat"
            className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center shrink-0"
          >
            💬
          </Link>
          <button
            type="button"
            onClick={shareWhatsApp}
            title="WhatsApp"
            className="h-8 w-8 rounded-full border border-[#25D366] bg-[#25D366] text-white flex items-center justify-center shrink-0"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M20.52 3.48A11.78 11.78 0 0 0 12.07 0C5.56 0 .23 5.3.23 11.82c0 2.08.54 4.1 1.56 5.88L0 24l6.49-1.7a11.79 11.79 0 0 0 5.58 1.42h.01c6.51 0 11.84-5.3 11.84-11.82 0-3.16-1.23-6.13-3.4-8.42Zm-8.45 18.2h-.01a9.84 9.84 0 0 1-5.02-1.38l-.36-.21-3.85 1.01 1.03-3.75-.23-.38a9.8 9.8 0 0 1-1.5-5.15c0-5.44 4.44-9.87 9.9-9.87 2.64 0 5.11 1.02 6.98 2.89a9.8 9.8 0 0 1 2.9 6.98c0 5.44-4.45 9.86-9.84 9.86Zm5.41-7.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.08 2.9 1.23 3.1.15.2 2.12 3.24 5.14 4.54.72.31 1.28.49 1.72.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
            </svg>
          </button>
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setShareOpen((x) => !x)}
              title="ShareIt"
              className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center shrink-0"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-700" aria-hidden>
                <path
                  fill="currentColor"
                  d="M18 16a3 3 0 0 0-2.39 1.2l-6.8-3.4a3.13 3.13 0 0 0 0-1.6l6.8-3.4A3 3 0 1 0 15 7a3.13 3.13 0 0 0 .06.6l-6.8 3.4a3 3 0 1 0 0 2l6.8 3.4A3 3 0 1 0 18 16Z"
                />
              </svg>
            </button>
            {shareOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5">
                <button type="button" onClick={() => openShare('facebook')} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50">Facebook</button>
                <button type="button" onClick={() => openShare('linkedin')} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50">LinkedIn</button>
                <button type="button" onClick={() => openShare('instagram')} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50">Instagram</button>
                <button type="button" onClick={() => openShare('twitter')} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50">Twitter / X</button>
                <button type="button" onClick={shareWhatsApp} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50">WhatsApp</button>
                <button type="button" onClick={() => openShare('mail')} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50">Email</button>
                <button type="button" onClick={copyLink} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50">Copy link</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
