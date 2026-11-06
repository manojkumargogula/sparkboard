import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

import { compact } from "@/lib/format";
import { keys, useFeed, useStats } from "@/lib/queries";
import { useHotkeys } from "@/lib/useHotkeys";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { IdeaSkeleton } from "@/ui/Skeleton";

import { Composer, type ComposerHandle } from "../composer/Composer";
import { IdeaSheet } from "../idea/IdeaSheet";
import { HotList } from "./HotList";
import { IdeaCard } from "./IdeaCard";
import { NewIdeasPill } from "./NewIdeasPill";
import { SortTabs } from "./SortTabs";
import { TagRail } from "./TagRail";
import { useFeedParams } from "./useFeedParams";
import { useInfiniteSentinel } from "./useInfiniteSentinel";

export function FeedPage() {
  const [params, update] = useFeedParams();
  const feed = useFeed(params);
  const stats = useStats();
  const qc = useQueryClient();
  const composer = useRef<ComposerHandle>(null);
  const location = useLocation();
  const [focusIndex, setFocusIndex] = useState(-1);
  const [baseline, setBaseline] = useState<number | null>(null);

  const ideas = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const maxVotes = useMemo(() => Math.max(0, ...ideas.map((i) => i.vote_count)), [ideas]);
  const query = location.search;

  // Remember the newest idea id we've rendered; anything newer feeds the pill.
  const latest = stats.data?.latest_idea_id ?? null;
  if (baseline === null && latest !== null) setBaseline(latest);
  const newCount = baseline !== null && latest !== null ? Math.max(0, latest - baseline) : 0;

  const refresh = useCallback(() => {
    setBaseline(latest);
    void qc.invalidateQueries({ queryKey: keys.feeds });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [latest, qc]);

  const loadMore = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  }, [feed]);
  const sentinel = useInfiniteSentinel(loadMore, feed.hasNextPage);

  useHotkeys({
    n: () => composer.current?.focus(),
    j: () => setFocusIndex((i) => Math.min(ideas.length - 1, i + 1)),
    k: () => setFocusIndex((i) => Math.max(0, i - 1)),
  });
  useEffect(() => {
    if (focusIndex < 0) return;
    document
      .querySelector(`[data-idea-id="${ideas[focusIndex]?.id}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusIndex, ideas]);

  const filtered = params.tag !== undefined || params.q !== undefined;

  return (
    <>
      <section className="grid grid-cols-[minmax(0,1fr)] gap-10 pt-8 pb-10 sm:pt-14 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-sm tracking-wide text-muted uppercase"
          >
            {stats.data
              ? `${compact(stats.data.ideas)} ideas · ${compact(stats.data.votes)} votes · ${compact(stats.data.shipped)} shipped`
              : "The community idea board"}
          </motion.p>
          <h1 className="mt-4 max-w-4xl text-hero font-extrabold text-balance">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              What should we
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-amber via-ember to-flare bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              build next?
            </motion.span>
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6 }}
            className="mt-8 max-w-3xl"
          >
            <Composer ref={composer} onPosted={() => update({ sort: "new" })} />
          </motion.div>
        </div>
        <HotList />
      </section>

      <section aria-label="Ideas" className="pb-24">
        <div className="sticky top-[4.5rem] z-20 -mx-4 flex flex-col gap-3 bg-canvas/85 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center">
          <SortTabs value={params.sort} onChange={(sort) => update({ sort })} />
          <div className="min-w-0 flex-1">
            <TagRail value={params.tag} onChange={(tag) => update({ tag })} />
          </div>
        </div>

        <AnimatePresence>
          {params.q && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-center gap-3 text-lg"
            >
              Results for <strong>“{params.q}”</strong>
              <Button
                variant="soft"
                onClick={() => update({ q: undefined })}
                icon={<X size={16} />}
              >
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-2">
          {feed.isPending && Array.from({ length: 4 }, (_, i) => <IdeaSkeleton key={i} />)}
          <AnimatePresence mode="popLayout">
            {ideas.map((idea, i) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                maxVotes={maxVotes}
                index={i}
                href={`/i/${idea.id}${query}`}
                focused={i === focusIndex}
              />
            ))}
          </AnimatePresence>
        </div>

        {feed.isError && (
          <EmptyState
            title="The board didn’t load"
            body={feed.error.message}
            action={<Button onClick={() => void feed.refetch()}>Try again</Button>}
          />
        )}
        {feed.isSuccess && ideas.length === 0 && (
          <EmptyState
            title={filtered ? "Nothing matches yet" : "The board is waiting for its first spark"}
            body={
              filtered
                ? "Try a different tag or search, or post the idea yourself."
                : "Post the first idea. Good ones get votes, great ones get shipped."
            }
            action={
              filtered ? (
                <Button onClick={() => update({ tag: undefined, q: undefined })}>
                  Show everything
                </Button>
              ) : (
                <Button variant="ember" onClick={() => composer.current?.focus()}>
                  Write the first idea
                </Button>
              )
            }
          />
        )}
        <div ref={sentinel} className="h-10" />
        {feed.isFetchingNextPage && (
          <div className="grid gap-5 lg:grid-cols-2">
            <IdeaSkeleton />
            <IdeaSkeleton />
          </div>
        )}
      </section>

      <NewIdeasPill count={params.sort === "new" ? newCount : 0} onClick={refresh} />
      <IdeaSheet basePath="/" />
    </>
  );
}
