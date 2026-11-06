import { ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";

import { useFeed } from "@/lib/queries";

const TICKETS = [
  { bg: "bg-cobalt text-white", rotate: -10, x: -56, y: 34 },
  { bg: "bg-slate text-snow", rotate: 8, x: 52, y: -18 },
  { bg: "bg-snow text-night", rotate: -2, x: 0, y: 8 },
];

/** The hero's signature: the three hottest ideas, printed as tickets. */
export function TicketStack() {
  const { data } = useFeed({ sort: "top" });
  const top = (data?.pages[0] ?? []).slice(0, 3).reverse();

  return (
    <div
      className="relative mx-auto h-[23rem] w-full max-w-[18rem] sm:h-[27rem] sm:max-w-[24rem]"
      aria-label="Hottest ideas right now"
    >
      {top.length === 0 && (
        <div className="ticket grain absolute inset-x-6 inset-y-8 bg-slate/60" aria-hidden />
      )}
      {top.map((idea, i) => {
        const t = TICKETS[i] ?? { bg: "bg-snow text-night", rotate: 0, x: 0, y: 0 };
        const rank = top.length - i;
        return (
          <motion.div
            key={idea.id}
            className="absolute inset-x-4 top-10 sm:inset-x-6"
            initial={{ opacity: 0, y: 80, rotate: 0 }}
            animate={{ opacity: 1, x: t.x, y: t.y, rotate: t.rotate }}
            whileHover={{ y: t.y - 14, rotate: t.rotate * 0.5, zIndex: 5 }}
            transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.25 + i * 0.12 }}
          >
            <Link
              to={`/i/${idea.id}`}
              className={`ticket grain flex min-h-[18rem] flex-col justify-between p-6 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)] sm:min-h-[20rem] sm:p-7 ${t.bg}`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-poster text-5xl leading-none">
                  #{String(rank).padStart(2, "0")}
                </span>
                <span className="label opacity-70">Most wanted</span>
              </div>
              <p className="relative z-10 text-[1.4rem] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[1.7rem]">
                {idea.title ?? idea.content}
              </p>
              <div className="relative z-10 flex items-center justify-between border-t border-dashed border-current/30 pt-4 font-mono text-sm">
                <span className="opacity-70">{idea.tags[0] ? `#${idea.tags[0]}` : "#idea"}</span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <ChevronUp size={16} strokeWidth={2.5} />
                  {idea.vote_count} votes
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
