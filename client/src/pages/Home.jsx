import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ItemCard } from '../components/ItemCard.jsx';
import { CategoryBrowse } from '../components/CategoryBrowse.jsx';
import { useBrowseScope } from '../context/BrowseScopeContext.jsx';
import { flagEmojiFromCountryName } from '../utils/countryFlag.js';

export function Home() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { scope, country, bootstrapping, setScope } = useBrowseScope();

  useEffect(() => {
    if (bootstrapping) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { limit: 12 };
        if (scope === 'country' && country.trim()) {
          params.country = country.trim();
        }
        const { data } = await api.get('/items', { params });
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, country, bootstrapping]);

  const recent = items.slice(0, 6);
  const countryFlag = country.trim() ? flagEmojiFromCountryName(country.trim()) : '';

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 pt-2">
        <p className="text-sm font-medium text-brand-blue uppercase tracking-wide">Find what matters</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
          Lost something? <span className="text-brand-blue">Claim it back.</span>
        </h1>
        <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
          Search lost and found listings near you.
        </p>
      </section>

      <div className="max-w-xl mx-auto space-y-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const params = new URLSearchParams();
            if (q.trim()) params.set('q', q.trim());
            window.location.href = `/search?${params.toString()}`;
          }}
        >
          <label className="block text-left text-sm font-medium text-slate-700 mb-2 sr-only">
            Search
          </label>
          <div className="flex gap-2 shadow-sm rounded-2xl border border-slate-200 bg-white p-1.5 focus-within:ring-2 focus-within:ring-brand-blue/30">
            <span className="pl-3 flex items-center text-xl" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search lost or found items"
              className="flex-1 min-w-0 border-0 bg-transparent py-3 text-base placeholder:text-slate-400 focus:ring-0"
            />
            <button
              type="submit"
              className="shrink-0 px-5 py-3 rounded-xl bg-brand-blue text-white font-semibold text-sm hover:bg-blue-800"
            >
              Search
            </button>
          </div>
        </form>

        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-0"
          role="radiogroup"
          aria-label="Listing region"
        >
          <span className="text-xs font-medium text-slate-600">Show listings</span>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-800">
              <input
                type="radio"
                name="browse-scope"
                className="text-brand-blue focus:ring-brand-blue"
                checked={scope === 'country'}
                onChange={() => setScope('country')}
              />
              <span className="inline-flex items-center gap-1 flex-wrap">
                Country
                {country.trim() ? (
                  <>
                    <span className="text-slate-500 font-normal">({country})</span>
                    {countryFlag ? (
                      <span className="text-base leading-none" title={country.trim()} aria-hidden>
                        {countryFlag}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-800">
              <input
                type="radio"
                name="browse-scope"
                className="text-brand-blue focus:ring-brand-blue"
                checked={scope === 'world'}
                onChange={() => setScope('world')}
              />
              <span className="inline-flex items-center gap-1">
                World
                <span className="text-base leading-none" title="Worldwide" aria-hidden>
                  🌐
                </span>
              </span>
            </label>
          </div>
        </div>
        {scope === 'country' && !country.trim() && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Set your country from the menu (⋮) in the top bar, or choose World to see all countries.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 justify-center max-w-2xl mx-auto">
        <Link
          to="/post?type=lost"
          className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-brand-red text-white font-semibold shadow-md hover:opacity-95 active:scale-[0.98] transition-transform"
        >
          I lost something
        </Link>
        <Link
          to="/post?type=found"
          className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-brand-green text-white font-semibold shadow-md hover:opacity-95 active:scale-[0.98] transition-transform"
        >
          I found something
        </Link>
      </div>

      <p className="text-center">
        <Link to="/map" className="text-sm font-semibold text-brand-blue hover:underline">
          Browse listings on the map →
        </Link>
      </p>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent listings</h2>
          <Link to="/search" className="text-sm font-semibold text-brand-blue hover:underline">
            View all
          </Link>
        </div>
        {bootstrapping || loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <p className="text-center text-slate-500 py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            No listings yet. Be the first to post.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </section>

      <CategoryBrowse />
    </div>
  );
}
