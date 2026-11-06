/** The spark glyph + wordmark used in the nav. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[22px] font-bold tracking-[-0.04em] ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 1 14.6 9.4 23 12 14.6 14.6 12 23 9.4 14.6 1 12 9.4 9.4Z"
          fill="var(--color-cobalt)"
        />
      </svg>
      sparkboard
    </span>
  );
}

/** The big poster lockup used in the footer. */
export function Lockup() {
  return (
    <div
      className="relative inline-block font-poster leading-[0.82] text-paper uppercase select-none"
      aria-label="Sparkboard by Infrenic"
    >
      <span className="block text-[clamp(4.5rem,10vw,9rem)]">Spark</span>
      <span className="block text-[clamp(4.5rem,10vw,9rem)]">
        B<span className="text-cobalt">✶</span>ard
      </span>
      <span className="absolute -top-3 -right-6 rotate-[-8deg] bg-paper px-2 py-0.5 font-sans text-lg font-bold tracking-tight text-night normal-case">
        the
      </span>
      <span className="mt-3 block text-right font-sans text-base font-medium tracking-normal text-fog normal-case">
        by Infrenic
      </span>
    </div>
  );
}
