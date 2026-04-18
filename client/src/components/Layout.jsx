import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBrowseScope } from '../context/BrowseScopeContext.jsx';
import { api } from '../api/client.js';
import { mergeCountryOptions } from '../constants/countries.js';
import { paypalSupportUrl } from '../constants/support.js';
import { NotificationBell } from './NotificationBell.jsx';
import { SupportBlock } from './SupportBlock.jsx';

const navClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-medium rounded-xl transition-colors min-w-0 flex-1 ${
    isActive ? 'text-brand-blue bg-blue-50' : 'text-slate-500 hover:text-slate-800'
  }`;

function HeaderBrowseMenu() {
  const { country, setCountryAndFocus } = useBrowseScope();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [countryList, setCountryList] = useState([]);
  const [draftCountry, setDraftCountry] = useState(country);
  const wrapRef = useRef(null);

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
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('touchstart', onDocClick);
    }
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (modalOpen) setDraftCountry(country);
  }, [modalOpen, country]);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label="More options"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="flex flex-col gap-[3px] items-center justify-center w-5" aria-hidden>
          <span className="block w-1 h-1 rounded-full bg-current" />
          <span className="block w-1 h-1 rounded-full bg-current" />
          <span className="block w-1 h-1 rounded-full bg-current" />
        </span>
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[11rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => {
              setMenuOpen(false);
              setModalOpen(true);
            }}
          >
            Set country
          </button>
        </div>
      )}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="country-set-title"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="country-set-title" className="text-lg font-bold text-slate-900">
              Set country
            </h2>
            <p className="text-sm text-slate-600">
              Home listings can filter to one country. This also switches the home view to Country scope.
            </p>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Country</span>
              <select
                value={draftCountry}
                onChange={(e) => setDraftCountry(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select country…</option>
                {countryList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-blue text-white hover:bg-blue-800"
                onClick={() => {
                  if (!draftCountry.trim()) return;
                  setCountryAndFocus(draftCountry.trim());
                  setModalOpen(false);
                }}
                disabled={!draftCountry.trim()}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-0">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand-blue">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue text-white text-lg">
              🔍
            </span>
            <span className="hidden sm:inline">ClaimYourLost</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              to="/map"
              className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-brand-blue px-2 py-2 rounded-lg"
            >
              Map
            </Link>
            <a
              href={paypalSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 px-2 py-1.5 sm:px-2.5 rounded-lg whitespace-nowrap"
            >
              Donate
            </a>
            <NotificationBell />
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm text-slate-600 truncate max-w-[140px]">
                  {user?.phone}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="text-sm font-medium text-slate-600 hover:text-brand-blue px-3 py-2 rounded-lg"
                >
                  Log out
                </button>
                <HeaderBrowseMenu />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold bg-brand-blue text-white px-4 py-2 rounded-xl shadow-sm hover:bg-blue-800 transition-colors"
                >
                  Log in
                </Link>
                <HeaderBrowseMenu />
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 safe-area-pb">
        <div className="flex justify-around items-stretch max-w-lg mx-auto py-1">
          <NavLink to="/" end className={navClass}>
            <span className="text-xl leading-none">🏠</span>
            Home
          </NavLink>
          <NavLink to="/post" className={navClass}>
            <span className="text-xl leading-none">➕</span>
            Post
          </NavLink>
          <NavLink to="/search" className={navClass}>
            <span className="text-xl leading-none">🔍</span>
            Search
          </NavLink>
          <NavLink to="/map" className={navClass}>
            <span className="text-xl leading-none">🗺️</span>
            Map
          </NavLink>
          <NavLink to="/dashboard" className={navClass}>
            <span className="text-xl leading-none">👤</span>
            Profile
          </NavLink>
        </div>
      </nav>

      <footer className="border-t border-slate-200 bg-slate-50 mt-auto pb-28 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="max-w-lg mx-auto">
            <SupportBlock variant="compact" />
          </div>
          <p className="text-center text-sm text-slate-500 border-t border-slate-200 pt-6">
            ClaimYourLost — Lost it? Claim it back.
          </p>
        </div>
      </footer>
    </div>
  );
}
