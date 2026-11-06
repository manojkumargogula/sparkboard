import { motion } from "motion/react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card grain flex flex-col items-center px-6 py-16 text-center"
    >
      <motion.svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        aria-hidden
        animate={{ rotate: [0, 8, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M44 6 52 34 80 44 52 54 44 82 36 54 8 44 36 34Z"
          fill="var(--color-ember)"
          opacity="0.9"
        />
        <circle cx="70" cy="16" r="5" fill="var(--color-amber)" />
        <circle cx="16" cy="70" r="3.5" fill="var(--color-flare)" />
      </motion.svg>
      <h2 className="mt-6 text-title font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-lg text-muted">{body}</p>
      {action && <div className="mt-7">{action}</div>}
    </motion.div>
  );
}
