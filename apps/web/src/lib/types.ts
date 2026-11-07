/** Wire types, mirroring apps/api/src/sparkboard_api/schemas.py. */

export type IdeaStatus = "open" | "planned" | "building" | "shipped";
export type SortOrder = "trending" | "new" | "top";

export interface Author {
  display_name: string;
  avatar_seed: string;
}

export interface Idea {
  id: number;
  content: string;
  created_at: string;
  title: string | null;
  tags: string[];
  status: IdeaStatus;
  vote_count: number;
  comment_count: number;
  author: Author | null;
  source?: string | null;
  source_rank?: number | null;
  source_score?: number | null;
  voted: boolean;
}

export interface IdeaDraft {
  content: string;
  title?: string;
  tags?: string[];
}

export interface Comment {
  id: number;
  idea_id: number;
  content: string;
  created_at: string;
  author: Author | null;
}

export interface VoteResult {
  idea_id: number;
  vote_count: number;
  voted: boolean;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface Stats {
  ideas: number;
  votes: number;
  comments: number;
  shipped: number;
  latest_idea_id: number | null;
}

export interface SimilarIdea {
  id: number;
  title: string | null;
  content: string;
  vote_count: number;
  score: number;
}

export interface Sharpened {
  title: string;
  content: string;
  tags: string[];
}

export interface FeedParams {
  sort: SortOrder;
  tag?: string | undefined;
  status?: IdeaStatus | undefined;
  q?: string | undefined;
}

export const STATUSES: readonly { id: IdeaStatus; label: string; hint: string }[] = [
  { id: "open", label: "Open", hint: "Gathering votes" },
  { id: "planned", label: "Planned", hint: "On the list" },
  { id: "building", label: "Building", hint: "Work in progress" },
  { id: "shipped", label: "Shipped", hint: "Live for everyone" },
];
