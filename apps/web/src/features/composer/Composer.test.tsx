import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { saveProfile } from "@/lib/device";
import { mockFetch, renderApp } from "@/test/utils";

import { Composer } from "./Composer";

describe("Composer", () => {
  beforeEach(() => {
    localStorage.clear();
    saveProfile({ display_name: "Ada", avatar_seed: "a" });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts content, headline and parsed tags, then clears", async () => {
    const onPosted = vi.fn();
    const calls = mockFetch({
      "GET /api/ai/status": { enabled: false, provider: "none" },
      "POST /api/ideas": { id: 9 },
    });
    renderApp([{ path: "/", element: <Composer onPosted={onPosted} /> }]);
    const user = userEvent.setup();

    const post = screen.getByRole("button", { name: "Post idea" });
    expect(post).toBeDisabled();
    await user.type(screen.getByLabelText("Your idea"), "Weekly digest email");
    await user.type(screen.getByLabelText("Headline"), "Digest");
    await user.type(screen.getByPlaceholderText(/tags/), "#Email, growth");
    await user.click(post);

    await waitFor(() => expect(onPosted).toHaveBeenCalled());
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      content: "Weekly digest email",
      title: "Digest",
      tags: ["email", "growth"],
    });
    expect(screen.getByLabelText("Your idea")).toHaveValue("");
  });

  it("offers an AI rewrite when enabled and applies it", async () => {
    mockFetch({
      "GET /api/ai/status": { enabled: true, provider: "anthropic" },
      "POST /api/ai/sharpen": {
        title: "Weekly digest",
        content: "Send a Monday digest.",
        tags: ["email"],
      },
    });
    renderApp([{ path: "/", element: <Composer /> }]);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Your idea"), "an email every week maybe");
    await user.click(await screen.findByRole("button", { name: /sharpen/i }));
    await user.click(await screen.findByRole("button", { name: "Use this" }));
    expect(screen.getByLabelText("Your idea")).toHaveValue("Send a Monday digest.");
    expect(screen.getByLabelText("Headline")).toHaveValue("Weekly digest");
  });
});
