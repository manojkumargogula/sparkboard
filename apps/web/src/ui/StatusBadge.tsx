import { clsx } from "clsx";

import type { IdeaStatus } from "@/lib/types";

const STYLE: Record<IdeaStatus, string> = {
  open: "bg-current/10",
  planned: "bg-[#ffd166] text-night",
  building: "bg-cobalt text-white",
  shipped: "bg-[#2fd28b] text-night",
};

export function StatusBadge({
  status,
  showOpen = false,
}: {
  status: IdeaStatus;
  showOpen?: boolean;
}) {
  if (status === "open" && !showOpen) return null;
  return (
    <span
      className={clsx(
        "inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 font-mono text-[11px] font-medium tracking-wide uppercase",
        STYLE[status],
      )}
    >
      {status}
    </span>
  );
}
