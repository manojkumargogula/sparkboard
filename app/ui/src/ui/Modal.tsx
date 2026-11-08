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
  width?: string;
}

const MOTION = {
  center: {
    initial: { opacity: 0, scale: 0.96, y: 16 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, y: 8 },
  },
  side: {
    initial: { opacity: 0, x: 48 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 48 },
  },
} as const;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  placement = "center",
  width = "36rem",
}: Props) {
  const panel =
    placement === "center"
      ? "fixed top-[8vh] left-1/2 max-h-[84dvh] -translate-x-1/2 overflow-y-auto rounded-[10px] p-7 sm:p-9"
      : "fixed inset-x-0 bottom-0 flex max-h-[94dvh] flex-col rounded-t-[14px] sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:rounded-none";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              onOpenAutoFocus={(e) => {
                // Focus the panel itself: screen readers start at the top and no
                // control shows a focus ring the user didn't ask for.
                e.preventDefault();
                (e.currentTarget as HTMLElement).focus();
              }}
            >
              <motion.div
                tabIndex={-1}
                className={`z-50 bg-paper-2 text-night shadow-2xl outline-none ${panel}`}
                style={{
                  width: `min(${width}, ${placement === "center" ? "calc(100vw - 2rem)" : "100vw"})`,
                }}
                {...MOTION[placement]}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
                {children}
                <Dialog.Close
                  aria-label="Close"
                  className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full text-night/60 transition-colors hover:bg-night/8 hover:text-night"
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
