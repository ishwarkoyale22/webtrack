import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu, Search, Bell, Sun, Moon, ChevronRight, User, Loader2, CalendarClock, Wallet, Globe,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { clientApi } from '../lib/api';
import { initials, avatarGradient, fmtDate } from '../lib/format';

const KIND_ICON = { payment: Wallet, deadline: CalendarClock, domain: Globe };
const SEVERITY = {
  critical: 'text-rose-400 bg-rose-500/15 ring-rose-500/30',
  warning: 'text-amber-400 bg-amber-500/15 ring-amber-500/30',
  info: 'text-cyan-300 bg-cyan-500/15 ring-cyan-500/30',
};

/* ── Theme toggle ──────────────────────────────────────────── */
function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="glass relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl transition-all duration-300 hover:border-brand-400/50 hover:shadow-glow"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ y: -18, opacity: 0, rotate: -70 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 18, opacity: 0, rotate: 70 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute"
        >
          {isDark ? <Moon size={17} className="text-brand-300" /> : <Sun size={17} className="text-amber-500" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/* ── Global client search ──────────────────────────────────── */
function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    setBusy(true);
    const t = setTimeout(() => {
      clientApi
        .list({ search: q.trim(), limit: 6 })
        .then((d) => setResults(d.clients || []))
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const go = (id) => {
    setOpen(false);
    setQ('');
    navigate(`/clients/${id}`);
  };

  return (
    <div ref={boxRef} className="relative hidden flex-1 sm:block sm:max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q.trim()) {
            setOpen(false);
            navigate(`/clients?search=${encodeURIComponent(q.trim())}`);
          }
        }}
        placeholder="Search clients…"
        aria-label="Search clients"
        className="field pl-10 pr-16"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-faint md:block">
        Ctrl K
      </kbd>

      <AnimatePresence>
        {open && q.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="glass-card absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden p-1.5"
          >
            {busy && (
              <div className="flex items-center gap-2 p-3 text-sm text-faint">
                <Loader2 size={15} className="animate-spin" /> Searching…
              </div>
            )}
            {!busy && !results.length && <p className="p-3 text-sm text-faint">No clients match “{q}”.</p>}
            {results.map((c) => (
              <button
                key={c._id}
                onClick={() => go(c._id)}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/8"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${avatarGradient(c.name)} text-[11px] font-bold text-white`}
                >
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-[11px] text-faint">
                    {c.project?.websiteName || c.company || c.phone}
                  </span>
                </span>
                <ChevronRight size={15} className="text-faint" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Notification bell ─────────────────────────────────────── */
function NotificationBell({ alerts = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = alerts.length;
  const critical = alerts.filter((a) => a.severity === 'critical').length;

  useEffect(() => {
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications, ${count} alert${count === 1 ? '' : 's'}`}
        className="glass relative grid h-10 w-10 place-items-center rounded-xl transition-all duration-300 hover:border-brand-400/50 hover:shadow-glow"
      >
        <motion.span
          animate={critical ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
          transition={{ duration: 0.9, repeat: critical ? Infinity : 0, repeatDelay: 4 }}
        >
          <Bell size={17} className={critical ? 'text-rose-400' : 'text-brand-300'} />
        </motion.span>

        {count > 0 && (
          <>
            <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-[0_0_14px_rgba(244,63,94,0.75)]">
              {count > 9 ? '9+' : count}
            </span>
            {critical > 0 && (
              <span className="absolute -right-1 -top-1 h-5 w-5 animate-pulse-ring rounded-full bg-rose-500/60" />
            )}
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass-card absolute right-0 top-[calc(100%+10px)] z-50 w-[min(88vw,22rem)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-display text-sm font-semibold">Notifications</p>
              <span className="chip-brand">{count} active</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-1.5">
              {!count && (
                <p className="p-6 text-center text-sm text-faint">
                  All clear — no payments due and no deadlines at risk.
                </p>
              )}
              {alerts.slice(0, 8).map((a) => {
                const Icon = KIND_ICON[a.kind] || Bell;
                return (
                  <Link
                    key={a.id}
                    to={a.clientId ? `/clients/${a.clientId}` : '/notifications'}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 rounded-xl p-3 transition hover:bg-white/8"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${SEVERITY[a.severity]}`}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">{a.title}</span>
                      <span className="block text-[11.5px] leading-snug text-faint">{a.message}</span>
                      {a.date && <span className="mt-0.5 block text-[10px] text-faint">{fmtDate(a.date)}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 border-t border-white/10 p-3 text-xs font-semibold text-brand-300 transition hover:bg-white/5"
            >
              View all notifications <ChevronRight size={14} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Admin menu ────────────────────────────────────────────── */
function AdminMenu() {
  const { admin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!admin) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-cyanic-400 text-[13px] font-bold text-white shadow-glow transition hover:scale-105"
      >
        {initials(admin.name) || 'A'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="glass-card absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden p-1.5"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{admin.name}</p>
              <p className="truncate text-[11px] text-faint">{admin.email}</p>
            </div>
            <div className="hr-soft my-1" />
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/8"
            >
              <User size={15} /> Profile & settings
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar({ onMenu, alerts = [], title, subtitle }) {
  return (
    <header className="sticky top-0 z-50 -mx-3 mb-5 px-3 pt-3 sm:-mx-4 sm:px-4 sm:pt-4">
      <div className="glass-card flex items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="glass grid h-10 w-10 shrink-0 place-items-center rounded-xl lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1 sm:hidden">
          <p className="truncate font-display text-sm font-semibold">{title}</p>
        </div>

        <div className="hidden min-w-0 shrink-0 pl-1 pr-2 sm:block lg:min-w-[190px]">
          <p className="truncate font-display text-sm font-bold">{title}</p>
          {subtitle && <p className="truncate text-[11px] text-faint">{subtitle}</p>}
        </div>

        <GlobalSearch />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <NotificationBell alerts={alerts} />
          <AdminMenu />
        </div>
      </div>
    </header>
  );
}
