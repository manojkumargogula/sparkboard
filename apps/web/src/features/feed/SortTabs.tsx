import { Clock, Flame, Trophy } from "lucide-react";

import type { SortOrder } from "@/lib/types";
import { Chip } from "@/ui/Chip";

const SORTS = [
  { id: "trending", label: "Hot", icon: Flame },
  { id: "new", label: "New", icon: Clock },
  { id: "top", label: "Top", icon: Trophy },
] as const satisfies readonly { id: SortOrder; label: string; icon: unknown }[];

export function SortTabs({
  value,
  onChange,
}: {
  value: SortOrder;
  onChange: (s: SortOrder) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Sort ideas"
      className="flex rounded-full bg-surface p-1 shadow-sm ring-1 ring-line"
    >
      {SORTS.map(({ id, label, icon: Icon }) => (
        <Chip key={id} active={value === id} onClick={() => onChange(id)} layoutGroup="sort">
          <span className="inline-flex items-center gap-1.5">
            <Icon size={16} />
            {label}
          </span>
        </Chip>
      ))}
    </div>
  );
}
