import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ItemCard } from '../components/ItemCard.jsx';
import { SocialPostCard } from '../components/SocialPostCard.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

export function Favorites() {
  const { favorites } = useFavorites();
  const [items, setItems] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const itemIds = favorites.filter((e) => e.kind === 'item').map((e) => e.id);
    const socialIds = favorites.filter((e) => e.kind === 'social').map((e) => e.id);

    if (itemIds.length === 0 && socialIds.length === 0) {
      setItems([]);
      setPosts([]);
      setLoading(false);
      return undefined;
    }

    (async () => {
      setLoading(true);
      try {
        const [itemResults, postResults] = await Promise.all([
          Promise.all(
            itemIds.map((id) =>
              api.get(`/items/${id}`).then((r) => r.data).catch(() => null)
            )
          ),
          Promise.all(
            socialIds.map((id) =>
              api.get(`/social-posts/${id}`).then((r) => r.data).catch(() => null)
            )
          ),
        ]);
        if (cancelled) return;
        setItems(itemResults.filter(Boolean));
        setPosts(postResults.filter(Boolean));
      } catch {
        if (!cancelled) {
          setItems([]);
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [favorites]);

  const empty = favorites.length === 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
        <p className="text-sm text-slate-600 mt-1">
          Listings and SocialHub posts you liked appear here. Remove one by tapping dislike on the card.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : empty ? (
        <p className="text-center text-slate-500 py-16 bg-white rounded-2xl border border-slate-100">
          Nothing saved yet. Use the 👍 like button on a listing or SocialHub post to add it here.
        </p>
      ) : (
        <div className="space-y-10">
          {items.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Loss &amp; Found</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <ItemCard key={item._id} item={item} />
                ))}
              </div>
            </section>
          )}
          {posts.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">SocialHub</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <SocialPostCard key={post._id} post={post} />
                ))}
              </div>
            </section>
          )}
          {!loading && favorites.length > 0 && items.length === 0 && posts.length === 0 && (
            <p className="text-center text-slate-500 py-8">
              Some favorites could not be loaded (they may have been removed).{' '}
              <Link to="/" className="text-brand-blue font-semibold hover:underline">
                Browse listings
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
