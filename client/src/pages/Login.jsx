import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const { login, requestOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [otpMode, setOtpMode] = useState('mock');

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await requestOtp(phone);
      setOtpMode(data.mode === 'sms' ? 'sms' : 'mock');
      if (data.mode === 'sms') {
        setHint('Enter the 6-digit code sent to your phone.');
      } else {
        setHint(data.mockHint || 'Use any 6-digit code (e.g. 123456).');
      }
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
      await login(phone, otp.trim());
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-600">
            {step === 'phone'
              ? 'Sign in with your phone. We will send or simulate a one-time code.'
              : otpMode === 'sms'
                ? 'Enter the code we sent by SMS.'
                : 'Demo mode: use any 6 digits to verify.'}
          </p>
        </div>

        {step === 'phone' ? (
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
        ) : (
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
                6-digit OTP
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
        )}

        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="text-brand-blue font-medium hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
