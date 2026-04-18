import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const { login, requestOtp, updateProfile, dismissNewUserPrompt } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [otpMode, setOtpMode] = useState('phone_last6');

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await requestOtp(phone);
      setOtpMode(data.mode || 'phone_last6');
      setHint(data.hint || 'Enter the last 6 digits of your phone number.');
      setStep('otp');
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

  async function handleNicknameSave(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmed = nickname.trim().slice(0, 48);
      if (trimmed) {
        await updateProfile({ nickname: trimmed });
      } else {
        dismissNewUserPrompt();
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save nickname');
    } finally {
      setLoading(false);
    }
  }

  function handleNicknameSkip() {
    dismissNewUserPrompt();
    navigate(from, { replace: true });
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Temporary login mode: SMS OTP is disabled. Use the last 6 digits of your phone number to verify.
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            {step === 'nickname' ? 'Choose a display name' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-600">
            {step === 'phone'
              ? 'Sign in with your phone. Tap Send OTP to continue.'
              : step === 'otp'
                ? 'Enter the last 6 digits of your phone number to verify.'
                : 'This is how others will see you in chats and on listings. You can skip and appear as a masked phone number instead.'}
          </p>
        </div>

        {step === 'nickname' ? (
          <form onSubmit={handleNicknameSave} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-1">
                Nickname (optional)
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
        ) : step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? 'Please wait…' : 'Send OTP'}
            </button>
          </form>
        ) : step === 'otp' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-sm text-slate-600">
              Code sent to <strong>{phone}</strong>
              <button
                type="button"
                className="ml-2 text-brand-blue font-medium"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                }}
              >
                Change
              </button>
            </p>
            {hint && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{hint}</p>}
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1">
                6-digit OTP (last 6 digits of phone)
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
