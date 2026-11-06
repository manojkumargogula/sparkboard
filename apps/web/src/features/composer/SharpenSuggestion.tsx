import { Check, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";

import type { Sharpened } from "@/lib/types";
import { Button } from "@/ui/Button";

export function SharpenSuggestion({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: Sharpened;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-4 rounded-3xl border border-dashed border-iris/50 bg-iris-soft/60 p-5">
        <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-wide text-iris uppercase">
          <Sparkles size={14} /> Suggested rewrite
        </p>
        <h3 className="mt-2 text-xl font-bold">{suggestion.title}</h3>
        <p className="mt-1 text-lg">{suggestion.content}</p>
        {suggestion.tags.length > 0 && (
          <p className="mt-2 font-mono text-sm text-muted">
            {suggestion.tags.map((t) => `#${t}`).join("  ")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={onAccept} icon={<Check size={18} />}>
            Use this
          </Button>
          <Button variant="ghost" onClick={onDismiss} icon={<X size={18} />}>
            Keep mine
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
