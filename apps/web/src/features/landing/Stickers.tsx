import { motion } from "motion/react";

import { compact } from "@/lib/format";
import { useStats, useTags } from "@/lib/queries";

/** Cut-out shapes. Each is a clip-path, so the text sits on a real silhouette. */
const SHAPES = {
  triangle: "polygon(50% 0, 100% 100%, 0 100%)",
  house: "polygon(50% 0, 100% 42%, 92% 42%, 92% 100%, 8% 100%, 8% 42%, 0 42%)",
};

interface StickerProps {
  children: React.ReactNode;
  className: string;
  rotate: number;
  delay: number;
  shape?: keyof typeof SHAPES;
  ticket?: boolean;
}

function Sticker({ children, className, rotate, delay, shape, ticket }: StickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate }}
      viewport={{ once: true, margin: "-80px" }}
      whileHover={{ rotate: rotate * 0.4, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay }}
      className={`grain flex items-center justify-center text-center font-poster leading-[0.95] uppercase ${ticket ? "ticket" : ""} ${className}`}
      style={shape ? { clipPath: SHAPES[shape] } : {}}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function Stickers() {
  const stats = useStats().data;
  const topTag = useTags().data?.[0]?.tag;
  const n = (v: number | undefined) => (v === undefined ? "…" : compact(v));

  return (
    <section
      className="grid-paper overflow-hidden py-24 text-night sm:py-32"
      aria-label="The board in numbers"
    >
      <div className="container-x">
        <h2 className="text-center text-headline uppercase">The board spoke. Here's how.</h2>
        <div className="mt-12 grid grid-cols-2 place-items-center gap-x-2 gap-y-6 sm:mt-16 lg:grid-cols-4 lg:gap-0">
          <Sticker
            shape="triangle"
            rotate={-6}
            delay={0}
            className="aspect-[1.1] w-40 bg-night px-5 pt-14 text-[1.15rem] text-snow sm:w-72 sm:px-10 sm:pt-24 sm:text-[2rem]"
          >
            {n(stats?.votes)}+
            <br />
            votes cast
            <br />
            so far
          </Sticker>
          <Sticker
            ticket
            rotate={8}
            delay={0.08}
            className="aspect-square w-38 bg-cobalt p-4 text-[1.2rem] text-white sm:w-64 sm:p-8 sm:text-[2.1rem]"
          >
            #{topTag ?? "ideas"}
            <br />
            is the most
            <br />
            wanted topic
          </Sticker>
          <Sticker
            shape="house"
            rotate={-3}
            delay={0.16}
            className="aspect-[0.95] w-40 bg-night px-6 pt-14 text-[1.15rem] text-snow sm:w-72 sm:px-12 sm:pt-24 sm:text-[2rem]"
          >
            {n(stats?.shipped)} ideas
            <br />
            already
            <br />
            shipped
          </Sticker>
          <Sticker
            ticket
            rotate={-10}
            delay={0.24}
            className="aspect-[0.8] w-36 bg-cobalt p-4 text-[1.1rem] text-white sm:w-60 sm:p-8 sm:text-[1.9rem]"
          >
            {n(stats?.comments)} comments
            <br />
            shaping what
            <br />
            gets built
            <span className="mt-4 block border-t-2 border-dotted border-white/60 pt-3 font-sans text-[10px] font-semibold tracking-wide normal-case sm:text-xs">
              *we read every single one.
            </span>
          </Sticker>
        </div>
      </div>
    </section>
  );
}
