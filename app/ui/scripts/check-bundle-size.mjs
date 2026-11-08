// Fails CI when the gzipped JS shipped on first load grows past the budget.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 230);
const dir = new URL("../dist/assets/", import.meta.url).pathname;
// confetti is lazy-loaded on milestones only, so it is outside the first-load budget.
const files = readdirSync(dir).filter((f) => f.endsWith(".js") && !f.startsWith("confetti"));
let total = 0;
for (const f of files) {
  const kb = gzipSync(readFileSync(join(dir, f))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} kB  ${f}`);
}
console.log(`${total.toFixed(1).padStart(7)} kB  total (budget ${BUDGET_KB} kB)`);
if (total > BUDGET_KB) {
  console.error(`Bundle is ${(total - BUDGET_KB).toFixed(1)} kB over budget.`);
  process.exit(1);
}
