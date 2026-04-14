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

const lostIcon = L.divIcon({
  className: 'cyl-marker cyl-marker-lost',
  html: '<span style="font-size:22px">📍</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -24],
});

const foundIcon = L.divIcon({
  className: 'cyl-marker cyl-marker-found',
  html: '<span style="font-size:22px">✅</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -24],
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
            Pins use GPS from listings. Enable location to center the map on you.
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
      )}

      <p className="text-xs text-slate-500">
        © OpenStreetMap contributors. Listings without GPS coordinates do not appear on the map.
      </p>
    </div>
  );
}
