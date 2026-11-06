import { Link } from "react-router";

import { buttonClass } from "@/ui/buttonClass";

export function NotFound() {
  return (
    <section className="grid-night flex min-h-[80dvh] items-center pt-24">
      <div className="container-x">
        <p className="label text-fog">Error 404</p>
        <h1 className="mt-4 text-mega uppercase">
          Lost
          <br />
          <span className="text-cobalt">the thread.</span>
        </h1>
        <p className="mt-6 max-w-md text-xl text-fog">
          This link is old or mistyped. The board is right where you left it.
        </p>
        <Link to="/" className={buttonClass("cobalt", "lg", "mt-8")}>
          Back to the board
        </Link>
      </div>
    </section>
  );
}
