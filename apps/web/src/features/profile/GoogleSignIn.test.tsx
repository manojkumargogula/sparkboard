import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { savedProfile } from "@/lib/device";
import { mockFetch, renderApp } from "@/test/utils";

import { useProfile } from "./useProfile";

function Probe() {
  const { profile, editProfile, ensureProfile } = useProfile();
  return (
    <div>
      <p>who: {profile?.display_name ?? "nobody"}</p>
      <button type="button" onClick={() => void ensureProfile("Sign in to vote.")}>
        need
      </button>
      <button type="button" onClick={editProfile}>
        account
      </button>
    </div>
  );
}

describe("Google sign-in", () => {
  let callback: ((r: { credential: string }) => void) | undefined;

  beforeEach(() => {
    localStorage.clear();
    callback = undefined;
    window.google = {
      accounts: {
        id: {
          initialize: ({ callback: cb }) => {
            callback = cb;
          },
          renderButton: (el) => {
            const b = document.createElement("button");
            b.textContent = "Continue with Google";
            b.onclick = () => callback?.({ credential: "id-token" });
            el.appendChild(b);
          },
          disableAutoSelect: vi.fn(),
        },
      },
    };
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.google;
  });

  it("signs in with the Google credential, then signs out", async () => {
    const calls = mockFetch({
      "GET /api/auth/config": { google_client_id: "cid", auth_required: true },
      "POST /api/auth/google": {
        display_name: "Ada Lovelace",
        avatar_seed: "s",
        picture_url: "https://p/a.png",
        signed_in: true,
      },
      "POST /api/auth/logout": new Response(null, { status: 204 }),
    });
    renderApp([{ path: "/", element: <Probe /> }]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "need" }));
    expect(await screen.findByText("Sign in to vote.")).toBeInTheDocument();
    expect(screen.queryByText(/continue with just a name/i)).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByText("who: Ada Lovelace")).toBeInTheDocument();
    expect(calls.find((c) => c.url === "/api/auth/google")?.body).toEqual({
      credential: "id-token",
    });
    expect(savedProfile()?.signed_in).toBe(true);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "account" }));
    expect(await screen.findByText("Signed in with Google")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByText("who: nobody")).toBeInTheDocument());
    expect(savedProfile()).toBeNull();
  });

  it("offers a name-only fallback when sign-in is optional", async () => {
    mockFetch({
      "GET /api/auth/config": { google_client_id: "cid", auth_required: false },
      "PUT /api/me": { display_name: "Grace", avatar_seed: "g", signed_in: false },
    });
    renderApp([{ path: "/", element: <Probe /> }]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "need" }));
    await user.click(await screen.findByRole("button", { name: /continue with just a name/i }));
    await user.type(await screen.findByLabelText("Display name"), "Grace");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("who: Grace")).toBeInTheDocument();
  });
});
