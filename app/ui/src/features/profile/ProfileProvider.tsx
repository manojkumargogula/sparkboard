import { Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { type Profile, saveProfile, savedProfile } from "@/lib/device";
import { cancelOneTap, forgetGoogleSession, promptOneTap, renderGoogleButton } from "@/lib/google";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";
import { Mark } from "@/ui/Wordmark";

import { ProfileContext, type ProfileContextValue } from "./useProfile";

const SUGGESTIONS = ["Night Owl", "Pixel Pilot", "Quiet Comet", "Idea Smith", "Maple Byte"];

function pickSuggestion(): string {
  return SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)] ?? "Night Owl";
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => savedProfile());
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const pending = useRef<((ok: boolean) => void) | null>(null);
  const config = useQuery({
    queryKey: ["auth-config"],
    queryFn: api.authConfig,
    staleTime: Infinity,
    retry: false,
  });
  const googleClientId = config.data?.google_client_id ?? null;
  const authRequired = config.data?.auth_required ?? false;
  const canWrite = authRequired ? Boolean(profile?.signed_in) : profile !== null;

  const settle = useCallback((ok: boolean) => {
    pending.current?.(ok);
    pending.current = null;
  }, []);

  const ensureProfile = useCallback(
    (why?: string) => {
      if (canWrite) return Promise.resolve(true);
      setReason(why);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        pending.current = resolve;
      });
    },
    [canWrite],
  );

  // Offer Google One Tap as soon as a signed-out visitor lands on the page.
  const signedIn = Boolean(profile?.signed_in);
  useEffect(() => {
    if (!googleClientId || signedIn) return;
    promptOneTap(googleClientId, (credential) => {
      api
        .googleSignIn(credential)
        .then((me) => {
          saveProfile(me);
          setProfile(me);
          setOpen(false);
          settle(true);
          toast.success(`Welcome, ${me.display_name}`);
        })
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Google sign-in failed");
        });
    }).catch(() => {
      /* Google unreachable or blocked: the Sign in button still works */
    });
    return () => cancelOneTap();
  }, [googleClientId, signedIn, settle]);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* the device link is gone either way once local state is cleared */
    }
    forgetGoogleSession();
    saveProfile(null);
    setProfile(null);
    setOpen(false);
    toast.success("Signed out");
  }, []);

  const onSaved = useCallback(
    (p: Profile) => {
      saveProfile(p);
      setProfile(p);
      setOpen(false);
      settle(true);
    },
    [settle],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      authRequired,
      ensureProfile,
      signOut,
      editProfile: () => {
        setReason(undefined);
        setOpen(true);
      },
    }),
    [profile, authRequired, ensureProfile, signOut],
  );

  let body: ReactNode;
  if (profile?.signed_in) {
    body = <AccountPanel profile={profile} onSignOut={() => void signOut()} />;
  } else if (googleClientId) {
    body = (
      <GoogleSignIn
        clientId={googleClientId}
        reason={reason}
        allowAnonymous={!authRequired}
        onSaved={onSaved}
        initial={profile}
      />
    );
  } else {
    body = <NameForm initial={profile} reason={reason} onSaved={onSaved} />;
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) settle(false);
        }}
        title={profile?.signed_in ? "Your account" : "Sign in to Sparkboard"}
        description="Sign in to post ideas, vote and comment."
      >
        {body}
      </Modal>
    </ProfileContext.Provider>
  );
}

