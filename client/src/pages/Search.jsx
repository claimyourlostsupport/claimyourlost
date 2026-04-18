import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ItemCard } from '../components/ItemCard.jsx';
import { MAIN_CATEGORIES, getMainCategory } from '../constants/categories.js';
import { mergeCountryOptions } from '../constants/countries.js';
import { useBrowseScope } from '../context/BrowseScopeContext.jsx';

const SEARCH_LOCATION_PREFS_KEY = 'cyl_search_location_prefs';

function readLocationPrefs() {
  try {
    const raw = localStorage.getItem(SEARCH_LOCATION_PREFS_KEY);
    if (!raw) return { country: '', city: '' };
    const p = JSON.parse(raw);
    return {
      country: String(p?.country || '').trim(),
      city: String(p?.city || '').trim(),
    };
  } catch {
    return { country: '', city: '' };
  }
}

function writeLocationPrefs(country, city) {
  try {
    localStorage.setItem(
      SEARCH_LOCATION_PREFS_KEY,
      JSON.stringify({
        country: String(country || '').trim(),
        city: String(city || '').trim(),
      })
    );
  } catch {
    /* ignore */
  }
}

function searchApiParams({
  q,
  type,
  category,
  subcategory,
  country,
  city,
  county,
  from,
  to,
}) {
  const catParam = category === 'all' ? undefined : category;
  const subParam = subcategory === 'all' ? undefined : subcategory;
  return {
    q: q?.trim() || undefined,
    type: type || undefined,
    category: catParam,
    subcategory: subParam,
    country: country === 'all' ? undefined : country,
    city: city?.trim() || undefined,
    county: county?.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
  };
}

