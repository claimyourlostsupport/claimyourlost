import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getYoutubeEmbedSrc } from '../utils/youtubeEmbed.js';
import { SUPPORT_EMAIL } from '../constants/support.js';

function formatDetailDate(iso) {
  if (!iso) return '';
  const x = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(x.getTime())) return iso;
  return x.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function EventFeedCard({ item, isAuthenticated, reaction, onToggleVote }) {
  const embed = item.videoUrl ? getYoutubeEmbedSrc(item.videoUrl) : null;
  const isEvent = item.kind === 'event';
  const [shareOpen, setShareOpen] = useState(false);

  const siteBase = import.meta.env.VITE_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const shareUrl = `${siteBase.replace(/\/$/, '')}/events#${item.id}`;
  const shareText = `${isEvent ? 'Event' : 'News'}: ${item.title}\n${shareUrl}`;

  const vote = reaction?.vote || '';
  const likesCount = reaction?.likes ?? 0;
  const dislikesCount = reaction?.dislikes ?? 0;

  function shareWhatsApp() {
    const wa = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareOpen(false);
    } catch {
      window.prompt('Copy link:', shareUrl);
    }
  }

  function openShare(kind) {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(`ClaimYourLost — ${item.title}`);
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
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        copyLink();
        return;
      default:
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  }

  const mailtoChat = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Event/News: ${item.title}`)}&body=${encodeURIComponent(`I'd like to discuss:\n${item.title}\n${shareUrl}`)}`;

  return (
    <li
      id={`event-feed-${item.id}`}
      className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow scroll-mt-24"
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              isEvent ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-900'
            }`}
          >
            {isEvent ? 'Event' : 'News'}
          </span>
          {item.distanceKm != null && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {item.distanceKm.toFixed(1)} km away
            </span>
          )}
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{item.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{formatDetailDate(item.date)}</span>
          {item.time && <span>{item.time}</span>}
          {item.venue && <span className="text-slate-600">{item.venue}</span>}
          <span>
            {item.city}
            {item.country ? ` · ${item.country}` : ''}
          </span>
        </div>
      </div>
      {embed && (
        <div className="border-t border-slate-100 aspect-video bg-black max-h-[220px] sm:max-h-[280px]">
          <iframe
            title={item.title}
            src={embed}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}

      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2">
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-3">
          <div className="justify-self-start inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleVote?.(item.id)}
              disabled={!isAuthenticated}
              title={
                vote === 'like'
                  ? 'Liked (tap to dislike)'
                  : vote === 'dislike'
                    ? 'Disliked (tap to clear)'
                    : 'Like / dislike'
              }
              className={`h-7 w-7 rounded-full border flex items-center justify-center text-sm ${
                vote === 'like'
                  ? 'border-emerald-300 bg-emerald-50'
                  : vote === 'dislike'
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-200 bg-white'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {vote === 'dislike' ? '👎' : '👍'}
            </button>
            <span className="text-[11px] text-slate-600 font-medium leading-none">
              {likesCount}/{dislikesCount}
            </span>
          </div>
          <div className="justify-self-center inline-flex w-[120px] items-center justify-between flex-nowrap">
            {isAuthenticated ? (
              <a
                href={mailtoChat}
                title="Email about this"
                className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center shrink-0"
              >
                💬
              </a>
            ) : (
              <Link
                to="/login"
                state={{ from: { pathname: '/events' } }}
                title="Log in to contact"
                className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center shrink-0"
              >
                💬
              </Link>
            )}
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
          </div>
          <div className="justify-self-end relative shrink-0">
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
                <button
                  type="button"
                  onClick={() => openShare('facebook')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50"
                >
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={() => openShare('linkedin')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50"
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => openShare('instagram')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50"
                >
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => openShare('twitter')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50"
                >
                  Twitter / X
                </button>
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50"
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => openShare('mail')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50"
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
