import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ComposedChart, Line,
} from 'recharts';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { money, num } from '../lib/format';

/* ─────────────────────────────────────────────────────────────
   Categorical hues — fixed order, never cycled, never rank-based.
   Both sets were validated (lightness band, chroma floor, CVD
   separation, contrast) against their own surface:
     dark  → surface #101637     light → surface #ffffff
   Adjacent-pair CVD sits in the 6–8 floor band for one pair, so
   every ≥3-category chart here also carries direct labels + a
   legend as secondary encoding.
   ───────────────────────────────────────────────────────────── */
const CATEGORICAL = {
  dark: ['#8b5cf6', '#0e9bbd', '#ec4899', '#d97706', '#059669'],
  light: ['#7c3aed', '#0891b2', '#db2777', '#d97706', '#059669'],
};

/** Reserved status palette — state only, never "series 4". */
const STATUS = {
  dark: { Paid: '#059669', Partial: '#d97706', Pending: '#e11d48' },
  light: { Paid: '#047857', Partial: '#b45309', Pending: '#be123c' },
};

export function usePalette() {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  return useMemo(
    () => ({
      mode,
      cat: CATEGORICAL[mode],
      status: STATUS[mode],
      grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
      axis: isDark ? 'rgba(176,184,214,0.75)' : 'rgba(71,85,105,0.85)',
      surface: isDark ? '#101637' : '#ffffff',
    }),
    [mode, isDark]
  );
}

/* ── Shared tooltip ────────────────────────────────────────── */
function GlassTooltip({ active, payload, label, formatter, extra }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card min-w-[9rem] !rounded-xl p-3 shadow-glass">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-xs text-dim">{p.name}</span>
          <span className="ml-auto text-xs font-bold">{formatter ? formatter(p.value) : num(p.value)}</span>
        </div>
      ))}
      {extra?.(payload[0]?.payload)}
    </div>
  );
}

const axisProps = (p) => ({
  tickLine: false,
  axisLine: false,
  tick: { fill: p.axis, fontSize: 11 },
});

function ChartFrame({ title, subtitle, right, children, height = 280, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold sm:text-[15px]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-faint">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div style={{ width: '100%', height }}>{children}</div>
    </motion.section>
  );
}

