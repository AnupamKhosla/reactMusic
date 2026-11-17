// WCAG 2.2 contrast of the colour pairs the site uses, read from app/app.css (light and dark schemes).
// Usage: node scripts/contrast.mjs   -> prints every pair; exits 1 if any falls below its minimum.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const css = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "app.css"), "utf8");
const block = (re) => Object.fromEntries([...(css.match(re)?.[1] ?? "").matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const light = block(/:root\s*{([^}]*)}/);
const dark = { ...light, ...block(/prefers-color-scheme: dark\)\s*{\s*:root\s*{([^}]*)}/) };

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [what, foreground, background, minimum] — 4.5 for text, 3 for large text and for non-text (WCAG 1.4.3 / 1.4.11).
const PAIRS = [
  ["Top line text (ink-2 on paper)", "ink-2", "paper", 4.5],
  ["Top line 'On air now' (ink on paper)", "ink", "paper", 4.5],
  ["Dial: tuned country, frequency (on-bar on bar)", "on-bar", "bar", 4.5],
  ["Dial: other countries, counts (on-bar-muted on bar)", "on-bar-muted", "bar", 4.5],
  ["Dial: tuned code chip (bar on on-bar)", "bar", "on-bar", 4.5],
  ["Dial: needle (red on bar)", "red", "bar", 3],
  ["Dial: window edge (line on paper)", "line", "paper", 3],
  ["Dial: focus ring (focus on bar)", "focus", "bar", 3],
  ["Dial hint under it (ink-2 on paper)", "ink-2", "paper", 4.5],
  ["Muted text (muted on paper)", "muted", "paper", 4.5],
  ["Muted text on a hovered card (muted on paper-2)", "muted", "paper-2", 4.5],
  ["Links and 'All stations' (red-ink on paper)", "red-ink", "paper", 4.5],
  ["Play button icon (on-red on red)", "on-red", "red", 3],
  ["Player bar text (on-bar-muted on bar)", "on-bar-muted", "bar", 4.5],
];

let failed = 0;
for (const [scheme, colours] of [["light", light], ["dark", dark]]) {
  console.log(`\n${scheme}`);
  for (const [what, fg, bg, min] of PAIRS) {
    const r = ratio(colours[fg], colours[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${what}  ${colours[fg]} on ${colours[bg]}`);
  }
}
process.exit(failed ? 1 : 0);
