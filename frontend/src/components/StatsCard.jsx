import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Counts up to `value` once, then tracks any later change.
 *
 * The animation is a flourish, never the source of truth: if it can't run —
 * reduced-motion, a hidden/background tab where rAF is paused — the real
 * number is shown immediately rather than a stuck 0.
 */
function useCountUp(value, duration = 1100) {
  const to = Number(value) || 0;
  const [display, setDisplay] = useState(to);
  const fromRef = useRef(to);

  useEffect(() => {
    const from = fromRef.current;
    if (from === to) return undefined;

    const skipAnimation =
      document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (skipAnimation) {
      fromRef.current = to;
      setDisplay(to);
      return undefined;
    }

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - p) ** 3; // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to); // land exactly on the target, never 99.7% of it
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // Interrupted mid-flight (unmount, value changed): don't strand a
      // half-counted number — commit the value we were heading to.
      fromRef.current = to;
    };
  }, [to, duration]);

  return display;
}

const TONES = {
  brand: {
    icon: 'from-brand-500 to-brand-700 shadow-[0_8px_28px_-8px_rgba(124,77,255,0.9)]',
    ring: 'group-hover:border-brand-400/50',
    glow: 'from-brand-500/25',
    spark: '#a78bfa',
  },
  cyan: {
    icon: 'from-cyan-400 to-blue-600 shadow-[0_8px_28px_-8px_rgba(34,211,238,0.9)]',
    ring: 'group-hover:border-cyan-400/50',
    glow: 'from-cyan-400/25',
    spark: '#22d3ee',
  },
  rose: {
    icon: 'from-rose-500 to-pink-600 shadow-[0_8px_28px_-8px_rgba(244,63,94,0.9)]',
    ring: 'group-hover:border-rose-400/50',
    glow: 'from-rose-500/25',
    spark: '#fb7185',
  },
  emerald: {
    icon: 'from-emerald-400 to-teal-600 shadow-[0_8px_28px_-8px_rgba(16,185,129,0.9)]',
    ring: 'group-hover:border-emerald-400/50',
    glow: 'from-emerald-400/25',
    spark: '#34d399',
  },
};

/**
 * Glass stat card with a real 3D tilt that follows the pointer.
 */
export default function StatsCard({
  icon: Icon,
  label,
  value,
  format = (v) => Math.round(v).toLocaleString('en-IN'),
  tone = 'brand',
  hint,
  trend,
  delay = 0,
  onClick,
}) {
  const ref = useRef(null);
  const t = TONES[tone] || TONES.brand;
  const animated = useCountUp(value);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], ['9deg', '-9deg']), { stiffness: 220, damping: 20 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], ['-9deg', '9deg']), { stiffness: 220, damping: 20 });

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  const Trend = trend?.dir === 'down' ? TrendingDown : TrendingUp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="perspective"
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        onClick={onClick}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
        className={`glass-card card-3d group p-5 ${t.ring} ${onClick ? 'cursor-pointer' : ''}`}
      >
        {/* Corner glow */}
        <div
          className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
        />

        <div className="flex items-start justify-between gap-3" style={{ transform: 'translateZ(35px)' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-faint">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-[28px]">
              {format(animated)}
            </p>
            {hint && <p className="mt-1 truncate text-[11px] text-faint">{hint}</p>}

            {trend && (
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                  trend.dir === 'down' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                <Trend size={11} />
                {trend.label}
              </span>
            )}
          </div>

          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${t.icon} text-white transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6`}
            style={{ transform: 'translateZ(55px)' }}
          >
            <Icon size={21} strokeWidth={2.1} />
          </span>
        </div>

        {/* Bottom spark line */}
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-white/8" style={{ transform: 'translateZ(20px)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.1, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${t.spark}, transparent)` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
