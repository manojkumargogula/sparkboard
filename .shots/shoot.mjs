import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:5173";
const out = new URL(".", import.meta.url).pathname;
const browser = await chromium.launch();
async function shot(name, path, { width = 1440, height = 1000, dark = false, full = true, act } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? "dark" : "light", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  if (act) await act(page);
  const over = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).position !== "fixed").map(e => e.tagName + "." + (e.className?.toString?.() ?? "").slice(0, 50)).slice(0, 5));
  await page.screenshot({ path: `${out}${name}.png`, fullPage: full });
  console.log(name, "errors:", errs.length ? errs : "none", "overflow:", over.length ? over : "none");
  await ctx.close();
}
const only = process.argv[2];
const shots = {
  desk: () => shot("desk", "/"),
  deskdark: () => shot("deskdark", "/", { dark: true }),
  mobile: () => shot("mobile", "/", { width: 390, height: 844 }),
  sheet: () => shot("sheet", "/i/3", { full: false }),
  roadmap: () => shot("roadmap", "/roadmap", { dark: true }),
  compose: () => shot("compose", "/", { full: false, act: async (p) => { await p.fill("#idea-content", "Add a dark mode for the dashboard please"); await p.waitForTimeout(1200); } }),
  palette: () => shot("palette", "/", { full: false, act: async (p) => { await p.keyboard.press("Control+k"); await p.keyboard.type("dark"); await p.waitForTimeout(900); } }),
};
for (const [k, f] of Object.entries(shots)) if (!only || only.split(",").includes(k)) await f();
await browser.close();
