import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { saveProfile } from "@/lib/device";
import { makeIdea, mockFetch, renderApp } from "@/test/utils";

import { LandingPage } from "./LandingPage";

const routes = [
  { path: "/", element: <LandingPage /> },
  { path: "/i/:id", element: <LandingPage /> },
];

const STATS = { ideas: 2, votes: 12, comments: 3, shipped: 1, latest_idea_id: 2 };

function board(
  ideas = [makeIdea(), makeIdea({ id: 2, title: "CSV export", vote_count: 9, tags: ["data"] })],
) {
  return mockFetch({
    "GET /api/ideas": ideas,
    "GET /api/stats": STATS,
    "GET /api/tags": [{ tag: "ui", count: 2 }],
    "GET /api/ai/status": { enabled: false, provider: "none" },
  });
}

describe("LandingPage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("renders hero, live stats, top 10 and the all-ideas table", async () => {
    board();
    renderApp(routes);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /what should\s*we build\s*next\?/i,
    );
    expect(await screen.findByText("votes cast", { exact: false })).toBeInTheDocument();
    const top = screen.getByRole("region", { name: /top 10 ideas/i });
    expect(await within(top).findByText("CSV export")).toBeInTheDocument();
    const all = screen.getByRole("region", { name: /all ideas/i });
    expect(await within(all).findByText("Dark mode")).toBeInTheDocument();
    expect(within(all).getByRole("checkbox", { name: /^ui/i })).toBeInTheDocument();
  });

  it("filters by topic and sorts through the URL-backed controls", async () => {
    const calls = board();
    renderApp(routes);
    const all = screen.getByRole("region", { name: /all ideas/i });
    await userEvent.click(await within(all).findByRole("checkbox", { name: /^ui/i }));
    await userEvent.click(within(all).getByRole("button", { name: "Newest" }));
    await waitFor(() =>
      expect(calls.some((c) => c.url.includes("tag=ui") && c.url.includes("sort=new"))).toBe(true),
    );
  });

  it("shows an inviting empty state", async () => {
    board([]);
    renderApp(routes);
    expect(await screen.findByText("Be the first spark")).toBeInTheDocument();
  });

  it("opens the composer from the hero and posts", async () => {
    saveProfile({ display_name: "Ada", avatar_seed: "a" });
    const calls = mockFetch({
      "GET /api/ideas": [],
      "GET /api/stats": STATS,
      "GET /api/tags": [],
      "GET /api/ai/status": { enabled: false, provider: "none" },
      "POST /api/ideas": { id: 3 },
    });
    renderApp(routes);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Post an idea" })[0]!);
    await user.type(await screen.findByLabelText("Your idea"), "Offline mode");
    await user.click(screen.getByRole("button", { name: "Post idea" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({
        content: "Offline mode",
      }),
    );
  });

  it("opens the idea sheet from the URL with comments", async () => {
    mockFetch({
      "GET /api/ideas": [makeIdea()],
      "GET /api/ideas/1": makeIdea({ status: "planned" }),
      "GET /api/ideas/1/comments": [
        {
          id: 1,
          idea_id: 1,
          content: "Love it",
          created_at: new Date().toISOString(),
          author: null,
        },
      ],
      "GET /api/stats": STATS,
      "GET /api/tags": [],
      "GET /api/ai/status": { enabled: false, provider: "none" },
    });
    renderApp(routes, "/i/1");
    expect(await screen.findByText("Love it")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getAllByText("planned").length).toBeGreaterThan(0);
  });

  it("asks for a name before the first vote, then votes", async () => {
    mockFetch({
      "GET /api/ideas": [makeIdea()],
      "GET /api/stats": STATS,
      "GET /api/tags": [],
      "GET /api/ai/status": { enabled: false, provider: "none" },
      "PUT /api/me": { display_name: "Grace", avatar_seed: "s" },
      "PUT /api/ideas/1/vote": { idea_id: 1, vote_count: 4, voted: true },
    });
    renderApp(routes);
    const user = userEvent.setup();
    const all = screen.getByRole("region", { name: /all ideas/i });
    await user.click(await within(all).findByRole("button", { name: /vote for this idea/i }));
    await user.type(await screen.findByLabelText("Display name"), "Grace");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(
      await within(all).findByRole("button", { name: /remove your vote/i }),
    ).toBeInTheDocument();
  });

  it("shows the error state with a retry", async () => {
    mockFetch({
      "GET /api/ideas": new Response(JSON.stringify({ detail: "Database is waking up" }), {
        status: 503,
      }),
      "GET /api/stats": STATS,
      "GET /api/tags": [],
      "GET /api/ai/status": { enabled: false, provider: "none" },
    });
    renderApp(routes);
    expect(await screen.findByText("Database is waking up")).toBeInTheDocument();
  });
});
