import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { SocialPostCard } from '../components/SocialPostCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function SocialHub() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [postError, setPostError] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/social-posts');
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
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setPostError('');
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
      const fd = new FormData();
      fd.append('media', file);
      fd.append('description', description.trim());
      fd.append('city', city.trim());
      fd.append('country', country.trim());
      await api.post('/social-posts', fd);
      setDescription('');
      setCity('');
      setCountry('');
      setFile(null);
      await load();
    } catch (err) {
      setPostError(err.response?.data?.error || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SocialHub</h1>
        <p className="text-slate-600 text-sm mt-1 max-w-xl">Share photos or short videos with the community.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3">New post</h2>
        {!isAuthenticated ? (
          <p className="text-sm text-slate-600">
            <Link to="/login" className="font-semibold text-brand-blue hover:underline">
              Log in
            </Link>{' '}
            to share an image or video.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 max-w-lg">
            <div>
              <label htmlFor="social-media" className="block text-xs font-medium text-slate-600 mb-1">
                Image or video <span className="text-red-600">*</span>
              </label>
              <input
                id="social-media"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-700"
              />
            </div>
            <div>
              <label htmlFor="social-desc" className="block text-xs font-medium text-slate-600 mb-1">
                Description
              </label>
              <textarea
                id="social-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="What is this about?"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="social-city" className="block text-xs font-medium text-slate-600 mb-1">
                  City
                </label>
                <input
                  id="social-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="social-country" className="block text-xs font-medium text-slate-600 mb-1">
                  Country
                </label>
                <input
                  id="social-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
            {postError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{postError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Feed</h2>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-slate-500 py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            No posts yet. Be the first to share.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {posts.map((p) => (
              <SocialPostCard key={p._id} post={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
