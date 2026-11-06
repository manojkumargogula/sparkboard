import { Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { type Profile, saveProfile, savedProfile } from "@/lib/device";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";

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

  const settle = useCallback((ok: boolean) => {
    pending.current?.(ok);
    pending.current = null;
  }, []);

  const ensureProfile = useCallback(
    (why?: string) => {
      if (profile) return Promise.resolve(true);
      setReason(why);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        pending.current = resolve;
      });
    },
    [profile],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      ensureProfile,
      editProfile: () => {
        setReason(undefined);
        setOpen(true);
      },
    }),
    [profile, ensureProfile],
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) settle(false);
        }}
        title="Choose your name"
        description="Pick the name people see next to your ideas, votes and comments."
      >
        <NameForm
          initial={profile}
          reason={reason}
          onSaved={(p) => {
            setProfile(p);
            setOpen(false);
            settle(true);
          }}
        />
      </Modal>
    </ProfileContext.Provider>
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
          <h2 className="text-title font-bold">{initial ? "Edit your name" : "Say hi first"}</h2>
          <p className="text-base text-muted">
            {reason ?? "No account needed. Your name shows on what you post."}
          </p>
        </div>
      </div>
      <label htmlFor="display-name" className="mt-7 text-sm font-semibold text-muted">
        Display name
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="display-name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="h-14 min-w-0 flex-1 rounded-2xl border border-line bg-raised px-5 text-xl outline-none focus:border-iris"
        />
        <Button
          variant="soft"
          size="icon"
          aria-label="New avatar colours"
          onClick={() => setSeed(randomSeed())}
          className="size-14"
          icon={<Shuffle size={20} />}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={saving}
        className="mt-6 justify-center"
      >
        {saving ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
