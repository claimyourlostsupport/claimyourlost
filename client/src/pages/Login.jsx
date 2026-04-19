import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBrowseScope } from '../context/BrowseScopeContext.jsx';
import {
  buildFullPhone,
  DEFAULT_DIAL_CODE,
  dialOptionValue,
  getDialOptionsForSelect,
  migrateLegacyDialStorage,
  parseDialSelectionKey,
} from '../constants/phoneDialCodes.js';

const LOGIN_DIAL_STORAGE_KEY = 'cyl_login_dial';

const PIN_LENGTH = 6;

function pinDigits(v) {
  return String(v ?? '').replace(/\D/g, '').slice(0, PIN_LENGTH);
}

function isSixDigitPin(s) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(String(s ?? ''));
}

function loginSubtitle(step, credentialMode) {
  if (step === 'phone') {
    return 'Sign in with your phone. Tap Continue.';
  }
  if (step === 'credential' && credentialMode === 'password') {
    return 'Enter your 6-digit account password.';
  }
  if (step === 'credential') {
    return 'Enter the last 6 digits of your phone number to verify.';
  }
  if (step === 'nickname') {
    return 'This is how others will see you in chats and on listings. You can skip and appear as a masked phone number instead.';
  }
  if (step === 'password') {
    return 'Optional: create a 6-digit numeric PIN (numbers only). Phone sign-in still works. Skip if you prefer — you can set this later from the ⋮ menu.';
  }
  return '';
}

