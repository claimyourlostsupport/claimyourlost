import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { ShareListing } from '../components/ShareListing.jsx';
import {
  listingImgClass,
  listingImageFrameClass,
  listingImagePlaceholderClass,
} from '../constants/images.js';
import { formatItemCategory } from '../constants/categories.js';

function formatDetailDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '••••';
  return `••••${phone.slice(-4)}`;
}

export function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimMsg, setClaimMsg] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [hasClaim, setHasClaim] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/items/${id}`);
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.status === 404 ? 'Item not found' : 'Failed to load');
          setItem(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !id || !item) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/claims/status/${id}`);
        if (!cancelled) setHasClaim(data.hasClaim);
      } catch {
        if (!cancelled) setHasClaim(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, id, item]);

  const ownerId = item?.userId?._id ?? item?.userId;
  const isOwner =
    Boolean(item && user && ownerId && String(ownerId) === String(user.id));
  const ownerPhone = item?.userId?.phone;

  async function submitClaim(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/items/${id}` } } });
      return;
    }
    setClaimError('');
    setClaimLoading(true);
    try {
      await api.post('/claims', { itemId: id, message: claimMsg.trim() });
      setClaimMsg('');
      setHasClaim(true);
      navigate(`/items/${id}/chat`);
    } catch (err) {
      setClaimError(err.response?.data?.error || 'Could not submit claim');
    } finally {
      setClaimLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-600">{error || 'Not found'}</p>
        <Link to="/search" className="text-brand-blue font-semibold hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  const isFound = item.type === 'found';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className={`${listingImageFrameClass} py-4`}>
          {item.image ? (
            <img src={assetUrl(item.image)} alt="" className={listingImgClass} />
          ) : (
            <div className={listingImagePlaceholderClass}>📦</div>
          )}
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full text-white ${
                isFound ? 'bg-brand-green' : 'bg-brand-red'
              }`}
            >
              {isFound ? 'FOUND' : 'LOST'}
            </span>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
              {formatItemCategory(item)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{item.title}</h1>
          <div className="flex flex-col gap-2 text-slate-600 text-sm">
            <p>
              <span className="font-medium text-slate-800">📍</span>{' '}
              {item.city?.trim() || item.location?.trim() ? (
                <span>{[item.city?.trim(), item.location?.trim()].filter(Boolean).join(' · ')}</span>
              ) : (
                <span className="text-slate-400">City / area not set</span>
              )}
            </p>
            {item.county?.trim() && (
              <p>
                <span className="font-medium text-slate-800">🏛</span>{' '}
                <span>{item.county.trim()}</span>
              </p>
            )}
            <p>
              <span className="font-medium text-slate-800">🌍</span>{' '}
              {item.country != null && String(item.country).trim() ? (
                <span>{String(item.country).trim()}</span>
              ) : (
                <span className="text-slate-400">Country not set</span>
              )}
            </p>
            <p>
              <span className="font-medium text-slate-800">📅</span> {formatDetailDate(item.date)}
            </p>
            {ownerPhone && (
              <p className="text-slate-500">
                Listed by: <span className="font-mono">{maskPhone(ownerPhone)}</span>
              </p>
            )}
            {String(item.category || '').toLowerCase() === 'pets' &&
              (item.petBreed?.trim() || item.contactUrgency) && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-amber-950 space-y-1">
                  {item.petBreed?.trim() && (
                    <p>
                      <span className="font-medium">Breed: </span>
                      {item.petBreed.trim()}
                    </p>
                  )}
                  {item.contactUrgency && (
                    <p>
                      <span className="font-medium">Contact urgency: </span>
                      {item.contactUrgency}
                    </p>
                  )}
                </div>
              )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Description</h2>
            <p className="text-slate-600 whitespace-pre-wrap">{item.description || 'No description.'}</p>
          </div>
          {item.lat != null && item.lng != null && (
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">Map</h2>
              <p className="text-xs text-slate-500 font-mono mb-2">
                {Number(item.lat).toFixed(5)}, {Number(item.lng).toFixed(5)}
              </p>
              <Link to="/map" className="text-sm font-semibold text-brand-blue hover:underline">
                Open map view →
              </Link>
            </div>
          )}
        </div>
      </div>

      <ShareListing itemId={id} title={item.title} type={item.type} location={item.location} country={item.country} />

      <div className="flex flex-col sm:flex-row gap-3">
        {isAuthenticated && (item.type === 'lost' || isOwner || hasClaim) && (
          <Link
            to={`/items/${id}/chat`}
            className="flex-1 text-center py-3.5 rounded-xl border-2 border-brand-blue text-brand-blue font-semibold hover:bg-blue-50"
          >
            Open chat
          </Link>
        )}
        {item.type === 'lost' && !isAuthenticated && (
          <Link
            to="/login"
            state={{ from: { pathname: `/items/${id}/chat` } }}
            className="flex-1 text-center py-3.5 rounded-xl border-2 border-brand-blue text-brand-blue font-semibold hover:bg-blue-50"
          >
            Log in to chat
          </Link>
        )}
        {isFound && !isOwner && (
          <button
            type="button"
            onClick={() => document.getElementById('claim-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex-1 py-3.5 rounded-xl bg-brand-green text-white font-semibold hover:bg-emerald-700"
          >
            Claim this item
          </button>
        )}
      </div>

      {isFound && !isOwner && (
        <section id="claim-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-slate-900">Claim verification</h2>
          <p className="text-sm text-slate-600">
            Describe unique details only the owner would know (scratches, contents, lock screen).
          </p>
          {!isAuthenticated ? (
            <Link
              to="/login"
              state={{ from: { pathname: `/items/${id}` } }}
              className="inline-flex px-5 py-3 rounded-xl bg-brand-blue text-white font-semibold"
            >
              Log in to claim
            </Link>
          ) : (
            <form onSubmit={submitClaim} className="space-y-3">
              <textarea
                required
                value={claimMsg}
                onChange={(e) => setClaimMsg(e.target.value)}
                rows={4}
                placeholder="e.g. Brown leather, ID card name ends with …, scratch near corner"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-brand-blue/30"
              />
              {claimError && <p className="text-sm text-red-600">{claimError}</p>}
              <button
                type="submit"
                disabled={claimLoading}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                {claimLoading ? 'Submitting…' : 'Submit claim'}
              </button>
            </form>
          )}
        </section>
      )}

      {isOwner && (
        <p className="text-center text-sm text-slate-500">
          This is your listing. Manage it from{' '}
          <Link to="/dashboard" className="text-brand-blue font-medium hover:underline">
            Dashboard
          </Link>
          .
        </p>
      )}
    </div>
  );
}
