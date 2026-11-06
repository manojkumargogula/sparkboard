import { SendHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { timeAgo } from "@/lib/format";
import { useAddComment, useComments } from "@/lib/queries";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";

import { useProfile } from "../profile/useProfile";

export function Comments({ ideaId }: { ideaId: number }) {
  const { data: comments = [], isPending } = useComments(ideaId);
  const add = useAddComment(ideaId);
  const { ensureProfile } = useProfile();
  const [text, setText] = useState("");

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    await ensureProfile("Add a name to your comment, or close this to comment anonymously.");
    add.mutate(content, {
      onSuccess: () => setText(""),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <section aria-label="Comments" className="mt-10 border-t border-line pt-8">
      <h3 className="text-2xl font-bold">
        Discussion{" "}
        <span className="font-mono text-base font-normal text-muted">{comments.length}</span>
      </h3>
      <form onSubmit={(e) => void submit(e)} className="mt-4 flex items-end gap-2">
        <label htmlFor="comment" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="comment"
          value={text}
          maxLength={600}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) void submit(e);
          }}
          placeholder="Add to the idea, or ask a question"
          className="field-sizing-content max-h-48 min-h-14 flex-1 resize-none rounded-2xl border border-line bg-raised px-5 py-3.5 text-lg outline-none focus:border-iris"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Post comment"
          disabled={!text.trim() || add.isPending}
          className="size-14"
          icon={<SendHorizontal size={20} />}
        />
      </form>

      {isPending && <div className="skeleton mt-6 h-16" />}
      {!isPending && comments.length === 0 && (
        <p className="mt-6 text-lg text-muted">No comments yet. Start the conversation.</p>
      )}
      <ol className="mt-6 flex flex-col gap-5">
        <AnimatePresence initial={false}>
          {comments.map((c) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3"
            >
              <Avatar author={c.author} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{c.author?.display_name ?? "Anonymous"}</span>{" "}
                  <span className="font-mono text-xs text-muted">{timeAgo(c.created_at)}</span>
                </p>
                <p className="mt-0.5 text-lg break-words whitespace-pre-line">{c.content}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
