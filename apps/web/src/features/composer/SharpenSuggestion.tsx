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
      <div className="mt-4 rounded-[8px] bg-cobalt p-5 text-white">
        <p className="label inline-flex items-center gap-2 text-white/80">
          <Sparkles size={14} /> Suggested rewrite
        </p>
        <h3 className="mt-2 text-2xl tracking-tight">{suggestion.title}</h3>
        <p className="mt-1 text-lg text-white/90">{suggestion.content}</p>
        {suggestion.tags.length > 0 && (
          <p className="mt-2 font-mono text-sm text-white/70">
            {suggestion.tags.map((t) => `#${t}`).join("  ")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="snow" onClick={onAccept} icon={<Check size={18} />}>
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
