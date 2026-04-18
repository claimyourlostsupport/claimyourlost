import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { MAIN_CATEGORIES, getMainCategory, DEFAULT_COUNTRY } from '../constants/categories.js';
import { mergeCountryOptions } from '../constants/countries.js';
import { localDateInputValue } from '../utils/dateDisplay.js';

const URGENCY = [
  { value: '', label: 'Not specified' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical — contact ASAP' },
];

export function PostItem() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const initialType = params.get('type') === 'found' ? 'found' : 'lost';
  const [tab, setTab] = useState(initialType);

  useEffect(() => {
    const t = params.get('type') === 'found' ? 'found' : 'lost';
    setTab(t);
  }, [params]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('misc');
  const [subcategory, setSubcategory] = useState('');
  const [subcategoryCustom, setSubcategoryCustom] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [petBreed, setPetBreed] = useState('');
  const [contactUrgency, setContactUrgency] = useState('');
  const [date, setDate] = useState(() => localDateInputValue());
  const [image, setImage] = useState(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countrySuggestions, setCountrySuggestions] = useState([]);

  const mainMeta = getMainCategory(category);
  const isPets = category === 'pets';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/items/countries');
        if (!cancelled && Array.isArray(data)) {
          setCountrySuggestions(mergeCountryOptions(data));
        }
      } catch {
        if (!cancelled) setCountrySuggestions(mergeCountryOptions([]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    if (!window.isSecureContext) {
      setError('GPS needs a secure site (HTTPS) or localhost. Open this page on https://claimyourlost.com or http://localhost.');
      return;
    }
    setError('');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLat(String(la));
        setLng(String(ln));
        try {
          const { data } = await api.get('/items/reverse-geocode', {
            params: { lat: la, lng: ln },
          });
          if (data?.country) setCountry(String(data.country));
          if (data?.city) setCity(String(data.city));
          if (data?.county) setCounty(String(data.county));
          if (data?.city) {
            setLocation((prev) => (prev.trim() ? prev : String(data.city)));
          }
        } catch {
          setError('GPS found your coordinates, but city/country auto-fill failed. Please enter them manually.');
        }
        setGeoLoading(false);
      },
      (geoErr) => {
        setGeoLoading(false);
        if (geoErr?.code === 1) {
          setError('Location permission denied. Allow location access in browser/site settings.');
          return;
        }
        if (geoErr?.code === 3) {
          setError('GPS request timed out. Move near open sky and try again.');
          return;
        }
        setError('Could not read GPS. You can still post with text location only.');
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 }
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-slate-600">Log in to post a lost or found item.</p>
        <Link
          to="/login"
          state={{ from: { pathname: '/post' } }}
          className="inline-flex px-6 py-3 rounded-xl bg-brand-blue text-white font-semibold"
        >
          Log in
        </Link>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('type', tab);
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('category', category);
      form.append('subcategory', subcategory);
      form.append('subcategoryCustom', subcategoryCustom.trim());
      form.append('location', location.trim());
      form.append('city', city.trim());
      form.append('county', county.trim());
      form.append('country', country.trim());
      form.append('date', date);
      if (isPets) {
        form.append('petBreed', petBreed.trim());
        form.append('contactUrgency', contactUrgency);
      }
      if (image) form.append('image', image);
      if (lat && lng) {
        form.append('lat', lat);
        form.append('lng', lng);
      }

      const { data } = await api.post('/items', form);
      navigate(`/items/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Post an item</h1>

      <div className="flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('lost')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'lost' ? 'bg-white text-brand-red shadow-sm' : 'text-slate-600'
          }`}
        >
          Lost item
        </button>
        <button
          type="button"
          onClick={() => setTab('found')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'found' ? 'bg-white text-brand-green shadow-sm' : 'text-slate-600'
          }`}
        >
          Found item
        </button>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-slate-100 file:font-semibold"
          />
          {isPets && (
            <p className="text-xs text-slate-500 mt-1">
              Clear photos help others identify a lost pet. Add another angle in the description if needed.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            Title *
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tab === 'found' ? 'e.g. Black wallet' : 'e.g. Lost iPhone 14'}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div>
          <label htmlFor="desc" className="block text-sm font-medium text-slate-700 mb-1">
            Short description
          </label>
          <textarea
            id="desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Marks, color, contents…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div>
          <label htmlFor="cat" className="block text-sm font-medium text-slate-700 mb-1">
            Category *
          </label>
          <select
            id="cat"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory('');
              setSubcategoryCustom('');
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
          >
            {MAIN_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>
        {mainMeta?.subs?.length > 0 && (
          <div>
            <label htmlFor="subcat" className="block text-sm font-medium text-slate-700 mb-1">
              Type (optional)
            </label>
            <select
              id="subcat"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
            >
              <option value="">Select…</option>
              {mainMeta.subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="subcat-custom" className="block text-sm font-medium text-slate-700 mb-1">
            Custom sub-type (optional)
          </label>
          <input
            id="subcat-custom"
            value={subcategoryCustom}
            onChange={(e) => setSubcategoryCustom(e.target.value)}
            placeholder="e.g. Samsung Galaxy S21, brown leather"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
          />
          <p className="text-xs text-slate-500 mt-1">
            Add detail if the list above does not match — shown next to your category on listings.
          </p>
        </div>

        {isPets && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-900">Pet details</p>
            <div>
              <label htmlFor="breed" className="block text-xs font-medium text-slate-700 mb-1">
                Breed
              </label>
              <input
                id="breed"
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                placeholder="e.g. Indie, Labrador"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div>
              <label htmlFor="urgency" className="block text-xs font-medium text-slate-700 mb-1">
                Contact urgency
              </label>
              <select
                id="urgency"
                value={contactUrgency}
                onChange={(e) => setContactUrgency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white"
              >
                {URGENCY.map((u) => (
                  <option key={u.value || 'none'} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
              City
            </label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bengaluru"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <div>
            <label htmlFor="county" className="block text-sm font-medium text-slate-700 mb-1">
              County / district
            </label>
            <input
              id="county"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="e.g. Cook County, Gautam Buddha Nagar"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
        </div>
        <div>
          <label htmlFor="loc" className="block text-sm font-medium text-slate-700 mb-1">
            Area / landmark (optional)
          </label>
          <input
            id="loc"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Noida Sector 62, near metro"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={geoLoading}
              className="text-sm font-semibold text-brand-blue hover:underline disabled:opacity-50"
            >
              {geoLoading ? 'Getting location…' : '📍 Use my GPS (sets country & city when possible)'}
            </button>
            {(lat || lng) && (
              <span className="text-xs text-slate-500 font-mono">
                {lat && lng ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">GPS pins your post on the map.</p>
        </div>
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1">
            Country *
          </label>
          <input
            id="country"
            list="country-suggestions"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. India"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
          />
          <datalist id="country-suggestions">
            {countrySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="text-xs text-slate-500 mt-1">Defaults to India; GPS can fill this automatically.</p>
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
            {tab === 'found' ? 'Date found' : 'Date lost / last seen'}
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-semibold text-white ${
            tab === 'found' ? 'bg-brand-green hover:bg-emerald-700' : 'bg-brand-red hover:bg-red-700'
          } disabled:opacity-60`}
        >
          {loading ? 'Posting…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
