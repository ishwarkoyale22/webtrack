import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, TrendingUp, IndianRupee, Users, FileSpreadsheet, FileText, Wallet, Target,
} from 'lucide-react';
import {
  MonthlyRevenueChart, ClientGrowthChart, PendingVsReceivedChart, ClientComparisonChart, SplitDonut,
} from '../components/Charts';
import { PageTransition, SkeletonCard, Select } from '../components/ui';
import StatsCard from '../components/StatsCard';
import { reportApi, paymentApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { exportReport, exportPayments } from '../lib/exportUtils';
import { money } from '../lib/format';

const RANGES = [
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: '24', label: 'Last 24 months' },
];

export default function Reports() {
  const [months, setMonths] = useState('12');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    reportApi
      .full({ months: Number(months) })
      .then(setData)
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load reports'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const exportPaymentReport = async (format) => {
    try {
      const ledgers = await paymentApi.list();
      exportPayments(ledgers, format);
      toast.success(`Payment report exported to ${format.toUpperCase()}.`);
    } catch (e) {
      toast.error(e.friendlyMessage || e.message);
    }
  };

  if (loading) {
    return (
      <PageTransition className="space-y-4">
        <SkeletonCard className="h-28" />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard className="h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </PageTransition>
    );
  }

  const t = data?.totals || {};
  const best = data?.bestMonth;
  const growth = data?.clientGrowth || [];
  const totalClients = growth.length ? growth[growth.length - 1].totalClients : 0;

  return (
    <PageTransition className="space-y-4">
      {/* ── Header ── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card flex flex-wrap items-center justify-between gap-4 p-5"
      >
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Business <span className="gradient-text">Reports</span>
          </h1>
          <p className="mt-1 text-sm text-dim">Revenue, growth and collection performance over time.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[9.5rem]">
            <Select value={months} onChange={(e) => setMonths(e.target.value)} options={RANGES} />
          </div>
          <button onClick={() => exportReport(data, 'xlsx')} className="btn-ghost" title="Export monthly report">
            <FileSpreadsheet size={15} /> <span className="hidden sm:inline">Report</span>
          </button>
          <button onClick={() => exportPaymentReport('xlsx')} className="btn-primary" title="Export full payment report">
            <FileText size={15} /> <span className="hidden sm:inline">Payments</span>
          </button>
        </div>
      </motion.section>

      {/* ── Best month highlight ── */}
      {best && (
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card relative overflow-hidden p-5 sm:p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 animate-float-slow rounded-full bg-amber-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 h-44 w-44 animate-float rounded-full bg-brand-500/25 blur-3xl" />

          <div className="relative flex flex-wrap items-center gap-5">
            <motion.span
              animate={{ rotate: [0, -8, 8, 0], y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-[0_12px_40px_-10px_rgba(245,158,11,0.9)]"
            >
              <Trophy size={28} />
            </motion.span>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">Best performing month</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{best.fullLabel}</p>
              <p className="mt-1 text-sm text-dim">
                <span className="font-bold text-emerald-400">{money(best.revenue)}</span> collected across{' '}
                {best.payments} payment{best.payments === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={IndianRupee} label="Total Received" value={t.totalReceived || 0} format={(v) => money(v)} tone="emerald" delay={0} />
        <StatsCard icon={Wallet} label="Total Pending" value={t.totalPending || 0} format={(v) => money(v)} tone="rose" delay={0.07} />
        <StatsCard icon={Target} label="Avg Deal Size" value={t.avgDealSize || 0} format={(v) => money(v)} tone="brand" delay={0.14} />
        <StatsCard icon={Users} label="Total Clients" value={totalClients} tone="cyan" hint="Cumulative to date" delay={0.21} />
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyRevenueChart data={data?.monthlyRevenue || []} height={300} delay={0.08} />
        <ClientGrowthChart data={growth} height={300} delay={0.14} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <PendingVsReceivedChart data={data?.pendingVsReceived || []} height={300} delay={0.18} />
        </div>
        <div className="lg:col-span-3">
          <SplitDonut
            title="Where Clients Come From"
            subtitle="Lead source split"
            data={data?.sourceSplit || []}
            height={300}
            delay={0.22}
          />
        </div>
      </div>

      <ClientComparisonChart data={data?.perClientComparison || []} height={360} delay={0.26} />

      {/* ── Table view — the accessible fallback for every chart above ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center gap-2.5 p-4 sm:p-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
            <TrendingUp size={17} />
          </span>
          <div>
            <h3 className="font-display text-[15px] font-semibold">Month by Month</h3>
            <p className="text-[11px] text-faint">The same numbers as the charts, in a table.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr>
                <th className="t-head">Month</th>
                <th className="t-head text-right">Revenue</th>
                <th className="t-head text-right">Payments</th>
                <th className="t-head text-right">New clients</th>
                <th className="t-head text-right">Total clients</th>
              </tr>
            </thead>
            <tbody>
              {(data?.monthlyRevenue || []).map((m, i) => (
                <tr key={m.key} className={`t-row ${best?.key === m.key ? 'bg-amber-500/8' : ''}`}>
                  <td className="t-cell font-medium">
                    {m.month}
                    {best?.key === m.key && <span className="ml-2 chip-partial">best</span>}
                  </td>
                  <td className="t-cell text-right font-semibold text-emerald-400">{money(m.revenue)}</td>
                  <td className="t-cell text-right text-dim">{m.payments}</td>
                  <td className="t-cell text-right text-dim">{growth[i]?.newClients ?? 0}</td>
                  <td className="t-cell text-right font-medium">{growth[i]?.totalClients ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </PageTransition>
  );
}
