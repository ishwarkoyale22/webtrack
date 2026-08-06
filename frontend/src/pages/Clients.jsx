import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, Plus, Download, Trash2, Users, X, LayoutGrid, List,
  Phone, Mail, Globe, CalendarClock, ArrowUpRight, FileSpreadsheet, FileText,
} from 'lucide-react';
import ClientFormModal from '../components/ClientFormModal';
import { PageTransition, EmptyState, SkeletonCard, ConfirmDialog, Select, Input } from '../components/ui';
import { clientApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { exportClients } from '../lib/exportUtils';
import {
  money, fmtDate, daysLeft, initials, avatarGradient, statusChip, priorityChip,
  stageProgress, stageColor, STAGES, PAY_STATUSES, SOURCES,
} from '../lib/format';

const BLANK_FILTERS = { search: '', stage: '', paymentStatus: '', source: '', from: '', to: '' };

/* ── Card view ─────────────────────────────────────────────── */
// forwardRef: AnimatePresence mode="popLayout" measures each child, so the
// card has to hand its DOM node back up.
const ClientCard = forwardRef(function ClientCard({ client, index, onDelete }, ref) {
  const p = client.payment || {};
  const proj = client.project || {};
  const dl = daysLeft(proj.deadline);
  const progress = stageProgress(proj.stage);

  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.35), ease: [0.22, 1, 0.36, 1] }}
      className="glass-card group flex flex-col p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${avatarGradient(
            client.name
          )} text-sm font-bold text-white shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3`}
        >
          {initials(client.name)}
        </span>

        <div className="min-w-0 flex-1">
          <Link to={`/clients/${client._id}`} className="block">
            <h3 className="truncate font-display text-[15px] font-semibold transition group-hover:text-brand-300">
              {client.name}
            </h3>
          </Link>
          <p className="truncate text-[11.5px] text-faint">{client.company || client.source}</p>
        </div>

        <button
          onClick={() => onDelete(client)}
          aria-label={`Delete ${client.name}`}
          className="rounded-lg p-2 text-faint opacity-0 transition hover:bg-rose-500/15 hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-4 space-y-1.5 text-[12px] text-dim">
        <p className="flex items-center gap-2 truncate">
          <Globe size={13} className="shrink-0 text-faint" />
          <span className="truncate">{proj.websiteName || 'No website set'}</span>
        </p>
        <p className="flex items-center gap-2 truncate">
          <Phone size={13} className="shrink-0 text-faint" />
          <a href={`tel:${client.phone}`} className="truncate hover:text-brand-300">
            {client.phone}
          </a>
        </p>
        {client.email && (
          <p className="flex items-center gap-2 truncate">
            <Mail size={13} className="shrink-0 text-faint" />
            <a href={`mailto:${client.email}`} className="truncate hover:text-brand-300">
              {client.email}
            </a>
          </p>
        )}
      </div>

      {/* Stage progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-semibold" style={{ color: stageColor(proj.stage) }}>
            {proj.stage || 'Discovery'}
          </span>
          <span className="text-faint">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${stageColor(proj.stage)}, ${stageColor(proj.stage)}66)` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl bg-white/5 p-2.5">
          <p className="text-faint">Received</p>
          <p className="mt-0.5 text-[13px] font-bold text-emerald-400">{money(p.received || 0, { compact: true })}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2.5">
          <p className="text-faint">Pending</p>
          <p className="mt-0.5 text-[13px] font-bold text-rose-400">{money(p.pending || 0, { compact: true })}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={statusChip(p.status)}>{p.status || 'Pending'}</span>
        <span className={priorityChip(proj.priority)}>{proj.priority || 'Medium'}</span>
        {proj.deadline && (
          <span className={`chip ${dl < 0 ? 'chip-pending' : dl <= 7 ? 'chip-partial' : 'chip-cyan'}`}>
            <CalendarClock size={11} />
            {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`}
          </span>
        )}
      </div>

      <Link
        to={`/clients/${client._id}`}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-semibold transition hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-brand-300"
      >
        Open detail page <ArrowUpRight size={14} />
      </Link>
    </motion.article>
  );
});

/* ── Table view ────────────────────────────────────────────── */
function ClientTable({ clients, onDelete }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr>
              <th className="t-head">Client</th>
              <th className="t-head">Website</th>
              <th className="t-head">Stage</th>
              <th className="t-head text-right">Total</th>
              <th className="t-head text-right">Received</th>
              <th className="t-head text-right">Pending</th>
              <th className="t-head">Status</th>
              <th className="t-head">Deadline</th>
              <th className="t-head" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {clients.map((c, i) => {
                const p = c.payment || {};
                const proj = c.project || {};
                const dl = daysLeft(proj.deadline);
                return (
                  <motion.tr
                    key={c._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className="t-row"
                  >
                    <td className="t-cell">
                      <Link to={`/clients/${c._id}`} className="flex items-center gap-2.5 group">
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${avatarGradient(
                            c.name
                          )} text-[11px] font-bold text-white`}
                        >
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold group-hover:text-brand-300">{c.name}</span>
                          <span className="block truncate text-[11px] text-faint">{c.phone}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="t-cell max-w-[180px] truncate text-dim">{proj.websiteName || '—'}</td>
                    <td className="t-cell">
                      <span className="chip" style={{ color: stageColor(proj.stage), borderColor: `${stageColor(proj.stage)}55`, background: `${stageColor(proj.stage)}1f` }}>
                        {proj.stage || '—'}
                      </span>
                    </td>
                    <td className="t-cell text-right font-medium">{money(p.grandTotal || 0)}</td>
                    <td className="t-cell text-right font-medium text-emerald-400">{money(p.received || 0)}</td>
                    <td className="t-cell text-right font-medium text-rose-400">{money(p.pending || 0)}</td>
                    <td className="t-cell">
                      <span className={statusChip(p.status)}>{p.status || 'Pending'}</span>
                    </td>
                    <td className="t-cell whitespace-nowrap text-[12px]">
                      {proj.deadline ? (
                        <span className={dl < 0 ? 'text-rose-400' : dl <= 7 ? 'text-amber-400' : 'text-dim'}>
                          {fmtDate(proj.deadline, 'DD MMM')}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="t-cell text-right">
                      <button
                        onClick={() => onDelete(c)}
                        aria-label={`Delete ${c.name}`}
                        className="rounded-lg p-1.5 text-faint transition hover:bg-rose-500/15 hover:text-rose-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function Clients() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...BLANK_FILTERS, search: params.get('search') || '' });
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem('webtrack_view') || 'grid');
  const [addOpen, setAddOpen] = useState(params.get('new') === '1');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    (f) => {
      setLoading(true);
      const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null));
      clientApi
        .list(clean)
        .then((d) => setClients(d.clients || []))
        .catch((e) => toast.error(e.friendlyMessage || 'Could not load clients'))
        .finally(() => setLoading(false));
    },
    [toast]
  );

  // Debounce so typing in the search box doesn't spam the API.
  useEffect(() => {
    const t = setTimeout(() => load(filters), filters.search ? 320 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('webtrack_view', view);
  }, [view]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setAddOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const activeCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => k !== 'search' && v).length,
    [filters]
  );

  const totals = useMemo(
    () =>
      clients.reduce(
        (a, c) => ({
          value: a.value + (c.payment?.grandTotal || 0),
          received: a.received + (c.payment?.received || 0),
          pending: a.pending + (c.payment?.pending || 0),
        }),
        { value: 0, received: 0, pending: 0 }
      ),
    [clients]
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await clientApi.remove(toDelete._id);
      setClients((cs) => cs.filter((c) => c._id !== toDelete._id));
      toast.success(`${toDelete.name} and all related records were deleted.`);
      setToDelete(null);
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not delete the client');
    } finally {
      setDeleting(false);
    }
  };

  const doExport = (format) => {
    try {
      exportClients(clients, format);
      toast.success(`Exported ${clients.length} client${clients.length === 1 ? '' : 's'} to ${format.toUpperCase()}.`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <PageTransition className="space-y-4">
      {/* ── Toolbar ── */}
      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[190px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={filters.search}
              onChange={set('search')}
              placeholder="Search by name, phone, email or company…"
              aria-label="Search clients"
              className="field pl-10 pr-9"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-current"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`btn-ghost ${showFilters || activeCount ? '!border-brand-400/50 !text-brand-300' : ''}`}
          >
            <SlidersHorizontal size={15} /> Filters
            {activeCount > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          <div className="glass hidden rounded-xl p-1 sm:flex">
            {[
              ['grid', LayoutGrid],
              ['table', List],
            ].map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={`${v} view`}
                className={`grid h-8 w-9 place-items-center rounded-lg transition ${
                  view === v ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow' : 'text-faint hover:text-current'
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => doExport('xlsx')} className="btn-ghost" title="Export to Excel">
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={() => doExport('csv')} className="btn-ghost" title="Export to CSV">
              <FileText size={15} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={() => setAddOpen(true)} className="btn-primary">
              <Plus size={16} /> <span className="hidden sm:inline">Add client</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="hr-soft my-4" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Select
                  label="Project stage"
                  value={filters.stage}
                  onChange={set('stage')}
                  options={[{ value: '', label: 'All stages' }, ...STAGES.map((s) => ({ value: s, label: s }))]}
                />
                <Select
                  label="Payment status"
                  value={filters.paymentStatus}
                  onChange={set('paymentStatus')}
                  options={[{ value: '', label: 'All statuses' }, ...PAY_STATUSES.map((s) => ({ value: s, label: s }))]}
                />
                <Select
                  label="Source"
                  value={filters.source}
                  onChange={set('source')}
                  options={[{ value: '', label: 'All sources' }, ...SOURCES.map((s) => ({ value: s, label: s }))]}
                />
                <Input label="Added from" type="date" value={filters.from} onChange={set('from')} />
                <Input label="Added to" type="date" value={filters.to} onChange={set('to')} />
              </div>
              {(activeCount > 0 || filters.search) && (
                <button
                  onClick={() => setFilters(BLANK_FILTERS)}
                  className="mt-3 text-xs font-semibold text-brand-300 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Summary strip ── */}
      {!loading && clients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            ['Clients shown', String(clients.length), 'text-brand-300'],
            ['Total value', money(totals.value, { compact: true }), ''],
            ['Received', money(totals.received, { compact: true }), 'text-emerald-400'],
            ['Pending', money(totals.pending, { compact: true }), 'text-rose-400'],
          ].map(([label, value, tone]) => (
            <div key={label} className="glass-card px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-wider text-faint">{label}</p>
              <p className={`mt-0.5 font-display text-lg font-bold ${tone}`}>{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      ) : !clients.length ? (
        <div className="glass-card">
          <EmptyState
            icon={Users}
            title={filters.search || activeCount ? 'No clients match those filters' : 'No clients yet'}
            message={
              filters.search || activeCount
                ? 'Try a different search term or clear the filters.'
                : 'Add your first client to start tracking their website, payments and domain.'
            }
            action={
              filters.search || activeCount ? (
                <button onClick={() => setFilters(BLANK_FILTERS)} className="btn-ghost mt-2">
                  Clear filters
                </button>
              ) : (
                <button onClick={() => setAddOpen(true)} className="btn-primary mt-2">
                  <Plus size={16} /> Add your first client
                </button>
              )
            }
          />
        </div>
      ) : view === 'table' ? (
        <ClientTable clients={clients} onDelete={setToDelete} />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {clients.map((c, i) => (
              <ClientCard key={c._id} client={c} index={i} onDelete={setToDelete} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ClientFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(c) => setClients((cs) => [c, ...cs])}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title={`Delete ${toDelete?.name || 'client'}?`}
        message="This permanently removes the client along with their project, payment history, domain record and activity log. This cannot be undone."
        confirmLabel="Delete permanently"
      />
    </PageTransition>
  );
}
