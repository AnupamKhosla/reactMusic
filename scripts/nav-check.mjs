// Checks that moving between pages uses the History API (no full reload) and that the player keeps playing.
// Usage: node scripts/nav-check.mjs [base]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let loads = 0;
page.on("load", () => loads++);

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  window.__marker = "same-document";
});
await page.locator('button[aria-label^="Play "]').first().click();
await page.waitForTimeout(5000);
const playingName = await page.locator('section[aria-label="Player"] a').first().textContent();

await page.locator('a[href="/country/germany"]').first().click();
await page.waitForURL("**/country/germany");
await page.locator("h1").filter({ hasText: "Germany" }).waitFor();
await page.locator('a[href="/genres"]').first().click();
await page.waitForURL("**/genres");
await page.goBack();
await page.waitForURL("**/country/germany");
await page.locator("h1").filter({ hasText: "Germany" }).waitFor();
await page.waitForFunction(() => document.title.startsWith("Germany"), null, { timeout: 5000 }).catch(() => {});

const state = await page.evaluate(() => ({
  marker: window.__marker,
  url: location.pathname,
  title: document.title,
  player: document.querySelector('section[aria-label="Player"] a')?.textContent,
  live: document.querySelector('section[aria-label="Player"] [aria-live]')?.textContent,
}));
console.log(JSON.stringify({ playingName, loadsAfterFirst: loads - 1, ...state }, null, 2));
console.log(state.marker === "same-document" && loads === 1 ? "PASS: no full page reloads" : "FAIL: the page reloaded");
await browser.close();
