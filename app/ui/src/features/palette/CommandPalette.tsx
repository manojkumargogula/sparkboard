import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { ChevronUp, Map, PenLine, Search, Trophy, UserRound } from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/api";
import { useDebounced } from "@/lib/useDebounced";
import { Kbd } from "@/ui/Kbd";
import { Modal } from "@/ui/Modal";

import { useProfile } from "../profile/useProfile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewIdea: () => void;
  onNavigate: (to: string) => void;
}

const item =
  "flex h-13 cursor-pointer items-center gap-3 rounded-[6px] px-3 text-[17px] text-night data-[selected=true]:bg-cobalt data-[selected=true]:text-white";
const group =
  "text-night/50 [&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2";

export function CommandPalette({ open, onOpenChange, onNewIdea, onNavigate }: Props) {
  const [value, setValue] = useState("");
  const q = useDebounced(value.trim(), 200);
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
      <Command label="Command palette" shouldFilter={false}>
        <div className="flex items-center gap-3 border-b border-night/10 pr-8 pb-4">
          <Search size={22} className="text-night/40" aria-hidden />
          <Command.Input
            value={value}
            onValueChange={setValue}
            placeholder="Search ideas or type a command"
            className="h-11 min-w-0 flex-1 bg-transparent text-xl text-night outline-none placeholder:text-night/35"
          />
        </div>
        <Command.List className="mt-3 max-h-[min(26rem,60dvh)] overflow-y-auto">
          <Command.Empty className="px-3 py-8 text-center text-night/50">
            No ideas match that.
          </Command.Empty>
          {(results.data?.length ?? 0) > 0 && (
            <Command.Group heading="Ideas" className={group}>
              {results.data?.map((idea) => (
                <Command.Item
                  key={idea.id}
                  value={`idea-${idea.id}`}
                  onSelect={run(() => onNavigate(`/i/${idea.id}`))}
                  className={item}
                >
                  <span className="line-clamp-1 flex-1">{idea.title ?? idea.content}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-sm opacity-70">
                    <ChevronUp size={14} />
                    {idea.vote_count}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Actions" className={group}>
            {q && (
              <Command.Item
                value="search-all"
                onSelect={run(() => onNavigate(`/?q=${encodeURIComponent(q)}#all-ideas`))}
                className={item}
              >
                <Search size={18} /> Show every result for “{q}”
              </Command.Item>
            )}
            <Command.Item value="new" onSelect={run(onNewIdea)} className={item}>
              <PenLine size={18} /> <span className="flex-1">Post an idea</span> <Kbd>N</Kbd>
            </Command.Item>
            <Command.Item value="top" onSelect={run(() => onNavigate("/#top-10"))} className={item}>
              <Trophy size={18} /> See the top 10
            </Command.Item>
            <Command.Item
              value="roadmap"
              onSelect={run(() => onNavigate("/roadmap"))}
              className={item}
            >
              <Map size={18} /> Open the roadmap
            </Command.Item>
            <Command.Item value="name" onSelect={run(editProfile)} className={item}>
              <UserRound size={18} /> Change your name
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </Modal>
  );
}
