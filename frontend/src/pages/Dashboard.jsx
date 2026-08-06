import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, IndianRupee, Clock3, Rocket, ArrowUpRight, CalendarClock, Wallet, Globe,
  BellRing, Activity as ActivityIcon, Plus, TrendingUp,
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { MonthlyRevenueChart, PendingVsReceivedChart, SplitDonut } from '../components/Charts';
import { PageTransition, SkeletonCard, EmptyState, SectionTitle } from '../components/ui';
import { reportApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { money, fmtDate, fromNow, initials, avatarGradient } from '../lib/format';

const ALERT_ICON = { payment: Wallet, deadline: CalendarClock, domain: Globe };
const ALERT_STYLE = {
  critical: { chip: 'chip-pending', ring: 'ring-rose-500/30 bg-rose-500/12 text-rose-400', bar: 'from-rose-500 to-red-500' },
  warning: { chip: 'chip-partial', ring: 'ring-amber-500/30 bg-amber-500/12 text-amber-400', bar: 'from-amber-400 to-orange-500' },
  info: { chip: 'chip-cyan', ring: 'ring-cyan-500/30 bg-cyan-500/12 text-cyan-300', bar: 'from-cyan-400 to-blue-500' },
};

function AlertRow({ alert, index }) {
  const Icon = ALERT_ICON[alert.kind] || BellRing;
  const s = ALERT_STYLE[alert.severity] || ALERT_STYLE.info;

  return (
    <motion.li
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link
        to={alert.clientId ? `/clients/${alert.clientId}` : '/notifications'}
        className="group relative flex items-start gap-3 overflow-hidden rounded-xl p-3 transition hover:bg-white/6"
      >
        <span className={`absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b ${s.bar}`} />
        <span className={`ml-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${s.ring}`}>
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold">{alert.title}</span>
            {alert.date && <span className="text-[10.5px] text-faint">{fmtDate(alert.date)}</span>}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-dim">{alert.message}</span>
        </span>
        <ArrowUpRight size={15} className="mt-1 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
      </Link>
    </motion.li>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    reportApi
      .dashboard({ months: 6 })
      .then(setData)
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load the dashboard'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <PageTransition className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} className="h-36" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonCard className="h-80 lg:col-span-2" />
          <SkeletonCard className="h-80" />
        </div>
      </PageTransition>
    );
  }

  const s = data?.stats || {};
  const alerts = data?.alerts || [];
  const critical = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <PageTransition className="space-y-5">
      {/* ── Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card relative overflow-hidden p-5 sm:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 animate-float-slow rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 animate-float rounded-full bg-cyanic-400/20 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="chip-brand mb-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
              Live overview
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Your studio, <span className="gradient-text">at a glance</span>
            </h1>
            <p className="mt-1.5 max-w-lg text-sm text-dim">
              {s.totalClients
                ? `${s.totalClients} client${s.totalClients === 1 ? '' : 's'} tracked · ${money(s.totalPending)} still to collect · ${s.activeProjects} project${s.activeProjects === 1 ? '' : 's'} in flight.`
                : 'Add your first client to start tracking projects, payments and domains.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/clients?new=1" className="btn-primary">
              <Plus size={16} /> Add client
            </Link>
            <Link to="/reports" className="btn-ghost">
              <TrendingUp size={16} /> Reports
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={Users}
          label="Total Clients"
          value={s.totalClients || 0}
          tone="brand"
          hint="One client, one website"
          delay={0}
          onClick={() => navigate('/clients')}
        />
        <StatsCard
          icon={IndianRupee}
          label="Total Revenue"
          value={s.totalRevenue || 0}
          format={(v) => money(v)}
          tone="emerald"
          hint={`${s.collectionRate || 0}% of everything quoted`}
          trend={s.collectionRate >= 50 ? { dir: 'up', label: `${s.collectionRate}% collected` } : undefined}
          delay={0.07}
        />
        <StatsCard
          icon={Clock3}
          label="Total Pending"
          value={s.totalPending || 0}
          format={(v) => money(v)}
          tone="rose"
          hint={critical ? `${critical} urgent alert${critical === 1 ? '' : 's'}` : 'Nothing overdue'}
          delay={0.14}
        />
        <StatsCard
          icon={Rocket}
          label="Active Projects"
          value={s.activeProjects || 0}
          tone="cyan"
          hint={`${s.liveProjects || 0} already live`}
          delay={0.21}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MonthlyRevenueChart data={data?.monthlyRevenue || []} height={300} delay={0.1} />
        </div>
        <div className="lg:col-span-2">
          <PendingVsReceivedChart data={data?.pendingVsReceived || []} height={300} delay={0.16} />
        </div>
      </div>

      {/* ── Alerts + splits ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card p-4 sm:p-5 lg:col-span-3"
        >
          <SectionTitle
            icon={BellRing}
            title="Alerts"
            subtitle="Payment reminders and deadline warnings"
            action={
              alerts.length ? (
                <Link to="/notifications" className="btn-ghost btn-sm">
                  View all
                </Link>
              ) : null
            }
          />

          {alerts.length ? (
            <ul className="-mx-1 max-h-[26rem] space-y-0.5 overflow-y-auto pr-1">
              {alerts.slice(0, 7).map((a, i) => (
                <AlertRow key={a.id} alert={a} index={i} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={BellRing}
              title="All clear"
              message="No payments are due and no deadlines are at risk right now."
            />
          )}
        </motion.section>

        <div className="lg:col-span-2">
          <SplitDonut
            title="Projects by Stage"
            subtitle="Where every website currently sits"
            data={data?.stageSplit || []}
            height={300}
            delay={0.24}
            valueLabel="projects"
          />
        </div>
      </div>

      {/* ── Recent activity ── */}
      <motion.section
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.26 }}
        className="glass-card p-4 sm:p-5"
      >
        <SectionTitle icon={ActivityIcon} title="Recent Activity" subtitle="The latest actions across every client" />

        {data?.recentActivity?.length ? (
          <ul className="grid gap-1.5 md:grid-cols-2">
            {data.recentActivity.map((a, i) => (
              <motion.li
                key={a._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + i * 0.03 }}
              >
                <Link
                  to={a.client?._id ? `/clients/${a.client._id}` : '/clients'}
                  className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-white/6"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${avatarGradient(
                      a.client?.name || 'x'
                    )} text-[11px] font-bold text-white`}
                  >
                    {initials(a.client?.name || '?')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{a.action}</span>
                    <span className="block truncate text-[11.5px] text-faint">
                      {a.client?.name} · {a.message}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10.5px] text-faint">{fromNow(a.createdAt)}</span>
                </Link>
              </motion.li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ActivityIcon} title="No activity yet" message="Actions will appear here as you work." />
        )}
      </motion.section>
    </PageTransition>
  );
}
