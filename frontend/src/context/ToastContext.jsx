import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ACCENT = {
  success: 'from-emerald-400 to-teal-400',
  error: 'from-rose-500 to-red-500',
  warning: 'from-amber-400 to-orange-500',
  info: 'from-violet-500 to-cyan-400',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, type = 'success', duration = 3800) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error', 5000),
    warning: (m) => push(m, 'warning', 4500),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="fixed top-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2.5 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.9, rotateY: -18 }}
                animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, x: 60, scale: 0.85, transition: { duration: 0.22 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="glass-card pointer-events-auto flex items-start gap-3 p-3.5 pr-2.5"
              >
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${ACCENT[t.type]} text-white shadow-glow`}
                >
                  <Icon size={16} strokeWidth={2.5} />
                </span>
                <p className="flex-1 pt-1 text-sm leading-snug">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="rounded-lg p-1.5 text-faint transition hover:bg-white/10 hover:text-white"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
