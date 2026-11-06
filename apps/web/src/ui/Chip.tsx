import { clsx } from "clsx";
import { motion } from "motion/react";
import type { ReactNode } from "react";

interface Props {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  layoutGroup?: string;
}

/** Filter pill. The active background slides between chips with a shared layout id. */
export function Chip({ active = false, onClick, children, layoutGroup = "chip" }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "relative h-10 shrink-0 rounded-full px-4 text-base font-medium transition-colors",
        active ? "text-canvas" : "text-muted hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId={`${layoutGroup}-active`}
          className="absolute inset-0 rounded-full bg-ink"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
