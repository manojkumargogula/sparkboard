import { clsx } from "clsx";
import { Search, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { useProfile } from "@/features/profile/useProfile";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { useHotkeys } from "@/lib/useHotkeys";
import { Avatar } from "@/ui/Avatar";
import { Kbd } from "@/ui/Kbd";
import { ThemeToggle } from "@/ui/ThemeToggle";

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
      <motion.svg
        width="26"
        height="26"
        viewBox="0 0 88 88"
        aria-hidden
        whileHover={{ rotate: 90, scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 12 }}
      >
        <path d="M44 6 52 34 80 44 52 54 44 82 36 54 8 44 36 34Z" fill="var(--color-ember)" />
      </motion.svg>
      sparkboard
    </span>
  );
}

const NAV = [
  { to: "/", label: "Board" },
  { to: "/roadmap", label: "Roadmap" },
];

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { profile, editProfile } = useProfile();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useHotkeys({ "/": () => setPaletteOpen(true) });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const section = pathname.startsWith("/roadmap") ? "/roadmap" : "/";

  return (
    <div className="mx-auto flex min-h-dvh max-w-[90rem] flex-col px-4 sm:px-8">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 -mx-4 flex h-[4.5rem] items-center gap-2 bg-canvas/85 px-4 backdrop-blur-md sm:-mx-8 sm:gap-4 sm:px-8">
        <NavLink to="/" aria-label="Sparkboard home" className="rounded-xl">
          <Wordmark />
        </NavLink>
        <nav
          aria-label="Main"
          className="ml-2 hidden rounded-full bg-surface p-1 ring-1 ring-line sm:flex"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={clsx(
                "relative rounded-full px-4 py-2 text-base font-semibold transition-colors",
                section === n.to ? "text-canvas" : "text-muted hover:text-ink",
              )}
            >
              {section === n.to && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-11 items-center gap-3 rounded-full bg-surface px-3 text-muted ring-1 ring-line transition-colors hover:text-ink sm:px-4"
            aria-label="Search and commands"
          >
            <Search size={18} />
            <span className="hidden text-base md:inline">Search ideas</span>
            <span className="hidden md:inline-flex">
              <Kbd>⌘K</Kbd>
            </span>
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={editProfile}
            aria-label={
              profile ? `Signed in as ${profile.display_name}. Change name` : "Choose a name"
            }
            className="rounded-full"
          >
            {profile ? (
              <Avatar author={profile} />
            ) : (
              <span className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-iris-soft">
                <UserRound size={20} />
              </span>
            )}
          </button>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-4 bottom-4 z-30 flex rounded-full bg-ink/90 p-1.5 shadow-2xl backdrop-blur sm:hidden"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={clsx(
              "flex-1 rounded-full py-3 text-center text-base font-semibold",
              section === n.to ? "bg-canvas text-ink" : "text-canvas/80",
            )}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-8 pb-28 text-sm text-muted sm:pb-8">
        <span>
          Sparkboard by{" "}
          <a
            href="https://infrenic.com"
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            Infrenic
          </a>
        </span>
        <span className="hidden items-center gap-2 sm:inline-flex">
          <Kbd>N</Kbd> new idea <Kbd>/</Kbd> search <Kbd>J</Kbd>
          <Kbd>K</Kbd> move
        </span>
      </footer>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNewIdea={() => {
          void navigate("/");
          setTimeout(() => document.getElementById("idea-content")?.focus(), 80);
        }}
      />
    </div>
  );
}
