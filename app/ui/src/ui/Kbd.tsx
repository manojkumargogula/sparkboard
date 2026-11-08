import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-[4px] border border-current/25 px-1.5 font-mono text-[11px] opacity-80">
      {children}
    </kbd>
  );
}
