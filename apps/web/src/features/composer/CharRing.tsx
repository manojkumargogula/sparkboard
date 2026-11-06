import { motion } from "motion/react";

/** Circular character budget. Turns cobalt-red near the limit. */
export function CharRing({ used, max }: { used: number; max: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(used / max, 1);
  const left = max - used;
  const warn = left <= 80;
  return (
    <span
      className="relative inline-grid size-10 place-items-center"
      title={`${left} characters left`}
    >
      <svg viewBox="0 0 36 36" className="size-10 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgb(18 18 18 / 0.12)" strokeWidth="3" />
        <motion.circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          stroke={warn ? "#e5484d" : "var(--color-cobalt)"}
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </svg>
      {warn && (
        <span
          className="absolute font-mono text-[10px] font-semibold text-[#e5484d]"
          aria-live="polite"
        >
          {left}
        </span>
      )}
    </span>
  );
}
