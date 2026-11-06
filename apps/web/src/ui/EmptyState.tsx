import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 border-t border-white/10 py-14">
      <p className="font-poster text-5xl leading-none tracking-tight text-white/90 uppercase">
        {title}
      </p>
      <p className="max-w-lg text-lg text-fog">{body}</p>
      {action}
    </div>
  );
}