function GoogleSignIn({
  clientId,
  reason,
  allowAnonymous,
  initial,
  onSaved,
}: {
  clientId: string;
  reason: string | undefined;
  allowAnonymous: boolean;
  initial: Profile | null;
  onSaved: (p: Profile) => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "signing" | "error">("loading");
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    const el = slot.current;
    if (!el || anonymous) return;
    let cancelled = false;
    renderGoogleButton(el, clientId, (credential) => {
      setState("signing");
      api
        .googleSignIn(credential)
        .then((me) => {
          toast.success(`Welcome, ${me.display_name}`);
          onSaved(me);
        })
        .catch((err: unknown) => {
          setState("ready");
          toast.error(err instanceof Error ? err.message : "Google sign-in failed");
        });
    })
      .then(() => {
        if (!cancelled) setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, onSaved, anonymous]);

  if (anonymous) return <NameForm initial={initial} reason={reason} onSaved={onSaved} />;

  return (
    <div className="flex flex-col">
      <Mark size={44} />
      <h2 className="mt-6 pr-8 text-[2rem] leading-tight tracking-[-0.04em]">
        Sign in to join the board
      </h2>
      <p className="mt-2 text-lg text-night/65">
        {reason ?? "Post ideas, vote for the ones you want and join the discussion."}
      </p>
      <div className="mt-8 min-h-11" ref={slot} aria-busy={state === "loading"} />
      {state === "loading" && <div className="h-11 w-72 animate-pulse rounded bg-night/10" />}
      {state === "signing" && <p className="mt-3 text-sm text-night/60">Signing you in…</p>}
      {state === "error" && (
        <p className="mt-3 text-sm text-[#c2410c]">
          Google sign-in could not load. Check your connection or ad blocker and try again.
        </p>
      )}
      <p className="mt-6 text-sm text-night/50">
        We only use your name, email and profile photo. No posting on your behalf, ever.
      </p>
      {allowAnonymous && (
        <button
          type="button"
          onClick={() => setAnonymous(true)}
          className="mt-4 self-start text-sm font-medium text-cobalt underline-offset-4 hover:underline"
        >
          Continue with just a name instead
        </button>
      )}
    </div>
  );
}

function AccountPanel({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 pr-8">
        <Avatar author={profile} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-2xl tracking-[-0.03em]">{profile.display_name}</h2>
          <p className="text-sm text-night/60">Signed in with Google</p>
        </div>
      </div>
      <p className="mt-6 text-base text-night/65">
        Your ideas, votes and comments are tied to this Google account on every device you sign in
        from.
      </p>
      <Button variant="ink" size="lg" className="mt-8 justify-center" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}

function NameForm({
  initial,
  reason,
  onSaved,
}: {
  initial: Profile | null;
  reason: string | undefined;
  onSaved: (p: Profile) => void;
}) {
  const [name, setName] = useState(initial?.display_name ?? "");
  const [seed, setSeed] = useState(initial?.avatar_seed ?? randomSeed());
  const [saving, setSaving] = useState(false);
  const [placeholder] = useState(pickSuggestion);
  const preview = { display_name: name.trim() || placeholder, avatar_seed: seed };

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const profile = { display_name: name.trim() || placeholder, avatar_seed: seed };
    setSaving(true);
    try {
      const saved = await api.saveMe(profile);
      saveProfile(saved);
      toast.success(`Welcome, ${saved.display_name}`);
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col">
      <div className="flex items-center gap-4">
        <motion.div
          key={seed}
          initial={{ scale: 0.6, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
        >
          <Avatar author={preview} size="lg" />
        </motion.div>
        <div>
          <h2 className="pr-8 text-3xl tracking-[-0.04em]">
            {initial ? "Edit your name" : "Say hi first"}
          </h2>
          <p className="text-base text-night/60">
            {reason ?? "No account needed. Your name shows on what you post."}
          </p>
        </div>
      </div>
      <label htmlFor="display-name" className="label mt-8 block text-night/55">
        Display name
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="display-name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="h-14 min-w-0 flex-1 rounded-[6px] border border-night/15 bg-white px-4 text-xl text-night outline-none focus:border-cobalt"
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="New avatar colours"
          onClick={() => setSeed(randomSeed())}
          className="size-14 text-night"
          icon={<Shuffle size={20} />}
        />
      </div>
      <Button
        type="submit"
        variant="cobalt"
        size="lg"
        disabled={saving}
        className="mt-6 justify-center"
      >
        {saving ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
