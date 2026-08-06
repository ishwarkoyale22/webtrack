import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Search, Plus, Pencil, Trash2, Check, X, Loader2, IndianRupee, History,
  Users, ExternalLink, ScrollText, ArrowUpRight, ChevronLeft,
} from 'lucide-react';
import {
  PageTransition, EmptyState, SkeletonCard, ConfirmDialog, Input, Select, SectionTitle,
} from '../components/ui';
import { clientApi, paymentApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  money, fmtDate, fmtDateTime, fromNow, toInputDate, initials, avatarGradient, statusChip, PAY_METHODS,
} from '../lib/format';

/* ── One row of the payment history, with inline editing ───── */
function EntryRow({ entry, index, runningTotal, grandTotal, onSave, onDelete, busy }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    amount: entry.amount,
    date: toInputDate(entry.date),
    method: entry.method,
    note: entry.note || '',
  });

  const start = () => {
    setDraft({ amount: entry.amount, date: toInputDate(entry.date), method: entry.method, note: entry.note || '' });
    setEditing(true);
  };

  const commit = async () => {
    const ok = await onSave(entry._id, {
      amount: Number(draft.amount),
      date: draft.date,
      method: draft.method,
      note: draft.note,
    });
    if (ok) setEditing(false);
  };

  const pendingAfter = Math.max(grandTotal - runningTotal, 0);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={`glass rounded-xl p-3 transition ${editing ? 'ring-1 ring-brand-400/50' : ''}`}
    >
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Date"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              autoFocus
            />
            <Input
              label="Amount received (₹)"
              type="number"
              min="0"
              step="any"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
            <Select
              label="Method"
              options={PAY_METHODS}
              value={draft.method}
              onChange={(e) => setDraft({ ...draft, method: e.target.value })}
            />
          </div>
          <Input
            label="Note"
            placeholder="Advance / milestone / final"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="btn-ghost btn-sm" disabled={busy}>
              <X size={13} /> Cancel
            </button>
            <button onClick={commit} className="btn-primary btn-sm" disabled={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save changes
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
            <IndianRupee size={15} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-sm font-bold">{money(entry.amount)}</span>
              <span className="text-[11px] text-faint">{fmtDate(entry.date)}</span>
              <span className="chip-cyan !py-0.5">{entry.method}</span>
              {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
                <span className="text-[10px] italic text-amber-400/90" title={`Last edited ${fmtDateTime(entry.updatedAt)}`}>
                  edited
                </span>
              )}
            </div>
            {entry.note && <p className="mt-0.5 truncate text-[11.5px] text-faint">{entry.note}</p>}
          </div>

          {/* Running figures — recomputed after every edit or delete */}
          <div className="hidden shrink-0 gap-4 text-right sm:flex">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-faint">Total received</p>
              <p className="text-[13px] font-bold text-emerald-400">{money(runningTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-faint">Pending</p>
              <p className="text-[13px] font-bold text-rose-400">{money(pendingAfter)}</p>
            </div>
          </div>

          <div className="flex shrink-0 gap-1">
            <button
              onClick={start}
              aria-label={`Edit payment of ${money(entry.amount)}`}
              className="rounded-lg p-2 text-faint transition hover:bg-brand-500/15 hover:text-brand-300"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(entry)}
              aria-label={`Delete payment of ${money(entry.amount)}`}
              className="rounded-lg p-2 text-faint transition hover:bg-rose-500/15 hover:text-rose-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

/* ── Payment panel for the selected client ─────────────────── */
function ClientPayments({ clientId, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [adding, setAdding] = useState(false);
  const [entry, setEntry] = useState({ amount: '', date: toInputDate(new Date()), method: 'UPI', note: '' });

  const load = useCallback(() => {
    setLoading(true);
    clientApi
      .get(clientId)
      .then(setData)
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load this client'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(load, [load]);

  const p = data?.payment;

  /** History oldest → newest so the running total reads naturally. */
  const chronological = useMemo(
    () => [...(p?.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [p]
  );

  const refresh = async () => {
    load();
    onChanged?.();
  };

  const saveEntry = async (entryId, patch) => {
    setBusy(true);
    try {
      await paymentApi.editEntry(clientId, entryId, patch);
      await refresh();
      toast.success('Payment updated — totals and status recalculated.');
      return true;
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not update the payment');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await paymentApi.deleteEntry(clientId, toDelete._id);
      await refresh();
      setToDelete(null);
      toast.success('Payment deleted — totals and status recalculated.');
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not delete the payment');
    } finally {
      setBusy(false);
    }
  };

  const addEntry = async (e) => {
    e.preventDefault();
    const amount = Number(entry.amount);
    if (!amount || amount <= 0) return toast.error('Enter an amount greater than 0.');

    setAdding(true);
    try {
      await paymentApi.addEntry(clientId, { ...entry, amount });
      await refresh();
      setEntry({ amount: '', date: toInputDate(new Date()), method: entry.method, note: '' });
      toast.success(`${money(amount)} recorded.`);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not record the payment');
    } finally {
      setAdding(false);
    }
    return undefined;
  };

  if (loading) return <SkeletonCard className="h-[30rem]" />;
  if (!data) return null;

  const editLog = (data.activities || []).filter(
    (a) => a.type === 'payment' || a.type === 'status'
  );

  let running = 0;

  return (
    <div className="space-y-4">
      {/* Header + live totals */}
      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${avatarGradient(
                data.name
              )} text-sm font-bold text-white`}
            >
              {initials(data.name)}
            </span>
            <div>
              <h2 className="font-display text-base font-bold">{data.name}</h2>
              <p className="text-[11.5px] text-faint">{data.project?.websiteName || 'No website set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={statusChip(p?.status)}>{p?.status}</span>
            <Link to={`/clients/${clientId}`} className="btn-ghost btn-sm">
              <ExternalLink size={13} /> Detail page
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Total price', money(p?.grandTotal || 0), ''],
            ['Total received', money(p?.received || 0), 'text-emerald-400'],
            ['Pending', money(p?.pending || 0), 'text-rose-400'],
            ['Entries', String(p?.history?.length || 0), 'text-brand-300'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/8">
              <p className="text-[10px] uppercase tracking-wider text-faint">{label}</p>
              <p className={`mt-1 font-display text-base font-bold ${tone}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Add a payment */}
      <section className="glass-card p-4 sm:p-5">
        <SectionTitle icon={Plus} title="Record a payment" subtitle="Totals update the moment it saves" />
        <form onSubmit={addEntry} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Input
            label="Amount (₹)"
            type="number"
            min="0"
            step="any"
            placeholder="20000"
            value={entry.amount}
            onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
          />
          <Input label="Date" type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
          <Select
            label="Method"
            options={PAY_METHODS}
            value={entry.method}
            onChange={(e) => setEntry({ ...entry, method: e.target.value })}
          />
          <div className="flex items-end">
            <button type="submit" disabled={adding} className="btn-primary w-full sm:w-auto">
              {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add
            </button>
          </div>
          <Input
            wrapClass="sm:col-span-4"
            label="Note (optional)"
            placeholder="Advance / milestone 2 / final payment"
            value={entry.note}
            onChange={(e) => setEntry({ ...entry, note: e.target.value })}
          />
        </form>
      </section>

      {/* Payment history */}
      <section className="glass-card p-4 sm:p-5">
        <SectionTitle
          icon={History}
          title="Payment history"
          subtitle="Edit or delete any entry — everything recalculates"
        />

        {chronological.length ? (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {chronological.map((h, i) => {
                running += h.amount;
                return (
                  <EntryRow
                    key={h._id}
                    entry={h}
                    index={i}
                    runningTotal={running}
                    grandTotal={p?.grandTotal || 0}
                    onSave={saveEntry}
                    onDelete={setToDelete}
                    busy={busy}
                  />
                );
              })}
            </AnimatePresence>
          </ul>
        ) : (
          <EmptyState
            icon={Wallet}
            title="No payments recorded"
            message="Record the first payment above and it will appear here."
          />
        )}
      </section>

      {/* Edit log for this client */}
      <section className="glass-card p-4 sm:p-5">
        <SectionTitle
          icon={ScrollText}
          title="Payment edit log"
          subtitle="Every add, edit, delete and status change — with date & time"
        />

        {editLog.length ? (
          <ol className="space-y-1.5">
            {editLog.map((a) => (
              <li key={a._id} className="flex gap-3 rounded-xl p-2.5 transition hover:bg-white/5">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    a.action === 'Payment entry edited'
                      ? 'bg-amber-400'
                      : a.action === 'Payment entry deleted'
                      ? 'bg-rose-400'
                      : a.type === 'status'
                      ? 'bg-cyan-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[12.5px] font-semibold">{a.action}</span>
                    <span className="text-[10.5px] text-faint">{fromNow(a.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-dim">{a.message}</p>
                  <p className="mt-0.5 text-[10px] text-faint">{fmtDateTime(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-6 text-center text-xs text-faint">No payment activity recorded yet.</p>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title="Delete this payment?"
        message={
          toDelete
            ? `Deleting the ${money(toDelete.amount)} payment from ${fmtDate(
                toDelete.date
              )} will reduce the received total and recalculate the pending amount and status.`
            : ''
        }
        confirmLabel="Delete payment"
      />
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function Payments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadClients = useCallback(() => {
    clientApi
      .list()
      .then((d) => setClients(d.clients || []))
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load clients'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(loadClients, [loadClients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? clients.filter((c) => `${c.name} ${c.company || ''}`.toLowerCase().includes(q)) : clients;
  }, [clients, search]);

  if (loading) {
    return (
      <PageTransition className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard className="h-[30rem]" />
        <SkeletonCard className="h-[30rem] lg:col-span-2" />
      </PageTransition>
    );
  }

  if (!clients.length) {
    return (
      <PageTransition>
        <div className="glass-card">
          <EmptyState
            icon={Users}
            title="No clients yet"
            message="Add a client with a total price, then manage their payments here."
            action={
              <button onClick={() => navigate('/clients?new=1')} className="btn-primary mt-2">
                Add a client
              </button>
            }
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="grid gap-4 lg:grid-cols-3">
      {/* ── Client list ── */}
      <aside className={`glass-card flex flex-col p-4 ${id ? 'hidden lg:flex' : ''}`}>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
            <Wallet size={17} />
          </span>
          <div>
            <h1 className="font-display text-[15px] font-bold">Payment Management</h1>
            <p className="text-[11px] text-faint">Pick a client to manage their payments</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients"
            className="field pl-9"
          />
        </div>

        <ul className="-mx-1 max-h-[60vh] space-y-1 overflow-y-auto px-1">
          {filtered.map((c) => {
            const active = c._id === id;
            const pay = c.payment || {};
            return (
              <li key={c._id}>
                <Link
                  to={`/payments/${c._id}`}
                  className={`flex items-center gap-2.5 rounded-xl p-2.5 transition ${
                    active ? 'bg-brand-500/15 ring-1 ring-brand-400/40' : 'hover:bg-white/6'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${avatarGradient(
                      c.name
                    )} text-[11px] font-bold text-white`}
                  >
                    {initials(c.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{c.name}</span>
                    <span className="block truncate text-[11px] text-faint">
                      {money(pay.received || 0)} of {money(pay.grandTotal || 0)}
                    </span>
                  </span>
                  <span className={`${statusChip(pay.status)} shrink-0`}>{pay.status}</span>
                </Link>
              </li>
            );
          })}
          {!filtered.length && <p className="p-4 text-center text-xs text-faint">No clients match “{search}”.</p>}
        </ul>
      </aside>

      {/* ── Detail ── */}
      <div className="lg:col-span-2">
        {id ? (
          <>
            <Link to="/payments" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition hover:text-brand-300 lg:hidden">
              <ChevronLeft size={14} /> All clients
            </Link>
            <ClientPayments clientId={id} onChanged={loadClients} />
          </>
        ) : (
          <div className="glass-card h-full">
            <EmptyState
              icon={ArrowUpRight}
              title="Select a client"
              message="Choose a client on the left to view, edit and delete their payment entries. Totals, pending amount and payment status all recalculate automatically."
            />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
