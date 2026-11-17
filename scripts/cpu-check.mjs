// Measures the live Worker's CPU time per page: starts `wrangler tail`, requests each page a few times,
// then prints CPU ms and the outcome per request. The free plan allows about 10 ms of CPU per request.
// Usage: node scripts/cpu-check.mjs https://liveradio.example.workers.dev
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2];
if (!base) throw new Error("usage: node scripts/cpu-check.mjs <base url>");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = [
  "/",
  "/?country=germany",
  "/top",
  "/countries",
  "/country/india",
  "/genres",
  "/genre/jazz",
  "/languages",
  "/station/christmas-fm-non-stop-595687e1-9fa0-49d7-8cb7-d6ed63f6d8b3",
  "/search?q=bbc",
  "/about",
  "/api/country/france",
  "/sitemap.xml",
];

const tail = spawn("npx", ["wrangler", "tail", "liveradio", "--format", "json", "--config", path.join(root, "wrangler.jsonc")], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
let buffer = "";
const events = [];
tail.stdout.on("data", (chunk) => {
  buffer += chunk;
  // Events are pretty-printed JSON objects, one after another.
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  let consumed = 0;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          events.push(JSON.parse(buffer.slice(start, i + 1)));
        } catch {
          /* partial */
        }
        consumed = i + 1;
      }
    }
  }
  buffer = buffer.slice(consumed);
});

await new Promise((r) => setTimeout(r, 15000)); // let the tail connect
for (let round = 1; round <= 3; round++) {
  for (const p of PAGES) {
    const res = await fetch(base + p, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh) cpu-check" }, redirect: "manual" });
    await res.arrayBuffer();
  }
}
await new Promise((r) => setTimeout(r, 25000)); // tail delivers events in batches, several seconds late
tail.kill();

const rows = events
  .filter((e) => e.event?.request?.url)
  .map((e) => ({ path: new URL(e.event.request.url).pathname + new URL(e.event.request.url).search, cpu: e.cpuTime, wall: e.wallTime, outcome: e.outcome }));
const byPath = new Map();
for (const r of rows) byPath.set(r.path, [...(byPath.get(r.path) ?? []), r]);
console.log(`${rows.length} requests logged`);
for (const [p, list] of byPath) {
  console.log(`${p.padEnd(72)} cpu ms: ${list.map((r) => r.cpu).join(", ").padEnd(14)} outcomes: ${[...new Set(list.map((r) => r.outcome))].join(",")}`);
}
const over = rows.filter((r) => r.outcome !== "ok");
console.log(over.length ? `NOT OK: ${over.length} request(s) ended with ${[...new Set(over.map((r) => r.outcome))].join(", ")}` : "every request ended ok");
