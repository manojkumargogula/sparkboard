import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { makeIdea, mockFetch, renderApp } from "@/test/utils";

import { FeedPage } from "./FeedPage";

const routes = [
  { path: "/", element: <FeedPage /> },
  { path: "/i/:id", element: <FeedPage /> },
];

describe("FeedPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows ideas, stats and tags", async () => {
    mockFetch({
      "GET /api/ideas": [makeIdea(), makeIdea({ id: 2, title: "CSV export", vote_count: 9 })],
      "GET /api/stats": { ideas: 2, votes: 12, comments: 1, shipped: 0, latest_idea_id: 2 },
      "GET /api/tags": [{ tag: "ui", count: 2 }],
      "GET /api/ai/status": { enabled: false, provider: "none" },
    });
    renderApp(routes);
    expect(await screen.findByRole("heading", { name: "CSV export" })).toBeInTheDocument();
    expect(await screen.findByText(/2 ideas · 12 votes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /#ui/ })).toBeInTheDocument();
  });

  it("shows a designed empty state", async () => {
    mockFetch({
      "GET /api/ideas": [],
      "GET /api/stats": { ideas: 0, votes: 0, comments: 0, shipped: 0, latest_idea_id: null },
      "GET /api/tags": [],
      "GET /api/ai/status": { enabled: false, provider: "none" },
    });
    renderApp(routes);
    expect(await screen.findByText("The board is waiting for its first spark")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Write the first idea" }));
    expect(screen.getByLabelText("Your idea")).toHaveFocus();
  });

  it("opens the idea sheet from the URL with comments", async () => {
    mockFetch({
      "GET /api/ideas": [makeIdea()],
      "GET /api/ideas/1": makeIdea(),
      "GET /api/ideas/1/comments": [
        {
          id: 1,
          idea_id: 1,
          content: "Love it",
          created_at: new Date().toISOString(),
          author: null,
        },
      ],
      "GET /api/stats": { ideas: 1, votes: 3, comments: 1, shipped: 0, latest_idea_id: 1 },
      "GET /api/tags": [],
      "GET /api/ai/status": { enabled: false, provider: "none" },
    });
    renderApp(routes, "/i/1");
    expect(await screen.findByText("Love it")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("shows the error state with a retry", async () => {
    mockFetch({
      "GET /api/ideas": new Response(JSON.stringify({ detail: "Database is waking up" }), {
        status: 503,
      }),
      "GET /api/stats": { ideas: 0, votes: 0, comments: 0, shipped: 0, latest_idea_id: null },
      "GET /api/tags": [],
      "GET /api/ai/status": { enabled: false, provider: "none" },
    });
    renderApp(routes);
    expect(await screen.findByText("Database is waking up")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
