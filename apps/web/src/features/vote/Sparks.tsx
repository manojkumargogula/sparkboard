import { motion } from "motion/react";

const COLORS = ["var(--color-ember)", "var(--color-amber)", "var(--color-flare)"];
const COUNT = 10;

/** A one-shot radial burst of embers. Rendered only while `burstKey` is set. */
export function Sparks({ burstKey }: { burstKey: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0" key={burstKey}>
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2;
        const distance = 26 + (i % 3) * 8;
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 size-1.5 rounded-full"
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: "-50%", y: "-50%", scale: 1, opacity: 1 }}
            animate={{
              x: `calc(-50% + ${Math.cos(angle) * distance}px)`,
              y: `calc(-50% + ${Math.sin(angle) * distance}px)`,
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </span>
  );
}
