/** Server-state hooks. Every cache key lives in `keys` so invalidation stays exact. */

import {
  type InfiniteData,
  type QueryClient,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "./api";
import type { Comment, FeedParams, Idea, IdeaDraft } from "./types";

const PAGE_SIZE = 20;

const keys = {
  feed: (p: FeedParams) => ["ideas", "feed", p] as const,
  feeds: ["ideas", "feed"] as const,
  idea: (id: number) => ["ideas", "one", id] as const,
  comments: (id: number) => ["ideas", "comments", id] as const,
  tags: ["tags"] as const,
  stats: ["stats"] as const,
  similar: (q: string) => ["similar", q] as const,
  ai: ["ai-status"] as const,
};

export function useFeed(params: FeedParams) {
  return useInfiniteQuery({
    queryKey: keys.feed(params),
    queryFn: ({ pageParam }) => api.ideas({ ...params, offset: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useIdea(id: number | null, initial?: Idea) {
  return useQuery({
    queryKey: keys.idea(id ?? -1),
    queryFn: () => api.idea(id ?? -1),
    enabled: id !== null,
    ...(initial ? { initialData: initial } : {}),
  });
}

export const useComments = (id: number | null) =>
  useQuery({
    queryKey: keys.comments(id ?? -1),
    queryFn: () => api.comments(id ?? -1),
    enabled: id !== null,
  });

export const useTags = () =>
  useQuery({ queryKey: keys.tags, queryFn: api.tags, staleTime: 60_000 });

/** Polled so the "new ideas" pill can appear without a websocket. */
export const useStats = () =>
  useQuery({ queryKey: keys.stats, queryFn: api.stats, refetchInterval: 20_000 });

export const useAiStatus = () =>
  useQuery({ queryKey: keys.ai, queryFn: api.aiStatus, staleTime: Infinity, retry: false });

export const useSimilar = (q: string) =>
  useQuery({
    queryKey: keys.similar(q),
    queryFn: () => api.similar(q),
    enabled: q.length >= 12,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: IdeaDraft) => api.createIdea(draft),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.feeds }),
        qc.invalidateQueries({ queryKey: keys.stats }),
        qc.invalidateQueries({ queryKey: keys.tags }),
      ]);
    },
  });
}

type FeedCache = InfiniteData<Idea[], number>;

function patchIdea(qc: QueryClient, id: number, patch: (idea: Idea) => Idea): void {
  qc.setQueriesData<FeedCache>({ queryKey: keys.feeds }, (data) =>
    data
      ? { ...data, pages: data.pages.map((page) => page.map((i) => (i.id === id ? patch(i) : i))) }
      : data,
  );
  qc.setQueryData<Idea>(keys.idea(id), (idea) => (idea ? patch(idea) : idea));
}

/** Optimistic vote: the count moves instantly and rolls back on failure. */
export function useVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, up }: { id: number; up: boolean }) => api.vote(id, up),
    onMutate: async ({ id, up }) => {
      await qc.cancelQueries({ queryKey: ["ideas"] });
      const feeds = qc.getQueriesData<FeedCache>({ queryKey: keys.feeds });
      const single = qc.getQueryData<Idea>(keys.idea(id));
      patchIdea(qc, id, (i) =>
        i.voted === up ? i : { ...i, voted: up, vote_count: i.vote_count + (up ? 1 : -1) },
      );
      return { feeds, single };
    },
    onError: (_err, { id }, ctx) => {
      ctx?.feeds.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.single) qc.setQueryData(keys.idea(id), ctx.single);
    },
    onSuccess: (result) => {
      patchIdea(qc, result.idea_id, (i) => ({
        ...i,
        voted: result.voted,
        vote_count: result.vote_count,
      }));
    },
  });
}

export function useAddComment(ideaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.addComment(ideaId, content),
    onSuccess: (comment) => {
      qc.setQueryData<Comment[]>(keys.comments(ideaId), (list) => [...(list ?? []), comment]);
      patchIdea(qc, ideaId, (i) => ({ ...i, comment_count: i.comment_count + 1 }));
    },
  });
}
