import { motion } from "motion/react";

import { useFeed } from "@/lib/queries";
import { type IdeaStatus, STATUSES } from "@/lib/types";
import { IdeaSkeleton } from "@/ui/Skeleton";

import { IdeaCard } from "../feed/IdeaCard";
import { IdeaSheet } from "../idea/IdeaSheet";

const ACCENT: Record<IdeaStatus, string> = {
  open: "bg-iris",
  planned: "bg-amber",
  building: "bg-ember",
  shipped: "bg-mint",
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
  const maxVotes = Math.max(0, ...ideas.map((i) => i.vote_count));
  return (
    <motion.section
      aria-label={label}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 200, damping: 26 }}
      className="flex w-[85vw] shrink-0 snap-start flex-col gap-4 sm:w-[24rem] lg:w-auto"
    >
      <header className="flex items-baseline gap-3 px-1">
        <span className={`size-3 rounded-full ${ACCENT[status]}`} aria-hidden />
        <h2 className="text-2xl font-bold">{label}</h2>
        <span className="font-mono text-sm text-muted">{ideas.length}</span>
        <span className="ml-auto text-sm text-muted">{hint}</span>
      </header>
      <div className="flex flex-col gap-4">
        {isPending && <IdeaSkeleton />}
        {!isPending && ideas.length === 0 && (
          <p className="rounded-[var(--radius-card)] border-2 border-dashed border-line px-5 py-10 text-center text-muted">
            Nothing here yet
          </p>
        )}
        {ideas.map((idea, i) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            maxVotes={maxVotes}
            index={i}
            compact
            href={`/roadmap/i/${idea.id}`}
          />
        ))}
      </div>
    </motion.section>
  );
}

export function RoadmapPage() {
  return (
    <>
      <section className="pt-8 pb-8 sm:pt-14">
        <p className="font-mono text-sm tracking-wide text-muted uppercase">Roadmap</p>
        <h1 className="mt-4 max-w-3xl text-hero font-extrabold text-balance">
          From spark <span className="text-ember">to shipped.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-xl text-muted">
          The most-voted ideas move along this board. Vote to push the ones you want forward.
        </p>
      </section>
      <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-24 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {STATUSES.map((s, i) => (
          <Column key={s.id} status={s.id} label={s.label} hint={s.hint} index={i} />
        ))}
      </div>
      <IdeaSheet basePath="/roadmap" />
    </>
  );
}
