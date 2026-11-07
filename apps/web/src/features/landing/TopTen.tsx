import { clsx } from "clsx";
import { ArrowRight, ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { Link, useLocation } from "react-router";

import { engagementOf, heatScore } from "@/lib/format";
import { useFeed } from "@/lib/queries";
import { FIX_MY_ITCH, FIX_MY_ITCH_URL } from "@/lib/source";
import type { Idea } from "@/lib/types";
import { TileSkeleton } from "@/ui/Skeleton";

/* Tile palette, in reading order. Two wide tiles, then rows of four. */
const TONES = [
  "bg-snow text-night",
  "bg-cobalt text-white",
  "bg-cobalt text-white",
  "bg-snow text-night",
  "bg-slate text-snow",
  "bg-cobalt text-white",
  "bg-slate text-snow",
  "bg-cobalt text-white",
  "bg-snow text-night",
  "bg-slate text-snow",
];

function Tile({ idea, rank, maxEngagement }: { idea: Idea; rank: number; maxEngagement: number }) {
  const tone = TONES[rank - 1] ?? "bg-slate text-snow";
  const light = tone.includes("bg-snow");
  const { search } = useLocation();
  return (
    <motion.li
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (rank % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={rank <= 2 ? "lg:col-span-6" : "lg:col-span-3"}
    >
      <Link
        to={`/i/${idea.id}${search}`}
        className={clsx(
          "group flex h-full min-h-48 flex-col justify-between gap-8 rounded-[4px] p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6",
          rank <= 2 ? "lg:min-h-44" : "lg:min-h-56",
          tone,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                "inline-flex h-7 items-center rounded-[4px] px-2.5 text-[13px] font-medium",
                light ? "border border-night/15 bg-white" : "bg-snow text-night",
              )}
            >
              {idea.tags[0] ? idea.tags[0].replace(/-/g, " ") : "Idea"}
            </span>
            <span className="font-mono text-xs opacity-60">#{String(rank).padStart(2, "0")}</span>
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-current/60 transition-transform duration-300 group-hover:-rotate-45">
            <ArrowRight size={15} />
          </span>
        </div>
        <div>
          <p className="text-card font-medium">{idea.title ?? idea.content}</p>
          <p className="mt-4 flex items-center gap-4 font-mono text-[13px] opacity-75">
            <span className="inline-flex items-center gap-1">
              <ChevronUp size={14} strokeWidth={2.5} />
              {idea.vote_count}
            </span>
            <span>
              {idea.source_score
                ? `itch score ${idea.source_score.toFixed(1)}`
                : idea.source_rank
                  ? `fix my itch #${idea.source_rank}`
                  : `heat ${heatScore(idea.vote_count, idea.comment_count, maxEngagement).toFixed(1)}`}
            </span>
          </p>
        </div>
      </Link>
    </motion.li>
  );
}

export function TopTen() {
  const { data, isPending } = useFeed({ sort: "top", tag: FIX_MY_ITCH });
  const top = (data?.pages[0] ?? []).slice(0, 10);
  const maxEngagement = Math.max(0, ...top.map(engagementOf));

  return (
    <section id="top-10" className="bg-night py-24 sm:py-28" aria-labelledby="top-10-title">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="top-10-title" className="text-giant text-paper uppercase">
            Top 10 problems
          </h2>
          <p className="max-w-sm pb-2 text-lg text-fog">
            The itches people most want fixed, curated by{" "}
            <a
              href={FIX_MY_ITCH_URL}
              target="_blank"
              rel="noreferrer"
              className="text-paper underline decoration-white/30 underline-offset-4 hover:decoration-cobalt"
            >
              Fix My Itch by Razorpay
            </a>
            . Your votes re-rank them.
          </p>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {isPending &&
            Array.from({ length: 6 }, (_, i) => (
              <li key={i} className={i < 2 ? "lg:col-span-6" : "lg:col-span-3"}>
                <TileSkeleton />
              </li>
            ))}
          {top.map((idea, i) => (
            <Tile key={idea.id} idea={idea} rank={i + 1} maxEngagement={maxEngagement} />
          ))}
        </ul>
      </div>
    </section>
  );
}
