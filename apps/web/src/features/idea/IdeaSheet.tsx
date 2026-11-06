import { Link2 } from "lucide-react";
import { motion } from "motion/react";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { timeAgo } from "@/lib/format";
import { useIdea } from "@/lib/queries";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";
import { StatusBadge } from "@/ui/StatusBadge";

import { VoteButton } from "../vote/VoteButton";
import { Comments } from "./Comments";

/** Idea detail as a side sheet (bottom sheet on phones). `/i/:id` is shareable. */
export function IdeaSheet({ basePath }: { basePath: string }) {
  const { id } = useParams();
  const ideaId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { search } = useLocation();
  const { data: idea, isError } = useIdea(Number.isFinite(ideaId) ? ideaId : null);

  const close = () => void navigate(`${basePath}${search}`, { preventScrollReset: true });

  async function share() {
    const url = `${window.location.origin}/i/${ideaId}`;
    try {
      const nav: Partial<Navigator> = navigator;
      if (nav.share) await nav.share({ title: idea?.title ?? "Sparkboard idea", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  return (
    <Modal
      open={ideaId !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={idea?.title ?? "Idea"}
      placement="side"
      width="42rem"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pt-8 pb-10 sm:px-10 sm:pt-12">
        {isError && (
          <p className="py-20 text-center text-xl text-night/60">This idea no longer exists.</p>
        )}
        {!idea && !isError && (
          <div aria-hidden className="space-y-4">
            <div className="h-7 w-32 animate-pulse rounded bg-night/10" />
            <div className="h-12 w-full animate-pulse rounded bg-night/10" />
            <div className="h-12 w-2/3 animate-pulse rounded bg-night/10" />
          </div>
        )}
        {idea && (
          <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center gap-2 pr-10">
              {idea.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex h-7 items-center rounded-[4px] border border-night/15 bg-white px-2.5 text-[13px] font-medium capitalize"
                >
                  {t.replace(/-/g, " ")}
                </span>
              ))}
              <StatusBadge status={idea.status} showOpen />
            </div>
            <h2 className="mt-7 text-[clamp(2rem,1.4rem+2.2vw,3rem)] leading-[1.02] tracking-[-0.04em]">
              {idea.title ?? idea.content}
            </h2>
            {idea.title && (
              <p className="mt-5 text-xl leading-relaxed text-night/75">{idea.content}</p>
            )}

            <div className="mt-7 flex items-center gap-3 text-sm text-night/60">
              <Avatar author={idea.author} size="sm" />
              <span className="font-medium text-night">
                {idea.author?.display_name ?? "Anonymous"}
              </span>
              <span className="font-mono text-xs">posted {timeAgo(idea.created_at)}</span>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <VoteButton idea={idea} variant="pill" />
              <Button
                variant="outline"
                className="h-12 text-night"
                onClick={() => void share()}
                icon={<Link2 size={18} />}
              >
                Share
              </Button>
            </div>
            <Comments ideaId={idea.id} />
          </motion.article>
        )}
      </div>
    </Modal>
  );
}
