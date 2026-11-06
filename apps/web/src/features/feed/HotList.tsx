import { Flame } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";

import { heat } from "@/lib/format";
import { useFeed } from "@/lib/queries";

/** The hero's right rail: what the community is fanning hardest right now. */
export function HotList() {
  const { data } = useFeed({ sort: "trending" });
  const top = (data?.pages[0] ?? []).slice(0, 4);
  const max = Math.max(1, ...top.map((i) => i.vote_count));
  if (top.length === 0) return null;
  return (
    <motion.aside
      aria-label="Burning right now"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 24 }}
      className="card grain hidden self-end p-7 lg:block"
    >
      <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-wide text-ember uppercase">
        <motion.span
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="inline-flex"
        >
          <Flame size={16} className="fill-amber" />
        </motion.span>
        Burning right now
      </p>
      <ol className="mt-5 flex flex-col gap-5">
        {top.map((idea, i) => (
          <li key={idea.id}>
            <Link to={`/i/${idea.id}`} className="group block rounded-xl">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm text-muted">{i + 1}</span>
                <span className="line-clamp-1 flex-1 text-lg font-semibold group-hover:text-iris">
                  {idea.title ?? idea.content}
                </span>
                <span className="font-mono text-sm font-semibold">{idea.vote_count}</span>
              </div>
              <div className="mt-2 ml-7 h-1 rounded-full bg-raised">
                <motion.div
                  className="heat-meter"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: Math.max(0.06, heat(idea.vote_count, max)) }}
                  transition={{ delay: 0.45 + i * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </motion.aside>
  );
}
