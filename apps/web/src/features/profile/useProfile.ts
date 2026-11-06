import { createContext, useContext } from "react";

import type { Profile } from "@/lib/device";

export interface ProfileContextValue {
  profile: Profile | null;
  /** Resolves true once the visitor has a name; opens the picker if needed. */
  ensureProfile: (reason?: string) => Promise<boolean>;
  editProfile: () => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
