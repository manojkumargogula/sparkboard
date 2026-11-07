/**
 * Anonymous identity. A random token lives in localStorage and is sent as
 * X-Device-Token; the server stores only its hash. No passwords, no email.
 */

const TOKEN_KEY = "sb-device";
const PROFILE_KEY = "sb-profile";

export interface Profile {
  display_name: string;
  avatar_seed: string;
  picture_url?: string | null;
  signed_in?: boolean;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: identity lasts for this tab only */
  }
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

let memoryToken: string | null = null;

export function deviceToken(): string {
  const existing = safeGet(TOKEN_KEY) ?? memoryToken;
  if (existing) return existing;
  const token = randomToken();
  memoryToken = token;
  safeSet(TOKEN_KEY, token);
  return token;
}

export function savedProfile(): Profile | null {
  const raw = safeGet(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Profile>;
    if (!parsed.display_name || !parsed.avatar_seed) return null;
    return {
      display_name: parsed.display_name,
      avatar_seed: parsed.avatar_seed,
      picture_url: parsed.picture_url ?? null,
      signed_in: parsed.signed_in ?? false,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile | null): void {
  if (profile) safeSet(PROFILE_KEY, JSON.stringify(profile));
  else {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      /* ignore */
    }
  }
}
