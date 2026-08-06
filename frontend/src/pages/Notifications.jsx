import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing, Wallet, CalendarClock, Globe, ArrowUpRight, RefreshCw, Loader2, CheckCircle2,
} from 'lucide-react';
import { PageTransition, EmptyState, SkeletonCard } from '../components/ui';
import { notificationApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { fmtDate, money } from '../lib/format';

const KINDS = [
  { value: 'all', label: 'Everything', icon: BellRing },
  { value: 'payment', label: 'Payments', icon: Wallet },
  { value: 'deadline', label: 'Deadlines', icon: CalendarClock },
  { value: 'domain', label: 'Domains', icon: Globe },
];

const STYLE = {
  critical: {
    ring: 'ring-rose-500/30 bg-rose-500/12 text-rose-400',
    bar: 'from-rose-500 to-red-500',
    chip: 'chip-pending',
    label: 'Urgent',
  },
  warning: {
    ring: 'ring-amber-500/30 bg-amber-500/12 text-amber-400',
    bar: 'from-amber-400 to-orange-500',
    chip: 'chip-partial',
    label: 'Soon',
  },
  info: {
    ring: 'ring-cyan-500/30 bg-cyan-500/12 text-cyan-300',
    bar: 'from-cyan-400 to-blue-500',
    chip: 'chip-cyan',
    label: 'Open',
  },
};

const ICON = { payment: Wallet, deadline: CalendarClock, domain: Globe };

export default function Notifications() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kind, setKind] = useState('all');
  const toast = useToast();

  const load = (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    notificationApi
      .list()
      .then((d) => setAlerts(d.alerts || []))
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load notifications'))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () => ({
      all: alerts.length,
      payment: alerts.filter((a) => a.kind === 'payment').length,
      deadline: alerts.filter((a) => a.kind === 'deadline').length,
      domain: alerts.filter((a) => a.kind === 'domain').length,
    }),
    [alerts]
  );

  const totalPending = useMemo(
    () => alerts.filter((a) => a.kind === 'payment').reduce((s, a) => s + (a.amount || 0), 0),
    [alerts]
  );

  const shown = kind === 'all' ? alerts : alerts.filter((a) => a.kind === kind);
  const critical = alerts.filter((a) => a.severity === 'critical').length;

  if (loading) {
    return (
      <PageTransition className="space-y-4">
        <SkeletonCard className="h-28" />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-20" />
        ))}
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-4">
      {/* ── Header ── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card relative overflow-hidden p-5 sm:p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 animate-float-slow rounded-full bg-rose-500/20 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.span
              animate={critical ? { rotate: [0, -10, 10, -6, 6, 0] } : {}}
              transition={{ duration: 1, repeat: critical ? Infinity : 0, repeatDelay: 3.5 }}
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-glow ${
                critical
                  ? 'bg-gradient-to-br from-rose-500 to-red-600'
                  : 'bg-gradient-to-br from-brand-500 to-cyanic-500'
              }`}
            >
              <BellRing size={24} />
            </motion.span>

            <div>
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Notifications</h1>
              <p className="mt-1 text-sm text-dim">
                {alerts.length
                  ? `${alerts.length} active alert${alerts.length === 1 ? '' : 's'}${
                      critical ? ` · ${critical} need${critical === 1 ? 's' : ''} attention now` : ''
                    }`
                  : 'Nothing needs your attention right now.'}
              </p>
              {totalPending > 0 && (
                <p className="mt-1 text-xs text-faint">
                  <span className="font-bold text-rose-400">{money(totalPending)}</span> outstanding across payment
                  reminders.
                </p>
              )}
            </div>
          </div>

          <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost">
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>
      </motion.section>

      {/* ── Kind filter ── */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {KINDS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setKind(value)}
            className={`btn shrink-0 ${
              kind === value ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <Icon size={14} /> {label}
            <span
              className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[10px] font-bold ${
                kind === value ? 'bg-white/25' : 'bg-white/10'
              }`}
            >
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {!shown.length ? (
        <div className="glass-card">
          <EmptyState
            icon={CheckCircle2}
            title={alerts.length ? 'Nothing in this category' : 'All caught up'}
            message={
              alerts.length
                ? 'Try another category — the other tabs still have alerts.'
                : 'No payments are due, no deadlines are at risk and no domains are expiring soon.'
            }
          />
        </div>
      ) : (
        <motion.ul layout className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {shown.map((a, i) => {
              const s = STYLE[a.severity] || STYLE.info;
              const Icon = ICON[a.kind] || BellRing;
              return (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Link
                    to={a.clientId ? `/clients/${a.clientId}` : '#'}
                    className="glass-card group relative flex items-start gap-3.5 overflow-hidden p-4"
                  >
                    <span className={`absolute inset-y-3 left-0 w-[3px] rounded-full bg-gradient-to-b ${s.bar}`} />

                    <span className={`ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${s.ring}`}>
                      <Icon size={18} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{a.title}</p>
                        <span className={s.chip}>{s.label}</span>
                        {a.date && <span className="text-[11px] text-faint">{fmtDate(a.date)}</span>}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-dim">{a.message}</p>
                    </div>

                    {a.amount > 0 && (
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className="block font-display text-base font-bold text-rose-400">{money(a.amount)}</span>
                        <span className="block text-[10.5px] text-faint">outstanding</span>
                      </span>
                    )}

                    <ArrowUpRight
                      size={16}
                      className="mt-1 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand-300"
                    />
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </PageTransition>
  );
}
