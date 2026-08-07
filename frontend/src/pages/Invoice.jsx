import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileSignature, FileCheck2, Download, Search, Loader2, Users, Eye, IndianRupee, Globe,
  Upload, Trash2, Paperclip,
} from 'lucide-react';
import { PageTransition, EmptyState, SkeletonCard, ConfirmDialog } from '../components/ui';
import { clientApi, documentApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { generateInvoice, generateQuotation } from '../lib/pdf';
import { money, initials, avatarGradient, statusChip, fmtDate } from '../lib/format';

const DOC_TYPES = [
  ['invoice', 'Invoice', FileText],
  ['quotation', 'Quotation', FileSignature],
  ['agreement', 'Agreement', FileCheck2],
];

const fileSize = (bytes) => {
  const kb = (Number(bytes) || 0) / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const toast = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(id || '');
  const [selected, setSelected] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [kind, setKind] = useState('invoice');
  const [preview, setPreview] = useState('');
  const [search, setSearch] = useState('');

  // Uploaded documents (separate from the auto-generated preview above)
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadType, setUploadType] = useState('invoice');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    clientApi
      .list()
      .then((d) => {
        setClients(d.clients || []);
        if (!id && d.clients?.length) setSelectedId(d.clients[0]._id);
      })
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load clients'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setFetching(true);
    clientApi
      .get(selectedId)
      .then(setSelected)
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load that client'))
      .finally(() => setFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Re-render the preview whenever the client or document type changes.
  const buildPreview = useCallback(() => {
    if (!selected) return;
    try {
      const fn = kind === 'invoice' ? generateInvoice : generateQuotation;
      const { dataUrl } = fn(selected, admin, { download: false });
      setPreview(dataUrl);
    } catch (e) {
      toast.error(`Preview failed: ${e.message}`);
      setPreview('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, kind, admin]);

  useEffect(buildPreview, [buildPreview]);

  // Uploaded documents for whichever client is selected.
  const loadDocs = useCallback(() => {
    if (!selectedId) return;
    setDocsLoading(true);
    documentApi
      .list(selectedId)
      .then(setDocs)
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load documents'))
      .finally(() => setDocsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(loadDocs, [loadDocs]);

  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile) return toast.error('Choose a file first.');
    if (!selectedId) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      await documentApi.upload(selectedId, uploadType, uploadFile, setUploadProgress);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocs();
      toast.success(`${uploadFile.name} uploaded.`);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not upload that file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteDoc = async () => {
    if (!confirmDeleteDoc) return;
    setDeletingDoc(true);
    try {
      await documentApi.remove(confirmDeleteDoc._id);
      setDocs((list) => list.filter((d) => d._id !== confirmDeleteDoc._id));
      toast.success('Document removed.');
      setConfirmDeleteDoc(null);
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not remove that document');
    } finally {
      setDeletingDoc(false);
    }
  };

  const download = () => {
    if (!selected) return;
    const fn = kind === 'invoice' ? generateInvoice : generateQuotation;
    fn(selected, admin);
    clientApi
      .addActivity(selected._id, {
        type: 'document',
        action: `${kind === 'invoice' ? 'Invoice' : 'Quotation'} generated`,
        message: `A ${kind} PDF was generated and downloaded.`,
      })
      .catch(() => {});
    toast.success(`${kind === 'invoice' ? 'Invoice' : 'Quotation'} downloaded.`);
  };

  const filtered = useMemo(
    () =>
      clients.filter((c) =>
        `${c.name} ${c.company || ''} ${c.project?.websiteName || ''}`.toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  if (loading) {
    return (
      <PageTransition className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard className="h-[32rem]" />
        <SkeletonCard className="h-[32rem] lg:col-span-2" />
      </PageTransition>
    );
  }

  if (!clients.length) {
    return (
      <PageTransition>
        <div className="glass-card">
          <EmptyState
            icon={Users}
            title="No clients to invoice yet"
            message="Add a client with a total price, then come back to generate their invoice or quotation."
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

  const p = selected?.payment;

  return (
    <PageTransition className="grid gap-4 lg:grid-cols-3">
      {/* ── Picker ── */}
      <motion.aside
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card flex flex-col p-4 sm:p-5"
      >
        <h2 className="font-display text-base font-semibold">Generate a document</h2>
        <p className="mt-1 text-xs text-faint">Every field is filled from the client's detail page.</p>

        {/* Doc type */}
        <div className="glass mt-4 grid grid-cols-2 gap-1 rounded-xl p-1">
          {[
            ['invoice', 'Invoice', FileText],
            ['quotation', 'Quotation', FileSignature],
          ].map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-300 ${
                kind === k ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow' : 'text-faint hover:text-current'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a client…"
            aria-label="Find a client"
            className="field pl-9"
          />
        </div>

        {/* Client list */}
        <ul className="-mx-1 mt-3 max-h-[22rem] space-y-1 overflow-y-auto px-1">
          {filtered.map((c) => {
            const active = c._id === selectedId;
            return (
              <li key={c._id}>
                <button
                  onClick={() => setSelectedId(c._id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition ${
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
                      {money(c.payment?.grandTotal || 0)} · {c.payment?.status || 'Pending'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {!filtered.length && <p className="p-4 text-center text-xs text-faint">No clients match “{search}”.</p>}
        </ul>

        {/* Summary + download */}
        {selected && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <div className="space-y-1.5 text-xs">
              {[
                ['Base price', money(p?.totalPrice || 0)],
                ...(p?.gstEnabled ? [[`GST (${p.gstRate}%)`, money(p.gstAmount || 0)]] : []),
                ['Grand total', money(p?.grandTotal || 0)],
                ['Received', money(p?.received || 0)],
                ['Balance due', money(p?.pending || 0)],
              ].map(([label, value], i, arr) => (
                <div key={label} className={`flex justify-between ${i === arr.length - 1 ? 'font-bold text-rose-400' : 'text-dim'}`}>
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>

            <button onClick={download} className="btn-primary w-full">
              <Download size={15} /> Download {kind === 'invoice' ? 'Invoice' : 'Quotation'}
            </button>
          </div>
        )}
      </motion.aside>

      {/* ── Preview ── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="glass-card flex flex-col overflow-hidden lg:col-span-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
              <Eye size={16} />
            </span>
            <div>
              <p className="font-display text-sm font-semibold">
                {kind === 'invoice' ? 'Invoice' : 'Quotation'} preview
              </p>
              <p className="text-[11px] text-faint">{selected?.name || 'Select a client'}</p>
            </div>
          </div>

          {selected && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={statusChip(p?.status)}>{p?.status}</span>
              {selected.domain?.domainName && (
                <span className="chip-cyan">
                  <Globe size={11} /> {selected.domain.domainName}
                </span>
              )}
              <span className="chip-brand">
                <IndianRupee size={11} /> {money(p?.grandTotal || 0)}
              </span>
            </div>
          )}
        </div>

        <div className="relative min-h-[28rem] flex-1 bg-slate-950/25 p-3">
          <AnimatePresence mode="wait">
            {fetching || !preview ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid h-full min-h-[26rem] place-items-center"
              >
                <div className="flex flex-col items-center gap-3 text-faint">
                  <Loader2 size={26} className="animate-spin" />
                  <p className="text-sm">Rendering the PDF…</p>
                </div>
              </motion.div>
            ) : (
              <motion.iframe
                key={`${selectedId}-${kind}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                src={preview}
                title={`${kind} preview`}
                className="h-[70vh] min-h-[26rem] w-full rounded-xl bg-white ring-1 ring-white/10"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ── Your documents (uploaded, not generated) ── */}
      {selected && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="glass-card p-4 sm:p-5 lg:col-span-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
              <Paperclip size={16} />
            </span>
            <div>
              <p className="font-display text-sm font-semibold">Your documents</p>
              <p className="text-[11px] text-faint">
                Upload your own invoice, quotation or agreement for {selected.name} — download or remove anytime.
              </p>
            </div>
          </div>

          {/* Upload row */}
          <form onSubmit={uploadDoc} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="glass grid grid-cols-3 gap-1 rounded-xl p-1">
              {DOC_TYPES.map(([k, label, Icon]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setUploadType(k)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                    uploadType === k
                      ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow'
                      : 'text-faint hover:text-current'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="field flex-1 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-current"
            />

            <button type="submit" disabled={uploading || !uploadFile} className="btn-primary">
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload size={15} /> Upload
                </>
              )}
            </button>
          </form>
          <p className="mt-1.5 text-[11px] text-faint">PDF, Word or image — up to 15 MB.</p>

          {/* List */}
          <div className="mt-4 space-y-2">
            {docsLoading ? (
              <SkeletonCard className="h-16" />
            ) : docs.length ? (
              docs.map((doc) => {
                const Icon = DOC_TYPES.find(([k]) => k === doc.type)?.[2] || FileText;
                return (
                  <div
                    key={doc._id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/8 text-brand-300">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{doc.originalName}</p>
                      <p className="text-[11px] text-faint">
                        {DOC_TYPES.find(([k]) => k === doc.type)?.[1] || doc.type} · {fileSize(doc.size)} · {fmtDate(doc.createdAt)}
                      </p>
                    </div>
                    <a
                      href={documentApi.downloadUrl(doc._id)}
                      download={doc.originalName}
                      className="btn-ghost !px-3 !py-2"
                      aria-label={`Download ${doc.originalName}`}
                    >
                      <Download size={15} />
                    </a>
                    <button
                      onClick={() => setConfirmDeleteDoc(doc)}
                      className="btn-ghost !px-3 !py-2 text-rose-300 hover:text-rose-200"
                      aria-label={`Remove ${doc.originalName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-faint">
                No documents uploaded for {selected.name} yet.
              </p>
            )}
          </div>
        </motion.section>
      )}

      <ConfirmDialog
        open={!!confirmDeleteDoc}
        onClose={() => setConfirmDeleteDoc(null)}
        onConfirm={deleteDoc}
        busy={deletingDoc}
        title={`Remove ${confirmDeleteDoc?.originalName || 'this document'}?`}
        message="This permanently deletes the uploaded file. This cannot be undone."
        confirmLabel="Remove permanently"
      />
    </PageTransition>
  );
}
