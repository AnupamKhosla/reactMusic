// Headless screenshots of the main pages at desktop and phone width, into .smoke/.
// Usage: node scripts/shots.mjs [base]   (needs the playwright package somewhere up the folder tree)
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:5173";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".smoke");
const pages = [
  ["home", "/"],
  ["country", "/country/india"],
  ["station", process.argv[3] ?? "/top"],
  ["genres", "/genres"],
];

const browser = await chromium.launch({ headless: true });
for (const [vw, vh, tag, scheme] of [
  [1440, 900, "desktop", "light"],
  [390, 844, "phone", "light"],
  [1440, 900, "desktop-dark", "dark"],
]) {
  const context = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  for (const [name, p] of pages) {
    if (tag === "desktop-dark" && name !== "home") continue;
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(out, `${name}-${tag}.png`), fullPage: false });
    if (name === "home" && tag === "desktop") {
      await page.screenshot({ path: path.join(out, `home-full.png`), fullPage: true });
    }
  }
  // Press play on the first card and capture the player bar.
  if (tag !== "desktop-dark") {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.locator('button[aria-label^="Play "]').first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, `player-${tag}.png`) });
  }
  console.log(tag, errors.length ? errors.slice(0, 5).join("\n  ") : "no page errors");
  await context.close();
}
await browser.close();
