import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { SocialPostCard } from '../components/SocialPostCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/** SocialHub-only: resolve city/country from GPS; otherwise country "World". Not shared with other tabs. */
async function socialHubResolvePlaceFromGps() {
  let city = '';
  let country = 'World';
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
    if (!country) country = 'World';
  } catch {
    /* keep World */
  }
  return { city, country: country || 'World', lat, lng };
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

export function SocialHub() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postError, setPostError] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locHint, setLocHint] = useState('');
  const [nearEnabled, setNearEnabled] = useState(false);
  const [nearKm, setNearKm] = useState(25);
  const [nearCoords, setNearCoords] = useState(null);
  const [nearLoading, setNearLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const endpoint = nearEnabled && nearCoords ? '/social-posts/near' : '/social-posts';
      const params =
        nearEnabled && nearCoords ? { lat: nearCoords.lat, lng: nearCoords.lng, km: nearKm } : undefined;
      const { data } = await api.get(endpoint, { params });
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [nearEnabled, nearCoords, nearKm]);

  function openPostModal() {
    setPostError('');
    setLocHint('');
    if (!isAuthenticated) {
      setPostModalOpen(true);
      return;
    }
    setPostModalOpen(true);
  }

  function closePostModal() {
    if (submitting) return;
    setPostModalOpen(false);
    setPostError('');
    setLocHint('');
  }

  async function onSubmitPost(e) {
    e.preventDefault();
    setPostError('');
    setLocHint('');
    if (!isAuthenticated) {
      setPostError('Log in to post.');
      return;
    }
    if (!file) {
      setPostError('Choose an image or video.');
      return;
    }
    setSubmitting(true);
    try {
      setLocHint('Detecting location…');
      const { city, country, lat, lng } = await socialHubResolvePlaceFromGps();
      setLocHint('');

      const fd = new FormData();
      fd.append('media', file);
      fd.append('description', description.trim());
      fd.append('city', city);
      fd.append('country', country);
      if (lat != null && lng != null) {
        fd.append('lat', String(lat));
        fd.append('lng', String(lng));
      }
      await api.post('/social-posts', fd);
      setDescription('');
      setFile(null);
      setPostModalOpen(false);
      await load();
    } catch (err) {
      setPostError(err.response?.data?.error || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative space-y-5 pb-20 md:pb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={async () => {
            if (nearEnabled) {
              setNearEnabled(false);
              setNearCoords(null);
              return;
            }
            setNearLoading(true);
            setError('');
            try {
              const coords = await getCurrentCoords();
              setNearCoords(coords);
              setNearEnabled(true);
            } catch (e) {
              setNearEnabled(false);
              setNearCoords(null);
              setError(e.message || 'Could not get your location.');
            } finally {
              setNearLoading(false);
            }
          }}
          disabled={nearLoading}
          className={`px-4 py-2 rounded-full text-sm font-semibold border ${
            nearEnabled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-800 hover:border-brand-blue'
          }`}
        >
          {nearLoading ? 'Locating…' : nearEnabled ? '✓ Near me' : '📍 Near me (25 km)'}
        </button>

        <div className="flex items-center gap-2 min-w-[220px]">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={nearKm}
            onChange={(e) => setNearKm(Number(e.target.value))}
            className="w-40 accent-brand-blue"
            aria-label="Nearby distance in km"
          />
          <span className="text-xs text-slate-600 w-16 text-right">{nearKm} km</span>
        </div>
      </div>

      <section aria-label="Feed">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-slate-500 py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            No posts yet. Tap Post to share.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {posts.map((p) => (
              <SocialPostCard key={p._id} post={p} />
            ))}
          </div>
        )}
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
          aria-labelledby="socialhub-post-title"
          onClick={closePostModal}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 id="socialhub-post-title" className="text-lg font-bold text-slate-900">
                New post
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
                <Link to="/login" className="font-semibold text-brand-blue hover:underline">
                  Log in
                </Link>{' '}
                to share an image or video.
              </div>
            ) : (
              <form onSubmit={onSubmitPost} className="p-4 space-y-4">
                <p className="text-xs text-slate-500">
                  Location is detected automatically from your device when you post. If it cannot be detected, your
                  post is tagged as worldwide.
                </p>
                <div>
                  <label htmlFor="sh-media" className="block text-xs font-medium text-slate-600 mb-1">
                    Image or video <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="sh-media"
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label htmlFor="sh-desc" className="block text-xs font-medium text-slate-600 mb-1">
                    Description
                  </label>
                  <textarea
                    id="sh-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder="What is this about?"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                {locHint && !postError && (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{locHint}</p>
                )}
                {postError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {postError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-5 py-3 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
