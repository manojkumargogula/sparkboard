import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const CATS = ["B2B Services","Beauty & Personal Care","Consumer Services","E-commerce","EdTech","FinTech","Food & Beverage","Home Services","Logistics","Payment Issues","Real Estate","SaaS","Transportation","Travel","Healthtech","Other"];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("https://razorpay.com/m/fix-my-itch/", { waitUntil: "networkidle", timeout: 60000 });
await p.waitForTimeout(2000);
const rows = new Map();
const harvest = () => p.evaluate(() => {
  const out = [];
  for (const e of document.querySelectorAll("p")) {
    const t = e.textContent.trim();
    if (!/^Why\b/.test(t) || e.children.length) continue;
    // climb to a row container that also holds a score like 82.8
    let n = e, score = null, industry = null;
    for (let i = 0; i < 6 && n; i++, n = n.parentElement) {
      const texts = [...n.querySelectorAll("p")].map((x) => x.textContent.trim()).filter((x) => x && x !== t);
      const s = texts.find((x) => /^\d{1,3}(\.\d)?$/.test(x));
      if (s) { score = Number(s); industry = texts.find((x) => !/^\d/.test(x) && x.length < 40) ?? null; break; }
    }
    let tag = null; n = e;
    if (score === null) { for (let i = 0; i < 6 && n; i++, n = n.parentElement) { const ts = [...n.querySelectorAll("p")].map((x) => x.textContent.trim()).filter((x) => x && x !== t && x.length < 30); if (ts.length) { tag = ts[0]; break; } } }
    out.push({ q: t, score, industry: industry ?? tag, top: score === null });
  }
  return out;
});
const add = (list, cat) => { for (const r of list) { const k = r.q; const prev = rows.get(k); rows.set(k, { ...prev, ...r, industry: r.industry ?? cat ?? prev?.industry, top: (prev?.top ?? false) || r.top }); } };
add(await harvest(), null);
// The filter list: the first occurrence of each category label sits in the sidebar.
for (const cat of CATS) {
  const label = p.locator("p.framer-text", { hasText: new RegExp(`^${cat.replace(/[&]/g, "\\&")}$`) }).first();
  try {
    await label.scrollIntoViewIfNeeded(); await label.click({ timeout: 5000 }); await p.waitForTimeout(1500);
    // scroll the table area to trigger any lazy loading
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(250); }
    const got = await harvest();
    add(got, cat);
    console.log(cat, "→", got.filter((r) => !r.top).length, "rows visible");
    await label.scrollIntoViewIfNeeded(); await label.click({ timeout: 5000 }); await p.waitForTimeout(800); // untick
  } catch (e) { console.log(cat, "click failed:", e.message.split("\n")[0]); }
}
const all = [...rows.values()];
writeFileSync("/tmp/claude-1000/fix-my-itch.json", JSON.stringify(all, null, 1));
console.log("total unique:", all.length, "with score:", all.filter((r) => r.score !== null).length, "top:", all.filter((r) => r.top).length);
await b.close();
