import { type ReactNode, useMemo, useState } from "react";

import { useProfile } from "../profile/useProfile";

import { Modal } from "@/ui/Modal";

import { Composer } from "./Composer";
import { ComposerContext } from "./useComposer";

/** One composer for the whole app, opened from the nav, hero, palette or `N`. */
export function ComposerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { authRequired, ensureProfile } = useProfile();
  const value = useMemo(
    () => ({
      openComposer: () => {
        // When posting needs an account, sign in first so dialogs never stack.
        if (!authRequired) {
          setOpen(true);
          return;
        }
        void ensureProfile("Sign in to post your idea.").then((ok) => {
          if (ok) setOpen(true);
        });
      },
    }),
    [authRequired, ensureProfile],
  );
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
