import { useTags } from "@/lib/queries";

/** A slow poster-type ribbon of everything people are asking for. */
export function TagMarquee() {
  const { data: tags = [] } = useTags();
  const words = tags.length ? tags.map((t) => t.tag) : ["ideas", "votes", "roadmap", "shipped"];
  const run = [...words, ...words, ...words];
  return (
    <div className="overflow-hidden border-y border-black/10 bg-cobalt py-4 text-white" aria-hidden>
      <div className="flex w-max animate-marquee gap-10 font-poster text-4xl tracking-wide uppercase">
        {[...run, ...run].map((w, i) => (
          <span key={i} className="flex items-center gap-10">
            {w}
            <span className="text-2xl text-white/60">↑</span>
          </span>
        ))}
      </div>
    </div>
  );
}
