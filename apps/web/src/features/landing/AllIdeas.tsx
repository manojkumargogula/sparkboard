import { clsx } from "clsx";
import { ArrowDownUp, Plus, Search, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";

import { engagementOf, heatScore, timeAgo } from "@/lib/format";
import { useFeed, useTags } from "@/lib/queries";
import { FIX_MY_ITCH, FIX_MY_ITCH_URL, scoreLabel } from "@/lib/source";
import { type IdeaStatus, type SortOrder, STATUSES } from "@/lib/types";
import { useDebounced } from "@/lib/useDebounced";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { RowSkeleton } from "@/ui/Skeleton";
import { StatusBadge } from "@/ui/StatusBadge";

import { useComposer } from "../composer/useComposer";
import { useFeedParams } from "../feed/useFeedParams";
import { VoteButton } from "../vote/VoteButton";

const SORTS: { id: SortOrder; label: string }[] = [
  { id: "top", label: "Heat" },
  { id: "trending", label: "Rising" },
  { id: "new", label: "Newest" },
];

function FilterOption({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-1 text-[15px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-3.5 cursor-pointer appearance-none rounded-[3px] border border-white/40 checked:border-cobalt checked:bg-cobalt"
      />
      <span
        className={clsx(
          "flex-1 transition-colors",
          checked ? "text-snow" : "text-fog group-hover:text-paper",
        )}
      >
        {label}
      </span>
      {count !== undefined && <span className="font-mono text-xs text-ash">{count}</span>}
    </label>
  );
}

export function AllIdeas() {
  const [params, update] = useFeedParams("top");
  const [status, setStatus] = useState<IdeaStatus | undefined>();
  const [query, setQuery] = useState(params.q ?? "");
  const q = useDebounced(query.trim(), 300);
  // The board opens on Fix My Itch; "all" in the URL shows every idea.
  const activeTag = params.tag === "all" ? undefined : (params.tag ?? FIX_MY_ITCH);
  const setTag = (tag: string | undefined) =>
    update({ tag: tag === FIX_MY_ITCH ? undefined : (tag ?? "all") });
  const feed = useFeed({ ...params, tag: activeTag, q: q || undefined, status });
  const { data: tags = [] } = useTags();
  const { openComposer } = useComposer();
  const { search } = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ideas = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const maxEngagement = Math.max(0, ...ideas.map(engagementOf));
  const filtered =
    (activeTag !== undefined && activeTag !== FIX_MY_ITCH) || status !== undefined || q !== "";

  const filters = (
    <div className="flex flex-col gap-7">
      <div className="relative">
        <Search
          size={16}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-fog"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ideas"
          aria-label="Search ideas"
          className="h-11 w-full rounded-[6px] border border-white/15 bg-white/5 pr-3 pl-9 text-[15px] outline-none placeholder:text-ash focus:border-cobalt"
        />
      </div>
      <fieldset>
        <legend className="mb-2 text-[15px] font-semibold text-snow">Topic</legend>
        <FilterOption
          label="Everything"
          checked={activeTag === undefined}
          onChange={() => setTag(undefined)}
        />
        {tags.slice(0, 18).map((t) => (
          <FilterOption
            key={t.tag}
            label={t.tag === FIX_MY_ITCH ? "Fix My Itch" : t.tag.replace(/-/g, " ")}
            count={t.count}
            checked={activeTag === t.tag}
            onChange={() => setTag(activeTag === t.tag ? undefined : t.tag)}
          />
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[15px] font-semibold text-snow">Status</legend>
        {STATUSES.map((s) => (
          <FilterOption
            key={s.id}
            label={s.label}
            checked={status === s.id}
            onChange={() => setStatus(status === s.id ? undefined : s.id)}
          />
        ))}
      </fieldset>
    </div>
  );

  return (
    <section id="all-ideas" className="grid-night py-24 sm:py-28" aria-labelledby="all-ideas-title">
      <div className="container-x">
        <h2 id="all-ideas-title" className="text-center text-giant text-paper uppercase">
          {activeTag === FIX_MY_ITCH ? "Fix my itch" : "All ideas"}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-fog">
          {activeTag === FIX_MY_ITCH ? (
            <>
              Problems worth solving, crowdsourced and AI-curated by{" "}
              <a
                href={FIX_MY_ITCH_URL}
                target="_blank"
                rel="noreferrer"
                className="text-paper underline decoration-white/30 underline-offset-4 hover:decoration-cobalt"
              >
                Razorpay's Fix My Itch
              </a>
              , ranked by their Itch Score until your votes say otherwise.
            </>
          ) : (
            "Every idea on the board. Filter by topic, search, or sort by what's rising."
          )}
        </p>

        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside aria-label="Filters">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="label flex items-center gap-2 text-fog lg:pointer-events-none"
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={15} /> Filter by
            </button>
            <div className={clsx("mt-5", !filtersOpen && "hidden lg:block")}>{filters}</div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-3">
              <div role="group" aria-label="Sort ideas" className="flex items-center gap-1">
                <ArrowDownUp size={15} className="mr-1 text-fog" aria-hidden />
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={params.sort === s.id}
                    onClick={() => update({ sort: s.id })}
                    className={clsx(
                      "rounded-[4px] px-2.5 py-1 text-[13px] font-semibold tracking-[0.06em] uppercase transition-colors",
                      params.sort === s.id ? "bg-snow text-night" : "text-fog hover:text-snow",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={openComposer} icon={<Plus size={16} />}>
                Post an idea
              </Button>
            </div>

            <div className="label hidden grid-cols-[minmax(0,1fr)_5rem_4.5rem_9rem_2.5rem] gap-6 border-b border-white/15 py-4 text-fog md:grid">
              <span>{activeTag === FIX_MY_ITCH ? "Itches" : "Ideas"}</span>
              <span>Score</span>
              <span>Votes</span>
              <span>Topic</span>
              <span className="sr-only">Open</span>
            </div>

            {feed.isPending && Array.from({ length: 6 }, (_, i) => <RowSkeleton key={i} />)}

            <ol>
              <AnimatePresence initial={false}>
                {ideas.map((idea, i) => (
                  <motion.li
                    key={idea.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.025 }}
                    className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 border-b border-white/12 py-5 md:grid-cols-[minmax(0,1fr)_5rem_4.5rem_9rem_2.5rem]"
                  >
                    <Link
                      to={`/i/${idea.id}${search}`}
                      className="min-w-0 after:absolute after:inset-0 after:content-['']"
                    >
                      <p className="text-lg leading-snug font-medium text-snow transition-colors group-hover:text-cobalt-soft sm:text-xl">
                        {idea.title ?? idea.content}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fog">
                        {idea.title && (
                          <span className="line-clamp-1 max-w-xl">{idea.content}</span>
                        )}
                        <span className="font-mono text-xs text-ash">
                          {idea.author?.display_name ?? "Anonymous"} · {timeAgo(idea.created_at)} ·{" "}
                          {idea.comment_count} comments
                        </span>
                        <StatusBadge status={idea.status} />
                      </p>
                    </Link>
                    <span className="hidden font-mono text-lg md:block">
                      {scoreLabel(
                        idea,
                        heatScore(idea.vote_count, idea.comment_count, maxEngagement),
                      )}
                    </span>
                    <div className="row-span-2 md:row-span-1">
                      <VoteButton idea={idea} variant="box" />
                    </div>
                    <span className="hidden text-lg text-paper/90 capitalize md:block">
                      {idea.tags[0]?.replace(/-/g, " ") ?? "—"}
                    </span>
                    <span
                      className="hidden size-9 place-items-center text-fog transition-transform group-hover:rotate-90 group-hover:text-snow md:grid"
                      aria-hidden
                    >
                      <Plus size={20} />
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>

            {feed.isError && (
              <EmptyState
                title="The board didn't load"
                body={feed.error.message}
                action={<Button onClick={() => void feed.refetch()}>Try again</Button>}
              />
            )}
            {feed.isSuccess && ideas.length === 0 && (
              <EmptyState
                title={filtered ? "Nothing matches" : "Be the first spark"}
                body={
                  filtered
                    ? "Try another topic or search, or post this idea yourself."
                    : "The board is empty. Post the first idea and get the votes rolling."
                }
                action={<Button onClick={openComposer}>Post an idea</Button>}
              />
            )}
            {feed.hasNextPage && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  className="text-snow"
                  disabled={feed.isFetchingNextPage}
                  onClick={() => void feed.fetchNextPage()}
                >
                  {feed.isFetchingNextPage ? "Loading…" : "Show more ideas"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
