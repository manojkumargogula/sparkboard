import { clsx } from "clsx";
import { Hash, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAiStatus, useCreateIdea } from "@/lib/queries";
import type { Sharpened } from "@/lib/types";
import { Button } from "@/ui/Button";

import { useProfile } from "../profile/useProfile";
import { CharRing } from "./CharRing";
import { SharpenSuggestion } from "./SharpenSuggestion";
import { SimilarHints } from "./SimilarHints";

const MAX = 1000;

export interface ComposerHandle {
  focus: () => void;
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}

export const Composer = forwardRef<ComposerHandle, { onPosted?: () => void }>(function Composer(
  { onPosted },
  ref,
) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestion, setSuggestion] = useState<Sharpened | null>(null);
  const [sharpening, setSharpening] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const create = useCreateIdea();
  const ai = useAiStatus();
  const { ensureProfile } = useProfile();

  useImperativeHandle(ref, () => ({ focus: () => textarea.current?.focus() }), []);

  const trimmed = content.trim();
  const canPost = trimmed.length >= 3 && trimmed.length <= MAX && !create.isPending;
  const expanded = focused || content.length > 0;

  async function sharpen() {
    setSharpening(true);
    try {
      setSuggestion(await api.sharpen(trimmed));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sharpen is unavailable right now");
    } finally {
      setSharpening(false);
    }
  }

  async function post(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!canPost) return;
    // Posting anonymously is allowed; a name is offered but never forced.
    await ensureProfile("Add a name to your idea, or close this to post anonymously.");
    create.mutate(
      { content: trimmed, ...(title.trim() ? { title: title.trim() } : {}), tags: parseTags(tags) },
      {
        onSuccess: () => {
          setContent("");
          setTitle("");
          setTags("");
          setSuggestion(null);
          toast.success("Idea posted. Now get people to fan it.");
          onPosted?.();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <motion.form
      layout
      onSubmit={(e) => void post(e)}
      className={clsx(
        "card relative p-5 transition-shadow duration-300 sm:p-7",
        expanded && "shadow-[0_24px_60px_-24px_rgb(75_63_216/0.45)]",
      )}
      aria-label="Post an idea"
    >
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.input
            key="title"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Headline (optional)"
            aria-label="Headline"
            className="mb-2 w-full bg-transparent font-display text-2xl font-bold outline-none placeholder:text-muted/60"
          />
        )}
      </AnimatePresence>
      <label htmlFor="idea-content" className="sr-only">
        Your idea
      </label>
      <textarea
        id="idea-content"
        ref={textarea}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void post(e);
        }}
        rows={expanded ? 3 : 1}
        placeholder="I wish this could…"
        className="field-sizing-content max-h-80 min-h-12 w-full resize-none bg-transparent text-idea outline-none placeholder:text-muted/70"
      />

      <SimilarHints text={content} />
      <AnimatePresence>
        {suggestion && (
          <SharpenSuggestion
            suggestion={suggestion}
            onAccept={() => {
              setTitle(suggestion.title);
              setContent(suggestion.content);
              setTags(suggestion.tags.join(", "));
              setSuggestion(null);
            }}
            onDismiss={() => setSuggestion(null)}
          />
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <label className="flex h-11 min-w-0 flex-1 basis-48 items-center gap-2 rounded-full bg-raised px-4 text-muted focus-within:ring-2 focus-within:ring-iris">
          <Hash size={16} aria-hidden />
          <span className="sr-only">Tags</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags, comma separated"
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink outline-none"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <CharRing used={content.length} max={MAX} />
          {ai.data?.enabled && (
            <Button
              variant="soft"
              disabled={trimmed.length < 8 || sharpening}
              onClick={() => void sharpen()}
              icon={
                <motion.span
                  animate={sharpening ? { rotate: 360 } : { rotate: 0 }}
                  transition={sharpening ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                  className="inline-flex"
                >
                  <Sparkles size={18} />
                </motion.span>
              }
            >
              {sharpening ? "Sharpening…" : "Sharpen"}
            </Button>
          )}
          <Button type="submit" variant="ember" disabled={!canPost}>
            {create.isPending ? "Posting…" : "Post idea"}
          </Button>
        </div>
      </div>
    </motion.form>
  );
});
