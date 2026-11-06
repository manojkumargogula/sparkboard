import { clsx } from "clsx";

import type { IdeaStatus } from "@/lib/types";

const STYLE: Record<IdeaStatus, string> = {
  open: "bg-iris-soft text-iris",
  planned: "bg-amber/20 text-[#9a5b00] dark:text-amber",
  building: "bg-ember/15 text-[#c23a1a] dark:text-ember",
  shipped: "bg-mint/15 text-[#0a7a5e] dark:text-[#3ddbb0]",
};

export function StatusBadge({ status }: { status: IdeaStatus }) {
  if (status === "open") return null;
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] font-semibold tracking-wide uppercase",
        STYLE[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
