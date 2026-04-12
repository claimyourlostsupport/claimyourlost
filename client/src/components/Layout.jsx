import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { paypalSupportUrl } from '../constants/support.js';
import { NotificationBell } from './NotificationBell.jsx';
import { SupportBlock } from './SupportBlock.jsx';

const navClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-medium rounded-xl transition-colors min-w-0 flex-1 ${
    isActive ? 'text-brand-blue bg-blue-50' : 'text-slate-500 hover:text-slate-800'
  }`;

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
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold bg-brand-blue text-white px-4 py-2 rounded-xl shadow-sm hover:bg-blue-800 transition-colors"
              >
                Log in
              </Link>
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
