import { motion } from "motion/react";

import { Button } from "@/ui/Button";

import { useComposer } from "../composer/useComposer";

export function CtaBand() {
  const { openComposer } = useComposer();
  return (
    <section
      id="mission"
      className="halftone relative overflow-hidden py-24 text-white sm:py-32"
      aria-label="Mission"
    >
      <div className="container-x grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-2">
        <motion.h2
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-mega uppercase"
        >
          Start
          <br />
          building
          <br />
          now
        </motion.h2>
        <div className="text-2xl leading-snug font-medium tracking-tight sm:text-[1.75rem]">
          <p>Every product is a pile of small itches nobody fixed.</p>
          <p>Sparkboard puts them in one place, ranked by the people who feel them.</p>
          <p className="mt-6">Got one? Put it on the board.</p>
          <Button variant="snow" size="lg" className="mt-9" onClick={openComposer}>
            Post an idea
          </Button>
        </div>
      </div>
    </section>
  );
}
