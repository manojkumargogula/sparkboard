import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { saveProfile } from "@/lib/device";
import { mockFetch, renderApp } from "@/test/utils";

import { Comments } from "./Comments";

describe("Comments", () => {
  beforeEach(() => {
    localStorage.clear();
    saveProfile({ display_name: "Ada", avatar_seed: "a" });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("adds a comment with Enter and shows it", async () => {
    const calls = mockFetch({
      "GET /api/ideas/5/comments": [],
      "POST /api/ideas/5/comments": {
        id: 1,
        idea_id: 5,
        content: "Ship it",
        created_at: new Date().toISOString(),
        author: { display_name: "Ada", avatar_seed: "a" },
      },
    });
    renderApp([{ path: "/", element: <Comments ideaId={5} /> }]);
    expect(await screen.findByText("No comments yet. Start the conversation.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Add a comment"), "Ship it{Enter}");
    expect(await screen.findByText("Ship it")).toBeInTheDocument();
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.body).toEqual({ content: "Ship it" }),
    );
    expect(screen.getByLabelText("Add a comment")).toHaveValue("");
  });
});
