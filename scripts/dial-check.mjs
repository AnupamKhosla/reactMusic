// Checks the home page dial, the whole-card links and the skeletons in a headless browser.
// Usage: node scripts/dial-check.mjs [base]
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:5173";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".smoke");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
let loads = 0;
page.on("load", () => loads++);
const results = [];
const check = (name, ok, detail = "") => {
  const line = `${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`;
  results.push(line);
  console.log(line);
};
page.on("framenavigated", (f) => {
  if (f === page.mainFrame()) console.log("  navigated:", f.url());
});

await page.goto(base + "/", { waitUntil: "networkidle" });
const heading = () => page.locator("#tuned-title").textContent({ timeout: 5000 }).catch(() => "(no heading)");
const first = await heading();
const scrollLeft0 = await page.locator("#dial-list").evaluate((el) => el.scrollLeft);
check("dial starts on the tuned country", /Popular in /.test(first ?? ""), `${first}, scrollLeft ${scrollLeft0}`);

// 1. Grab and drag with the mouse.
const box = await page.locator("#dial-list").boundingBox();
const y = box.y + box.height / 2;
await page.mouse.move(box.x + box.width / 2, y);
await page.mouse.down();
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(box.x + box.width / 2 - i * 30, y);
  await page.waitForTimeout(16);
}
await page.waitForTimeout(150);
await page.mouse.up();
await page.waitForTimeout(400);
const shotSkeleton = page.screenshot({ path: path.join(out, "dial-loading.png") });
await page.waitForFunction((before) => document.querySelector("#tuned-title")?.textContent !== before, first, { timeout: 8000 }).catch(() => {});
await shotSkeleton;
await page.waitForTimeout(1500);
const afterDrag = await heading();
const url1 = page.url();
const snapped = await page.locator("#dial-list").evaluate((el) => {
  const w = el.firstElementChild.offsetWidth;
  return Math.abs(el.scrollLeft / w - Math.round(el.scrollLeft / w)) < 0.02;
});
check("dragging tunes another country", afterDrag !== first, `${first} -> ${afterDrag}`);
check("address shows the country, same page", /\?country=/.test(url1) && loads === 1, url1);
check("dial comes to rest on a country", snapped);
const cards = await page.locator('#tuned-title ~ * li, section[aria-labelledby="tuned-title"] ul[aria-label^="Stations in"] > li').count();
check("its stations are listed below", cards > 0, `${cards} cards`);
await page.screenshot({ path: path.join(out, "dial-after-drag.png") });

// 2. Click a country on the dial: tunes, doesn't leave the page.
const target = page.locator('#dial-list a[href="/country/germany"]');
await target.scrollIntoViewIfNeeded().catch(() => {});
await target.click();
await page.waitForFunction(() => document.querySelector("#tuned-title")?.textContent === "Popular in Germany", null, { timeout: 8000 }).catch(() => {});
check("clicking Germany on the dial tunes it in place", (await heading()) === "Popular in Germany" && new URL(page.url()).pathname === "/", page.url());

// 3. Arrow key on the dial.
await page.locator('#dial-list a[aria-current="true"]').focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(1200);
check("arrow key tunes the next country", (await heading()) !== "Popular in Germany", await heading());

// 4. A whole card opens its station page in place.
const card = page.locator('section[aria-labelledby="tuned-title"] ul[aria-label^="Stations in"] > li').first();
await card.waitFor({ timeout: 10000 });
const cardBox = await card.boundingBox();
await page.mouse.click(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height - 50);
await page.waitForURL("**/station/**", { timeout: 10000 }).catch(() => {});
check("clicking a card's empty area opens the station page", page.url().includes("/station/") && loads === 1, page.url());

// 5. Back returns to the tuned country.
await page.goBack();
await page.waitForURL((u) => u.pathname === "/", { timeout: 10000 }).catch(() => {});
await page.locator("#tuned-title").waitFor({ timeout: 10000 }).catch(() => {});
const backHeading = await heading();
await page.screenshot({ path: path.join(out, "after-back.png") });
check("back returns home with the same country", /\?country=/.test(page.url()) && backHeading.startsWith("Popular in"), `${page.url()} ${backHeading}`);

// 6. Page skeleton while a slow page loads.
await page.route("**/genres.data*", async (route) => {
  await new Promise((r) => setTimeout(r, 1500));
  await route.continue();
});
await page.locator('header a[href="/genres"]').first().click();
await page.waitForTimeout(600);
const skeletonShown = await page.locator(".skeleton").count();
await page.screenshot({ path: path.join(out, "page-skeleton.png") });
check("a slow page shows the skeleton", skeletonShown > 0, `${skeletonShown} shapes`);
await page.waitForURL("**/genres", { timeout: 10000 });

check("no script errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
