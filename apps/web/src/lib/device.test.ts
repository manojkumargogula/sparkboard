import { deviceToken, saveProfile, savedProfile } from "./device";

describe("device identity", () => {
  beforeEach(() => localStorage.clear());

  it("creates one url-safe token and reuses it", () => {
    const token = deviceToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(deviceToken()).toBe(token);
  });

  it("round-trips the profile and ignores corrupt data", () => {
    expect(savedProfile()).toBeNull();
    saveProfile({ display_name: "Ada", avatar_seed: "x" });
    expect(savedProfile()).toEqual({ display_name: "Ada", avatar_seed: "x" });
    localStorage.setItem("sb-profile", "{not json");
    expect(savedProfile()).toBeNull();
    localStorage.setItem("sb-profile", JSON.stringify({ display_name: "Ada" }));
    expect(savedProfile()).toBeNull();
  });
});
