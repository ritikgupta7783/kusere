import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import api, { parseError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useCountdown from '../hooks/useCountdown';
import { Button, ErrorNote, Field, PageLoader } from '../components/ui';
import { BRAND } from '../utils/images';

const emptyReg = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

function PasswordField({ label, error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field label={label} type={show ? 'text' : 'password'} error={error} className="[&_input]:pr-12" {...props} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-[30px] flex h-10 w-10 items-center justify-center rounded-full text-ink-400 hover:text-forest">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/**
 * ONE page for customers and the owner: /login
 * Modes: login | register | verify | forgot. The server decides the role; the page only follows `redirectTo`.
 */
export default function Login() {
  const { user, loading, login, verifyOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = location.state?.from;

  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [reg, setReg] = useState(emptyReg);
  const [pending, setPending] = useState({ email: '', masked: '' }); // account awaiting OTP
  const [otp, setOtp] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotDone, setForgotDone] = useState(false);
  const [seconds, restart] = useCountdown(0);

  useEffect(() => { document.title = 'Sign in | Bimari Mitao Herbs'; }, []);
  useEffect(() => { setError(''); setErrors({}); }, [mode]);

  if (loading) return <PageLoader />;
  if (user && mode !== 'verify') return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : from || '/'} replace />;

  const fail = (err) => {
    const p = parseError(err);
    setErrors(p.fields || {});
    setError(Object.keys(p.fields || {}).length && p.code === 'VALIDATION_ERROR' ? '' : p.message);
    return p;
  };

  const submitLogin = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setErrors({});
    try {
      const data = await login(loginForm.email, loginForm.password);
      navigate(data.user.role === 'ADMIN' ? '/admin/dashboard' : from || '/', { replace: true });
    } catch (err) {
      const p = fail(err);
      if (p.code === 'EMAIL_NOT_VERIFIED') {
        // Send a fresh code and move to the verification screen.
        setPending({ email: loginForm.email.trim().toLowerCase(), masked: p.fields?.email || loginForm.email });
        try {
          const { data } = await api.post('/auth/resend-otp', { email: loginForm.email });
          restart(data.resendAfter || 60);
        } catch (e2) { restart(parseError(e2).fields?.retryAfter || 60); }
        setOtp(''); setMode('verify');
      }
    } finally { setBusy(false); }
  };

  const submitRegister = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setErrors({});
    try {
      const { data } = await api.post('/auth/register', reg);
      setPending({ email: reg.email.trim().toLowerCase(), masked: data.email });
      restart(data.resendAfter || 60); setOtp(''); setMode('verify');
      toast.success('We emailed you a 6-digit code');
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const submitOtp = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await verifyOtp(pending.email, otp);
      toast.success('Email verified. Welcome!');
      navigate(from || '/', { replace: true });
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const resend = async () => {
    setError('');
    try {
      const { data } = await api.post('/auth/resend-otp', { email: pending.email });
      restart(data.resendAfter || 60); toast.success('A new code has been sent');
    } catch (err) {
      const p = parseError(err);
      if (p.fields?.retryAfter) restart(p.fields.retryAfter);
      setError(p.message);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/auth/forgot-password', { email: forgotEmail }); setForgotDone(true); }
    catch (err) { fail(err); } finally { setBusy(false); }
  };

  const setLogin = (k) => (e) => setLoginForm((f) => ({ ...f, [k]: e.target.value }));
  const setR = (k) => (e) => { setReg((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  return (
    <div className="leaf-bg">
      <div className="container-page flex min-h-[70vh] items-center justify-center py-10 sm:py-16">
        <div className="card w-full max-w-md p-6 sm:p-8">
          <img src={BRAND.logo} alt="Bimari Mitao Herbs" className="mx-auto mb-6 h-10 w-auto" />

          {mode === 'login' && (
            <form onSubmit={submitLogin} className="space-y-4" noValidate>
              <div className="text-center"><h1 className="text-3xl font-semibold">Welcome back</h1><p className="mt-1 text-sm text-ink-500">Sign in to your account</p></div>
              <ErrorNote>{error}</ErrorNote>
              <Field label="Email" type="email" name="email" autoComplete="email" placeholder="Enter your email address" value={loginForm.email} onChange={setLogin('email')} error={errors.email} required />
              <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Enter your password" value={loginForm.password} onChange={setLogin('password')} error={errors.password} required />
              <div className="text-right"><button type="button" onClick={() => { setForgotEmail(loginForm.email); setForgotDone(false); setMode('forgot'); }} className="text-sm font-medium text-forest hover:underline">Forgot password?</button></div>
              <Button type="submit" loading={busy} className="w-full">Sign In</Button>
              <p className="text-center text-sm text-ink-500">New here? <button type="button" onClick={() => setMode('register')} className="font-semibold text-forest hover:underline">Create Account</button></p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={submitRegister} className="space-y-4" noValidate>
              <div className="text-center"><h1 className="text-3xl font-semibold">Create account</h1><p className="mt-1 text-sm text-ink-500">We will email you a code to verify your address</p></div>
              <ErrorNote>{error}</ErrorNote>
              <Field label="Full name" autoComplete="name" placeholder="Enter your full name" value={reg.name} onChange={setR('name')} error={errors.name} required />
              <Field label="Email address" type="email" autoComplete="email" placeholder="Enter your email address" value={reg.email} onChange={setR('email')} error={errors.email} required />
              <Field label="Phone number" type="tel" inputMode="numeric" autoComplete="tel" placeholder="Enter your phone number" value={reg.phone} onChange={setR('phone')} error={errors.phone} required />
              <PasswordField label="Password" autoComplete="new-password" placeholder="Create a strong password" value={reg.password} onChange={setR('password')} error={errors.password} hint="8+ characters with upper-case, lower-case and a number" required />
              <PasswordField label="Confirm password" autoComplete="new-password" placeholder="Re-enter your password" value={reg.confirmPassword} onChange={setR('confirmPassword')} error={errors.confirmPassword} required />
              <Button type="submit" loading={busy} className="w-full">Create Account</Button>
              <p className="text-center text-sm text-ink-500">Already registered? <button type="button" onClick={() => setMode('login')} className="font-semibold text-forest hover:underline">Sign in</button></p>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={submitOtp} className="space-y-5" noValidate>
              <div className="text-center">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-leaf-100 text-forest"><MailCheck /></span>
                <h1 className="text-3xl font-semibold">Verify Your Email</h1>
                <p className="mt-2 text-sm text-ink-500">Enter the 6-digit code sent to<br /><strong className="text-ink">{pending.masked}</strong></p>
              </div>
              <ErrorNote>{error}</ErrorNote>
              <div>
                <label htmlFor="otp" className="sr-only">6-digit verification code</label>
                <input id="otp" className="input text-center font-mono text-2xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="------"
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
                {errors.otp && <p className="mt-1 text-xs text-brand-red" role="alert">{errors.otp}</p>}
              </div>
              <Button type="submit" loading={busy} disabled={otp.length !== 6} className="w-full">Verify Email</Button>
              <div className="flex flex-col items-center gap-2 text-sm">
                {seconds > 0
                  ? <p className="text-ink-500" aria-live="polite">Resend code in <span className="font-semibold tabular-nums">{seconds}s</span></p>
                  : <button type="button" onClick={resend} className="font-semibold text-forest hover:underline">Resend OTP</button>}
                <button type="button" onClick={() => setMode('register')} className="text-ink-500 hover:text-forest hover:underline">Change email</button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            forgotDone ? (
              <div className="space-y-4 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf-100 text-forest"><MailCheck /></span>
                <h1 className="text-3xl font-semibold">Check your email</h1>
                <p className="text-sm text-ink-500">If an account exists for <strong className="text-ink">{forgotEmail}</strong>, we have sent a link to reset your password. It expires in 30 minutes.</p>
                <button className="btn-outline w-full" onClick={() => setMode('login')}>Back to sign in</button>
              </div>
            ) : (
              <form onSubmit={submitForgot} className="space-y-4" noValidate>
                <div className="text-center"><h1 className="text-3xl font-semibold">Forgot password?</h1><p className="mt-1 text-sm text-ink-500">Enter your registered email and we will send a reset link</p></div>
                <ErrorNote>{error}</ErrorNote>
                <Field label="Email" type="email" autoComplete="email" placeholder="Enter your email address" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} error={errors.email} required />
                <Button type="submit" loading={busy} className="w-full">Send reset link</Button>
                <p className="text-center text-sm"><button type="button" onClick={() => setMode('login')} className="font-semibold text-forest hover:underline">Back to sign in</button></p>
              </form>
            )
          )}
        </div>
      </div>
      {mode === 'login' && <p className="sr-only"><Link to="/">Home</Link></p>}
    </div>
  );
}
