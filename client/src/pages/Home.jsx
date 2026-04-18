import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ItemCard } from '../components/ItemCard.jsx';
import { CategoryBrowse } from '../components/CategoryBrowse.jsx';
import { useBrowseScope } from '../context/BrowseScopeContext.jsx';
import { flagEmojiFromCountryName } from '../utils/countryFlag.js';
import { lossFoundSearchUrl } from '../utils/browseSearchUrl.js';

export function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geo, setGeo] = useState(null);
  const [nearKm, setNearKm] = useState(25);
  const [nearbyFallback, setNearbyFallback] = useState(false);
  const [nearError, setNearError] = useState('');
  const { scope, country, bootstrapping, setScope } = useBrowseScope();

  useEffect(() => {
    if (bootstrapping) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNearbyFallback(false);
      try {
        const countryParams =
          scope === 'country' && country.trim() ? { country: country.trim() } : {};

        if (nearbyMode && geo) {
          const { data: nearData } = await api.get('/items/near', {
            params: {
              lat: geo.lat,
              lng: geo.lng,
              km: nearKm,
              ...countryParams,
            },
          });
          let list = Array.isArray(nearData) ? nearData : [];
          if (list.length === 0) {
            const { data } = await api.get('/items', { params: { limit: 12, ...countryParams } });
            list = Array.isArray(data) ? data : [];
            if (!cancelled) setNearbyFallback(true);
          }
          if (!cancelled) setItems(list);
        } else {
          const { data } = await api.get('/items', { params: { limit: 12, ...countryParams } });
          if (!cancelled) setItems(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, country, bootstrapping, nearbyMode, geo, nearKm]);

  function enableNearby() {
    if (!navigator.geolocation) {
      setNearError('Geolocation is not supported in this browser.');
      return;
    }
    setGeoLoading(true);
    setNearError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyMode(true);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setNearError('Location access denied. Turn on location or browse by Country / World above.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function clearNearby() {
    setNearbyMode(false);
    setGeo(null);
    setNearbyFallback(false);
    setNearError('');
  }

  const recent = items.slice(0, 6);
  const countryFlag = country.trim() ? flagEmojiFromCountryName(country.trim()) : '';

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 pt-2">
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
            const query = {};
            if (q.trim()) query.q = q.trim();
            navigate(lossFoundSearchUrl(scope, country, query));
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
          className="flex flex-row flex-wrap items-center gap-x-3 gap-y-2 pt-1"
          role="radiogroup"
          aria-label="Listing region"
        >
          <span className="text-xs font-medium text-slate-600 shrink-0 self-center">Show listings</span>
          <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-800">
              <input
                type="radio"
                name="browse-scope"
                className="text-brand-blue focus:ring-brand-blue h-4 w-4 shrink-0 mt-0.5"
                checked={scope === 'country'}
                onChange={() => setScope('country')}
              />
              <span className="inline-flex items-center gap-1 min-w-0 leading-snug">
                <span className="shrink-0">Country</span>
                {country.trim() ? (
                  <>
                    <span className="text-slate-500 font-normal truncate max-w-[4.5rem] sm:max-w-[7rem] md:max-w-[10rem]">
                      ({country})
                    </span>
                    {countryFlag ? (
                      <span className="text-sm leading-none shrink-0" title={country.trim()} aria-hidden>
                        {countryFlag}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-800">
              <input
                type="radio"
                name="browse-scope"
                className="text-brand-blue focus:ring-brand-blue h-4 w-4 shrink-0 mt-0.5"
                checked={scope === 'world'}
                onChange={() => setScope('world')}
              />
              <span className="inline-flex items-center gap-1 leading-snug">
                World
                <span className="text-sm leading-none" title="Worldwide" aria-hidden>
                  🌐
                </span>
              </span>
            </label>
          </div>
        </div>
        {scope === 'country' && !country.trim() && (
          <p className="text-[10px] leading-snug text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
            Set country from ⋮ menu, or choose World.
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

      <div className="space-y-1">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <button
              type="button"
              onClick={nearbyMode ? clearNearby : enableNearby}
              disabled={geoLoading}
              title={nearbyMode ? 'Tap to turn off nearby' : 'Use your location'}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${
                nearbyMode
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-brand-blue'
              }`}
            >
              {geoLoading ? '…' : nearbyMode ? `✓ ${nearKm} km` : '📍 Near me'}
            </button>
            <div className="inline-flex items-center gap-1 shrink-0">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={nearKm}
                onChange={(e) => setNearKm(Number(e.target.value))}
                className="w-[4.5rem] sm:w-24 h-1 accent-brand-blue cursor-pointer"
                aria-label="Nearby distance in km"
              />
              <span className="text-[10px] text-slate-600 tabular-nums leading-none whitespace-nowrap">
                <span className="font-semibold text-slate-700">{nearKm}</span>
                <span className="text-slate-500 ml-0.5">km</span>
              </span>
            </div>
            {nearbyMode && (
              <p className="text-[10px] text-slate-500 leading-tight w-full basis-full">
                Pins within {nearKm} km; if none, matches Country / World.
              </p>
            )}
          </div>
          {nearError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{nearError}</p>
          )}
          {nearbyFallback && !nearError && nearbyMode && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              No open listings with a map location within {nearKm} km for your filters. Showing recent listings that match
              Country / World (including posts without GPS).
            </p>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-2 gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent listings</h2>
            <Link
              to={lossFoundSearchUrl(scope, country)}
              className="text-sm font-semibold text-brand-blue hover:underline"
            >
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
      </div>

      <CategoryBrowse />
    </div>
  );
}
