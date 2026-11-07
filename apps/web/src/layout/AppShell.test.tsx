import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { makeIdea, mockFetch, renderApp } from "@/test/utils";

import { AppShell } from "./AppShell";
import { NotFound } from "./NotFound";

function setup(path = "/") {
  mockFetch({
    "GET /api/ideas": [makeIdea({ title: "Dark mode" })],
    "PUT /api/me": { display_name: "Grace", avatar_seed: "s" },
    "GET /api/ai/status": { enabled: false, provider: "none" },
  });
  return renderApp(
    [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { path: "/", element: <p>Board page</p> },
          { path: "/roadmap", element: <p>Roadmap page</p> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
    path,
  );
}

describe("AppShell", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("navigates to the roadmap", async () => {
    setup();
    expect(screen.getByText("Board page")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("link", { name: "Roadmap" })[0]!);
    expect(await screen.findByText("Roadmap page")).toBeInTheDocument();
  });

  it("opens the command palette with ⌘K and searches ideas", async () => {
    setup();
    const user = userEvent.setup();
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByPlaceholderText(/search ideas or type a command/i), "dark");
    expect(await screen.findByText("Dark mode")).toBeInTheDocument();
    await user.click(screen.getByText("Open the roadmap"));
    expect(await screen.findByText("Roadmap page")).toBeInTheDocument();
  });

  it("opens the composer with N", async () => {
    setup();
    await userEvent.keyboard("n");
    expect(await screen.findByLabelText("Your idea")).toBeInTheDocument();
  });

  it("opens and closes the mobile menu", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close menu" }));
  });

  it("lets the visitor choose a name from the header", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.type(await screen.findByLabelText("Display name"), "Grace");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /signed in as grace/i })).toBeInTheDocument(),
    );
  });

  it("shows a helpful 404", () => {
    setup("/nope");
    expect(screen.getByText(/the thread/i)).toBeInTheDocument();
  });
});