export function Search() {
  const [params, setParams] = useSearchParams();
  const { country: browseCountry, scope: browseScope } = useBrowseScope();
  const browseCountrySyncRef = useRef(null);
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const category = params.get('category') || 'all';
  const subcategory = params.get('subcategory') || 'all';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const country = params.get('country') || 'all';
  const city = params.get('city') || '';
  const county = params.get('county') || '';

  const [localQ, setLocalQ] = useState(q);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nearbyMode, setNearbyMode] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geo, setGeo] = useState(null);
  const [nearKm, setNearKm] = useState(25);
  const [countryList, setCountryList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [countyList, setCountyList] = useState([]);
  const [nearbyFallback, setNearbyFallback] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const mainMeta = category !== 'all' ? getMainCategory(category) : null;

  const baseParams = useMemo(
    () =>
      searchApiParams({
        q,
        type,
        category,
        subcategory,
        country,
        city,
        county,
        from,
        to,
      }),
    [q, type, category, subcategory, country, city, county, from, to]
  );

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
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/items/cities', {
          params: { country: country === 'all' ? undefined : country },
        });
        if (!cancelled && Array.isArray(data)) setCityList(data);
      } catch {
        if (!cancelled) setCityList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/items/counties', {
          params: { country: country === 'all' ? undefined : country },
        });
        if (!cancelled && Array.isArray(data)) setCountyList(data);
      } catch {
        if (!cancelled) setCountyList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  /**
   * Loss & Found "Country" scope: keep `country` query aligned with header/Home browse country.
   * Ref avoids re-applying after the user picks "All countries" in Adv (same browse key until header changes).
   */
  useEffect(() => {
    if (browseScope !== 'country') {
      browseCountrySyncRef.current = `scope:${browseScope}`;
      return;
    }
    const bc = String(browseCountry || '').trim();
    if (!bc) {
      browseCountrySyncRef.current = 'country:empty';
      return;
    }
    const syncKey = `country:${bc}`;
    if (browseCountrySyncRef.current === syncKey) return;
    browseCountrySyncRef.current = syncKey;

    setParams((prev) => {
      const urlC = prev.get('country') || '';
      if (urlC === bc) return prev;
      const next = new URLSearchParams(prev);
      next.set('country', bc);
      writeLocationPrefs(bc, prev.get('city') || '');
      return next;
    }, { replace: true });
  }, [browseScope, browseCountry, setParams]);

  /**
   * When URL has no country and no city: fill from GPS (once per tab session), else saved prefs,
   * else header browse country (BrowseScope). Re-runs when browseCountry arrives after first paint.
   */
  useEffect(() => {
    const needsLocationDefaults =
      (country === 'all' || !country) && !String(city || '').trim();
    if (!needsLocationDefaults) return;

    const skipGpsCountry =
      browseScope === 'country' && String(browseCountry || '').trim();

    let cancelled = false;
    (async () => {
      let nextCountry = '';
      let nextCity = '';
      let gpsAttempted = false;
      try {
        gpsAttempted = sessionStorage.getItem('cyl_search_gps_try') === '1';
      } catch {
        /* ignore */
      }

      if (!gpsAttempted && navigator.geolocation && window.isSecureContext && !skipGpsCountry) {
        try {
          try {
            sessionStorage.setItem('cyl_search_gps_try', '1');
          } catch {
            /* ignore */
          }
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 12000,
              maximumAge: 300000,
            });
          });
          const { data } = await api.get('/items/reverse-geocode', {
            params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          nextCountry = data?.country != null ? String(data.country).trim() : '';
          nextCity = data?.city != null ? String(data.city).trim() : '';
        } catch {
          /* fall through to prefs / browse country */
        }
      }

      const prefs = readLocationPrefs();
      if (!nextCountry) {
        if (skipGpsCountry) {
          nextCountry = '';
        } else {
          nextCountry = prefs.country || String(browseCountry || '').trim();
        }
      }
      if (!nextCity) {
        nextCity = prefs.city;
      }

      if (cancelled) return;
      if (nextCountry || nextCity) {
        const persistCountry =
          nextCountry ||
          (skipGpsCountry ? String(browseCountry || '').trim() : '') ||
          prefs.country ||
          '';
        writeLocationPrefs(persistCountry, nextCity);
        setParams((prev) => {
          const next = new URLSearchParams(prev);
          if (nextCountry) next.set('country', nextCountry);
          if (nextCity) next.set('city', nextCity);
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [browseScope, browseCountry, country, city, setParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setNearbyFallback(false);
      try {
        if (nearbyMode && geo) {
          const { data: nearData } = await api.get('/items/near', {
            params: {
              lat: geo.lat,
              lng: geo.lng,
              km: nearKm,
              ...baseParams,
            },
          });
          let list = Array.isArray(nearData) ? nearData : [];
          if (list.length === 0) {
            const { data: searchData } = await api.get('/items/search', {
              params: { ...baseParams, limit: 200 },
            });
            list = Array.isArray(searchData) ? searchData : [];
            if (!cancelled) setNearbyFallback(true);
          }
          if (!cancelled) setItems(list);
        } else {
          const { data } = await api.get('/items/search', {
            params: { ...baseParams, limit: 200 },
          });
          if (!cancelled) setItems(Array.isArray(data) ? data : []);
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
  }, [baseParams, nearbyMode, geo, nearKm]);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (value === '' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setParams(next);
    if (key === 'country' || key === 'city') {
      const nextC =
        key === 'country'
          ? value === '' || value === 'all'
            ? ''
            : String(value)
          : country === 'all'
            ? ''
            : country;
      const nextCityVal =
        key === 'city'
          ? String(value || '').trim()
          : String(city || '').trim();
      writeLocationPrefs(nextC, nextCityVal);
    }
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
    setNearbyFallback(false);
  }

  const categorySummary =
    category === 'all' || !params.get('category')
      ? 'All categories'
      : `${MAIN_CATEGORIES.find((c) => c.id === category)?.shortLabel || category}${
          subcategory !== 'all' && params.get('subcategory') ? ` · ${subcategory}` : ''
        }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Search</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Type</span>
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
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex gap-2 shadow-sm rounded-2xl border border-slate-200 bg-white p-1.5">
          <span className="pl-3 flex items-center text-xl">🔍</span>
          <input
            type="search"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Keyword, city, country…"
            className="flex-1 border-0 bg-transparent py-3 focus:ring-0"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-brand-blue text-white font-semibold text-sm"
          >
            Go
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
          <button
            type="button"
            onClick={() => setAdvOpen((o) => !o)}
            className="ml-auto sm:ml-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:border-brand-blue"
            aria-expanded={advOpen}
          >
            Adv Option
            <span className="text-slate-400" aria-hidden>
              {advOpen ? '▾' : '▸'}
            </span>
          </button>
          {nearbyMode && (
            <p className="text-[10px] text-slate-500 leading-snug w-full basis-full">
              Pins within {nearKm} km; if none, matches your other filters.
            </p>
          )}
        </div>

        {advOpen && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-start">
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

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="search-city" className="block text-xs font-medium text-slate-600 mb-1">
                  City
                </label>
                <input
                  id="search-city"
                  type="text"
                  list="search-city-options"
                  value={city}
                  onChange={(e) => updateParam('city', e.target.value.trim())}
                  placeholder="Filter by city (optional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                />
                <datalist id="search-city-options">
                  {cityList.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="search-county" className="block text-xs font-medium text-slate-600 mb-1">
                  County / district
                </label>
                <input
                  id="search-county"
                  type="text"
                  list="search-county-options"
                  value={county}
                  onChange={(e) => updateParam('county', e.target.value.trim())}
                  placeholder="Filter by county or district (optional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                />
                <datalist id="search-county-options">
                  {countyList.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setCategoryOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
            aria-expanded={categoryOpen}
          >
            <span>
              Category <span className="font-normal text-slate-500">({categorySummary})</span>
            </span>
            <span className="text-slate-400 shrink-0" aria-hidden>
              {categoryOpen ? '▾' : '▸'}
            </span>
          </button>
          {categoryOpen && (
            <div className="px-4 pb-4 pt-0 space-y-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-2 pt-3">
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {nearbyFallback && !error && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          No open listings with a map location within {nearKm} km for these filters. Showing all listings that match your
          filters (including posts without GPS).
        </p>
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
