import { Link } from 'react-router-dom';
import { assetUrl } from '../api/client';
import { listingImgClass } from '../constants/images.js';
import { formatItemCategory } from '../constants/categories.js';
import { formatCalendarDate, formatDateTimeLocal } from '../utils/dateDisplay.js';

export function ItemCard({ item }) {
  const isFound = item.type === 'found';
  const city = item?.location?.trim?.() || '';
  const country =
    item?.country != null && String(item.country).trim() ? String(item.country).trim() : '';

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="flex min-h-[200px] items-center justify-center bg-slate-100 py-2">
        {item.image ? (
          <img src={assetUrl(item.image)} alt="" className={listingImgClass} />
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center text-4xl opacity-40">📦</div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <span
          className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
            isFound ? 'bg-brand-green' : 'bg-brand-red'
          }`}
        >
          {isFound ? 'FOUND' : 'LOST'}
        </span>
        <h3 className="font-semibold text-slate-900 line-clamp-2">{item.title}</h3>
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">Category: </span>
          {formatItemCategory(item)}
        </p>
        <div className="text-sm text-slate-600 space-y-1">
          <p className="flex items-start gap-1.5">
            <span className="shrink-0" aria-hidden>
              📍
            </span>
            <span className="break-words min-w-0">
              <span className="font-medium text-slate-700">City: </span>
              {city || <span className="text-slate-400">Not set</span>}
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="shrink-0" aria-hidden>
              🌍
            </span>
            <span className="break-words min-w-0">
              <span className="font-medium text-slate-700">Country: </span>
              {country || <span className="text-slate-400">Not set</span>}
            </span>
          </p>
        </div>
        <p className="text-sm text-slate-400 flex items-center gap-1">
          <span aria-hidden>📅</span>
          {item.date
            ? formatCalendarDate(item.date)
            : formatDateTimeLocal(item.createdAt)}
        </p>
        {item.distanceKm != null && Number.isFinite(item.distanceKm) && (
          <p className="text-sm font-medium text-brand-blue">
            📏 {item.distanceKm.toFixed(1)} km away
          </p>
        )}
        <Link
          to={`/items/${item._id}`}
          className="mt-auto w-full text-center py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
