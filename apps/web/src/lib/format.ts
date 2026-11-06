/** Small, dependency-free formatting helpers. */

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** 0..1 heat from votes, log-scaled so the first few votes are felt most. */
export function heat(votes: number, maxVotes: number): number {
  if (votes <= 0 || maxVotes <= 0) return 0;
  return Math.min(1, Math.log1p(votes) / Math.log1p(Math.max(maxVotes, 10)));
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${compact(n)} ${n === 1 ? one : many}`;
}

/** Deterministic hue for avatars, so a name always looks the same. */
export function seedHue(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
