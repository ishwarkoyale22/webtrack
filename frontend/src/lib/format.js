import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const CURRENCY = '₹';

/** ₹45,000 — Indian grouping, no decimals unless they matter. */
export function money(n, { compact = false, currency = CURRENCY } = {}) {
  const v = Number(n) || 0;
  if (compact && Math.abs(v) >= 100000) return `${currency}${(v / 100000).toFixed(2)}L`;
  if (compact && Math.abs(v) >= 1000) return `${currency}${(v / 1000).toFixed(1)}K`;
  return `${currency}${v.toLocaleString('en-IN', { maximumFractionDigits: v % 1 === 0 ? 0 : 2 })}`;
}

export const num = (n) => (Number(n) || 0).toLocaleString('en-IN');

export const fmtDate = (d, f = 'DD MMM YYYY') => (d ? dayjs(d).format(f) : '—');
export const fmtDateTime = (d) => (d ? dayjs(d).format('DD MMM YYYY, hh:mm A') : '—');
export const fromNow = (d) => (d ? dayjs(d).fromNow() : '');
export const toInputDate = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '');

/** Negative = overdue. */
export const daysLeft = (d) => (d ? dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day') : null);

export const STAGES = ['Discovery', 'Design', 'Development', 'Testing', 'Live'];
export const PRIORITIES = ['High', 'Medium', 'Low'];
export const SOURCES = ['Referral', 'Social Media', 'Direct'];
export const PAY_STATUSES = ['Paid', 'Partial', 'Pending'];
export const PAY_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

export const stageIndex = (s) => Math.max(STAGES.indexOf(s), 0);
export const stageProgress = (s) => Math.round(((stageIndex(s) + 1) / STAGES.length) * 100);

export const statusChip = (status) =>
  ({ Paid: 'chip-paid', Partial: 'chip-partial', Pending: 'chip-pending' }[status] || 'chip-pending');

export const priorityChip = (p) =>
  ({ High: 'chip-pending', Medium: 'chip-partial', Low: 'chip-cyan' }[p] || 'chip-brand');

export const stageColor = (s) =>
  ({
    Discovery: '#8b5cf6',
    Design: '#ec4899',
    Development: '#3b82f6',
    Testing: '#f59e0b',
    Live: '#10b981',
  }[s] || '#7c4dff');

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

/** Deterministic gradient per client so avatars stay stable across renders. */
export function avatarGradient(seed = '') {
  const palettes = [
    'from-violet-500 to-fuchsia-500',
    'from-blue-500 to-cyan-400',
    'from-fuchsia-500 to-rose-500',
    'from-cyan-400 to-emerald-400',
    'from-indigo-500 to-purple-500',
    'from-amber-400 to-orange-500',
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

export { dayjs };
