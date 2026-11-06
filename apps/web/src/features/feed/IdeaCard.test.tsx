import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { saveProfile } from "@/lib/device";
import { makeIdea, mockFetch, renderApp } from "@/test/utils";

import { IdeaCard } from "./IdeaCard";

describe("IdeaCard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("renders the idea with author, tags and status", () => {
    renderApp([
      {
        path: "/",
        element: <IdeaCard idea={makeIdea({ status: "shipped" })} maxVotes={10} href="/i/1" />,
      },
    ]);
    expect(screen.getByRole("heading", { name: "Dark mode" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("#ui")).toBeInTheDocument();
    expect(screen.getByText("shipped")).toBeInTheDocument();
  });

  it("asks for a name before the first vote, then votes", async () => {
    const calls = mockFetch({
      "PUT /api/me": { display_name: "Grace", avatar_seed: "s" },
      "PUT /api/ideas/1/vote": { idea_id: 1, vote_count: 4, voted: true },
    });
    renderApp([{ path: "/", element: <IdeaCard idea={makeIdea()} maxVotes={10} href="/i/1" /> }]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /vote for this idea/i }));
    await user.type(await screen.findByLabelText("Display name"), "Grace");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() =>
      expect(calls.map((c) => `${c.method} ${c.url}`)).toContain("PUT /api/ideas/1/vote"),
    );
    expect(calls.find((c) => c.url === "/api/me")?.body).toMatchObject({ display_name: "Grace" });
  });

  it("removes a vote when already voted", async () => {
    saveProfile({ display_name: "Ada", avatar_seed: "a" });
    const calls = mockFetch({
      "DELETE /api/ideas/1/vote": { idea_id: 1, vote_count: 2, voted: false },
    });
    renderApp([
      {
        path: "/",
        element: <IdeaCard idea={makeIdea({ voted: true })} maxVotes={10} href="/i/1" />,
      },
    ]);
    await userEvent.click(screen.getByRole("button", { name: /remove your vote/i }));
    await waitFor(() => expect(calls[0]?.method).toBe("DELETE"));
  });
});
