import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { plural } from "@/lib/format";

export function NewIdeasPill({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          type="button"
          onClick={onClick}
          initial={{ y: -40, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className="fixed top-24 left-1/2 z-30 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-iris px-5 font-semibold text-white shadow-xl"
        >
          <ArrowUp size={18} /> {plural(count, "new idea")}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
