export function RowSkeleton() {
  return (
    <div className="flex items-center gap-6 border-b border-white/10 py-6" aria-hidden>
      <div className="skeleton h-5 flex-1" />
      <div className="skeleton h-5 w-12" />
      <div className="skeleton h-10 w-14" />
      <div className="skeleton hidden h-5 w-24 sm:block" />
    </div>
  );
}

export function TileSkeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton min-h-44 rounded-[6px] ${className}`} aria-hidden />;
}
