import { compact, heat, plural, seedHue, timeAgo } from "./format";

describe("format", () => {
  it("formats relative time", () => {
    const now = Date.parse("2026-11-06T12:00:00Z");
    expect(timeAgo("2026-11-06T11:59:50Z", now)).toBe("just now");
    expect(timeAgo("2026-11-06T09:00:00Z", now)).toBe("3 hr. ago");
    expect(timeAgo("2026-11-04T12:00:00Z", now)).toBe("2 days ago");
  });

  it("compacts and pluralises numbers", () => {
    expect(compact(1500)).toBe("1.5K");
    expect(plural(1, "idea")).toBe("1 idea");
    expect(plural(3, "idea")).toBe("3 ideas");
  });

  it("scales heat between 0 and 1 and favours early votes", () => {
    expect(heat(0, 10)).toBe(0);
    expect(heat(5, 0)).toBe(0);
    expect(heat(100, 100)).toBe(1);
    expect(heat(2, 100)).toBeGreaterThan(0.2);
  });

  it("derives a stable hue from a seed", () => {
    expect(seedHue("ada")).toBe(seedHue("ada"));
    expect(seedHue("ada")).toBeGreaterThanOrEqual(0);
    expect(seedHue("ada")).toBeLessThan(360);
  });
});
