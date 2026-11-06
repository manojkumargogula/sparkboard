import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";

import { ComposerProvider } from "@/features/composer/ComposerProvider";

import { ProfileProvider } from "@/features/profile/ProfileProvider";
import type { Idea } from "@/lib/types";

export function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: 1,
    content: "Add dark mode",
    created_at: new Date().toISOString(),
    title: "Dark mode",
    tags: ["ui"],
    status: "open",
    vote_count: 3,
    comment_count: 1,
    author: { display_name: "Ada Lovelace", avatar_seed: "abc" },
    voted: false,
    ...overrides,
  };
}

interface Route {
  path: string;
  element: ReactElement;
  children?: Route[];
}

/** Render inside the same providers the app uses, with a fresh cache per test. */
export function renderApp(routes: Route[], initialPath = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        element: (
          <ComposerProvider>
            <Outlet />
          </ComposerProvider>
        ),
        children: routes,
      },
    ],
    { initialEntries: [initialPath] },
  );
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <ProfileProvider>
          <RouterProvider router={router} />
        </ProfileProvider>
      </QueryClientProvider>,
    ),
  };
}

/** A fetch stub that answers by "METHOD path" and records calls. */
export function mockFetch(routes: Record<string, unknown>) {
  const calls: { method: string; url: string; body: unknown; headers: Headers }[] = [];
  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    const method = init?.method ?? "GET";
    const path = url.split("?")[0] ?? url;
    calls.push({
      method,
      url,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      headers: new Headers(init?.headers),
    });
    const key = Object.keys(routes).find(
      (k) => k === `${method} ${path}` || k === `${method} ${url}`,
    );
    if (!key)
      return Promise.resolve(
        new Response(JSON.stringify({ detail: "not mocked" }), { status: 404 }),
      );
    const value = routes[key];
    if (value instanceof Response) return Promise.resolve(value);
    return Promise.resolve(new Response(JSON.stringify(value), { status: 200 }));
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}
