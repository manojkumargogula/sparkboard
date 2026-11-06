import { type ReactNode, useMemo, useState } from "react";

import { Modal } from "@/ui/Modal";

import { Composer } from "./Composer";
import { ComposerContext } from "./useComposer";

/** One composer for the whole app, opened from the nav, hero, palette or `N`. */
export function ComposerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openComposer: () => setOpen(true) }), []);
  return (
    <ComposerContext.Provider value={value}>
      {children}
      <Modal open={open} onOpenChange={setOpen} title="Post an idea" width="42rem">
        <Composer
          onPosted={() => {
            setOpen(false);
            document.getElementById("all-ideas")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </Modal>
    </ComposerContext.Provider>
  );
}
