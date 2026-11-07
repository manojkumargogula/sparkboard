/** Google Identity Services ("Continue with Google"), loaded on demand. */

interface CredentialResponse {
  credential: string;
}

interface GoogleId {
  initialize: (options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: "signin" | "signup" | "use";
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: () => void;
  cancel: () => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "continue_with" | "signin_with" | "signup_with";
      shape?: "rectangular" | "pill";
      width?: number;
      logo_alignment?: "left" | "center";
    },
  ) => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SRC = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleId> | null = null;

export function loadGoogle(): Promise<GoogleId> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => {
      const id = window.google?.accounts.id;
      if (id) resolve(id);
      else reject(new Error("Google sign-in did not load"));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Google sign-in could not be reached"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Render Google's own button into `el`; `onCredential` receives the ID token. */
export async function renderGoogleButton(
  el: HTMLElement,
  clientId: string,
  onCredential: (credential: string) => void,
): Promise<void> {
  const id = await loadGoogle();
  id.initialize({
    client_id: clientId,
    callback: (r) => onCredential(r.credential),
    ux_mode: "popup",
    cancel_on_tap_outside: true,
  });
  id.renderButton(el, {
    type: "standard",
    theme: "filled_black",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: Math.min(el.clientWidth || 360, 400),
  });
}

/**
 * Google One Tap: the "Continue as …" card Google shows on page load for people
 * already signed in to Google in this browser. Google rate-limits it after a
 * dismissal, so it never nags. Uses FedCM where the browser supports it.
 */
export async function promptOneTap(
  clientId: string,
  onCredential: (credential: string) => void,
): Promise<void> {
  const id = await loadGoogle();
  id.initialize({
    client_id: clientId,
    callback: (r) => onCredential(r.credential),
    auto_select: true,
    cancel_on_tap_outside: true,
    context: "signin",
    itp_support: true,
    use_fedcm_for_prompt: true,
  });
  id.prompt();
}

export function cancelOneTap(): void {
  window.google?.accounts.id.cancel();
}

export function forgetGoogleSession(): void {
  window.google?.accounts.id.disableAutoSelect();
}
