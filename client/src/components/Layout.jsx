import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBrowseScope } from '../context/BrowseScopeContext.jsx';
import { api } from '../api/client.js';
import { mergeCountryOptions } from '../constants/countries.js';
import { paypalSupportUrl, SUPPORT_EMAIL } from '../constants/support.js';
import { NotificationBell } from './NotificationBell.jsx';
import { lossFoundSearchUrl } from '../utils/browseSearchUrl.js';
import { publicUserLabel } from '../utils/publicUserLabel.js';

const navClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-medium rounded-xl transition-colors min-w-0 flex-1 ${
    isActive ? 'text-brand-blue bg-blue-50' : 'text-slate-500 hover:text-slate-800'
  }`;

const sectionTabClass = ({ isActive }) =>
  `shrink-0 whitespace-nowrap px-2.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
    isActive
      ? 'text-brand-blue border-brand-blue bg-blue-50/60'
      : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
  }`;

function SectionTabs() {
  return (
    <div className="border-b border-slate-200 bg-white/95">
      <nav
        className="max-w-5xl mx-auto px-2 sm:px-4 flex gap-0 sm:gap-1 overflow-x-auto"
        aria-label="Site sections"
      >
        <NavLink to="/" end className={sectionTabClass}>
          Loss &amp; Found
        </NavLink>
        <NavLink to="/events" className={sectionTabClass}>
          Event/News
        </NavLink>
        <NavLink to="/social-hub" className={sectionTabClass}>
          SocialHub
        </NavLink>
        <NavLink to="/looking" className={sectionTabClass}>
          Looking ?
        </NavLink>
      </nav>
    </div>
  );
}

const PASSWORD_PIN_LEN = 6;

function pinDigits(v) {
  return String(v ?? '').replace(/\D/g, '').slice(0, PASSWORD_PIN_LEN);
}

function isSixDigitPin(s) {
  return new RegExp(`^\\d{${PASSWORD_PIN_LEN}}$`).test(String(s ?? ''));
}

function HeaderBrowseMenu() {
  const { country, setCountryAndFocus } = useBrowseScope();
  const { isAuthenticated, user, updateProfile, setPassword } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [countryList, setCountryList] = useState([]);
  const [draftCountry, setDraftCountry] = useState(country);
  const [draftNickname, setDraftNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const wrapRef = useRef(null);
  const hasPassword = Boolean(user?.hasPassword);

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

  useEffect(() => {
    if (nicknameModalOpen) {
      setDraftNickname(String(user?.nickname ?? '').trim());
      setNicknameError('');
    }
  }, [nicknameModalOpen, user?.nickname]);

  useEffect(() => {
    if (passwordModalOpen) {
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setPwdError('');
    }
  }, [passwordModalOpen]);

  async function saveNickname() {
    setNicknameError('');
    setNicknameSaving(true);
    try {
      await updateProfile({ nickname: draftNickname.trim().slice(0, 48) });
      setNicknameModalOpen(false);
    } catch (err) {
      setNicknameError(err.response?.data?.error || 'Could not save display name');
    } finally {
      setNicknameSaving(false);
    }
  }

  async function savePassword() {
    setPwdError('');
    const next = pinDigits(pwdNew);
    const confirm = pinDigits(pwdConfirm);
    const cur = pinDigits(pwdCurrent);
    if (!isSixDigitPin(next)) {
      setPwdError(`Password must be exactly ${PASSWORD_PIN_LEN} digits.`);
      return;
    }
    if (next !== confirm) {
      setPwdError('Passwords do not match.');
      return;
    }
    if (hasPassword && !isSixDigitPin(cur)) {
      setPwdError(`Enter your current ${PASSWORD_PIN_LEN}-digit password.`);
      return;
    }
    setPwdSaving(true);
    try {
      await setPassword({
        password: next,
        ...(hasPassword ? { currentPassword: cur } : {}),
      });
      setPasswordModalOpen(false);
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Could not update password');
    } finally {
      setPwdSaving(false);
    }
  }

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
          className="absolute right-0 top-full mt-1 z-50 min-w-[13.5rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <Link
            to="/favorites"
            role="menuitem"
            className="block px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50 font-medium"
            onClick={() => setMenuOpen(false)}
          >
            Favorite
          </Link>
          {isAuthenticated && (
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50 border-t border-slate-100 font-medium"
              onClick={() => {
                setMenuOpen(false);
                setNicknameModalOpen(true);
              }}
            >
              Display name
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 border-t border-slate-100"
            onClick={() => {
              setMenuOpen(false);
              setModalOpen(true);
            }}
          >
            Set country
          </button>
          {isAuthenticated && (
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50 border-t border-slate-100 font-medium"
              onClick={() => {
                setMenuOpen(false);
                setPasswordModalOpen(true);
              }}
            >
              {hasPassword ? 'Change password' : 'Set password'}
            </button>
          )}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            role="menuitem"
            className="block px-3 py-2.5 text-sm hover:bg-slate-50 border-t border-slate-100"
            onClick={() => setMenuOpen(false)}
          >
            <span className="block font-medium text-slate-800">Contact us</span>
            <span className="block text-xs text-slate-500 truncate mt-0.5">{SUPPORT_EMAIL}</span>
          </a>
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
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-change-title"
          onClick={() => !pwdSaving && setPasswordModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="password-change-title" className="text-lg font-bold text-slate-900">
              {hasPassword ? 'Change password' : 'Set password'}
            </h2>
            <p className="text-sm text-slate-600">
              {hasPassword
                ? `Enter your current ${PASSWORD_PIN_LEN}-digit password, then choose a new ${PASSWORD_PIN_LEN}-digit password.`
                : `Choose a ${PASSWORD_PIN_LEN}-digit numeric password. You can still sign in with your phone.`}
            </p>
            {hasPassword && (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Current password (6 digits)</span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={PASSWORD_PIN_LEN}
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(pinDigits(e.target.value))}
                  placeholder="••••••"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-center font-mono tracking-widest bg-white"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                {hasPassword ? 'New password (6 digits)' : 'Password (6 digits)'}
              </span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={PASSWORD_PIN_LEN}
                value={pwdNew}
                onChange={(e) => setPwdNew(pinDigits(e.target.value))}
                placeholder="••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-center font-mono tracking-widest bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Confirm password (6 digits)</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={PASSWORD_PIN_LEN}
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(pinDigits(e.target.value))}
                placeholder="••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-center font-mono tracking-widest bg-white"
              />
            </label>
            {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                disabled={pwdSaving}
                onClick={() => setPasswordModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-blue text-white hover:bg-blue-800 disabled:opacity-60"
                disabled={pwdSaving}
                onClick={() => savePassword()}
              >
                {pwdSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {nicknameModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nickname-set-title"
          onClick={() => !nicknameSaving && setNicknameModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="nickname-set-title" className="text-lg font-bold text-slate-900">
              Display name
            </h2>
            <p className="text-sm text-slate-600">
              This is how you appear in the header, chats, and on your listings. Leave blank to show a masked phone number
              instead (e.g. ••••••57).
            </p>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Nickname</span>
              <input
                type="text"
                autoComplete="nickname"
                maxLength={48}
                value={draftNickname}
                onChange={(e) => setDraftNickname(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                placeholder="e.g. Alex"
              />
            </label>
            {nicknameError && <p className="text-sm text-red-600">{nicknameError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                disabled={nicknameSaving}
                onClick={() => setNicknameModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-blue text-white hover:bg-blue-800 disabled:opacity-60"
                disabled={nicknameSaving}
                onClick={() => saveNickname()}
              >
                {nicknameSaving ? 'Saving…' : 'Save'}
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
  const { scope, country: browseCountry } = useBrowseScope();
  const searchNavTo = useMemo(
    () => lossFoundSearchUrl(scope, browseCountry),
    [scope, browseCountry]
  );

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
                  {publicUserLabel(user)}
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

      <SectionTabs />

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
          <NavLink to={searchNavTo} className={navClass}>
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
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-500">
            ClaimYourLost — Lost it? Claim it back.
          </p>
        </div>
      </footer>
    </div>
  );
}
