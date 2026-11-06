import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { FeedParams, SortOrder } from "@/lib/types";

const SORTS: readonly SortOrder[] = ["trending", "new", "top"];

/** Feed filters live in the URL so every view is shareable and back-button friendly. */
export function useFeedParams(defaultSort: SortOrder = "trending") {
  const [search, setSearch] = useSearchParams();
  const params = useMemo<FeedParams>(() => {
    const sort = search.get("sort");
    return {
      sort: SORTS.includes(sort as SortOrder) ? (sort as SortOrder) : defaultSort,
      tag: search.get("tag") ?? undefined,
      q: search.get("q") ?? undefined,
    };
  }, [search, defaultSort]);

  const update = useCallback(
    (patch: Partial<FeedParams>) => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === "" || (key === "sort" && value === defaultSort)) {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearch, defaultSort],
  );
  return [params, update] as const;
}
