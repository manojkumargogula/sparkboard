import { ArrowDown, Lightbulb, MessagesSquare, Rocket } from "lucide-react";
import { motion } from "motion/react";

import { compact } from "@/lib/format";
import { useStats } from "@/lib/queries";
import { Button } from "@/ui/Button";
import { buttonClass } from "@/ui/buttonClass";

import { useComposer } from "../composer/useComposer";
import { TicketStack } from "./TicketStack";

const LINES = ["What should", "we build", "next?"];

export function Hero() {
  const { openComposer } = useComposer();
  const stats = useStats().data;

  return (
    <section
      className="grid-night relative overflow-hidden pt-28 sm:pt-32"
      aria-label="Introduction"
    >
      <div className="container-x grid grid-cols-[minmax(0,1fr)] items-center gap-14 pb-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:pb-24">
        <div>
          <h1 className="text-mega uppercase">
            {LINES.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className={`block ${i === 2 ? "text-cobalt" : ""}`}
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-8 max-w-xl text-xl leading-relaxed text-paper/80"
          >
            A public board for ideas worth building. Post yours, vote for the ones you want, and
            follow them from spark to shipped. No sign-up.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Button size="lg" onClick={openComposer}>
              Post an idea
            </Button>
            <a href="#top-10" className={buttonClass("outline", "lg", "text-snow")}>
              Show me the top 10 <ArrowDown size={18} />
            </a>
          </motion.div>
        </div>
        <TicketStack />
      </div>

      <div className="border-t border-white/10 bg-black/60 backdrop-blur-sm">
        <dl className="container-x grid grid-cols-1 divide-white/10 sm:grid-cols-3 sm:divide-x">
          {[
            { icon: Lightbulb, value: stats?.ideas, label: "Ideas on the board" },
            { icon: Rocket, value: stats?.votes, label: "Votes and counting" },
            { icon: MessagesSquare, value: stats?.comments, label: "Comments shaping them" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 py-5 sm:justify-center">
              <span className="grid size-10 place-items-center rounded-full border border-white/25">
                <Icon size={18} />
              </span>
              <div className="leading-tight uppercase">
                <dt className="label text-fog">{label}</dt>
                <dd className="text-2xl font-bold tracking-tight">
                  {value === undefined ? "—" : compact(value)}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
