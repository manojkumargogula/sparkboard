import { Hash, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
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

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}

const PROMPTS = ["What if…", "Why can't I…", "I wish this could…", "It would be great if…"];

export function Composer({ onPosted }: { onPosted?: () => void }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [suggestion, setSuggestion] = useState<Sharpened | null>(null);
  const [sharpening, setSharpening] = useState(false);
  const [prompt] = useState(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)] ?? "What if…",
  );
  const textarea = useRef<HTMLTextAreaElement>(null);
  const create = useCreateIdea();
  const ai = useAiStatus();
  const { ensureProfile } = useProfile();

  const trimmed = content.trim();
  const canPost = trimmed.length >= 3 && trimmed.length <= MAX && !create.isPending;

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
          toast.success("Idea posted. Now get people to vote for it.");
          onPosted?.();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <form onSubmit={(e) => void post(e)} aria-label="Post an idea" className="flex flex-col">
      <p className="label text-cobalt">New idea</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Give it a headline"
        aria-label="Headline"
        className="mt-3 w-full bg-transparent pr-10 text-[2rem] leading-tight font-bold tracking-[-0.035em] text-night outline-none placeholder:text-night/30"
      />
      <label htmlFor="idea-content" className="sr-only">
        Your idea
      </label>
      <textarea
        id="idea-content"
        ref={textarea}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void post(e);
        }}
        rows={4}
        placeholder={prompt}
        className="mt-2 field-sizing-content max-h-72 min-h-28 w-full resize-none bg-transparent text-xl leading-snug text-night outline-none placeholder:text-night/35"
      />

      <SimilarHints text={`${title} ${content}`.trim()} />
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

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-night/10 pt-5">
        <label className="flex h-11 min-w-0 flex-1 basis-48 items-center gap-2 rounded-[6px] border border-night/12 bg-white px-3 text-night/50 focus-within:border-cobalt">
          <Hash size={16} aria-hidden />
          <span className="sr-only">Tags</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags, comma separated"
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-night outline-none"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <CharRing used={content.length} max={MAX} />
          {ai.data?.enabled && (
            <Button
              variant="outline"
              className="text-cobalt"
              disabled={trimmed.length < 8 || sharpening}
              onClick={() => void sharpen()}
              icon={
                <motion.span
                  animate={sharpening ? { rotate: 360 } : { rotate: 0 }}
                  transition={sharpening ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                  className="inline-flex"
                >
                  <Sparkles size={17} />
                </motion.span>
              }
            >
              {sharpening ? "Sharpening…" : "Sharpen"}
            </Button>
          )}
          <Button type="submit" variant="cobalt" disabled={!canPost}>
            {create.isPending ? "Posting…" : "Post idea"}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-night/45">Tip: press ⌘ Enter to post.</p>
    </form>
  );
}
