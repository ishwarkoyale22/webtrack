import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, Inbox, AlertTriangle } from 'lucide-react';

/* ── Page transition wrapper ───────────────────────────────── */
export function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'opacity, transform' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Stagger helpers so lists cascade in instead of popping. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const riseIn = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Section heading ───────────────────────────────────────── */
export function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
            <Icon size={17} />
          </span>
        )}
        <div>
          <h2 className="font-display text-base font-semibold sm:text-lg">{title}</h2>
          {subtitle && <p className="text-xs text-faint">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
            className={`glass-card relative z-10 w-full ${widths[size]} max-h-[92dvh] overflow-hidden rounded-b-none sm:rounded-2xl`}
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-faint">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-xl p-2 text-faint transition hover:bg-white/10 hover:text-current"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[64dvh] overflow-y-auto p-5">{children}</div>

            {footer && <div className="flex justify-end gap-2 border-t border-white/10 p-4 safe-bottom">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Confirm dialog ────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', busy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
          <AlertTriangle size={19} />
        </span>
        <p className="pt-1 text-sm leading-relaxed text-dim">{message}</p>
      </div>
    </Modal>
  );
}

/* ── Loading / empty states ────────────────────────────────── */
export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function FullPageLoader({ label = 'Loading' }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 animate-spin-slow rounded-2xl bg-gradient-to-br from-brand-500 to-cyanic-400 opacity-70 blur-md" />
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyanic-400 shadow-glow">
            <Spinner size={22} className="text-white" />
          </div>
        </div>
        <p className="text-sm text-faint">{label}…</p>
      </div>
    </div>
  );
}

export function SkeletonCard({ className = 'h-28' }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
    >
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-cyanic-400/15 text-brand-300 ring-1 ring-white/10">
        <Icon size={26} />
      </span>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {message && <p className="max-w-sm text-sm text-faint">{message}</p>}
      {action}
    </motion.div>
  );
}

/* ── Toggle switch ─────────────────────────────────────────── */
export function Switch({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-300 ${
          checked
            ? 'bg-gradient-to-r from-brand-500 to-cyanic-400 shadow-glow'
            : 'bg-white/12 ring-1 ring-white/15'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 38, mass: 0.6 }}
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
          style={{ left: checked ? 26 : 4, willChange: 'transform' }}
        />
      </button>
    </label>
  );
}

/* ── Labelled input / select / textarea ────────────────────── */
export function Field({ label, hint, error, className = '', children }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-faint">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-medium text-rose-400">{error}</p>}
    </div>
  );
}

export function Input({ label, hint, error, className = '', wrapClass = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapClass}>
      <input className={`field ${error ? '!border-rose-500/60' : ''} ${className}`} {...props} />
    </Field>
  );
}

export function Select({ label, hint, error, options = [], className = '', wrapClass = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapClass}>
      <select className={`field ${className}`} {...props}>
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          )
        )}
      </select>
    </Field>
  );
}

export function Textarea({ label, hint, error, className = '', wrapClass = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapClass}>
      <textarea className={`field resize-y ${className}`} {...props} />
    </Field>
  );
}
