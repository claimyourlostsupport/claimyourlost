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
    <section className="space-y-4" aria-labelledby="browse-categories-heading">
      <div className="text-center space-y-1 max-w-2xl mx-auto">
        <h2 id="browse-categories-heading" className="text-xl font-bold text-slate-900">
          Browse by category
        </h2>
        <p className="text-sm text-slate-600">
          Pick a type of item — documents and IDs are especially common in India. Each tile links to search.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MAIN_CATEGORIES.map((cat) => (
          <article
            key={cat.id}
            className={`rounded-2xl border overflow-hidden bg-white shadow-sm border-slate-100 flex flex-col ${
              cat.highlight ? 'ring-2 ring-brand-blue/30 ring-offset-2' : ''
            }`}
          >
            <Link
              to={`/search?category=${encodeURIComponent(cat.id)}`}
              className={`block relative h-28 bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0`}
            >
              <span className="text-6xl drop-shadow-md select-none" aria-hidden>
                {cat.imageEmoji}
              </span>
              {cat.highlight && (
                <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide bg-white/90 text-brand-blue px-2 py-0.5 rounded-full">
                  High priority
                </span>
              )}
            </Link>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="text-xl shrink-0" aria-hidden>
                  {cat.icon}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    <Link to={`/search?category=${encodeURIComponent(cat.id)}`} className="hover:text-brand-blue">
                      {cat.label}
                    </Link>
                  </h3>
                  {cat.id === 'documents' && (
                    <p className="text-xs text-slate-500 mt-1">Aadhaar, PAN, license, passport &amp; more</p>
                  )}
                  {cat.id === 'pets' && (
                    <p className="text-xs text-slate-500 mt-1">Add breed &amp; urgency when posting</p>
                  )}
                </div>
              </div>
              <ul className="text-sm space-y-1.5 border-t border-slate-100 pt-3 mt-1">
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
