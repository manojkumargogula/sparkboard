import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** "center" for dialogs, "side" for the idea sheet (bottom sheet on phones). */
  placement?: "center" | "side";
}

const PANEL = {
  center: {
    className:
      "fixed top-1/2 left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-7",
    motion: {
      initial: { opacity: 0, scale: 0.94, y: 12 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: 8 },
    },
  },
  side: {
    className:
      "fixed z-50 inset-x-0 bottom-0 max-h-[92dvh] rounded-b-none sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[min(40rem,calc(100vw-1.5rem))] sm:rounded-b-[var(--radius-card)] flex flex-col",
    motion: {
      initial: { opacity: 0, y: 60 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 60 },
    },
  },
} as const;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  placement = "center",
}: Props) {
  const panel = PANEL[placement];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-[#0b0920]/45 backdrop-blur-[6px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              onOpenAutoFocus={(e) => {
                // Focus the panel itself, so screen readers start at the top
                // and no control shows a focus ring the user didn't ask for.
                e.preventDefault();
                (e.currentTarget as HTMLElement).focus();
              }}
            >
              <motion.div
                tabIndex={-1}
                className={`card outline-none ${panel.className}`}
                {...panel.motion}
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="sr-only">{description}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
                {children}
                <Dialog.Close
                  aria-label="Close"
                  className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-iris-soft hover:text-ink"
                >
                  <X size={20} />
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
