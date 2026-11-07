/**
 * The Sparkboard mark: a vote chevron rising out of a cobalt tile, with a spark
 * breaking off its tip. "Ideas rise when people vote for them."
 */
export function Mark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={className}
      shapeRendering="geometricPrecision"
    >
      <rect width="32" height="32" rx="8" fill="var(--color-cobalt)" />
      <path
        d="M8.5 20.5 16 13l7.5 7.5"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23.4 5.6 24.5 8l2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4L19.9 9.1l2.4-1.1Z" fill="#fff" />
    </svg>
  );
}

/** Mark + wordmark, used in the nav. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-[22px] font-bold tracking-[-0.045em] ${className}`}
    >
      <Mark size={28} />
      sparkboard
    </span>
  );
}

/** The big poster lockup used in the footer. */
export function Lockup() {
  return (
    <div
      className="relative inline-flex items-end gap-5 select-none"
      aria-label="Sparkboard by Infrenic"
    >
      <Mark size={128} className="mb-3 shrink-0 max-sm:size-20" />
      <div className="font-poster leading-[0.82] text-paper uppercase">
        <span className="block text-[clamp(4rem,9vw,8rem)]">Spark</span>
        <span className="block text-[clamp(4rem,9vw,8rem)]">board</span>
        <span className="mt-3 block text-right font-sans text-base font-medium tracking-normal text-fog normal-case">
          by Infrenic
        </span>
      </div>
    </div>
  );
}
