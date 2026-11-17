// Renders design/og.html to public/og.png (1200x630) in a headless browser with a throwaway profile.
// Usage: node design/render-og.mjs   (needs the playwright package somewhere up the folder tree)
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "og.html")).toString());
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(here, "..", "public", "og.png"), type: "png" });
await browser.close();
console.log("wrote public/og.png");
