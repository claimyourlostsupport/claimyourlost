import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl } from '../api/client';
import { formatDateTimeLocal } from '../utils/dateDisplay.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { publicUserLabel } from '../utils/publicUserLabel.js';
import { socialShareLandingUrl } from '../utils/socialShareLandingUrl.js';

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function normalizeUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function renderLinkifiedText(text) {
  const raw = String(text || '');
  if (!raw) return null;
  const matches = [...raw.matchAll(URL_RE)];
  if (matches.length === 0) return raw;

  const nodes = [];
  let cursor = 0;
  matches.forEach((m, idx) => {
    const hit = m[0];
    const start = m.index ?? 0;
    if (start > cursor) {
      nodes.push(<span key={`t-${idx}`}>{raw.slice(cursor, start)}</span>);
    }
    const safeHref = normalizeUrl(hit);
    nodes.push(
      <a
        key={`u-${idx}`}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-blue underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {hit}
      </a>
    );
    cursor = start + hit.length;
  });
  if (cursor < raw.length) {
    nodes.push(<span key="t-tail">{raw.slice(cursor)}</span>);
  }
  return nodes;
}

export function SocialPostCard({ post }) {
  const [descExpanded, setDescExpanded] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { applyReaction: applyFavorite } = useFavorites();
  const initialReaction = (post.reactions || []).find((r) => String(r.userId) === String(user?.id))?.value || '';
  const [vote, setVote] = useState(initialReaction);
  const [likesCount, setLikesCount] = useState(Number(post.likesCount || 0));
  const [dislikesCount, setDislikesCount] = useState(Number(post.dislikesCount || 0));
  const [reactLoading, setReactLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const city = String(post?.city || '').trim();
  const country = String(post?.country || '').trim();
  const description = String(post?.description || '').trim();
  const posterLabel = publicUserLabel(post?.userId);
  const dateLine = post?.createdAt ? formatDateTimeLocal(post.createdAt) : '';
  const metaParts = [dateLine, city || null, country || null].filter(Boolean);
  const metaLine = metaParts.join(' · ');
  const needsDescMore = description.length > 100;

  const siteBase = import.meta.env.VITE_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const sharePostUrl =
    socialShareLandingUrl(post._id) || `${siteBase.replace(/\/$/, '')}/social-hub/${post._id}`;
  const summaryLine = description
    ? description.replace(/\s+/g, ' ').trim().slice(0, 200) + (description.length > 200 ? '…' : '')
    : 'Social Hub post on ClaimYourLost — open the link for the photo or video.';
  const shareText = `${summaryLine}\n\n${sharePostUrl}`;

  const isVideo = post.mediaType === 'video';

  async function toggleVote() {
    if (!isAuthenticated || reactLoading) return;
    const next = vote === '' ? 'like' : vote === 'like' ? 'dislike' : '';
    setReactLoading(true);
    try {
      const { data } = await api.post(`/social-posts/${post._id}/react`, { value: next });
      setVote(data.userReaction || '');
      setLikesCount(Number(data.likesCount || 0));
      setDislikesCount(Number(data.dislikesCount || 0));
      applyFavorite('social', post._id, data.userReaction || '');
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

  function reportPost() {
    setOverflowOpen(false);
    window.alert('Flagged for review.');
  }

  function hidePost() {
    setOverflowOpen(false);
    setHidden(true);
  }

  if (hidden) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(sharePostUrl);
      setShareOpen(false);
    } catch {
      window.prompt('Copy link:', sharePostUrl);
    }
  }

  function openShare(kind) {
    const encodedUrl = encodeURIComponent(sharePostUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent('ClaimYourLost SocialHub');
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

  return (
    <article
      id={`social-post-${post._id}`}
      className="relative bg-white rounded-2xl shadow-sm border border-slate-100 p-4 min-h-[276px] flex flex-col hover:shadow-md transition-shadow scroll-mt-24"
    >
      <button
        type="button"
        onClick={() => setOverflowOpen((x) => !x)}
        title="More"
        className="absolute top-2 right-[-2px] z-20 p-1 text-slate-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="5" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="19" r="1.8" fill="currentColor" />
        </svg>
      </button>
      {overflowOpen && (
        <div className="absolute top-9 right-1.5 z-30 w-44 rounded-xl border border-slate-200 bg-white shadow-xl p-1.5">
          <button
            type="button"
            onClick={reportPost}
            className="w-full flex items-center gap-2 text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-700" aria-hidden>
              <path
                fill="currentColor"
                d="M6 3a1 1 0 1 1 2 0v1h8.2c1.52 0 2.47 1.65 1.7 2.95l-1.48 2.5a1 1 0 0 0 0 1.1l1.48 2.5c.77 1.3-.18 2.95-1.7 2.95H8v4a1 1 0 1 1-2 0V3Zm2 3v8h8.2l-1.48-2.5a3 3 0 0 1 0-3.1L16.2 6H8Z"
              />
            </svg>
            <span>Report</span>
          </button>
          <button
            type="button"
            onClick={hidePost}
            className="w-full flex items-center gap-2 text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-50"
          >
            <span aria-hidden>🙈</span>
            <span>Hide</span>
          </button>
        </div>
      )}

      <div className="pr-5 flex flex-col flex-1 min-h-0">
        <p className="text-xs font-semibold text-slate-800 mb-1">
          <span className="text-slate-500 font-medium">Posted by</span> {posterLabel}
        </p>
        <p className="text-[11px] text-slate-500 truncate mb-2">{metaLine || '—'}</p>

        {description ? (
          <div className="mb-3">
            <p className={`text-sm text-slate-700 leading-snug ${descExpanded ? '' : 'line-clamp-2'}`}>
              {renderLinkifiedText(description)}
            </p>
            {needsDescMore && (
              <button
                type="button"
                onClick={() => setDescExpanded((x) => !x)}
                className="mt-0.5 text-xs font-semibold text-brand-blue hover:underline"
              >
                {descExpanded ? 'less' : '…more'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-3">No description.</p>
        )}

        <div className="w-full h-[140px] rounded-xl bg-slate-100 overflow-hidden border border-slate-100">
          {post.mediaUrl ? (
            isVideo ? (
              <video
                src={assetUrl(post.mediaUrl)}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
              />
            ) : (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="block w-full h-full"
                title="Open image"
              >
                <img
                  src={assetUrl(post.mediaUrl)}
                  alt=""
                  className="block w-full h-full object-contain bg-slate-100"
                />
              </button>
            )
          ) : null}
        </div>
      </div>

      {previewOpen && post.mediaUrl && !isVideo && (
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
              src={assetUrl(post.mediaUrl)}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded-xl bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 items-center gap-3">
        <div className="justify-self-start inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 shrink-0">
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
        <div className="justify-self-center inline-flex w-[120px] items-center justify-between flex-nowrap">
          <Link
            to={`/social-hub/${post._id}/chat`}
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
    </article>
  );
}
