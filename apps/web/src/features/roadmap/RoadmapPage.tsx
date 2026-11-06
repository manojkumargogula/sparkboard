import { clsx } from "clsx";
import { ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";

import { useFeed } from "@/lib/queries";
import { type IdeaStatus, STATUSES } from "@/lib/types";
import { TileSkeleton } from "@/ui/Skeleton";

import { IdeaSheet } from "../idea/IdeaSheet";

const TONE: Record<IdeaStatus, { bar: string; card: string }> = {
  open: { bar: "bg-slate", card: "bg-night-2 text-snow ring-1 ring-white/10" },
  planned: { bar: "bg-paper", card: "bg-snow text-night" },
  building: { bar: "bg-cobalt", card: "bg-cobalt text-white" },
  shipped: { bar: "bg-[#2fd28b]", card: "bg-slate text-snow" },
};

function Column({
  status,
  label,
  hint,
  index,
}: {
  status: IdeaStatus;
  label: string;
  hint: string;
  index: number;
}) {
  const { data, isPending } = useFeed({ sort: "top", status });
  const ideas = data?.pages.flat() ?? [];
  const tone = TONE[status];
  return (
    <motion.section
      aria-label={label}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex w-[82vw] shrink-0 snap-start flex-col gap-3 sm:w-[22rem] lg:w-auto"
    >
      <header className="mb-2">
        <div className={clsx("h-1.5 w-full rounded-full", tone.bar)} />
        <div className="mt-4 flex items-baseline gap-3">
          <h2 className="text-3xl tracking-[-0.04em] uppercase">{label}</h2>
          <span className="font-mono text-sm text-fog">{ideas.length}</span>
        </div>
        <p className="text-sm text-fog">{hint}</p>
      </header>
      {isPending && <TileSkeleton />}
      {!isPending && ideas.length === 0 && (
        <p className="rounded-[4px] border border-dashed border-white/20 px-5 py-10 text-center text-fog">
          Nothing here yet
        </p>
      )}
      {ideas.map((idea) => (
        <Link
          key={idea.id}
          to={`/roadmap/i/${idea.id}`}
          className={clsx(
            "group flex min-h-40 flex-col justify-between gap-6 rounded-[4px] p-5 transition-transform hover:-translate-y-1",
            tone.card,
          )}
        >
          <span className="text-[13px] font-medium capitalize opacity-70">
            {idea.tags[0]?.replace(/-/g, " ") ?? "Idea"}
          </span>
          <div>
            <p className="text-xl leading-snug font-medium tracking-tight">
              {idea.title ?? idea.content}
            </p>
            <p className="mt-3 inline-flex items-center gap-1 font-mono text-[13px] opacity-75">
              <ChevronUp size={14} strokeWidth={2.5} />
              {idea.vote_count} votes · {idea.comment_count} comments
            </p>
          </div>
        </Link>
      ))}
    </motion.section>
  );
}

export function RoadmapPage() {
  return (
    <>
      <section className="grid-night pt-32 pb-28">
        <div className="container-x">
          <p className="label text-fog">Roadmap</p>
          <h1 className="mt-5 text-mega uppercase">
            From spark
            <br />
            <span className="text-cobalt">to shipped.</span>
          </h1>
          <p className="mt-7 max-w-xl text-xl text-paper/80">
            The most-voted ideas move along this board. Vote for the ones you want pushed forward.
          </p>
          <div className="-mx-5 mt-16 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:-mx-10 sm:px-10 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {STATUSES.map((s, i) => (
              <Column key={s.id} status={s.id} label={s.label} hint={s.hint} index={i} />
            ))}
          </div>
        </div>
      </section>
      <IdeaSheet basePath="/roadmap" />
    </>
  );
}
