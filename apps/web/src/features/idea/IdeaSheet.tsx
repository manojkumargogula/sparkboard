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

/** Idea detail as a side sheet (bottom sheet on phones). The URL `/i/:id` is shareable. */
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
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-6 sm:p-9">
        <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-line sm:hidden" />
        {isError && (
          <p className="py-20 text-center text-xl text-muted">This idea no longer exists.</p>
        )}
        {!idea && !isError && (
          <div aria-hidden>
            <div className="skeleton h-9 w-40" />
            <div className="skeleton mt-8 h-10 w-full" />
            <div className="skeleton mt-3 h-10 w-2/3" />
          </div>
        )}
        {idea && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 pr-10">
              <Avatar author={idea.author} />
              <div className="leading-tight">
                <p className="font-semibold">{idea.author?.display_name ?? "Anonymous"}</p>
                <p className="font-mono text-xs text-muted">{timeAgo(idea.created_at)}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={idea.status} />
              </div>
            </div>
            {idea.title && (
              <h2 className="mt-8 text-title font-extrabold text-balance">{idea.title}</h2>
            )}
            <p
              className={
                idea.title ? "mt-4 text-xl text-pretty" : "mt-8 text-title font-bold text-pretty"
              }
            >
              {idea.content}
            </p>
            {idea.tags.length > 0 && (
              <p className="mt-4 font-mono text-sm text-muted">
                {idea.tags.map((t) => `#${t}`).join("  ")}
              </p>
            )}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <VoteButton idea={idea} size="lg" />
              <Button
                variant="soft"
                size="lg"
                onClick={() => void share()}
                icon={<Link2 size={20} />}
              >
                Share
              </Button>
            </div>
            <Comments ideaId={idea.id} />
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
