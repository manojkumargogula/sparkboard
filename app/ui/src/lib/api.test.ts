import { mockFetch } from "@/test/utils";

import { api, ApiError } from "./api";

describe("api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds feed queries and sends the device token", async () => {
    const calls = mockFetch({ "GET /api/ideas": [] });
    await api.ideas({ sort: "top", tag: "ui", q: undefined, offset: 20, limit: 20 });
    expect(calls[0]?.url).toBe("/api/ideas?sort=top&tag=ui&offset=20&limit=20");
    expect(calls[0]?.headers.get("X-Device-Token")).toBeTruthy();
  });

  it("posts JSON bodies", async () => {
    const calls = mockFetch({ "POST /api/ideas": { id: 1 } });
    await api.createIdea({ content: "Hello world" });
    expect(calls[0]?.body).toEqual({ content: "Hello world" });
    expect(calls[0]?.headers.get("Content-Type")).toBe("application/json");
  });

  it("uses PUT to vote and DELETE to unvote", async () => {
    const calls = mockFetch({ "PUT /api/ideas/4/vote": {}, "DELETE /api/ideas/4/vote": {} });
    await api.vote(4, true);
    await api.vote(4, false);
    expect(calls.map((c) => c.method)).toEqual(["PUT", "DELETE"]);
  });

  it("surfaces server error details", async () => {
    mockFetch({
      "POST /api/ideas": new Response(JSON.stringify({ detail: "Slow down" }), { status: 429 }),
      "GET /api/stats": new Response(JSON.stringify({ detail: [{ msg: "bad" }] }), { status: 422 }),
      "GET /api/tags": new Response("oops", { status: 500 }),
    });
    await expect(api.createIdea({ content: "x" })).rejects.toEqual(new ApiError(429, "Slow down"));
    await expect(api.stats()).rejects.toThrow("Check the highlighted fields");
    await expect(api.tags()).rejects.toThrow("Request failed (500)");
  });

  it("reports offline clearly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("network"))),
    );
    await expect(api.stats()).rejects.toThrow("You look offline");
  });
});
