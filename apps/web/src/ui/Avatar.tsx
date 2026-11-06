import { clsx } from "clsx";

import { seedHue } from "@/lib/format";
import type { Author } from "@/lib/types";

const SIZES = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-14 text-xl" } as const;

/** A generated gradient monogram. Deterministic per name + seed. */
export function Avatar({
  author,
  size = "md",
}: {
  author: Author | null;
  size?: keyof typeof SIZES;
}) {
  const name = author?.display_name ?? "Anonymous";
  const hue = seedHue(`${name}:${author?.avatar_seed ?? ""}`);
  const initials = author
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
    : "?";
  return (
    <span
      aria-hidden
      className={clsx(
        "grid shrink-0 place-items-center rounded-full font-display font-bold text-white",
        SIZES[size],
      )}
      style={{
        background: author
          ? `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 50) % 360} 75% 48%))`
          : "var(--sb-line)",
      }}
    >
      {initials}
    </span>
  );
}