/* ── 1. Monthly revenue — single series, magnitude over time ─ */
export function MonthlyRevenueChart({ data = [], height = 280, delay = 0, title = 'Monthly Revenue' }) {
  const p = usePalette();
  const total = data.reduce((a, d) => a + (d.revenue || 0), 0);
  const peak = Math.max(...data.map((d) => d.revenue || 0), 0);

  return (
    <ChartFrame
      title={title}
      subtitle={`Payments received per month · ${money(total)} total`}
      height={height}
      delay={delay}
      right={<span className="chip-brand">{data.length} months</span>}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 18, right: 8, left: -18, bottom: 0 }} barCategoryGap="26%">
          <defs>
            <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.cat[0]} stopOpacity={1} />
              <stop offset="100%" stopColor={p.cat[1]} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={p.grid} vertical={false} />
          <XAxis dataKey="month" {...axisProps(p)} />
          <YAxis {...axisProps(p)} tickFormatter={(v) => money(v, { compact: true })} width={58} />
          <Tooltip
            cursor={{ fill: p.grid }}
            content={<GlassTooltip formatter={(v) => money(v)} />}
          />
          <Bar dataKey="revenue" name="Revenue" fill="url(#revBar)" radius={[4, 4, 0, 0]} maxBarSize={54}>
            {/* Direct-label only the peak month — never a number on every bar. */}
            <LabelList
              dataKey="revenue"
              position="top"
              content={({ x, y, width, value }) =>
                value === peak && peak > 0 ? (
                  <text
                    x={x + width / 2}
                    y={y - 7}
                    textAnchor="middle"
                    className="recharts-text"
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    {money(value, { compact: true })}
                  </text>
                ) : null
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ── 2. Pending vs Received — two categories, one ₹ axis ───── */
export function PendingVsReceivedChart({ data = [], height = 280, delay = 0 }) {
  const p = usePalette();
  const received = data.find((d) => d.name === 'Received')?.value || 0;
  const pending = data.find((d) => d.name === 'Pending')?.value || 0;
  const rate = received + pending > 0 ? Math.round((received / (received + pending)) * 100) : 0;

  const rows = [
    { name: 'Received', value: received, fill: p.cat[0] },
    { name: 'Pending', value: pending, fill: p.cat[1] },
  ];

  return (
    <ChartFrame
      title="Pending vs Received"
      subtitle={`${rate}% of everything quoted has been collected`}
      height={height}
      delay={delay}
      right={<span className="chip-cyan">{rate}% collected</span>}
    >
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 74, left: 6, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke={p.grid} horizontal={false} />
          <XAxis type="number" {...axisProps(p)} tickFormatter={(v) => money(v, { compact: true })} />
          <YAxis type="category" dataKey="name" {...axisProps(p)} width={74} />
          <Tooltip cursor={{ fill: p.grid }} content={<GlassTooltip formatter={(v) => money(v)} />} />
          <Bar dataKey="value" name="Amount" radius={[0, 4, 4, 0]} maxBarSize={46}>
            {rows.map((r) => (
              <Cell key={r.name} fill={r.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              offset={10}
              className="recharts-text"
              style={{ fontSize: 11.5, fontWeight: 700 }}
              formatter={(v) => money(v, { compact: true })}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ── 3. Client growth — cumulative total, one measure ───────
   New-clients-per-month rides along in the tooltip rather than a
   second y-axis: two scales on one plot is never acceptable.      */
export function ClientGrowthChart({ data = [], height = 280, delay = 0 }) {
  const p = usePalette();
  const added = data.reduce((a, d) => a + (d.newClients || 0), 0);

  return (
    <ChartFrame
      title="Client Growth"
      subtitle={`Total clients over time · ${added} added in this window`}
      height={height}
      delay={delay}
      right={<span className="chip-brand">+{added} new</span>}
    >
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.cat[0]} stopOpacity={0.55} />
              <stop offset="100%" stopColor={p.cat[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={p.grid} vertical={false} />
          <XAxis dataKey="month" {...axisProps(p)} />
          <YAxis {...axisProps(p)} width={46} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: p.cat[0], strokeWidth: 1, strokeDasharray: '4 4' }}
            content={
              <GlassTooltip
                extra={(row) =>
                  row ? (
                    <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] text-faint">
                      {row.newClients || 0} new client{row.newClients === 1 ? '' : 's'} this month
                    </p>
                  ) : null
                }
              />
            }
          />
          <Area
            type="monotone"
            dataKey="totalClients"
            name="Total clients"
            stroke={p.cat[0]}
            strokeWidth={2}
            fill="url(#growthFill)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: p.surface }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ── 4. Donut — identity split (stage / source) ─────────────── */
export function SplitDonut({ data = [], title, subtitle, height = 280, delay = 0, colorMap, valueLabel = 'clients' }) {
  const p = usePalette();
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((a, d) => a + d.value, 0);

  const colorFor = (name, i) => colorMap?.[name] || p.cat[i % p.cat.length];

  return (
    <ChartFrame title={title} subtitle={subtitle} height={height} delay={delay}>
      {!total ? (
        <div className="grid h-full place-items-center text-sm text-faint">Nothing to chart yet.</div>
      ) : (
        <div className="flex h-full flex-col items-center gap-3 sm:flex-row">
          <div className="relative h-full min-h-[170px] w-full sm:w-1/2">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke={p.surface}
                  strokeWidth={2}
                >
                  {rows.map((r, i) => (
                    <Cell key={r.name} fill={colorFor(r.name, i)} />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip formatter={(v) => `${num(v)} ${valueLabel}`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-display text-2xl font-bold">{num(total)}</p>
                <p className="text-[10px] uppercase tracking-wider text-faint">total</p>
              </div>
            </div>
          </div>

          {/* Legend doubles as the direct-label layer — identity is never colour alone. */}
          <ul className="w-full space-y-1.5 sm:w-1/2">
            {rows.map((r, i) => (
              <li key={r.name} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: colorFor(r.name, i) }} />
                <span className="flex-1 truncate text-dim">{r.name}</span>
                <span className="font-semibold">{r.value}</span>
                <span className="w-10 text-right text-[11px] text-faint">
                  {Math.round((r.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartFrame>
  );
}

/* ── 5. Per-client received vs pending (Reports) ────────────── */
export function ClientComparisonChart({ data = [], height = 340, delay = 0 }) {
  const p = usePalette();
  if (!data.length) return null;

  return (
    <ChartFrame
      title="Top Clients — Received vs Pending"
      subtitle="Ranked by total deal value"
      height={height}
      delay={delay}
    >
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
          barGap={2}
          barCategoryGap="24%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={p.grid} horizontal={false} />
          <XAxis type="number" {...axisProps(p)} tickFormatter={(v) => money(v, { compact: true })} />
          <YAxis type="category" dataKey="name" {...axisProps(p)} width={104} interval={0} />
          <Tooltip cursor={{ fill: p.grid }} content={<GlassTooltip formatter={(v) => money(v)} />} />
          <Legend
            iconType="square"
            iconSize={9}
            wrapperStyle={{ fontSize: 11.5, paddingTop: 6, color: p.axis }}
          />
          <Bar dataKey="received" name="Received" fill={p.cat[0]} radius={[0, 4, 4, 0]} maxBarSize={16} />
          <Bar dataKey="pending" name="Pending" fill={p.cat[1]} radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ── 6. Sparkline for compact contexts ─────────────────────── */
export function Sparkline({ data = [], dataKey = 'revenue', height = 54 }) {
  const p = usePalette();
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.cat[0]} stopOpacity={0.5} />
              <stop offset="100%" stopColor={p.cat[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={p.cat[0]} strokeWidth={2} fill="url(#sparkFill)" dot={false} />
          <Tooltip content={<GlassTooltip formatter={(v) => money(v)} />} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── 7. Revenue vs Expense — two bars + a profit line ────────
   Reuses the Paid/Pending pair from STATUS (green = money in, red
   = money out) so it reads consistently with every other chart's
   received/pending language. The profit line's own dots are
   colour-coded per point: green months, red months. */
export function RevenueVsExpenseChart({ data = [], height = 300, delay = 0 }) {
  const p = usePalette();
  const totalRevenue = data.reduce((a, d) => a + (d.revenue || 0), 0);
  const totalExpense = data.reduce((a, d) => a + (d.expense || 0), 0);
  const netProfit = totalRevenue - totalExpense;

  const ProfitDot = ({ cx, cy, payload }) => {
    const positive = (payload.profit || 0) >= 0;
    return <circle cx={cx} cy={cy} r={3.5} fill={positive ? p.status.Paid : p.status.Pending} stroke={p.surface} strokeWidth={1.5} />;
  };

  return (
    <ChartFrame
      title="Revenue vs Team Expense"
      subtitle={`Net ${money(netProfit)} across the year`}
      height={height}
      delay={delay}
      right={
        <span className={netProfit >= 0 ? 'chip-paid' : 'chip-pending'}>
          {netProfit >= 0 ? 'Profitable' : 'Loss'}
        </span>
      }
    >
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 18, right: 8, left: -18, bottom: 0 }} barCategoryGap="26%">
          <CartesianGrid strokeDasharray="3 3" stroke={p.grid} vertical={false} />
          <XAxis dataKey="month" {...axisProps(p)} />
          <YAxis {...axisProps(p)} tickFormatter={(v) => money(v, { compact: true })} width={58} />
          <Tooltip cursor={{ fill: p.grid }} content={<GlassTooltip formatter={(v) => money(v)} />} />
          <Legend wrapperStyle={{ fontSize: 11.5 }} />
          <Bar dataKey="revenue" name="Revenue" fill={p.status.Paid} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Team Expense" fill={p.status.Pending} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line
            type="monotone"
            dataKey="profit"
            name="Net Profit"
            stroke={p.cat[0]}
            strokeWidth={2.5}
            dot={<ProfitDot />}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export { STATUS as STATUS_COLORS };
