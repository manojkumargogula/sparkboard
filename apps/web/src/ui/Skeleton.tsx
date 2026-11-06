export function IdeaSkeleton() {
  return (
    <div className="card p-6" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="skeleton size-9 rounded-full" />
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="skeleton mt-5 h-6 w-11/12" />
      <div className="skeleton mt-3 h-6 w-3/5" />
      <div className="mt-6 flex gap-2">
        <div className="skeleton h-8 w-20 rounded-full" />
        <div className="skeleton h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}
