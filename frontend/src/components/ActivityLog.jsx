import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Wallet, Globe, StickyNote, FileText, GitBranch, ImageIcon, Activity as ActivityIcon,
  BadgeCheck, Download, ChevronDown,
} from 'lucide-react';
import { fmtDateTime, fromNow } from '../lib/format';
import { exportActivities } from '../lib/exportUtils';
import { EmptyState } from './ui';

const ICON = {
  client: UserPlus,
  payment: Wallet,
  domain: Globe,
  note: StickyNote,
  document: FileText,
  project: GitBranch,
  stage: GitBranch,
  status: BadgeCheck,
  screenshot: ImageIcon,
};

const TONE = {
  client: 'from-violet-500 to-purple-600',
  payment: 'from-emerald-400 to-teal-500',
  domain: 'from-cyan-400 to-blue-500',
  note: 'from-amber-400 to-orange-500',
  document: 'from-fuchsia-500 to-pink-600',
  project: 'from-blue-500 to-indigo-600',
  stage: 'from-indigo-500 to-violet-600',
  status: 'from-teal-400 to-emerald-500',
  screenshot: 'from-rose-400 to-pink-500',
};

/**
 * Per-client activity timeline — every action with its date & time.
 */
export default function ActivityLog({ activities = [], clientName, initialCount = 8, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? activities : activities.slice(0, initialCount);

  if (!activities.length) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No activity yet"
        message="Every payment, stage change and note edit will show up here with its timestamp."
      />
    );
  }

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-faint">
            {activities.length} recorded action{activities.length === 1 ? '' : 's'}
          </p>
          <button
            onClick={() => exportActivities(activities, clientName, 'csv')}
            className="btn-ghost btn-sm"
            title="Download this log as CSV"
          >
            <Download size={13} /> CSV
          </button>
        </div>
      )}

      <ol className="relative space-y-0.5">
        {/* Timeline rail */}
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-500/50 via-white/12 to-transparent"
        />

        <AnimatePresence initial={false}>
          {shown.map((a, i) => {
            const Icon = ICON[a.type] || ActivityIcon;
            return (
              <motion.li
                key={a._id || i}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32, delay: Math.min(i * 0.035, 0.3) }}
                className="group relative flex gap-3.5 rounded-xl p-2 transition hover:bg-white/5"
              >
                <span
                  className={`relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${
                    TONE[a.type] || TONE.client
                  } text-white shadow-md ring-4 ring-[rgb(var(--bg-0))] transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon size={14} strokeWidth={2.3} />
                </span>

                <div className="min-w-0 flex-1 pb-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-[13px] font-semibold">{a.action}</p>
                    <time className="text-[10.5px] text-faint" dateTime={a.createdAt} title={fmtDateTime(a.createdAt)}>
                      {fromNow(a.createdAt)}
                    </time>
                  </div>
                  {a.message && <p className="mt-0.5 text-[12px] leading-relaxed text-dim">{a.message}</p>}
                  <p className="mt-1 text-[10.5px] text-faint">{fmtDateTime(a.createdAt)}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      {activities.length > initialCount && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-semibold text-brand-300 transition hover:bg-white/5"
        >
          {expanded ? 'Show less' : `Show all ${activities.length}`}
          <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}
