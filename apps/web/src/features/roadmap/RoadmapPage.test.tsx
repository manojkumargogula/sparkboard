import { screen } from "@testing-library/react";

import { makeIdea, mockFetch, renderApp } from "@/test/utils";

import { RoadmapPage } from "./RoadmapPage";

describe("RoadmapPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the four status columns", async () => {
    mockFetch({ "GET /api/ideas": [makeIdea({ status: "planned", title: "Planned thing" })] });
    renderApp([{ path: "/roadmap", element: <RoadmapPage /> }], "/roadmap");
    for (const label of ["Open", "Planned", "Building", "Shipped"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
    expect((await screen.findAllByText("Planned thing")).length).toBeGreaterThan(0);
  });
});
