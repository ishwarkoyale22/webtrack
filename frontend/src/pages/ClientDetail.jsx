import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Trash2, FileText, FileSignature, Loader2, User, Building2, Wallet, Globe,
  Activity as ActivityIcon, Plus, Check, ImageIcon, Upload, X, ExternalLink,
  Phone, Mail, IndianRupee, History, Sparkles,
} from 'lucide-react';
import ActivityLog from '../components/ActivityLog';
import { PageTransition, FullPageLoader, Input, ConfirmDialog, SectionTitle } from '../components/ui';
import { clientApi, projectApi, paymentApi, domainApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { generateInvoice, generateQuotation } from '../lib/pdf';
import {
  money, fmtDate, toInputDate, initials, avatarGradient, statusChip,
} from '../lib/format';

/* ── Reusable editable panel ───────────────────────────────── */
function Panel({ icon, title, subtitle, children, onSave, dirty, saving, delay = 0, actions, className = '' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card p-4 sm:p-5 ${className}`}
    >
      <SectionTitle
        icon={icon}
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex items-center gap-2">
            {actions}
            {onSave && (
              <button onClick={onSave} disabled={!dirty || saving} className={dirty ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : dirty ? <Save size={13} /> : <Check size={13} />}
                {saving ? 'Saving' : dirty ? 'Save' : 'Saved'}
              </button>
            )}
          </div>
        }
      />
      {children}
    </motion.section>
  );
}

/* ── Screenshot gallery ────────────────────────────────────── */
function ShotGallery({ type, shots = [], clientId, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    setProgress(0);
    try {
      const project = await projectApi.uploadShots(clientId, type, files, setProgress);
      onChange(project);
      toast.success(`${files.length} ${type} screenshot${files.length === 1 ? '' : 's'} uploaded.`);
    } catch (e) {
      toast.error(e.friendlyMessage || 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (shotId) => {
    try {
      onChange(await projectApi.deleteShot(clientId, shotId, type));
      toast.success('Screenshot removed.');
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not remove the screenshot');
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{type}</p>
        <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-ghost btn-sm">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {busy ? `${progress}%` : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {shots.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <AnimatePresence>
            {shots.map((s) => (
              <motion.div
                key={s._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="group relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10"
              >
                <img
                  src={s.url}
                  alt={`${type} screenshot`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 grid place-items-center bg-slate-950/60 opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
                >
                  <ExternalLink size={16} className="text-white" />
                </a>
                <button
                  onClick={() => remove(s._id)}
                  aria-label="Remove screenshot"
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-lg bg-rose-500/90 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/15 py-6 text-xs text-faint transition hover:border-brand-400/50 hover:bg-brand-500/5"
        >
          <ImageIcon size={20} />
          Drop the {type} screenshots here
        </button>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { admin } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Local editable copies
  const [client, setClient] = useState(null);
  const [project, setProject] = useState(null);
  const [payment, setPayment] = useState(null);
  const [domain, setDomain] = useState(null);
  const [saving, setSaving] = useState({});
  const [entry, setEntry] = useState({ amount: '' });
  const [addingEntry, setAddingEntry] = useState(false);

  const hydrate = useCallback((d) => {
    setData(d);
    setClient({
      name: d.name || '', phone: d.phone || '', email: d.email || '',
    });
    setProject({
      websiteName: d.project?.websiteName || '', websiteUrl: d.project?.websiteUrl || '',
      screenshots: d.project?.screenshots || { before: [], after: [] },
    });
    setPayment({
      totalPrice: d.payment?.totalPrice ?? 0,
      history: d.payment?.history || [], received: d.payment?.received || 0,
      pending: d.payment?.pending || 0, grandTotal: d.payment?.grandTotal || 0,
      status: d.payment?.status || 'Pending',
    });
    setDomain({
      domainName: d.domain?.domainName || '', price: d.domain?.price ?? 0,
    });
  }, []);

  const reload = useCallback(
    () => clientApi.get(id).then(hydrate),
    [id, hydrate]
  );

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((e) => {
        toast.error(e.friendlyMessage || 'Could not load this client');
        navigate('/clients', { replace: true });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Dirty tracking — compares the editable copy against what the server returned. */
  const dirty = {
    client:
      data &&
      client &&
      ['name', 'phone', 'email'].some(
        (k) => String(client[k] ?? '') !== String(data[k] ?? '')
      ),
    project:
      data &&
      project &&
      (project.websiteName !== (data.project?.websiteName || '') ||
        project.websiteUrl !== (data.project?.websiteUrl || '')),
    payment:
      data &&
      payment &&
      Number(payment.totalPrice) !== (data.payment?.totalPrice ?? 0),
    domain:
      data &&
      domain &&
      (domain.domainName !== (data.domain?.domainName || '') ||
        Number(domain.price) !== (data.domain?.price ?? 0)),
  };

  const withSaving = async (key, fn, successMsg) => {
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await fn();
      await reload();
      toast.success(successMsg);
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not save your changes');
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const saveClient = () => withSaving('client', () => clientApi.update(id, client), 'Client details saved.');
  const saveProject = () =>
    withSaving('project', () => projectApi.save(id, { websiteName: project.websiteName, websiteUrl: project.websiteUrl }), 'Project saved.');
  const savePayment = () =>
    withSaving(
      'payment',
      () =>
        paymentApi.save(id, {
          totalPrice: Number(payment.totalPrice) || 0,
        }),
      'Payment details saved.'
    );
  const saveDomain = () =>
    withSaving(
      'domain',
      () =>
        domainApi.save(id, {
          domainName: domain.domainName,
          price: Number(domain.price) || 0,
        }),
      'Domain saved.'
    );

  const addEntry = async (e) => {
    e.preventDefault();
    const amount = Number(entry.amount);
    if (!amount || amount <= 0) return toast.error('Enter an amount greater than 0.');

    setAddingEntry(true);
    try {
      await paymentApi.addEntry(id, { amount, date: toInputDate(new Date()), method: 'UPI', note: '' });
      await reload();
      setEntry({ amount: '' });
      toast.success(`${money(amount)} recorded.`);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not record the payment');
    } finally {
      setAddingEntry(false);
    }
    return undefined;
  };

  const removeEntry = async (entryId) => {
    try {
      await paymentApi.deleteEntry(id, entryId);
      await reload();
      toast.success('Payment entry removed.');
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not remove the entry');
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await clientApi.remove(id);
      toast.success(`${data.name} was deleted.`);
      navigate('/clients', { replace: true });
    } catch (e) {
      toast.error(e.friendlyMessage || 'Could not delete the client');
      setDeleting(false);
    }
  };

  const makeDoc = (kind) => {
    try {
      const fn = kind === 'invoice' ? generateInvoice : generateQuotation;
      fn(data, admin);
      clientApi
        .addActivity(id, {
          type: 'document',
          action: `${kind === 'invoice' ? 'Invoice' : 'Quotation'} generated`,
          message: `A ${kind} PDF was generated and downloaded.`,
        })
        .then(reload)
        .catch(() => {});
      toast.success(`${kind === 'invoice' ? 'Invoice' : 'Quotation'} downloaded.`);
    } catch (e) {
      toast.error(`Could not generate the ${kind}: ${e.message}`);
    }
  };

  if (loading || !data) return <FullPageLoader label="Opening client" />;

  const livePending = Math.max((Number(payment.totalPrice) || 0) - payment.received, 0);

  return (
    <PageTransition className="space-y-4">
      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card relative overflow-hidden p-5 sm:p-6"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 animate-float-slow rounded-full bg-brand-500/25 blur-3xl" />

        <Link to="/clients" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition hover:text-brand-300">
          <ArrowLeft size={14} /> Back to clients
        </Link>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${avatarGradient(
                data.name
              )} font-display text-lg font-bold text-white shadow-glow`}
            >
              {initials(data.name)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold tracking-tight sm:text-2xl">{data.name}</h1>
              <p className="mt-0.5 truncate text-sm text-dim">
                {data.project?.websiteName || 'No website set'}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={statusChip(data.payment?.status)}>{data.payment?.status || 'Pending'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => makeDoc('invoice')} className="btn-primary">
              <FileText size={15} /> Invoice PDF
            </button>
            <button onClick={() => makeDoc('quotation')} className="btn-ghost">
              <FileSignature size={15} /> Quotation
            </button>
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost !text-rose-400 hover:!border-rose-500/50">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Money strip */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Total', money(data.payment?.grandTotal || 0), ''],
            ['Received', money(data.payment?.received || 0), 'text-emerald-400'],
            ['Pending', money(data.payment?.pending || 0), 'text-rose-400'],
            ['Domain', data.domain?.domainName || '—', 'text-cyan-300 truncate'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/8">
              <p className="text-[10.5px] uppercase tracking-wider text-faint">{label}</p>
              <p className={`mt-1 font-display text-base font-bold sm:text-lg ${tone}`}>{value}</p>
            </div>
          ))}
        </div>
      </motion.header>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* ── Client info ── */}
          <Panel
            icon={User}
            title="Client Information"
            subtitle="Editable — save when you're done"
            onSave={saveClient}
            dirty={dirty.client}
            saving={saving.client}
            delay={0.05}
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label="Full name" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
              <Input label="Phone" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
              <Input wrapClass="sm:col-span-2" label="Email" type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`tel:${data.phone}`} className="btn-ghost btn-sm">
                <Phone size={13} /> Call
              </a>
              {data.email && (
                <a href={`mailto:${data.email}`} className="btn-ghost btn-sm">
                  <Mail size={13} /> Email
                </a>
              )}
              {data.project?.websiteUrl && (
                <a href={data.project.websiteUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                  <ExternalLink size={13} /> Visit site
                </a>
              )}
            </div>
          </Panel>

          {/* ── Project ── */}
          <Panel
            icon={Building2}
            title="Website & Project"
            subtitle="One client, one website"
            onSave={saveProject}
            dirty={dirty.project}
            saving={saving.project}
            delay={0.1}
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label="Website name" value={project.websiteName} onChange={(e) => setProject({ ...project, websiteName: e.target.value })} />
              <Input label="Website URL" placeholder="https://" value={project.websiteUrl} onChange={(e) => setProject({ ...project, websiteUrl: e.target.value })} />
            </div>
          </Panel>

          {/* ── Payment ── */}
          <Panel
            icon={Wallet}
            title="Payment Tracking"
            subtitle="Pending and status calculate themselves"
            onSave={savePayment}
            dirty={dirty.payment}
            saving={saving.payment}
            delay={0.15}
          >
            <div className="space-y-4">
              <div className="max-w-md">
                <Input
                  label="Total price (₹)"
                  type="number"
                  min="0"
                  step="any"
                  value={payment.totalPrice}
                  onChange={(e) => setPayment({ ...payment, totalPrice: e.target.value })}
                />
              </div>

              {/* Derived figures */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Total price', money(Number(payment.totalPrice) || 0), '', IndianRupee],
                  ['Received', money(payment.received), 'text-emerald-400', Check],
                  ['Pending (auto)', money(livePending), 'text-rose-400', History],
                ].map(([label, value, tone, Icon]) => (
                  <div key={label} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/8">
                    <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-faint">
                      <Icon size={11} /> {label}
                    </p>
                    <p className={`mt-1 font-display text-[15px] font-bold ${tone}`}>{value}</p>
                  </div>
                ))}
              </div>

              {dirty.payment && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-[11.5px] text-amber-300">
                  These figures update live — save to record the change and refresh the payment status.
                </p>
              )}

              <div className="hr-soft" />

              {/* Add a payment */}
              <form onSubmit={addEntry} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <Input
                    label="Amount received (₹)"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="20000"
                    value={entry.amount}
                    onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={addingEntry} className="btn-primary">
                  {addingEntry ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Add
                </button>
              </form>

              {/* History */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-faint">
                  Payment history ({payment.history.length})
                </p>
                {payment.history.length ? (
                  <ul className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {[...payment.history]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((h) => (
                          <motion.li
                            key={h._id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="group flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/8"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
                              <IndianRupee size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold">{money(h.amount)}</p>
                              <p className="truncate text-[11px] text-faint">
                                {fmtDate(h.date)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeEntry(h._id)}
                              aria-label="Delete this payment entry"
                              className="rounded-lg p-2 text-faint opacity-0 transition hover:bg-rose-500/15 hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </motion.li>
                        ))}
                    </AnimatePresence>
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/12 py-5 text-center text-xs text-faint">
                    No payments recorded yet.
                  </p>
                )}
              </div>
            </div>
          </Panel>

          {/* ── Screenshots ── */}
          <Panel icon={ImageIcon} title="Before / After Screenshots" subtitle="Show the transformation" delay={0.2}>
            <div className="grid gap-5 sm:grid-cols-2">
              <ShotGallery
                type="before"
                shots={project.screenshots?.before}
                clientId={id}
                onChange={(p) => setProject((prev) => ({ ...prev, screenshots: p.screenshots }))}
              />
              <ShotGallery
                type="after"
                shots={project.screenshots?.after}
                clientId={id}
                onChange={(p) => setProject((prev) => ({ ...prev, screenshots: p.screenshots }))}
              />
            </div>
          </Panel>
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-4">
          {/* Domain */}
          <Panel
            icon={Globe}
            title="Domain"
            subtitle="Domain details"
            onSave={saveDomain}
            dirty={dirty.domain}
            saving={saving.domain}
            delay={0.08}
          >
            <div className="space-y-3.5">
              <Input label="Domain name" placeholder="example.com" value={domain.domainName} onChange={(e) => setDomain({ ...domain, domainName: e.target.value })} />
              <Input label="Domain price (₹)" type="number" min="0" step="any" value={domain.price} onChange={(e) => setDomain({ ...domain, price: e.target.value })} />

              {domain.domainName && (
                <a
                  href={`https://${domain.domainName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost btn-sm w-full"
                >
                  <ExternalLink size={13} /> Open {domain.domainName}
                </a>
              )}
            </div>
          </Panel>

          {/* Documents */}
          <Panel icon={FileText} title="Documents" subtitle="Auto-filled from this page" delay={0.17}>
            <div className="space-y-2">
              <button onClick={() => makeDoc('invoice')} className="btn-primary w-full">
                <FileText size={15} /> Generate Invoice PDF
              </button>
              <button onClick={() => makeDoc('quotation')} className="btn-ghost w-full">
                <FileSignature size={15} /> Generate Quotation PDF
              </button>
              <Link to={`/invoice/${id}`} className="btn-ghost w-full">
                <Sparkles size={15} /> Upload a document
              </Link>
              <p className="pt-1 text-[11px] leading-relaxed text-faint">
                Generated PDFs pull the client, website, payment and domain details straight from this page. You can
                also upload your own invoice, quotation or agreement files under Documents.
              </p>
            </div>
          </Panel>

          {/* Activity */}
          <Panel icon={ActivityIcon} title="Activity Log" subtitle="Every action, with date & time" delay={0.22}>
            <ActivityLog activities={data.activities || []} clientName={data.name} initialCount={6} />
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        busy={deleting}
        title={`Delete ${data.name}?`}
        message="This permanently removes the client, their project, every payment entry, the domain record and the entire activity log. This cannot be undone."
        confirmLabel="Delete permanently"
      />
    </PageTransition>
  );
}
