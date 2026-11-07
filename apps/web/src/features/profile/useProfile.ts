import { createContext, useContext } from "react";

import type { Profile } from "@/lib/device";

export interface ProfileContextValue {
  profile: Profile | null;
  /** Writes need a signed-in Google account (server AUTH_REQUIRED). */
  authRequired: boolean;
  /** Resolves true once the visitor may write; opens sign-in if needed. */
  ensureProfile: (reason?: string) => Promise<boolean>;
  /** Opens the account panel (sign in, edit name, or sign out). */
  editProfile: () => void;
  signOut: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
