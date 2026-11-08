import { clsx } from "clsx";
import { Menu, Search, UserRound, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { useComposer } from "@/features/composer/useComposer";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { useProfile } from "@/features/profile/useProfile";
import { useHotkeys } from "@/lib/useHotkeys";
import { Avatar } from "@/ui/Avatar";
import { Button } from "@/ui/Button";
import { Wordmark } from "@/ui/Wordmark";

import { Footer } from "./Footer";

const LINKS = [
  { to: "/#top-10", label: "Top 10" },
  { to: "/#all-ideas", label: "All ideas" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/#mission", label: "Mission" },
];

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { profile, editProfile } = useProfile();
  const { openComposer } = useComposer();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  useHotkeys({ "/": () => setPaletteOpen(true), n: openComposer });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Hash links ("/#top-10") scroll to their section after navigation.
  useEffect(() => {
    if (!hash) return;
    const id = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 60);
    return () => clearTimeout(id);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-30 transition-colors duration-300",
          scrolled || menuOpen
            ? "border-b border-white/10 bg-night/90 backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <div className="container-x flex h-16 items-center gap-6">
          <Link to="/" aria-label="Sparkboard home" className="rounded-md">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="ml-auto hidden items-center gap-8 lg:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                className={() =>
                  clsx(
                    "text-[14px] font-semibold tracking-[0.04em] uppercase transition-colors hover:text-cobalt-soft",
                    pathname === l.to ? "text-cobalt-soft" : "text-snow",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 lg:ml-6">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search and commands"
              className="grid size-10 place-items-center rounded-full text-snow transition-colors hover:bg-white/10"
            >
              <Search size={19} />
            </button>
            <button
              type="button"
              onClick={editProfile}
              aria-label={profile ? `Signed in as ${profile.display_name}. Account` : "Sign in"}
              className="grid size-10 place-items-center rounded-full text-snow transition-colors hover:bg-white/10"
            >
              {profile ? <Avatar author={profile} size="sm" /> : <UserRound size={19} />}
            </button>
            <Button size="sm" className="ml-2 hidden sm:inline-flex" onClick={openComposer}>
              Post an idea
            </Button>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full text-snow hover:bg-white/10 lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              aria-label="Mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10 lg:hidden"
            >
              <div className="container-x flex flex-col py-4">
                {LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-white/10 py-4 text-3xl font-bold tracking-tight uppercase"
                  >
                    {l.label}
                  </Link>
                ))}
                <Button
                  size="lg"
                  className="mt-6 justify-center"
                  onClick={() => {
                    setMenuOpen(false);
                    openComposer();
                  }}
                >
                  Post an idea
                </Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNewIdea={openComposer}
        onNavigate={(to) => void navigate(to)}
      />
    </div>
  );
}
