import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { EventFeedCard } from '../components/EventFeedCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getYoutubeEmbedSrc } from '../utils/youtubeEmbed.js';

const USER_POSTS_KEY = 'cyl_event_news_user_posts_v1';
const REACTIONS_KEY = 'cyl_event_news_reactions_v1';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function getCurrentCoords() {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported in this browser.');
  }
  if (!window.isSecureContext) {
    throw new Error('Near me needs HTTPS or localhost.');
  }
  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 120000,
    });
  });
  return { lat: Number(pos.coords.latitude), lng: Number(pos.coords.longitude) };
}

/** Resolve city/country from GPS (same API as SocialHub). */
async function resolvePlaceFromGps() {
  let city = '';
  let country = '';
  let lat = null;
  let lng = null;
  if (!navigator.geolocation || !window.isSecureContext) {
    return { city, country, lat, lng };
  }
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 120000,
      });
    });
    lat = Number(pos.coords.latitude);
    lng = Number(pos.coords.longitude);
    const { data } = await api.get('/items/reverse-geocode', {
      params: { lat, lng },
    });
    if (data?.city) city = String(data.city).trim();
    if (data?.country) country = String(data.country).trim();
  } catch {
    /* manual fields */
  }
  return { city, country, lat, lng };
}

function loadUserPosts() {
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function loadStoredReactions() {
  try {
    const raw = sessionStorage.getItem(REACTIONS_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

/** Demo seed counts for dummy items (session overrides per-device). */
const DEMO_REACTION_SEED = {
  'ev-1': { likes: 14, dislikes: 2 },
  'news-1': { likes: 9, dislikes: 1 },
  'ev-2': { likes: 6, dislikes: 0 },
  'news-2': { likes: 11, dislikes: 3 },
  'ev-3': { likes: 4, dislikes: 1 },
  'news-3': { likes: 7, dislikes: 0 },
  'ev-4': { likes: 5, dislikes: 2 },
  'news-4': { likes: 18, dislikes: 4 },
};

/** Demo content with coordinates for distance filtering (not from API). */
const DUMMY_FEED = [
  {
    id: 'ev-1',
    kind: 'event',
    title: 'City-wide lost & found awareness day',
    summary:
      'Local councils and volunteers help reunite owners with lost property. Free registration desk and document-safe storage tips.',
    date: '2026-05-18',
    time: '09:00 – 16:00',
    venue: 'Town Hall plaza',
    city: 'Bengaluru',
    country: 'India',
    lat: 12.9716,
    lng: 77.5946,
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  },
  {
    id: 'news-1',
    kind: 'news',
    title: 'New guidelines for posting found pets',
    summary:
      'Updated advice on photos, microchip checks, and how to avoid scams when someone claims a lost pet.',
    date: '2026-04-02',
    city: 'Bengaluru',
    country: 'India',
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    id: 'ev-2',
    kind: 'event',
    title: 'Beach cleanup & lost-item drop-off',
    summary:
      'Morning cleanup along the promenade; bring tagged found items for the community board.',
    date: '2026-06-07',
    time: '07:00 – 11:00',
    venue: 'Marina Beach, north entrance',
    city: 'Chennai',
    country: 'India',
    lat: 13.0478,
    lng: 80.2827,
  },
  {
    id: 'news-2',
    kind: 'news',
    title: 'Study: most lost phones are returned within 48 hours',
    summary:
      'A regional survey highlights the role of clear lock-screen contact info and neighbourhood apps.',
    date: '2026-03-22',
    city: 'Mumbai',
    country: 'India',
    lat: 19.076,
    lng: 72.8777,
    videoUrl: 'https://youtu.be/L_jWHffIx5E',
  },
  {
    id: 'ev-3',
    kind: 'event',
    title: 'University campus lost property week',
    summary:
      'Student union hosts daily booths; unclaimed items donated to charity after 30 days.',
    date: '2026-04-28',
    time: '10:00 – 15:00',
    venue: 'Main quad',
    city: 'New Delhi',
    country: 'India',
    lat: 28.6139,
    lng: 77.209,
  },
  {
    id: 'news-3',
    kind: 'news',
    title: 'Partnership expands cross-city listing search',
    summary:
      'ClaimYourLost-style hubs in three metros now share anonymised match hints to improve recovery rates.',
    date: '2026-04-10',
    city: 'Hyderabad',
    country: 'India',
    lat: 17.385,
    lng: 78.4867,
  },
  {
    id: 'ev-4',
    kind: 'event',
    title: 'Community safety & lost-property workshop',
    summary:
      'Short talks from police liaison and insurance advisers; Q&A on reporting and recovery.',
    date: '2026-05-03',
    time: '14:00 – 17:00',
    venue: 'Library auditorium',
    city: 'Pune',
    country: 'India',
    lat: 18.5204,
    lng: 73.8567,
    videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  },
  {
    id: 'news-4',
    kind: 'news',
    title: 'International: EU draft rules on online lost-and-found marketplaces',
    summary:
      'Proposal focuses on identity checks for high-value claims and standard dispute windows.',
    date: '2026-03-30',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
  },
];

function buildInitialReactions(userPostIds) {
  const stored = loadStoredReactions();
  const ids = new Set([...DUMMY_FEED.map((p) => p.id), ...userPostIds]);
  const out = {};
  for (const id of ids) {
    const seed = DEMO_REACTION_SEED[id] || { likes: 0, dislikes: 0 };
    const s = stored[id];
    out[id] = {
      likes: s?.likes ?? seed.likes,
      dislikes: s?.dislikes ?? seed.dislikes,
      vote: s?.vote ?? '',
    };
  }
  return out;
}

export function EventNews() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [nearEnabled, setNearEnabled] = useState(false);
  const [nearKm, setNearKm] = useState(25);
  const [nearCoords, setNearCoords] = useState(null);
  const [nearLoading, setNearLoading] = useState(false);
  const [nearError, setNearError] = useState('');
  const [videoPaste, setVideoPaste] = useState('');

  const [userPosts, setUserPosts] = useState(loadUserPosts);
  const [reactions, setReactions] = useState(() =>
    buildInitialReactions(loadUserPosts().map((p) => p.id)),
  );

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postError, setPostError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postKind, setPostKind] = useState('event');
  const [postTitle, setPostTitle] = useState('');
  const [postSummary, setPostSummary] = useState('');
  const [postDate, setPostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [postTime, setPostTime] = useState('');
  const [postVenue, setPostVenue] = useState('');
  const [postCity, setPostCity] = useState('');
  const [postCountry, setPostCountry] = useState('');
  const [postLat, setPostLat] = useState(null);
  const [postLng, setPostLng] = useState(null);
  const [postVideo, setPostVideo] = useState('');
  const [locDetecting, setLocDetecting] = useState(false);

  const embedSrc = useMemo(() => getYoutubeEmbedSrc(videoPaste), [videoPaste]);

  const baseFeed = useMemo(() => [...userPosts, ...DUMMY_FEED], [userPosts]);

  const filtered = useMemo(() => {
    let list = baseFeed.map((item) => {
      if (!nearEnabled || !nearCoords || item.lat == null || item.lng == null) {
        return { ...item, distanceKm: null };
      }
      const d = haversineKm(nearCoords.lat, nearCoords.lng, item.lat, item.lng);
      return { ...item, distanceKm: d };
    });

    if (nearEnabled && nearCoords) {
      const cap = nearKm <= 0 ? Infinity : nearKm;
      list = list.filter((item) => item.distanceKm != null && item.distanceKm <= cap);
    }

    return list.sort((a, b) => {
      if (nearEnabled && nearCoords && a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return String(b.date).localeCompare(String(a.date));
    });
  }, [baseFeed, nearEnabled, nearCoords, nearKm]);

  const events = filtered.filter((x) => x.kind === 'event');
  const news = filtered.filter((x) => x.kind === 'news');

  useEffect(() => {
    try {
      sessionStorage.setItem(REACTIONS_KEY, JSON.stringify(reactions));
    } catch {
      /* ignore */
    }
  }, [reactions]);

  useEffect(() => {
    setReactions((prev) => {
      let next = prev;
      let changed = false;
      for (const p of userPosts) {
        if (!next[p.id]) {
          const seed = DEMO_REACTION_SEED[p.id] || { likes: 0, dislikes: 0 };
          next = { ...next, [p.id]: { likes: seed.likes, dislikes: seed.dislikes, vote: '' } };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [userPosts]);

  const scrollToHash = useCallback(() => {
    const raw = location.hash?.replace(/^#/, '').trim();
    if (!raw) return;
    requestAnimationFrame(() => {
      document.getElementById(`event-feed-${raw}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [location.hash]);

  useEffect(() => {
    scrollToHash();
  }, [scrollToHash, filtered.length]);

  function toggleReactionVote(id) {
    if (!isAuthenticated) return;
    setReactions((prev) => {
      const seed = DEMO_REACTION_SEED[id] || { likes: 0, dislikes: 0 };
      const cur = prev[id] || { likes: seed.likes, dislikes: seed.dislikes, vote: '' };
      const nextVote = cur.vote === '' ? 'like' : cur.vote === 'like' ? 'dislike' : '';
      let likes = cur.likes;
      let dislikes = cur.dislikes;
      if (cur.vote === '' && nextVote === 'like') likes += 1;
      else if (cur.vote === 'like' && nextVote === 'dislike') {
        likes -= 1;
        dislikes += 1;
      } else if (cur.vote === 'dislike' && nextVote === '') dislikes -= 1;
      return { ...prev, [id]: { likes, dislikes, vote: nextVote } };
    });
  }

  function openPostModal() {
    setPostError('');
    setPostModalOpen(true);
  }

  function closePostModal() {
    setPostModalOpen(false);
    setPostError('');
    setSubmitting(false);
    setPostKind('event');
    setPostTitle('');
    setPostSummary('');
    setPostDate(new Date().toISOString().slice(0, 10));
    setPostTime('');
    setPostVenue('');
    setPostCity('');
    setPostCountry('');
    setPostLat(null);
    setPostLng(null);
    setPostVideo('');
  }

  async function detectPostLocation() {
    setLocDetecting(true);
    setPostError('');
    try {
      const place = await resolvePlaceFromGps();
      if (place.city) setPostCity(place.city);
      if (place.country) setPostCountry(place.country);
      setPostLat(place.lat);
      setPostLng(place.lng);
      if (!place.city && !place.country) {
        setPostError('Could not resolve place. Enter city and country manually.');
      }
    } catch {
      setPostError('Location permission denied or unavailable.');
    } finally {
      setLocDetecting(false);
    }
  }

  async function onSubmitUserPost(e) {
    e.preventDefault();
    setPostError('');
    if (!isAuthenticated) {
      setPostError('Log in to post.');
      return;
    }
    if (!postTitle.trim()) {
      setPostError('Title is required.');
      return;
    }
    if (!postSummary.trim()) {
      setPostError('Summary is required.');
      return;
    }
    setSubmitting(true);
    try {
      const newItem = {
        id: `u-${Date.now()}`,
        kind: postKind,
        title: postTitle.trim(),
        summary: postSummary.trim(),
        date: postDate || new Date().toISOString().slice(0, 10),
        time: postTime.trim() || undefined,
        venue: postVenue.trim() || undefined,
        city: postCity.trim() || '—',
        country: postCountry.trim() || '',
        lat: postLat,
        lng: postLng,
        videoUrl: postVideo.trim() || undefined,
      };
      const next = [newItem, ...userPosts];
      setUserPosts(next);
      try {
        localStorage.setItem(USER_POSTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setReactions((prev) => ({
        ...prev,
        [newItem.id]: { likes: 0, dislikes: 0, vote: '' },
      }));
      closePostModal();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleNearMe() {
    setNearError('');
    if (nearEnabled) {
      setNearEnabled(false);
      setNearCoords(null);
      return;
    }
    setNearLoading(true);
    try {
      const coords = await getCurrentCoords();
      setNearCoords(coords);
      setNearEnabled(true);
    } catch (e) {
      setNearError(e.message || 'Could not get your location.');
    } finally {
      setNearLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-24">
      <header className="text-center max-w-2xl mx-auto space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">Community</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Events &amp; news</h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Local happenings, updates, and stories from the ClaimYourLost community. Demo content below — replace with
          your own feed when ready.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={toggleNearMe}
            disabled={nearLoading}
            title={nearEnabled ? 'Turn off nearby filter' : 'Use your location'}
            className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border shrink-0 transition-colors ${
              nearEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-800 hover:border-brand-blue'
            }`}
          >
            {nearLoading ? 'Locating…' : nearEnabled ? `Near me (${nearKm} km)` : 'Near me'}
          </button>

          <div
            className={`flex flex-1 items-center gap-3 min-w-[12rem] max-w-md ${!nearEnabled ? 'opacity-45 pointer-events-none' : ''}`}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={nearKm}
              onChange={(e) => setNearKm(Number(e.target.value))}
              className="flex-1 h-1.5 accent-brand-blue cursor-pointer disabled:cursor-not-allowed"
              aria-label="Radius in kilometres"
              disabled={!nearEnabled}
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-700 tabular-nums w-[4.5rem] text-right shrink-0">
              {nearKm} km
            </span>
          </div>
        </div>
        {nearError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{nearError}</p>
        )}
        <p className="mt-2 text-[11px] sm:text-xs text-slate-500">
          {nearEnabled
            ? nearKm <= 0
              ? 'Radius 0 km shows all demo items (no distance limit).'
              : `Showing items within ${nearKm} km of you.`
            : 'Turn on Near me to filter by distance. Slider sets radius 0–100 km (default 25 km).'}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-sm">
              📅
            </span>
            Events
          </h2>
          {events.length === 0 ? (
            <EmptyNear />
          ) : (
            <ul className="space-y-4">
              {events.map((item) => (
                <EventFeedCard
                  key={item.id}
                  item={item}
                  isAuthenticated={isAuthenticated}
                  reaction={reactions[item.id]}
                  onToggleVote={toggleReactionVote}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-800 text-sm">
              📰
            </span>
            News
          </h2>
          {news.length === 0 ? (
            <EmptyNear />
          ) : (
            <ul className="space-y-4">
              {news.map((item) => (
                <EventFeedCard
                  key={item.id}
                  item={item}
                  isAuthenticated={isAuthenticated}
                  reaction={reactions[item.id]}
                  onToggleVote={toggleReactionVote}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <h2 className="text-base font-bold text-slate-900 mb-1">Paste a video link</h2>
        <p className="text-sm text-slate-600 mb-4">
          Try a YouTube URL — it will play inline below (preview only; not saved).
        </p>
        <input
          type="url"
          value={videoPaste}
          onChange={(e) => setVideoPaste(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/…"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
        />
        {embedSrc ? (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video max-w-3xl mx-auto">
            <iframe
              title="Video preview"
              src={embedSrc}
              className="w-full h-full min-h-[200px]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : videoPaste.trim() ? (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Could not recognize a YouTube link. Use a full youtube.com or youtu.be URL.
          </p>
        ) : null}
      </section>

      <button
        type="button"
        onClick={openPostModal}
        className="fixed bottom-24 right-4 z-30 md:bottom-8 min-h-[3.25rem] px-5 rounded-full bg-brand-blue text-white text-sm font-bold shadow-lg hover:bg-blue-800 flex items-center justify-center"
        aria-label="Post"
      >
        Post
      </button>

      {postModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eventnews-post-title"
          onClick={closePostModal}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 id="eventnews-post-title" className="text-lg font-bold text-slate-900">
                New event / news
              </h2>
              <button
                type="button"
                onClick={closePostModal}
                className="text-slate-500 hover:text-slate-800 text-xl leading-none px-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {!isAuthenticated ? (
              <div className="p-6 text-sm text-slate-600">
                <Link to="/login" state={{ from: { pathname: '/events' } }} className="font-semibold text-brand-blue hover:underline">
                  Log in
                </Link>{' '}
                to add an event or news item (saved on this device).
              </div>
            ) : (
              <form onSubmit={onSubmitUserPost} className="p-4 space-y-4">
                <div>
                  <label htmlFor="en-kind" className="block text-xs font-medium text-slate-600 mb-1">
                    Type
                  </label>
                  <select
                    id="en-kind"
                    value={postKind}
                    onChange={(e) => setPostKind(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="event">Event</option>
                    <option value="news">News</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="en-title" className="block text-xs font-medium text-slate-600 mb-1">
                    Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="en-title"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    maxLength={200}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="en-summary" className="block text-xs font-medium text-slate-600 mb-1">
                    Summary <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="en-summary"
                    value={postSummary}
                    onChange={(e) => setPostSummary(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="en-date" className="block text-xs font-medium text-slate-600 mb-1">
                      Date
                    </label>
                    <input
                      id="en-date"
                      type="date"
                      value={postDate}
                      onChange={(e) => setPostDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="en-time" className="block text-xs font-medium text-slate-600 mb-1">
                      Time (optional)
                    </label>
                    <input
                      id="en-time"
                      value={postTime}
                      onChange={(e) => setPostTime(e.target.value)}
                      placeholder="e.g. 10:00 – 14:00"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="en-venue" className="block text-xs font-medium text-slate-600 mb-1">
                    Venue (optional)
                  </label>
                  <input
                    id="en-venue"
                    value={postVenue}
                    onChange={(e) => setPostVenue(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="en-video" className="block text-xs font-medium text-slate-600 mb-1">
                    YouTube URL (optional)
                  </label>
                  <input
                    id="en-video"
                    type="url"
                    value={postVideo}
                    onChange={(e) => setPostVideo(e.target.value)}
                    placeholder="https://youtube.com/…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="en-city" className="block text-xs font-medium text-slate-600 mb-1">
                      City
                    </label>
                    <input
                      id="en-city"
                      value={postCity}
                      onChange={(e) => setPostCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="en-country" className="block text-xs font-medium text-slate-600 mb-1">
                      Country
                    </label>
                    <input
                      id="en-country"
                      value={postCountry}
                      onChange={(e) => setPostCountry(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={detectPostLocation}
                  disabled={locDetecting}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  {locDetecting ? 'Detecting…' : 'Use my location (fill city & map)'}
                </button>
                <p className="text-[11px] text-slate-500">
                  Posts you add are stored in this browser only until a server feed is connected.
                </p>
                {postError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{postError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-5 py-3 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Add to feed'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyNear() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 px-4 text-center text-sm text-slate-500">
      Nothing in range. Try a larger radius or turn off Near me to see all demo items.
    </div>
  );
}
