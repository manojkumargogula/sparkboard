/** Typed HTTP client for the Sparkboard API. */

import { deviceToken, type Profile } from "./device";
import type {
  Comment,
  FeedParams,
  Idea,
  IdeaDraft,
  SimilarIdea,
  Sharpened,
  Stats,
  TagCount,
  VoteResult,
} from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Device-Token", deviceToken());
  if (init.body) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "You look offline. Check your connection and try again.");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = "Check the highlighted fields and try again.";
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const api = {
  ideas: (p: FeedParams & { offset?: number; limit?: number }) =>
    request<Idea[]>(
      `/api/ideas${query({ sort: p.sort, tag: p.tag, status: p.status, q: p.q, offset: p.offset, limit: p.limit })}`,
    ),
  idea: (id: number) => request<Idea>(`/api/ideas/${id}`),
  createIdea: (draft: IdeaDraft) =>
    request<Idea>("/api/ideas", { method: "POST", body: JSON.stringify(draft) }),
  vote: (id: number, up: boolean) =>
    request<VoteResult>(`/api/ideas/${id}/vote`, { method: up ? "PUT" : "DELETE" }),
  comments: (id: number) => request<Comment[]>(`/api/ideas/${id}/comments`),
  addComment: (id: number, content: string) =>
    request<Comment>(`/api/ideas/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  tags: () => request<TagCount[]>("/api/tags"),
  stats: () => request<Stats>("/api/stats"),
  similar: (q: string) => request<SimilarIdea[]>(`/api/similar${query({ q })}`),
  me: () => request<Profile>("/api/me"),
  saveMe: (profile: Profile) =>
    request<Profile>("/api/me", { method: "PUT", body: JSON.stringify(profile) }),
  authConfig: () =>
    request<{ google_client_id: string | null; auth_required: boolean }>("/api/auth/config"),
  googleSignIn: (credential: string) =>
    request<Profile>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  logout: () => request<undefined>("/api/auth/logout", { method: "POST" }),
  aiStatus: () => request<{ enabled: boolean; provider: string }>("/api/ai/status"),
  sharpen: (content: string) =>
    request<Sharpened>("/api/ai/sharpen", { method: "POST", body: JSON.stringify({ content }) }),
};
