import { Link } from "react-router";

import { EmptyState } from "@/ui/EmptyState";

export function NotFound() {
  return (
    <div className="py-16">
      <EmptyState
        title="This page drifted off"
        body="The link may be old or mistyped. The board is still where you left it."
        action={
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-full bg-ink px-5 font-semibold text-canvas"
          >
            Back to the board
          </Link>
        }
      />
    </div>
  );
}
