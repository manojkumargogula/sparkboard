import { clsx } from "clsx";
import { Flame } from "lucide-react";
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
    colors: ["#ff5a36", "#ffb224", "#e5266e", "#4b3fd8"],
    origin: {
      x: (origin.left + origin.width / 2) / window.innerWidth,
      y: (origin.top + origin.height / 2) / window.innerHeight,
    },
    disableForReducedMotion: true,
  });
}

/** "Fan the flame": the one place the ember colour is used for an action. */
export function VoteButton({ idea, size = "md" }: { idea: Idea; size?: "md" | "lg" }) {
  const vote = useVote();
  const { ensureProfile } = useProfile();
  const controls = useAnimationControls();
  const [burst, setBurst] = useState(0);

  async function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (!(await ensureProfile("Pick a name so your votes count once."))) return;
    const up = !idea.voted;
    if (up) {
      setBurst((n) => n + 1);
      void controls.start({ scale: [1, 1.28, 0.94, 1], rotate: [0, -12, 6, 0] });
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
        "group relative inline-flex items-center gap-2 rounded-full font-mono font-semibold transition-colors",
        size === "lg" ? "h-14 px-6 text-lg" : "h-11 px-4 text-base",
        idea.voted
          ? "bg-ember text-white shadow-[0_10px_24px_-10px_rgb(255_90_54/0.7)]"
          : "bg-raised text-ink hover:bg-ember/10 hover:text-ember",
      )}
    >
      {burst > 0 && <Sparks burstKey={burst} />}
      <motion.span animate={controls} transition={{ duration: 0.45 }} className="inline-flex">
        <Flame
          size={size === "lg" ? 22 : 18}
          className={clsx("transition-[fill]", idea.voted ? "fill-amber" : "fill-transparent")}
        />
      </motion.span>
      <CountRoll value={idea.vote_count} />
    </button>
  );
}
