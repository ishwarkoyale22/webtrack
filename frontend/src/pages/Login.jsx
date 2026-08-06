import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, User, Loader2, Sun, Moon,
  LayoutDashboard, Wallet, Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../lib/api';
import Background3D from '../components/Background3D';

const HIGHLIGHTS = [
  { icon: LayoutDashboard, title: 'Every client on one page', text: 'Website, payments, domain, notes and history together.' },
  { icon: Wallet, title: 'Payments that add themselves up', text: 'Pending and status recalculate on every entry.' },
  { icon: Globe, title: 'Nothing slips', text: 'Due dates, deadlines and domain expiry all alert you.' },
];

export default function Login() {
  const { login, register } = useAuth();
  const { isDark, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.get('expired')) toast.warning('Your session expired. Please log in again.');
    authApi
      .status()
      .then(({ hasAdmin }) => setMode(hasAdmin ? 'login' : 'register'))
      .catch(() => setMode('login'))
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await register(form);
        toast.success(`Welcome aboard, ${form.name.split(' ')[0]}!`);
      } else {
        const user = await login(form.email, form.password);
        toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      }
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.friendlyMessage || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Background3D />

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="glass absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-xl transition hover:shadow-glow"
      >
        {isDark ? <Moon size={17} className="text-brand-300" /> : <Sun size={17} className="text-amber-500" />}
      </button>

      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:gap-16">
        {/* ── Brand side ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-col gap-8 lg:flex"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-cyanic-400 blur-lg opacity-80" />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-cyanic-500 shadow-glow-lg">
                <Sparkles size={22} className="text-white" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl font-bold tracking-tight">
                Web<span className="gradient-text">Track</span>
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">Studio Console</p>
            </div>
          </div>

          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">
              Run your web studio
              <br />
              <span className="gradient-text">from one screen.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-dim">
              Clients, projects, payments and domains — tracked, calculated and invoiced without a
              single spreadsheet.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.5 }}
                className="glass-card flex items-start gap-3.5 p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs leading-relaxed text-faint">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Form side ── */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformPerspective: 1400 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyanic-500 shadow-glow">
              <Sparkles size={20} className="text-white" />
            </div>
            <p className="font-display text-xl font-bold">
              Web<span className="gradient-text">Track</span>
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold">
                {mode === 'register' ? 'Create your admin account' : 'Welcome back'}
              </h2>
              <p className="mt-1.5 text-sm text-dim">
                {mode === 'register'
                  ? 'This is a single-admin panel — set up the one account that owns it.'
                  : 'Sign in to your studio console.'}
              </p>
            </div>

            {checking ? (
              <div className="flex items-center gap-2 py-8 text-sm text-faint">
                <Loader2 size={16} className="animate-spin" /> Preparing…
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="label">Your name</label>
                      <div className="relative">
                        <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                        <input
                          className="field pl-10"
                          placeholder="Ishwar Koyale"
                          value={form.name}
                          onChange={set('name')}
                          required={mode === 'register'}
                          autoComplete="name"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      type="email"
                      className="field pl-10"
                      placeholder="you@studio.com"
                      value={form.email}
                      onChange={set('email')}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="field pl-10 pr-11"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={set('password')}
                      required
                      minLength={6}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-faint transition hover:text-current"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/12 px-3.5 py-2.5 text-xs font-medium text-rose-300"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
                  {busy ? <Loader2 size={17} className="animate-spin" /> : null}
                  {mode === 'register' ? 'Create account & continue' : 'Sign in'}
                  {!busy && <ArrowRight size={16} />}
                </button>

                <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-faint">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  Protected by JWT — your session stays on this device.
                </div>
              </form>
            )}
          </div>

          <p className="mt-5 text-center text-[11px] text-faint">
            WebTrack · Client, project &amp; payment tracking for web studios
          </p>
        </motion.div>
      </div>
    </div>
  );
}
