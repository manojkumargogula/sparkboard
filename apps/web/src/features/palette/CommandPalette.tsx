import { Command } from "cmdk";
import { Flame, Map, Moon, PenLine, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { applyTheme, currentTheme } from "@/lib/theme";
import { useDebounced } from "@/lib/useDebounced";
import { Kbd } from "@/ui/Kbd";
import { Modal } from "@/ui/Modal";

import { useProfile } from "../profile/useProfile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewIdea: () => void;
}

const item =
  "flex h-14 cursor-pointer items-center gap-3 rounded-2xl px-4 text-lg data-[selected=true]:bg-iris-soft data-[selected=true]:text-ink";

export function CommandPalette({ open, onOpenChange, onNewIdea }: Props) {
  const [value, setValue] = useState("");
  const q = useDebounced(value.trim(), 200);
  const navigate = useNavigate();
  const { editProfile } = useProfile();
  const results = useQuery({
    queryKey: ["palette", q],
    queryFn: () => api.ideas({ sort: "top", q, limit: 6 }),
    enabled: open && q.length >= 2,
  });

  const setOpen = (next: boolean) => {
    if (!next) setValue("");
    onOpenChange(next);
  };

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <Modal open={open} onOpenChange={setOpen} title="Command palette">
      <Command label="Command palette" shouldFilter={false} className="-m-2">
        <div className="flex items-center gap-3 border-b border-line px-3 pb-4">
          <Search size={22} className="text-muted" aria-hidden />
          <Command.Input
            value={value}
            onValueChange={setValue}
            placeholder="Search ideas or type a command"
            className="h-12 min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-muted/70"
          />
        </div>
        <Command.List className="mt-3 max-h-[min(26rem,60dvh)] overflow-y-auto">
          <Command.Empty className="px-4 py-8 text-center text-muted">
            No ideas match that.
          </Command.Empty>
          {(results.data?.length ?? 0) > 0 && (
            <Command.Group
              heading="Ideas"
              className="text-sm text-muted [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2"
            >
              {results.data?.map((idea) => (
                <Command.Item
                  key={idea.id}
                  value={`idea-${idea.id}`}
                  onSelect={run(() => void navigate(`/i/${idea.id}`))}
                  className={item}
                >
                  <Flame size={18} className="shrink-0 text-ember" />
                  <span className="line-clamp-1 flex-1 text-ink">{idea.title ?? idea.content}</span>
                  <span className="font-mono text-sm">{idea.vote_count}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group
            heading="Actions"
            className="text-sm text-muted [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2"
          >
            {q && (
              <Command.Item
                value="search-all"
                onSelect={run(() => void navigate(`/?q=${encodeURIComponent(q)}`))}
                className={item}
              >
                <Search size={18} /> <span className="text-ink">Show every result for “{q}”</span>
              </Command.Item>
            )}
            <Command.Item value="new" onSelect={run(onNewIdea)} className={item}>
              <PenLine size={18} /> <span className="flex-1 text-ink">Post an idea</span>{" "}
              <Kbd>N</Kbd>
            </Command.Item>
            <Command.Item
              value="roadmap"
              onSelect={run(() => void navigate("/roadmap"))}
              className={item}
            >
              <Map size={18} /> <span className="text-ink">Open the roadmap</span>
            </Command.Item>
            <Command.Item
              value="theme"
              onSelect={run(() => applyTheme(currentTheme() === "dark" ? "light" : "dark"))}
              className={item}
            >
              <Moon size={18} /> <span className="text-ink">Switch theme</span>
            </Command.Item>
            <Command.Item value="name" onSelect={run(editProfile)} className={item}>
              <UserRound size={18} /> <span className="text-ink">Change your name</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </Modal>
  );
}
