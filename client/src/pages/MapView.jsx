import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { api, assetUrl } from '../api/client';
import { listingImgClass } from '../constants/images.js';
import { formatCityCountryOrPlaceholder } from '../utils/place.js';
import 'leaflet/dist/leaflet.css';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

/** Lost = red circle + “L”; Found = green rounded square + “F” (distinct shapes, no emoji-in-a-box). */
const lostIcon = L.divIcon({
  className: 'cyl-marker cyl-marker-lost',
  html:
    '<div style="width:30px;height:30px;border-radius:50%;background:#dc2626;color:#fff;font:700 13px/30px system-ui,-apple-system,sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid #fff;letter-spacing:-0.02em" title="Lost listing">L</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -12],
});

const foundIcon = L.divIcon({
  className: 'cyl-marker cyl-marker-found',
  html:
    '<div style="width:28px;height:28px;border-radius:7px;background:#059669;color:#fff;font:700 12px/28px system-ui,-apple-system,sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid #fff;letter-spacing:-0.02em" title="Found listing">F</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -12],
});

function MapCenterOnUser({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 12, { animate: true });
  }, [center, map]);
  return null;
}

export function MapView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/items/map');
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.error || 'Could not load map data');
          setItems([]);
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
    if (!userPos) {
      setNearbyCount(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/items/near', {
          params: { lat: userPos.lat, lng: userPos.lng, km: 25 },
        });
        if (!cancelled) setNearbyCount(Array.isArray(data) ? data.length : 0);
      } catch {
        if (!cancelled) setNearbyCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userPos]);

  const defaultCenter = useMemo(() => {
    if (userPos) return [userPos.lat, userPos.lng];
    if (items.length && items[0].lat != null && items[0].lng != null) {
      return [items[0].lat, items[0].lng];
    }
    return [20.5937, 78.9629];
  }, [items, userPos]);

  function locateMe() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('Could not read your location. Allow location access or browse the map manually.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Map</h1>
          <p className="text-sm text-slate-600 mt-1">
            Listing pins use each post’s GPS. Tap <strong className="text-slate-800">Near me</strong> to center on you and
            show a blue “you are here” circle.
            {userPos && nearbyCount != null && (
              <span className="block mt-1 font-medium text-brand-blue">
                {nearbyCount} listing{nearbyCount === 1 ? '' : 's'} within 25 km (with GPS).
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
        >
          {locating ? 'Locating…' : '📍 Near me'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 space-y-2"
          aria-label="Map legend"
        >
          <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wide">Map key</p>
          <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-4 sm:gap-y-1.5">
            <li className="flex items-center gap-2">
              <span
                className="shrink-0 w-[30px] h-[30px] rounded-full bg-red-600 text-white text-[13px] font-bold flex items-center justify-center border-2 border-white shadow-sm"
                aria-hidden
              >
                L
              </span>
              <span>
                <span className="font-medium text-slate-900">Lost</span> — someone is missing this item
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="shrink-0 w-7 h-7 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm"
                aria-hidden
              >
                F
              </span>
              <span>
                <span className="font-medium text-slate-900">Found</span> — someone found this and posted it
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="shrink-0 w-7 h-7 rounded-full border-2 border-blue-800 bg-blue-500/35 flex items-center justify-center shadow-sm"
                aria-hidden
              />
              <span>
                <span className="font-medium text-slate-900">You</span> — only after you tap Near me (approximate area)
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[min(70vh,520px)] z-0">
          <MapContainer
            key={`${items.length}-${userPos?.lat ?? ''}-${userPos?.lng ?? ''}`}
            center={defaultCenter}
            zoom={userPos ? 12 : items.length ? 11 : 4}
            className="h-full w-full z-0"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterOnUser center={userPos ? [userPos.lat, userPos.lng] : null} />
            {userPos && (
              <CircleMarker
                center={[userPos.lat, userPos.lng]}
                radius={14}
                pathOptions={{
                  color: '#1e40af',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Popup>You are here</Popup>
              </CircleMarker>
            )}
            {items.map((item) =>
              item.lat != null && item.lng != null ? (
                <Marker
                  key={item._id}
                  position={[item.lat, item.lng]}
                  icon={item.type === 'found' ? foundIcon : lostIcon}
                >
                  <Popup>
                    <div className="min-w-[160px]">
                      {item.image && (
                        <img
                          src={assetUrl(item.image)}
                          alt=""
                          className={`mb-2 ${listingImgClass}`}
                        />
                      )}
                      <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatCityCountryOrPlaceholder(item, '—')}</p>
                      <span
                        className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                          item.type === 'found' ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      >
                        {item.type === 'found' ? 'FOUND' : 'LOST'}
                      </span>
                      <Link
                        to={`/items/${item._id}`}
                        className="block mt-2 text-center text-xs font-semibold text-brand-blue hover:underline"
                      >
                        View details
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            )}
          </MapContainer>
        </div>
        </>
      )}

      <p className="text-xs text-slate-500">
        © OpenStreetMap contributors. Listings without GPS coordinates do not appear on the map.
      </p>
    </div>
  );
}
