import { Link } from 'react-router-dom';
import { MAIN_CATEGORIES } from '../constants/categories.js';

function subSearchUrl(mainId, subId) {
  const p = new URLSearchParams();
  p.set('category', mainId);
  p.set('subcategory', subId);
  return `/search?${p.toString()}`;
}

export function CategoryBrowse() {
  return (
    <section className="space-y-2 sm:space-y-3" aria-labelledby="browse-categories-heading">
      <div className="text-center space-y-0.5 max-w-2xl mx-auto px-1">
        <h2 id="browse-categories-heading" className="text-sm sm:text-base font-bold text-slate-900">
          Browse by category
        </h2>
        <p className="text-[10px] sm:text-xs text-slate-600 leading-snug">
          Pick a type of item — documents and IDs are especially common in India. Each tile links to search.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {MAIN_CATEGORIES.map((cat) => (
          <article
            key={cat.id}
            className={`min-w-0 rounded-xl border overflow-hidden bg-white shadow-sm border-slate-100 flex flex-col ${
              cat.highlight ? 'ring-1 ring-brand-blue/35 ring-offset-1' : ''
            }`}
          >
            <Link
              to={`/search?category=${encodeURIComponent(cat.id)}`}
              className={`block relative h-[4.25rem] sm:h-20 bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0`}
            >
              <span className="text-3xl sm:text-4xl drop-shadow-sm select-none leading-none" aria-hidden>
                {cat.imageEmoji}
              </span>
              {cat.highlight && (
                <span className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wide bg-white/90 text-brand-blue px-1.5 py-px rounded-full">
                  High priority
                </span>
              )}
            </Link>
            <div className="p-2 sm:p-2.5 flex-1 flex flex-col gap-1.5 min-h-0">
              <div className="flex items-start gap-1.5">
                <span className="text-sm sm:text-base shrink-0 leading-none mt-0.5" aria-hidden>
                  {cat.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 leading-tight text-xs sm:text-sm">
                    <Link to={`/search?category=${encodeURIComponent(cat.id)}`} className="hover:text-brand-blue">
                      {cat.label}
                    </Link>
                  </h3>
                  {cat.id === 'documents' && (
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Aadhaar, PAN, license, passport &amp; more
                    </p>
                  )}
                  {cat.id === 'pets' && (
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Add breed &amp; urgency when posting</p>
                  )}
                </div>
              </div>
              <ul className="text-[10px] sm:text-xs space-y-0.5 border-t border-slate-100 pt-1.5 mt-0.5 leading-snug">
                {cat.subs.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={subSearchUrl(cat.id, s.id)}
                      className="text-brand-blue hover:underline font-medium text-slate-700 hover:text-brand-blue"
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
