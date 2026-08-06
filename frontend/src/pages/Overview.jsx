import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, X, FileSpreadsheet, FileText, Table2, Users, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { PageTransition, EmptyState, SkeletonCard, Select } from '../components/ui';
import { clientApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { exportOverview } from '../lib/exportUtils';
import {
  money, initials, avatarGradient, statusChip, stageColor, STAGES, PAY_STATUSES,
} from '../lib/format';

/** Column definitions drive the header, the sorting and the cells. */
const COLUMNS = [
  { key: 'index', label: '#', align: 'left', sortable: false, className: 'w-12' },
  { key: 'name', label: 'Client Name', align: 'left', sortable: true },
  { key: 'websiteName', label: 'Website Name', align: 'left', sortable: true },
  { key: 'domainName', label: 'Domain Name', align: 'left', sortable: true },
  { key: 'domainPrice', label: 'Domain Price', align: 'right', sortable: true, numeric: true },
  { key: 'totalPrice', label: 'Total Price', align: 'right', sortable: true, numeric: true },
  { key: 'received', label: 'Received', align: 'right', sortable: true, numeric: true },
  { key: 'pending', label: 'Pending', align: 'right', sortable: true, numeric: true },
  { key: 'status', label: 'Payment Status', align: 'left', sortable: true },
  { key: 'stage', label: 'Project Stage', align: 'left', sortable: true },
];

/** Flattens the nested client payload into one flat row per client. */
function toRow(c) {
  return {
    _id: c._id,
    name: c.name,
    company: c.company || '',
    websiteName: c.project?.websiteName || '',
    domainName: c.domain?.domainName || '',
    domainPrice: c.domain?.price || 0,
    totalPrice: c.payment?.grandTotal || 0,
    received: c.payment?.received || 0,
    pending: c.payment?.pending || 0,
    status: c.payment?.status || 'Pending',
    stage: c.project?.stage || 'Discovery',
  };
}

export default function Overview() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 1 });

  useEffect(() => {
    clientApi
      .list()
      .then((d) => setClients(d.clients || []))
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load the overview'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search / filter / sort all run client-side so the table reacts instantly.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = clients.map(toRow);

    if (q) out = out.filter((r) => `${r.name} ${r.company}`.toLowerCase().includes(q));
    if (status) out = out.filter((r) => r.status === status);
    if (stage) out = out.filter((r) => r.stage === stage);

    const col = COLUMNS.find((c) => c.key === sort.key);
    return [...out].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = col?.numeric ? av - bv : String(av).localeCompare(String(bv));
      return cmp * sort.dir;
    });
  }, [clients, search, status, stage, sort]);

  /** The TOTAL row — always reflects what is currently filtered into view. */
  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          domainPrice: a.domainPrice + r.domainPrice,
          totalPrice: a.totalPrice + r.totalPrice,
          received: a.received + r.received,
          pending: a.pending + r.pending,
        }),
        { domainPrice: 0, totalPrice: 0, received: 0, pending: 0 }
      ),
    [rows]
  );

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setStage('');
    if (params.get('search')) {
      params.delete('search');
      setParams(params, { replace: true });
    }
  };

  const doExport = (format) => {
    try {
      exportOverview(rows, totals, format);
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'} to ${format.toUpperCase()}.`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const filtered = !!(search.trim() || status || stage);

  const SortIcon = ({ colKey }) => {
    if (sort.key !== colKey) return <ArrowUpDown size={11} className="opacity-35" />;
    return sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
  };

  if (loading) {
    return (
      <PageTransition className="space-y-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-[32rem]" />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-4">
      {/* ── Toolbar ── */}
      <section className="glass-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
              <Table2 size={18} />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">Client Overview</h1>
              <p className="text-xs text-faint">
                Every client on one row — domains, pricing and status side by side.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => doExport('xlsx')} className="btn-ghost" title="Export to Excel">
              <FileSpreadsheet size={15} /> <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={() => doExport('csv')} className="btn-ghost" title="Export to CSV">
              <FileText size={15} /> <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <label className="label" htmlFor="ov-search">Search client</label>
            <Search size={15} className="pointer-events-none absolute left-3.5 top-[34px] text-faint" />
            <input
              id="ov-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name…"
              className="field pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-[34px] text-faint hover:text-current"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Select
            label="Payment status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[{ value: '', label: 'All statuses' }, ...PAY_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
          <Select
            label="Project stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            options={[{ value: '', label: 'All stages' }, ...STAGES.map((s) => ({ value: s, label: s }))]}
          />
        </div>

        {filtered && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-xs text-faint">
              Showing <span className="font-semibold text-brand-300">{rows.length}</span> of {clients.length} clients
            </p>
            <button onClick={clearFilters} className="text-xs font-semibold text-brand-300 hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* ── Table ── */}
      {!rows.length ? (
        <div className="glass-card">
          <EmptyState
            icon={Users}
            title={filtered ? 'No clients match those filters' : 'No clients yet'}
            message={
              filtered
                ? 'Try a different name, status or stage.'
                : 'Add your first client and they will appear here instantly.'
            }
            action={
              filtered ? (
                <button onClick={clearFilters} className="btn-ghost mt-2">Clear filters</button>
              ) : (
                <button onClick={() => navigate('/clients?new=1')} className="btn-primary mt-2">Add a client</button>
              )
            }
          />
        </div>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card overflow-hidden"
        >
          {/* One scroll container so the sticky header and sticky total row
              both anchor to it — vertically and horizontally. */}
          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full min-w-[1020px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`t-head whitespace-nowrap border-b border-white/10 bg-[rgb(var(--bg-1))]/95 backdrop-blur-xl ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.sortable ? (
                        <button
                          onClick={() => toggleSort(col.key)}
                          className={`inline-flex items-center gap-1.5 transition hover:text-brand-300 ${
                            sort.key === col.key ? 'text-brand-300' : ''
                          }`}
                        >
                          {col.label}
                          <SortIcon colKey={col.key} />
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <motion.tr
                    key={r._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.25) }}
                    onClick={() => navigate(`/clients/${r._id}`)}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${r.name}'s detail page`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/clients/${r._id}`);
                      }
                    }}
                    className="cursor-pointer border-t border-white/8 transition hover:bg-white/6 focus:bg-white/8 focus:outline-none"
                  >
                    <td className="t-cell text-faint">{i + 1}</td>

                    <td className="t-cell">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${avatarGradient(
                            r.name
                          )} text-[11px] font-bold text-white`}
                        >
                          {initials(r.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{r.name}</span>
                          {r.company && <span className="block truncate text-[11px] text-faint">{r.company}</span>}
                        </span>
                      </div>
                    </td>

                    <td className="t-cell max-w-[180px] truncate text-dim">{r.websiteName || '—'}</td>

                    <td className="t-cell max-w-[170px] truncate">
                      {r.domainName ? (
                        <span className="text-cyan-300">{r.domainName}</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>

                    <td className="t-cell text-right tabular-nums text-dim">
                      {r.domainPrice ? money(r.domainPrice) : '—'}
                    </td>
                    <td className="t-cell text-right font-medium tabular-nums">{money(r.totalPrice)}</td>
                    <td className="t-cell text-right font-medium tabular-nums text-emerald-400">{money(r.received)}</td>
                    <td className="t-cell text-right font-bold tabular-nums text-rose-400">{money(r.pending)}</td>

                    <td className="t-cell">
                      <span className={statusChip(r.status)}>{r.status}</span>
                    </td>

                    <td className="t-cell">
                      <span
                        className="chip"
                        style={{
                          color: stageColor(r.stage),
                          borderColor: `${stageColor(r.stage)}55`,
                          background: `${stageColor(r.stage)}1f`,
                        }}
                      >
                        {r.stage}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>

              {/* Sticky TOTAL row — pinned to the bottom of the scroll box. */}
              <tfoot className="sticky bottom-0 z-20">
                <tr>
                  <td
                    colSpan={4}
                    className="t-cell border-t-2 border-brand-400/40 bg-[rgb(var(--bg-1))]/95 font-display text-[13px] font-bold backdrop-blur-xl"
                  >
                    TOTAL
                    <span className="ml-2 text-[11px] font-medium text-faint">
                      ({rows.length} client{rows.length === 1 ? '' : 's'}
                      {filtered ? ', filtered' : ''})
                    </span>
                  </td>
                  <td className="t-cell border-t-2 border-brand-400/40 bg-[rgb(var(--bg-1))]/95 text-right font-bold tabular-nums backdrop-blur-xl">
                    {money(totals.domainPrice)}
                  </td>
                  <td className="t-cell border-t-2 border-brand-400/40 bg-[rgb(var(--bg-1))]/95 text-right font-bold tabular-nums backdrop-blur-xl">
                    {money(totals.totalPrice)}
                  </td>
                  <td className="t-cell border-t-2 border-brand-400/40 bg-[rgb(var(--bg-1))]/95 text-right font-bold tabular-nums text-emerald-400 backdrop-blur-xl">
                    {money(totals.received)}
                  </td>
                  <td className="t-cell border-t-2 border-brand-400/40 bg-[rgb(var(--bg-1))]/95 text-right font-bold tabular-nums text-rose-400 backdrop-blur-xl">
                    {money(totals.pending)}
                  </td>
                  <td
                    colSpan={2}
                    className="t-cell border-t-2 border-brand-400/40 bg-[rgb(var(--bg-1))]/95 backdrop-blur-xl"
                  >
                    <span className="text-[11px] text-faint">
                      {totals.totalPrice
                        ? `${Math.round((totals.received / totals.totalPrice) * 100)}% collected`
                        : '—'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.section>
      )}

      <p className="px-1 text-[11px] text-faint">
        Tip: click any row to open that client's detail page. Totals always reflect the rows currently in view.
      </p>
    </PageTransition>
  );
}
