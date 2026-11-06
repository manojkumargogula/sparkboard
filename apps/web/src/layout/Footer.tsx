import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { useComposer } from "@/features/composer/useComposer";
import { Button } from "@/ui/Button";
import { Kbd } from "@/ui/Kbd";
import { Lockup } from "@/ui/Wordmark";

async function shareBoard() {
  const url = window.location.origin;
  const nav: Partial<Navigator> = navigator;
  try {
    if (nav.share)
      await nav.share({ title: "Sparkboard", text: "What should we build next?", url });
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  } catch {
    /* share sheet dismissed */
  }
}

export function Footer() {
  const { openComposer } = useComposer();
  return (
    <footer className="bg-night-2 py-20 text-snow">
      <div className="container-x grid grid-cols-[minmax(0,1fr)] items-end gap-14 lg:grid-cols-2">
        <div>
          <h2 className="text-headline uppercase">Get involved</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={openComposer}>Post an idea</Button>
            <Button
              variant="outline"
              className="text-snow"
              icon={<Share2 size={17} />}
              onClick={() => void shareBoard()}
            >
              Share the board
            </Button>
          </div>
          <div className="mt-14 space-y-3 text-xl text-fog">
            <p>
              Built by{" "}
              <a
                href="https://infrenic.com"
                className="text-paper underline decoration-white/30 underline-offset-4 hover:decoration-cobalt"
              >
                Infrenic
              </a>
              . Open source on{" "}
              <a
                href="https://github.com/manojkumargogula/sparkboard"
                className="text-paper underline decoration-white/30 underline-offset-4 hover:decoration-cobalt"
              >
                GitHub
              </a>
              .
            </p>
            <p className="hidden items-center gap-2 text-sm sm:flex">
              <Kbd>N</Kbd> new idea <Kbd>/</Kbd> search <Kbd>⌘K</Kbd> commands
            </p>
          </div>
        </div>
        <div className="lg:justify-self-end">
          <Lockup />
        </div>
      </div>
    </footer>
  );
}
