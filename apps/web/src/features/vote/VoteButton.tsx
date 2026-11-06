import { clsx } from "clsx";
import { ChevronUp } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { useVote } from "@/lib/queries";
import type { Idea } from "@/lib/types";
import { CountRoll } from "@/ui/CountRoll";

import { useProfile } from "../profile/useProfile";
import { Sparks } from "./Sparks";

const MILESTONES = new Set([10, 25, 50, 100, 250, 500, 1000]);

async function celebrate(origin: DOMRect) {
  const { default: confetti } = await import("canvas-confetti");
  void confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 32,
    colors: ["#2f54ff", "#fafafa", "#7d93ff", "#ffd166"],
    origin: {
      x: (origin.left + origin.width / 2) / window.innerWidth,
      y: (origin.top + origin.height / 2) / window.innerHeight,
    },
    disableForReducedMotion: true,
  });
}

type Variant = "box" | "pill" | "pill-dark";

const STYLES: Record<Variant, { base: string; on: string; off: string }> = {
  // Table rows: a square counter, like a ballot box.
  box: {
    base: "h-14 w-14 flex-col justify-center gap-0 rounded-[6px] border text-sm",
    on: "border-cobalt bg-cobalt text-white",
    off: "border-white/15 text-snow hover:border-cobalt-soft hover:text-cobalt-soft",
  },
  // On light surfaces (sheet, white tiles).
  pill: {
    base: "h-12 gap-2 rounded-[6px] px-4 text-base",
    on: "bg-cobalt text-white",
    off: "bg-night/8 text-night hover:bg-cobalt hover:text-white",
  },
  // On dark / cobalt tiles.
  "pill-dark": {
    base: "h-10 gap-1.5 rounded-[6px] px-3 text-sm",
    on: "bg-snow text-night",
    off: "bg-white/12 text-current hover:bg-white/22",
  },
};

export function VoteButton({ idea, variant = "box" }: { idea: Idea; variant?: Variant }) {
  const vote = useVote();
  const { ensureProfile } = useProfile();
  const controls = useAnimationControls();
  const [burst, setBurst] = useState(0);
  const style = STYLES[variant];

  async function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    if (!(await ensureProfile("Pick a name so your votes count once."))) return;
    const up = !idea.voted;
    if (up) {
      setBurst((n) => n + 1);
      void controls.start({ y: [0, -5, 0], scale: [1, 1.25, 1] });
      if (MILESTONES.has(idea.vote_count + 1)) void celebrate(rect);
    }
    vote.mutate(
      { id: idea.id, up },
      { onError: (err) => toast.error(err instanceof Error ? err.message : "Vote failed") },
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => void toggle(e)}
      aria-pressed={idea.voted}
      aria-label={`${idea.voted ? "Remove your vote from" : "Vote for"} this idea, ${idea.vote_count} votes`}
      className={clsx(
        "relative z-10 inline-flex shrink-0 items-center font-mono font-medium transition-colors",
        style.base,
        idea.voted ? style.on : style.off,
      )}
    >
      {burst > 0 && <Sparks burstKey={burst} />}
      <motion.span animate={controls} transition={{ duration: 0.4 }} className="inline-flex">
        <ChevronUp size={variant === "box" ? 18 : 18} strokeWidth={2.5} />
      </motion.span>
      <CountRoll value={idea.vote_count} />
    </button>
  );
}
