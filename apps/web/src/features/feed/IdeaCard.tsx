import { clsx } from "clsx";
import { MessageCircle } from "lucide-react";
import { motion, type MotionStyle } from "motion/react";
import { Link } from "react-router";

import { heat, timeAgo } from "@/lib/format";
import type { Idea } from "@/lib/types";
import { Avatar } from "@/ui/Avatar";
import { StatusBadge } from "@/ui/StatusBadge";

import { VoteButton } from "../vote/VoteButton";

interface Props {
  idea: Idea;
  maxVotes: number;
  href: string;
  index?: number;
  compact?: boolean;
  focused?: boolean;
}

export function IdeaCard({
  idea,
  maxVotes,
  href,
  index = 0,
  compact = false,
  focused = false,
}: Props) {
  const h = heat(idea.vote_count, maxVotes);
  return (
    <motion.article
      layout
      layoutId={`idea-${idea.id}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 30,
        delay: Math.min(index, 8) * 0.035,
      }}
      whileHover={{ y: -3 }}
      data-idea-id={idea.id}
      className={clsx(
        "card heat group relative flex flex-col",
        compact ? "gap-3 p-5" : "gap-4 p-6 sm:p-7",
        focused && "ring-3 ring-iris",
      )}
      style={{ "--heat": h } as MotionStyle}
    >
      <header className="flex items-center gap-3">
        <Avatar author={idea.author} size="md" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-base font-semibold">
            {idea.author?.display_name ?? "Anonymous"}
          </p>
          <p className="font-mono text-xs text-muted">{timeAgo(idea.created_at)}</p>
        </div>
        <StatusBadge status={idea.status} />
      </header>

      <Link
        to={href}
        className="block rounded-xl after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
      >
        {idea.title && (
          <h3
            className={clsx(
              "font-bold text-balance",
              compact ? "text-xl leading-tight" : "text-title",
            )}
          >
            {idea.title}
          </h3>
        )}
        <p
          className={clsx(
            "text-pretty",
            idea.title ? "mt-2 text-lg text-muted" : compact ? "text-xl" : "text-idea",
            compact && "line-clamp-3",
          )}
        >
          {idea.content}
        </p>
      </Link>

      <footer className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
        <VoteButton idea={idea} />
        <Link
          to={href}
          className="inline-flex h-11 items-center gap-2 rounded-full px-4 font-mono text-base text-muted transition-colors hover:bg-iris-soft hover:text-ink"
          aria-label={`${idea.comment_count} comments`}
        >
          <MessageCircle size={18} />
          {idea.comment_count}
        </Link>
        <div className="ml-auto flex flex-wrap justify-end gap-1.5">
          {idea.tags.map((t) => (
            <span key={t} className="rounded-full bg-raised px-3 py-1 font-mono text-xs text-muted">
              #{t}
            </span>
          ))}
        </div>
      </footer>
    </motion.article>
  );
}
