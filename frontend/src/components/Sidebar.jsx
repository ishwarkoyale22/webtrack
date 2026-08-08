import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Table2, Wallet, BarChart3, FileText, Bell, X, Sparkles, UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/team', label: 'Team', icon: UserCheck },
  { to: '/overview', label: 'Overview', icon: Table2 },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/invoice', label: 'Documents', icon: FileText },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

function NavItems({ onNavigate, alertCount }) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-1.5">
      {NAV.map(({ to, label, icon: Icon, end }) => {
        const active = end ? pathname === to : pathname.startsWith(to);
        return (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className="relative">
            <span className={`nav-item ${active ? 'nav-item-active' : ''}`}>
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 36, mass: 0.6 }}
                  style={{ willChange: 'transform' }}
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow"
                />
              )}
              <Icon size={18} className={active ? 'text-white' : ''} />
              <span className="flex-1">{label}</span>
              {label === 'Notifications' && alertCount > 0 && (
                <span
                  className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-rose-500 text-white shadow-[0_0_14px_rgba(244,63,94,0.7)]'
                  }`}
                >
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-500 to-cyanic-400 blur-md opacity-70" />
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-cyanic-500 shadow-glow">
          <Sparkles size={19} className="text-white" />
        </div>
      </div>
      <div className="leading-tight">
        <p className="font-display text-lg font-bold tracking-tight">
          Web<span className="gradient-text">Track</span>
        </p>
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-faint">Studio Console</p>
      </div>
    </div>
  );
}

function AdminCard() {
  const { admin } = useAuth();
  if (!admin) return null;

  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-cyanic-400 text-[13px] font-bold text-white">
          {initials(admin.name) || 'A'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{admin.name}</p>
          <p className="truncate text-[11px] text-faint">{admin.email}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop: fixed rail. Mobile: slide-in drawer driven by `open`.
 */
export default function Sidebar({ open, onClose, alertCount = 0 }) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col gap-6 p-4 lg:flex">
        <div className="glass-card flex h-full flex-col gap-6 p-4">
          <Brand />
          <div className="hr-soft" />
          <NavItems alertCount={alertCount} />
          <div className="mt-auto flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600/30 to-cyanic-500/20 p-3.5 ring-1 ring-white/10">
              <div className="absolute -right-6 -top-6 h-16 w-16 animate-float rounded-full bg-brand-400/30 blur-xl" />
              <p className="text-xs font-semibold">One client, one website.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-faint">
                Everything for a client lives on a single detail page.
              </p>
            </div>
            <AdminCard />
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="glass absolute inset-y-0 left-0 flex w-[80vw] max-w-[290px] flex-col gap-5 p-4"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  onClick={onClose}
                  aria-label="Close menu"
                  className="rounded-xl p-2 text-faint transition hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="hr-soft" />
              <NavItems onNavigate={onClose} alertCount={alertCount} />
              <div className="mt-auto">
                <AdminCard />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
