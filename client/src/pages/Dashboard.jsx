import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, assetUrl } from '../api/client';
import { listingImgClass, listingImageThumbBoxClass } from '../constants/images.js';
import { formatCityCountryOrPlaceholder } from '../utils/place.js';
import { useAuth } from '../context/AuthContext.jsx';

export function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const notifRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, c, n] = await Promise.all([
          api.get('/items/mine'),
          api.get('/claims/mine'),
          api.get('/notifications'),
        ]);
        if (!cancelled) {
          setPosts(p.data);
          setClaims(c.data);
          setNotifications(n.data);
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
          setClaims([]);
          setNotifications([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.state?.scrollTo === 'notifications' && notifRef.current) {
      notifRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state, loading]);

  useEffect(() => {
    async function refreshNotifications() {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data);
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('cyl-notifications-refresh', refreshNotifications);
    return () => window.removeEventListener('cyl-notifications-refresh', refreshNotifications);
  }, []);

  /** Chat alerts are removed from the panel once read; match alerts stay visible (read or unread). */
  const visibleNotifications = notifications.filter((n) => n.type !== 'message' || !n.read);

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((x) => (x._id === id ? { ...x, read: true } : x)));
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    } catch {
      /* ignore */
    }
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 text-sm mt-1">Signed in as {user?.phone}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <section ref={notifRef} id="notifications">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-sm font-semibold text-brand-blue hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            {visibleNotifications.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                No alerts yet. Possible matches for your listings and new chat messages appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {visibleNotifications.map((n) => (
                  <li
                    key={n._id}
                    className={`rounded-2xl border p-4 ${
                      n.read ? 'bg-white border-slate-100' : 'bg-blue-50/80 border-blue-100'
                    }`}
                  >
                    <p className="font-semibold text-slate-900 text-sm">{n.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{n.body}</p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {n.type === 'message' && n.relatedItemId && (
                        <Link
                          to={`/items/${String(n.relatedItemId)}/chat`}
                          onClick={() => markRead(n._id)}
                          className="text-sm font-semibold text-brand-blue hover:underline"
                        >
                          Open chat
                        </Link>
                      )}
                      {n.relatedItemId && n.type !== 'message' && (
                        <Link
                          to={`/items/${String(n.relatedItemId)}`}
                          onClick={() => !n.read && markRead(n._id)}
                          className="text-sm font-semibold text-brand-blue hover:underline"
                        >
                          Open listing
                        </Link>
                      )}
                      {n.type === 'match' && n.matchedItemId && String(n.matchedItemId) !== String(n.relatedItemId) && (
                        <Link
                          to={`/items/${String(n.matchedItemId)}`}
                          onClick={() => !n.read && markRead(n._id)}
                          className="text-sm font-semibold text-slate-600 hover:underline"
                        >
                          Matched listing
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">My posts</h2>
            {posts.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                You have not posted yet.{' '}
                <Link to="/post" className="text-brand-blue font-semibold hover:underline">
                  Post an item
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {posts.map((item) => (
                  <li
                    key={item._id}
                    className="flex gap-4 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm"
                  >
                    <div className={listingImageThumbBoxClass}>
                      {item.image ? (
                        <img src={assetUrl(item.image)} alt="" className={listingImgClass} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {item.type === 'found' ? 'Found' : 'Lost'} ·{' '}
                        {formatCityCountryOrPlaceholder(item, '—')}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Link
                          to={`/items/${item._id}`}
                          className="text-sm font-semibold text-brand-blue hover:underline"
                        >
                          View
                        </Link>
                        <Link
                          to={`/items/${item._id}/chat`}
                          className="text-sm font-semibold text-slate-600 hover:underline"
                        >
                          Messages
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">My claims</h2>
            {claims.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                No claims yet. Find a found item and submit a claim from the item page.
              </p>
            ) : (
              <ul className="space-y-3">
                {claims.map((claim) => {
                  const it = claim.itemId;
                  if (!it) return null;
                  return (
                    <li
                      key={claim._id}
                      className="flex gap-4 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm"
                    >
                      <div className={listingImageThumbBoxClass}>
                        {it.image ? (
                          <img src={assetUrl(it.image)} alt="" className={listingImgClass} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{it.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{claim.message}</p>
                        <div className="flex gap-2 mt-2">
                          <Link
                            to={`/items/${it._id}`}
                            className="text-sm font-semibold text-brand-blue hover:underline"
                          >
                            Item
                          </Link>
                          <Link
                            to={`/items/${it._id}/chat`}
                            className="text-sm font-semibold text-slate-600 hover:underline"
                          >
                            Chat
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