export function Login() {
  const { login, loginWithPassword, requestOtp, updateProfile, setPassword, dismissNewUserPrompt } = useAuth();
  const { setCountryAndFocus } = useBrowseScope();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [dialSelection, setDialSelection] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem(LOGIN_DIAL_STORAGE_KEY) : null;
      return migrateLegacyDialStorage(saved);
    } catch {
      return migrateLegacyDialStorage(null);
    }
  });
  const dialParsed = useMemo(() => {
    const p = parseDialSelectionKey(dialSelection);
    if (p?.dial) return p;
    return { dial: DEFAULT_DIAL_CODE, countryName: 'India' };
  }, [dialSelection]);
  const dialCode = dialParsed.dial;
  const [nationalNumber, setNationalNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [credentialMode, setCredentialMode] = useState('otp');
  const [nickname, setNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    try {
      sessionStorage.setItem(LOGIN_DIAL_STORAGE_KEY, dialSelection);
    } catch {
      /* ignore */
    }
  }, [dialSelection]);

  function handleLoginDialChange(e) {
    const key = e.target.value;
    setDialSelection(key);
    const p = parseDialSelectionKey(key);
    if (p?.countryName) setCountryAndFocus(p.countryName);
  }

  const fullPhone = buildFullPhone(dialCode, nationalNumber);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    const phone = buildFullPhone(dialCode, nationalNumber);
    const nationalDigits = String(nationalNumber || '').replace(/\D/g, '');
    if (!phone || nationalDigits.length < 6) {
      setError('Enter your mobile number (at least 6 digits after the country code).');
      return;
    }
    setLoading(true);
    try {
      const { data } = await requestOtp(phone);
      const mode = data.credentialMode === 'password' ? 'password' : 'otp';
      setCredentialMode(mode);
      setHint(
        data.hint ||
          (mode === 'password'
            ? 'Enter your 6-digit account password.'
            : 'Enter the last 6 digits of your full phone number (including country code digits).')
      );
      setOtp('');
      setLoginPass('');
      setStep('credential');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const phone = buildFullPhone(dialCode, nationalNumber);
      const data = await login(phone, otp.trim());
      if (data?.user?.isNewUser) {
        setStep('nickname');
        setNickname('');
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginWithPassword(e) {
    e.preventDefault();
    setError('');
    const pin = pinDigits(loginPass);
    if (!isSixDigitPin(pin)) {
      setError('Enter your 6-digit password.');
      return;
    }
    setLoading(true);
    try {
      const phone = buildFullPhone(dialCode, nationalNumber);
      const data = await loginWithPassword(phone, pin);
      if (data?.user?.isNewUser) {
        setStep('nickname');
        setNickname('');
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleNicknameSave(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmed = nickname.trim().slice(0, 48);
      if (trimmed) {
        await updateProfile({ nickname: trimmed });
      }
      setNewPassword('');
      setConfirmPassword('');
      setStep('password');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save name');
    } finally {
      setLoading(false);
    }
  }

  function handleNicknameSkip() {
    setError('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('password');
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setError('');
    const p = pinDigits(newPassword);
    const c = pinDigits(confirmPassword);
    if (!isSixDigitPin(p)) {
      setError('Enter exactly 6 digits (numbers only), or tap Skip for now.');
      return;
    }
    if (p !== c) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await setPassword({ password: p });
      dismissNewUserPrompt();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save password');
    } finally {
      setLoading(false);
    }
  }

  function handlePasswordSkip() {
    dismissNewUserPrompt();
    navigate(from, { replace: true });
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
        {step === 'credential' && credentialMode === 'otp' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Temporary login mode: SMS OTP is disabled. Enter the last 6 digits of your full international number
            (country code + mobile) to verify.
          </div>
        )}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            {step === 'nickname'
              ? 'Choose a display name'
              : step === 'password'
                ? 'Set a password'
                : step === 'credential' && credentialMode === 'password'
                  ? 'Enter your password'
                  : 'Welcome'}
          </h1>
          <p className="text-sm text-slate-600">{loginSubtitle(step, credentialMode)}</p>
        </div>

        {step === 'nickname' ? (
          <form onSubmit={handleNicknameSave} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                id="nickname"
                type="text"
                autoComplete="nickname"
                maxLength={48}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={handleNicknameSkip}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              Skip for now
            </button>
          </form>
        ) : step === 'password' ? (
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              Not 8 characters — use exactly <strong>6 numbers</strong> (for example <span className="font-mono">123456</span>).
            </p>
            <div>
              <label htmlFor="login-new-password" className="block text-sm font-medium text-slate-700 mb-1">
                New password (6 digits)
              </label>
              <input
                id="login-new-password"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={PIN_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(pinDigits(e.target.value))}
                placeholder="6 digits"
                aria-describedby="login-pin-hint"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.35em] text-center font-mono focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              />
            </div>
            <div>
              <label htmlFor="login-confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm password (6 digits)
              </label>
              <input
                id="login-confirm-password"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={PIN_LENGTH}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(pinDigits(e.target.value))}
                placeholder="6 digits"
                aria-describedby="login-pin-hint"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.35em] text-center font-mono focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              />
            </div>
            <p id="login-pin-hint" className="text-[11px] text-slate-500">
              Numbers only. Same 6 digits in both fields.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={handlePasswordSkip}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              Skip for now
            </button>
          </form>
        ) : step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1.5">Phone number</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="sr-only" htmlFor="login-country-code">
                  Country code
                </label>
                <select
                  id="login-country-code"
                  value={dialSelection}
                  onChange={handleLoginDialChange}
                  className="w-full sm:w-[min(100%,15.5rem)] shrink-0 rounded-xl border border-slate-200 px-3 py-3 text-sm bg-white focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
                  aria-label="Country and dial code"
                >
                  {getDialOptionsForSelect().map((c) => (
                    <option key={dialOptionValue(c)} value={dialOptionValue(c)}>
                      {c.name} (+{c.dial})
                    </option>
                  ))}
                </select>
                <input
                  id="login-national-number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  value={nationalNumber}
                  onChange={(e) => setNationalNumber(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="999888123"
                  className="flex-1 min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-base focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
                  aria-label="Mobile number without country code"
                />
              </div>
              {fullPhone && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Using number: <span className="font-mono text-slate-700">{fullPhone}</span>
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? 'Please wait…' : 'Continue'}
            </button>
          </form>
        ) : step === 'credential' && credentialMode === 'password' ? (
          <form onSubmit={handleLoginWithPassword} className="space-y-4">
            <p className="text-sm text-slate-600">
              Signing in as <strong className="font-mono">{fullPhone || 'your number'}</strong>
              <button
                type="button"
                className="ml-2 text-brand-blue font-medium"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setLoginPass('');
                }}
              >
                Change
              </button>
            </p>
            {hint && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{hint}</p>}
            <div>
              <label htmlFor="login-account-password" className="block text-sm font-medium text-slate-700 mb-1">
                Password (6 digits)
              </label>
              <input
                id="login-account-password"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={PIN_LENGTH}
                value={loginPass}
                onChange={(e) => setLoginPass(pinDigits(e.target.value))}
                placeholder="••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.35em] text-center font-mono focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !isSixDigitPin(loginPass)}
              className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : step === 'credential' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-sm text-slate-600">
              Code for <strong className="font-mono">{fullPhone || 'your number'}</strong>
              <button
                type="button"
                className="ml-2 text-brand-blue font-medium"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setLoginPass('');
                }}
              >
                Change
              </button>
            </p>
            {hint && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{hint}</p>}
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1">
                6-digit code (last 6 digits of full number)
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.5em] text-center font-mono focus:ring-2 focus:ring-brand-blue/40"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Verify & continue'}
            </button>
          </form>
        ) : null}

        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="text-brand-blue font-medium hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
