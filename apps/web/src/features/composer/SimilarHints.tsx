import { Flame } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";

import { useSimilar } from "@/lib/queries";
import { useDebounced } from "@/lib/useDebounced";

/** Near-duplicates appear while typing, so people vote instead of reposting. */
export function SimilarHints({ text }: { text: string }) {
  const q = useDebounced(text.trim(), 450);
  const { data = [] } = useSimilar(q);
  const hits = q.length >= 12 ? data.filter((s) => s.score >= 0.3).slice(0, 3) : [];
  return (
    <AnimatePresence initial={false}>
      {hits.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <p className="pt-4 text-sm font-semibold text-muted">
            Already on the board? Vote instead.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {hits.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/i/${s.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-raised px-4 py-3 text-base transition-colors hover:bg-iris-soft"
                >
                  <span className="line-clamp-1 flex-1">{s.title ?? s.content}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-sm text-ember">
                    <Flame size={14} /> {s.vote_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
