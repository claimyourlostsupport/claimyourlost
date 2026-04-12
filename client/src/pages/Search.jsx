import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ItemCard } from '../components/ItemCard.jsx';
import { MAIN_CATEGORIES, getMainCategory } from '../constants/categories.js';
import { mergeCountryOptions } from '../constants/countries.js';

export function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const category = params.get('category') || 'all';
  const subcategory = params.get('subcategory') || 'all';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const country = params.get('country') || 'all';

  const [localQ, setLocalQ] = useState(q);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nearbyMode, setNearbyMode] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geo, setGeo] = useState(null);
  const [countryList, setCountryList] = useState([]);

  const mainMeta = category !== 'all' ? getMainCategory(category) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/items/countries');
        if (!cancelled && Array.isArray(data)) {
          setCountryList(mergeCountryOptions(data));
        }
      } catch {
        if (!cancelled) setCountryList(mergeCountryOptions([]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const catParam = category === 'all' ? undefined : category;
        const subParam = subcategory === 'all' ? undefined : subcategory;
        if (nearbyMode && geo) {
          const { data } = await api.get('/items/near', {
            params: {
              lat: geo.lat,
              lng: geo.lng,
              km: 25,
              type: type || undefined,
              category: catParam,
              subcategory: subParam,
              country: country === 'all' ? undefined : country,
            },
          });
          if (!cancelled) setItems(data);
        } else {
          const { data } = await api.get('/items/search', {
            params: {
              q: q || undefined,
              type: type || undefined,
              category: catParam,
              subcategory: subParam,
              country: country === 'all' ? undefined : country,
              from: from || undefined,
              to: to || undefined,
            },
          });
          if (!cancelled) setItems(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.error || 'Search failed');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, type, category, subcategory, country, from, to, nearbyMode, geo]);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (value === '' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setParams(next);
  }

  function setSearchCategory(cat) {
    const next = new URLSearchParams(params);
    if (!cat || cat === 'all') {
      next.delete('category');
      next.delete('subcategory');
    } else {
      next.set('category', cat);
      next.delete('subcategory');
    }
    setParams(next);
  }

  function onSubmit(e) {
    e.preventDefault();
    updateParam('q', localQ.trim());
  }

  function enableNearby() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setGeoLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyMode(true);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setError('Location access denied. You can still search by keyword and filters.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function clearNearby() {
    setNearbyMode(false);
    setGeo(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Search</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex gap-2 shadow-sm rounded-2xl border border-slate-200 bg-white p-1.5">
          <span className="pl-3 flex items-center text-xl">🔍</span>
          <input
            type="search"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Keyword, city, country…"
            disabled={nearbyMode}
            className="flex-1 border-0 bg-transparent py-3 focus:ring-0 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={nearbyMode}
            className="px-5 py-3 rounded-xl bg-brand-blue text-white font-semibold text-sm disabled:opacity-50"
          >
            Go
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={nearbyMode ? clearNearby : enableNearby}
            disabled={geoLoading}
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${
              nearbyMode
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-800 hover:border-brand-blue'
            }`}
          >
            {geoLoading ? 'Locating…' : nearbyMode ? '✓ Nearby (25 km) — tap to clear' : '📍 Near me (25 km)'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 w-full sm:w-auto py-1">Type</span>
          {[
            { value: '', label: 'All' },
            { value: 'lost', label: 'Lost' },
            { value: 'found', label: 'Found' },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => updateParam('type', t.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${
                type === t.value
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-500 w-full py-1">Country</span>
          <select
            value={country}
            onChange={(e) => updateParam('country', e.target.value === 'all' ? '' : e.target.value)}
            className="w-full sm:w-auto min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            <option value="all">All countries</option>
            {countryList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-slate-500 block py-1">Category</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSearchCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                category === 'all' || !params.get('category')
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              All
            </button>
            {MAIN_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSearchCategory(c.id)}
                title={c.label}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border max-w-[10rem] truncate ${
                  category === c.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <span className="mr-1" aria-hidden>
                  {c.icon}
                </span>
                {c.shortLabel}
              </button>
            ))}
          </div>
          {mainMeta?.subs?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label htmlFor="subcat" className="text-xs text-slate-500">
                Sub-type
              </label>
              <select
                id="subcat"
                value={subcategory === 'all' || !params.get('subcategory') ? 'all' : subcategory}
                onChange={(e) => updateParam('subcategory', e.target.value === 'all' ? '' : e.target.value)}
                className="flex-1 min-w-[180px] max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="all">All sub-types</option>
                {mainMeta.subs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="from" className="block text-xs font-medium text-slate-600 mb-1">
              From date
            </label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => updateParam('from', e.target.value)}
              disabled={nearbyMode}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="to" className="block text-xs font-medium text-slate-600 mb-1">
              To date
            </label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(e) => updateParam('to', e.target.value)}
              disabled={nearbyMode}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-slate-500 py-16 bg-white rounded-2xl border border-slate-100">
          No items match your filters.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
